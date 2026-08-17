"""OpenAI를 이용한 요인 상세(REPORT-02) 관리 팁 생성.

`product_comment.py`와 같은 패턴(OpenAI 클라이언트 재사용, 실패 시 예외로 위임)을 따른다.
인사이트의 판정·수치는 Spring이 이미 확정한 상태이고, 여기서는 그 근거를 읽고 사용자가
무엇을 해볼지에 대한 조언 문장만 쓴다 — 패턴 판정이나 수치에는 관여하지 않는다.

한 화면당 인사이트 하나라 배치가 아니라 단건 호출이다(`product_comment.py`가 배치인 이유는
추천 목록이 제품 N개이기 때문이다).
"""

from __future__ import annotations

import json
import logging
from functools import lru_cache

import openai
from openai import OpenAI
from pydantic import ValidationError

from app.config import get_settings
from app.schema import InsightTipRequest, InsightTipResponse

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """너는 피부 관리 조언을 쓰는 전문가다. 사용자의 피부 분석 인사이트를 읽고
무엇을 해보면 좋을지 짧은 관리 팁을 한국어로 작성해라.

인사이트는 "이 요인이 이 지표에 영향을 주는가"를 사용자 기록으로 분석한 결과다. 요인이 지표에
좋게 작용하는지 나쁘게 작용하는지는 **변화량의 부호로만 알 수 있다.** 지표값은 높을수록 증상이
심한 것이라, 변화량이 양수면 요인이 증상을 악화시켰다는 뜻이고 음수면 완화시켰다는 뜻이다.

- 2~3문장, 100자 내외로 짧게 써라.
- 존댓말을 쓰되 단정적인 의학적 진단이나 치료 표현은 쓰지 마라.
- 주어진 근거(요인·지표·시차·변화량) 밖의 수치를 새로 지어내지 마라.
- **성분에 대한 일반 지식으로 좋고 나쁨을 추정하지 마라.** 변화량이 주어지지 않았다면 그 요인이
  지표를 개선하는지 악화시키는지 알 수 없는 상태다. 그럴 때 "개선에 도움이 된다"거나 "써 보라"고
  권하지 마라 — 아직 판정되지 않은 방향을 단정하는 것이다.
- confidence가 OBSERVING이면 패턴이 아직 확정되지 않은 상태다. 단정하지 말고, 기록을 더 쌓아
  패턴을 확인하도록 관찰을 권하는 어조로 써라.
- 반드시 아래 JSON 형식으로만 답해라. 다른 텍스트를 덧붙이지 마라.
{"tip": "..."}
"""


class InsightTipUnavailableError(Exception):
    """OpenAI 호출 실패/타임아웃/비신뢰 응답. 호출부가 폴백(팁 없음)을 결정한다."""


@lru_cache(maxsize=1)
def _client() -> OpenAI:
    settings = get_settings()
    return OpenAI(
        api_key=settings.api_key,
        base_url=settings.base_url,
        timeout=settings.timeout_seconds,
    )


def _build_user_prompt(request: InsightTipRequest) -> str:
    """근거를 관계로 서술한다.

    요인·지표를 단어로만 나열하면 모델이 성분 일반 지식으로 좋고 나쁨을 채워 넣는다(실측:
    변화량 없는 OBSERVING 인사이트에서 "개선에 도움이 된다"는 근거 없는 방향 단정이 반복됐다).
    분석이 무엇을 보고 있는지와, 방향을 말할 수 있는지를 문장으로 명시한다.
    """
    lines = [
        "[인사이트]",
        f"- 분석 대상: '{request.title}'이(가) {request.metric} 지표에 영향을 주는지 관찰 중",
        f"- 신뢰도: {request.confidence}",
    ]
    if request.summary:
        lines.append(f"- 분석 요약: {request.summary}")
    if request.lag_days is not None:
        lines.append(f"- 시차: {request.lag_days}일")

    if request.average_delta is not None:
        direction = "악화" if request.average_delta > 0 else "완화"
        lines.append(
            f"- 평균 변화량: {request.average_delta:+.1f} → '{request.title}' 이후 "
            f"{request.metric}이(가) {direction}되는 방향"
        )
    else:
        lines.append(
            f"- 평균 변화량: 없음 → '{request.title}'이(가) {request.metric}을(를) 개선하는지 "
            "악화시키는지 **아직 알 수 없다.** 방향을 추정하지 말고 기록을 더 쌓도록 안내해라."
        )
    return "\n".join(lines)


def _parse(content: str) -> str:
    try:
        data = json.loads(content)
        return InsightTipResponse.model_validate(data).tip
    except (json.JSONDecodeError, ValidationError) as e:
        raise InsightTipUnavailableError(f"OpenAI 응답 파싱 실패: {content!r}") from e


def generate(request: InsightTipRequest) -> str:
    """인사이트 한 건에 대한 관리 팁을 생성한다.

    :raises InsightTipUnavailableError: 키 미설정·호출 실패·타임아웃·비신뢰 응답인 경우
    """
    settings = get_settings()
    if not settings.api_key:
        raise InsightTipUnavailableError("OPENAI_API_KEY가 설정되지 않았습니다.")

    try:
        response = _client().chat.completions.create(
            model=settings.model,
            temperature=0.7,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(request)},
            ],
        )
    except (
        openai.APITimeoutError,
        openai.APIConnectionError,
        openai.APIStatusError,
        openai.RateLimitError,
    ) as e:
        raise InsightTipUnavailableError(f"OpenAI 호출 실패: {e}") from e

    content = response.choices[0].message.content if response.choices else None
    if not content:
        raise InsightTipUnavailableError(f"OpenAI 응답에 content가 없습니다: {response!r}")

    tip = _parse(content)
    log.info("인사이트 관리 팁 생성 완료: title=%s", request.title)
    return tip
