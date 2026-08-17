"""OpenAI Vision을 이용한 2차 점수 확정.

`metrics.compute()`가 낸 CIELAB 규칙 기반 점수를 "1차 점수"로 삼아 OpenAI Vision에 근거로
제공하고, 최종 점수는 OpenAI 판단을 클램핑 없이 그대로 신뢰한다(ADR 0022). 1차 점수와
동떨어진 값이 나와도 보정하지 않는다 — 이는 의도된 설계다.

OpenAI 호출이 실패·타임아웃·비신뢰 응답이면 `VisionUnavailableError`를 던진다. 이 예외는
`AnalysisError`를 상속하지 않는다 — 사용자가 재촬영해야 할 사유(얼굴 미검출, 품질 미달)와
달리, OpenAI 실패는 서비스 내부 사정이라 `pipeline.py`가 잡아 1차 점수로 조용히 폴백한다.
"""

from __future__ import annotations

import base64
import json
import logging
from functools import lru_cache

import cv2
import numpy as np
import openai
from openai import OpenAI
from pydantic import ValidationError

from app.config import get_settings
from app.schema import AnalysisResult, SkinScores

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """너는 피부과 전문의를 보조하는 피부 분석 AI다. 첨부된 얼굴 사진과 아래
1차 분석 결과를 참고해 최종 점수를 확정해라.

1차 분석 결과는 CIELAB 색공간 통계를 쓰는 영상처리 규칙 시스템이 산출한 참고 자료일 뿐이다.
사진을 직접 보고 실제 상태에 맞게 최종 점수를 자유롭게 조정해라. 점수가 높을수록 좋은
상태(트러블/홍조/모공/색소잡티가 적음)를 뜻한다.

- TROUBLE: 트러블(여드름·뾰루지) 상태
- REDNESS: 홍조 상태
- PORES: 모공 상태 (참고: 이 지표는 카메라 노이즈·압축 아티팩트와 구분이 원리적으로
  어려워 1차 점수의 신뢰도가 낮을 수 있다)
- PIGMENTATION: 색소침착·잡티 상태

반드시 아래 JSON 형식으로만 답해라. 다른 텍스트를 덧붙이지 마라.
{"TROUBLE": 0-100, "REDNESS": 0-100, "PORES": 0-100, "PIGMENTATION": 0-100}
"""


class VisionUnavailableError(Exception):
    """OpenAI 호출 실패/타임아웃/비신뢰 응답. pipeline이 폴백 여부를 결정한다."""


@lru_cache(maxsize=1)
def _client() -> OpenAI:
    settings = get_settings()
    return OpenAI(
        api_key=settings.api_key,
        base_url=settings.base_url,
        timeout=settings.timeout_seconds,
    )


def _build_user_prompt(preliminary: AnalysisResult) -> str:
    scores = preliminary.scores
    return (
        "[1차 분석 결과]\n"
        f"- TROUBLE: {scores.TROUBLE}\n"
        f"- REDNESS: {scores.REDNESS}\n"
        f"- PORES: {scores.PORES}\n"
        f"- PIGMENTATION: {scores.PIGMENTATION}\n"
    )


def _encode_image(image_bgr: np.ndarray) -> str:
    ok, buffer = cv2.imencode(".jpg", image_bgr)
    if not ok:
        raise VisionUnavailableError("이미지를 JPEG로 인코딩하지 못했습니다.")
    return base64.b64encode(buffer).decode("ascii")


def _parse(content: str) -> SkinScores:
    try:
        data = json.loads(content)
        return SkinScores.model_validate(data)
    except (json.JSONDecodeError, ValidationError) as e:
        raise VisionUnavailableError(f"OpenAI 응답 파싱 실패: {content!r}") from e


def refine(image_bgr: np.ndarray, preliminary: AnalysisResult) -> AnalysisResult:
    """1차 점수를 근거로 OpenAI Vision에 최종 점수 확정을 요청한다.

    `pores_reliability`는 규칙 기반 판정을 그대로 유지한다 — 이 값은 촬영 조건별 실측
    통계(`metrics._PORES_NOISE_FLOOR`)로 정의된 것이라 OpenAI에 재위임할 근거가 없다.

    `raw`·`algorithm_version`·`normalization_version`도 1차 결과를 그대로 옮긴다. OpenAI는
    수치 측정값을 내지 않고 점수만 판단하므로, 이 필드들은 항상 규칙 기반(CIELAB) 1차 단계의
    값을 가리킨다 — score가 OpenAI로 바뀌어도 raw는 바뀌지 않는다.

    :raises VisionUnavailableError: 키 미설정·호출 실패·타임아웃·비신뢰 응답인 경우
    """
    settings = get_settings()
    if not settings.api_key:
        raise VisionUnavailableError("OPENAI_API_KEY가 설정되지 않았습니다.")

    base64_image = _encode_image(image_bgr)

    try:
        response = _client().chat.completions.create(
            model=settings.model,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": _build_user_prompt(preliminary)},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                        },
                    ],
                },
            ],
        )
    except (
        openai.APITimeoutError,
        openai.APIConnectionError,
        openai.APIStatusError,
        openai.RateLimitError,
    ) as e:
        raise VisionUnavailableError(f"OpenAI 호출 실패: {e}") from e

    content = response.choices[0].message.content if response.choices else None
    if not content:
        raise VisionUnavailableError(f"OpenAI 응답에 content가 없습니다: {response!r}")

    scores = _parse(content)
    result = AnalysisResult(
        scores=scores,
        raw=preliminary.raw,
        pores_reliability=preliminary.pores_reliability,
        algorithm_version=preliminary.algorithm_version,
        normalization_version=preliminary.normalization_version,
    )
    log.info("OpenAI 확정 점수: %s (1차: %s)", result.model_dump(), preliminary.model_dump())
    return result
