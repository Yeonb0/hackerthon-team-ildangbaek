"""지표 산출 검증 (Phase 4).

절대 점수가 맞는지는 검증할 수 없다 — 정답 데이터가 없기 때문이다. 대신 **방향성**을 고정한다.
"트러블이 늘면 TROUBLE 점수가 내려간다"가 성립하지 않으면 이 지표는 쓸모가 없다.
"""

from __future__ import annotations

import numpy as np
import pytest

from app import metrics, pipeline
from tests.conftest import draw_face, encode_jpeg


def scores_of(image: np.ndarray) -> dict[str, int]:
    return pipeline.analyze(encode_jpeg(image)).scores.model_dump()


@pytest.fixture(scope="module")
def clean() -> dict[str, int]:
    return scores_of(draw_face())


def test_all_metrics_in_range(clean: dict[str, int]) -> None:
    assert set(clean) == {"TROUBLE", "REDNESS", "PORES", "PIGMENTATION"}
    assert all(0 <= value <= 100 for value in clean.values())


def test_clean_face_scores_well(clean: dict[str, int]) -> None:
    """문제 없는 얼굴이 낮은 점수를 받으면 구간값이 잘못 잡힌 것이다."""
    for metric, value in clean.items():
        assert value >= 70, f"{metric}이 깨끗한 얼굴에서 {value}점"


def test_trouble_drops_as_blemishes_increase(clean: dict[str, int]) -> None:
    few = scores_of(draw_face(blemishes=6))
    many = scores_of(draw_face(blemishes=14))

    assert clean["TROUBLE"] > few["TROUBLE"] > many["TROUBLE"]


def test_redness_drops_on_red_skin(clean: dict[str, int]) -> None:
    red = scores_of(draw_face(skin_bgr=(150, 190, 250)))
    pale = scores_of(draw_face(skin_bgr=(200, 210, 225)))

    assert red["REDNESS"] < clean["REDNESS"] <= pale["REDNESS"]


def test_redness_is_not_confused_by_blemishes(clean: dict[str, int]) -> None:
    """트러블이 늘어도 홍조 점수가 트러블만큼 급락하면 두 지표가 분리되지 않은 것이다."""
    blemished = scores_of(draw_face(blemishes=14))

    trouble_drop = clean["TROUBLE"] - blemished["TROUBLE"]
    redness_drop = clean["REDNESS"] - blemished["REDNESS"]

    assert trouble_drop > redness_drop


def test_pigmentation_drops_with_dark_spots(clean: dict[str, int]) -> None:
    spotted = scores_of(draw_face(blemishes=14))

    assert spotted["PIGMENTATION"] < clean["PIGMENTATION"]


def test_scores_are_stable_across_capture_distance() -> None:
    """촬영 거리가 달라도 색 기반 지표는 흔들리지 않아야 한다."""
    near = scores_of(draw_face(size=768))
    far = scores_of(draw_face(size=384))

    for metric in ("REDNESS", "TROUBLE", "PIGMENTATION"):
        assert abs(near[metric] - far[metric]) <= 10, f"{metric}이 촬영 거리에 흔들린다"


def test_scores_are_stable_under_warm_light(clean: dict[str, int]) -> None:
    """조명 색온도가 바뀌어도 같은 얼굴은 비슷한 점수를 받아야 한다."""
    warm = np.clip(
        draw_face().astype(np.float32) * np.array([0.80, 0.95, 1.20]), 0, 255
    ).astype(np.uint8)

    warm_scores = scores_of(warm)

    for metric in ("REDNESS", "TROUBLE", "PIGMENTATION"):
        assert abs(clean[metric] - warm_scores[metric]) <= 15, f"{metric}이 조명에 흔들린다"


def test_to_score_maps_endpoints() -> None:
    assert metrics._to_score(4.0, 4.0, 16.0) == 100
    assert metrics._to_score(16.0, 4.0, 16.0) == 0
    assert metrics._to_score(10.0, 4.0, 16.0) == 50


def test_to_score_clamps_beyond_range() -> None:
    assert metrics._to_score(-5.0, 4.0, 16.0) == 100
    assert metrics._to_score(99.0, 4.0, 16.0) == 0


def test_to_score_rejects_inverted_range() -> None:
    with pytest.raises(ValueError):
        metrics._to_score(5.0, 16.0, 4.0)


def test_pores_reliability_is_low_within_noise_floor(clean: dict[str, int]) -> None:
    """정상 촬영 잡음만으로도 나올 수 있는 측정값 구간에서는 LOW를 반환해야 한다.

    실측(clean 20장, 센서 노이즈만 다름)에서 hf_std가 4.92~6.19로 자연 변동했다 — 이 구간의
    점수는 "모공이 실제로 좋다"가 아니라 "노이즈와 구분이 안 된다"는 뜻이다.
    """
    result = pipeline.analyze(encode_jpeg(draw_face()))

    assert result.pores_reliability == "LOW"


def test_pores_reliability_is_normal_for_clear_texture_signal() -> None:
    """트러블처럼 뚜렷한 텍스처 신호가 있으면 NORMAL로 올라가야 한다."""
    result = pipeline.analyze(encode_jpeg(draw_face(blemishes=14)))

    assert result.pores_reliability == "NORMAL"
