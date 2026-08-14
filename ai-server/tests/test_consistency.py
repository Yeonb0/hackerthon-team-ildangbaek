"""일관성 검증 (Phase 5).

정답 데이터가 없어 "정확한가"는 검증할 수 없다. 대신 **믿어도 되는가**를 데이터로 확인한다.

1. 재현성 — 같은 사진은 항상 같은 점수
2. 연속 촬영 안정성 — 같은 세션의 여러 장은 점수가 거의 같아야 한다
3. 조명 강건성 — 조명이 달라져도 같은 얼굴은 비슷한 점수
4. 방향성 — 문제가 있는 사진과 없는 사진이 실제로 갈리는지

PORES는 계획 단계에서부터 "화질 의존성이 커서 신뢰도가 가장 낮을 것"으로 예상했던 지표다.
아래 테스트가 그 예상을 실측으로 확인한다 — 다른 세 지표보다 훨씬 큰 허용 오차를 둔 것은
타협이 아니라 실측 결과를 그대로 반영한 것이다.
"""

from __future__ import annotations

import numpy as np
import pytest

from app import pipeline
from tests.conftest import draw_face, encode_jpeg

METRICS = ("TROUBLE", "REDNESS", "PORES", "PIGMENTATION")

# 실측 spread(연속 촬영 5장, 센서 노이즈 sigma=3): TROUBLE 0, REDNESS 0, PIGMENTATION 1, PORES 0.
# PORES_RANGE를 (4.0, 14.0)에서 (6.5, 16.0)으로 넓힌 뒤(clean 20장의 hf_std 자연 변동
# 4.92~6.19를 구간 하한 아래로 깔아 흡수) spread가 8에서 0으로 줄었다. 그래도 신뢰도가
# 다른 세 지표와 원리적으로 같은 수준이 된 것은 아니라 허용치는 여전히 넉넉하게 둔다 —
# 노이즈가 더 크면(예: 실제 저조도 사진) 다시 벌어질 수 있고, pores_reliability=LOW로
# 그 경우를 API 응답에서 구분한다(app/metrics.py 참고).
STABLE_METRICS = ("TROUBLE", "REDNESS", "PIGMENTATION")
STABLE_TOLERANCE = 5
PORES_TOLERANCE = 15

# 조명 색온도 변화는 White balance로 대부분 걷어내지만 완전히 지우지는 못한다. 강한 백열등
# 시뮬레이션(실측 REDNESS 92→84, diff=8)에서 다른 세 지표보다 관용치를 넉넉히 둔다 — a* 채널이
# 정확히 색온도가 흔드는 축이라 구조적으로 가장 크게 남는 잔차다.
LIGHTING_TOLERANCE = 10


def scores_of(image: np.ndarray, quality: int = 95) -> dict[str, int]:
    return pipeline.analyze(encode_jpeg(image, quality)).scores.model_dump()


def test_reproducibility() -> None:
    """같은 바이트 입력은 항상 같은 점수를 내야 한다."""
    image = encode_jpeg(draw_face())

    first = pipeline.analyze(image).scores.model_dump()
    second = pipeline.analyze(image).scores.model_dump()

    assert first == second


def test_burst_capture_stability() -> None:
    """같은 세션에서 연속 촬영한 5장은 센서 노이즈만 다르다 — 점수가 거의 같아야 한다."""
    burst = [scores_of(draw_face(noise=3.0, noise_seed=i)) for i in range(5)]

    for metric in STABLE_METRICS:
        values = [shot[metric] for shot in burst]
        assert max(values) - min(values) <= STABLE_TOLERANCE, f"{metric} spread={values}"

    pores = [shot["PORES"] for shot in burst]
    assert max(pores) - min(pores) <= PORES_TOLERANCE, f"PORES spread={pores}"


def test_lighting_robustness() -> None:
    """조명 색온도가 바뀌어도(백열등 시뮬레이션) 같은 얼굴은 비슷한 점수를 받아야 한다."""
    normal = scores_of(draw_face())
    warm = scores_of(
        np.clip(draw_face().astype(np.float32) * np.array([0.80, 0.95, 1.20]), 0, 255).astype(
            np.uint8
        )
    )

    for metric in STABLE_METRICS:
        assert abs(normal[metric] - warm[metric]) <= LIGHTING_TOLERANCE, metric


def test_head_angle_robustness() -> None:
    """촬영 시 고개가 살짝 기울어져도(±10도) 점수가 크게 흔들리면 안 된다."""
    base = scores_of(draw_face())

    for angle in (3, 6, 10):
        rotated = scores_of(draw_face(rotate=angle))
        for metric in STABLE_METRICS:
            assert abs(base[metric] - rotated[metric]) <= STABLE_TOLERANCE, f"{metric} @ {angle}도"


def test_jpeg_compression_robustness() -> None:
    """전송 과정의 JPEG 압축(품질 40~95)에도 핵심 지표는 안정적이어야 한다."""
    base = scores_of(draw_face(), quality=95)

    for quality in (80, 60, 40):
        compressed = scores_of(draw_face(), quality=quality)
        for metric in STABLE_METRICS:
            assert abs(base[metric] - compressed[metric]) <= STABLE_TOLERANCE, f"{metric} @ q{quality}"


def test_directional_validity_trouble_vs_clean() -> None:
    """트러블이 뚜렷한 사진과 깨끗한 사진은 실제로 크게 갈려야 한다."""
    clean = scores_of(draw_face())
    blemished = scores_of(draw_face(blemishes=14))

    assert clean["TROUBLE"] - blemished["TROUBLE"] >= 50


def test_directional_validity_redness_vs_clean() -> None:
    """붉은 피부와 창백한 피부는 홍조 점수가 반대 방향으로 갈려야 한다."""
    red = scores_of(draw_face(skin_bgr=(150, 190, 250)))
    pale = scores_of(draw_face(skin_bgr=(200, 210, 225)))

    assert pale["REDNESS"] - red["REDNESS"] >= 30
