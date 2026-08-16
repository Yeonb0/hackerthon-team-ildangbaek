"""OpenAI를 이용한 제품 추천 코멘트 배치 생성.

`vision.py`와 같은 패턴(OpenAI 클라이언트 재사용, 실패 시 예외로 위임)을 따른다. 제품
추천 자체는 Spring의 규칙 기반 매칭이 이미 끝낸 상태이고, 여기서는 그 매칭 근거를
자연스러운 한 줄 코멘트로 다듬기만 한다 — 추천 여부 판단에는 관여하지 않는다.

제품 수만큼 개별 호출하면 지연·비용이 N배가 되므로, 요청에 담긴 제품 전체를 한 번의
OpenAI 호출로 묶어 보낸다(배치 프롬프트).
"""

from __future__ import annotations

import json
import logging
from functools import lru_cache

import openai
from openai import OpenAI
from pydantic import ValidationError

from app.config import get_settings
from app.schema import ProductComment, ProductCommentBatchResponse, ProductCommentRequest

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """너는 스킨케어 제품 추천 문구를 쓰는 카피라이터다. 각 제품마다 왜
추천되었는지(매칭된 성분, 카테고리)를 참고해 자연스러운 한 줄 코멘트를 한국어로 작성해라.

- 한 문장, 20~40자 내외로 짧게 써라.
- 존댓말을 쓰되 광고 문구처럼 과장하지 마라.
- 매칭된 성분이 있으면 자연스럽게 언급해라.
- 반드시 아래 JSON 형식으로만 답해라. 다른 텍스트를 덧붙이지 마라.
{"comments": [{"product_id": 0, "comment": "..."}]}
"""


class ProductCommentUnavailableError(Exception):
    """OpenAI 호출 실패/타임아웃/비신뢰 응답. 호출부가 폴백(코멘트 없음)을 결정한다."""


@lru_cache(maxsize=1)
def _client() -> OpenAI:
    settings = get_settings()
    return OpenAI(
        api_key=settings.api_key,
        base_url=settings.base_url,
        timeout=settings.timeout_seconds,
    )


def _build_user_prompt(products: list[ProductCommentRequest]) -> str:
    lines = ["[추천 제품 목록]"]
    for p in products:
        ingredients = ", ".join(p.matched_ingredients) if p.matched_ingredients else "-"
        lines.append(
            f"- product_id={p.product_id}, name={p.name}, brand={p.brand}, "
            f"matched_ingredients=[{ingredients}], category={p.category}"
        )
    return "\n".join(lines)


def _parse(content: str) -> list[ProductComment]:
    try:
        data = json.loads(content)
        return ProductCommentBatchResponse.model_validate(data).comments
    except (json.JSONDecodeError, ValidationError) as e:
        raise ProductCommentUnavailableError(f"OpenAI 응답 파싱 실패: {content!r}") from e


def generate(products: list[ProductCommentRequest]) -> list[ProductComment]:
    """제품 목록 전체를 한 번의 OpenAI 호출로 보내 제품별 코멘트를 받는다.

    :raises ProductCommentUnavailableError: 키 미설정·호출 실패·타임아웃·비신뢰 응답인 경우
    """
    settings = get_settings()
    if not settings.api_key:
        raise ProductCommentUnavailableError("OPENAI_API_KEY가 설정되지 않았습니다.")

    try:
        response = _client().chat.completions.create(
            model=settings.model,
            temperature=0.7,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(products)},
            ],
        )
    except (
        openai.APITimeoutError,
        openai.APIConnectionError,
        openai.APIStatusError,
        openai.RateLimitError,
    ) as e:
        raise ProductCommentUnavailableError(f"OpenAI 호출 실패: {e}") from e

    content = response.choices[0].message.content if response.choices else None
    if not content:
        raise ProductCommentUnavailableError(f"OpenAI 응답에 content가 없습니다: {response!r}")

    comments = _parse(content)
    log.info("제품 코멘트 생성 완료: %d건", len(comments))
    return comments
