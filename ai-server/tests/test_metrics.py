"""지표 산출 검증 (Phase 4).

절대 점수가 맞는지는 검증할 수 없다 — 정답 데이터가 없기 때문이다. 대신 **방향성**을 고정한다.
"트러블이 늘면 TROUBLE 점수가 내려간다"가 성립하지 않으면 이 지표는 쓸모가 없다.
"""

from __future__ import annotations

import numpy as np
import pytest

from app import metrics, pipeline
from tests.conftest import draw_face, draw_localized_flush, encode_jpeg


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


def test_trouble_detects_small_blemishes(clean: dict[str, int]) -> None:
    """작은 여드름(반지름 2px급)도 놓치지 않아야 한다.

    처음에는 백분위 99(p99)를 썼는데, radius=2 반점은 피부 전체 픽셀의 0.2%도 안 돼서
    상위 1% 컷오프 안에 들어오지 못하고 완전히 사라졌다(clean과 동일하게 0으로 측정).
    p99.9로 바꿔 해결했다 — 이 테스트가 그 회귀를 고정한다.
    """
    small_blemish = scores_of(draw_face(blemishes=6, blemish_radius=2))

    assert clean["TROUBLE"] - small_blemish["TROUBLE"] >= 50


def test_trouble_drops_when_blemishes_present(clean: dict[str, int]) -> None:
    """트러블 유무는 확실히 갈려야 하지만, 개수별 세밀한 순위는 이 신호로 보장하지 않는다.

    TROUBLE은 p99.9(상위 0.1% 픽셀)를 쓴다 — 반점 1개짜리 극값도 놓치지 않으려고 택한 값이라
    (`app/metrics.py`의 `_trouble` 참고), 반점이 늘어도 이미 가장 튀는 지점의 값은 크게
    안 변한다. 실측(JPEG 경유, 반점 1~14개)에서 점수가 1760~1955 사이를 순서 없이 오갔다 —
    "6개가 14개보다 나쁘다" 같은 세밀한 순위는 설계상 보장 대상이 아니다.
    """
    for count in (1, 6, 14):
        blemished = scores_of(draw_face(blemishes=count))
        assert clean["TROUBLE"] - blemished["TROUBLE"] >= 50, f"blemishes={count}"


def test_redness_drops_on_red_skin(clean: dict[str, int]) -> None:
    red = scores_of(draw_face(skin_bgr=(150, 190, 250)))
    pale = scores_of(draw_face(skin_bgr=(200, 210, 225)))

    assert red["REDNESS"] < clean["REDNESS"] <= pale["REDNESS"]


def test_redness_detects_localized_flush(clean: dict[str, int]) -> None:
    """볼 일부에만 몰린 홍조도 잡아야 한다.

    평균(mean)을 쓰던 초기 구현이 정확히 이걸 놓쳤다 — 실제 붉기가 a*=32(정상의 6배)인 국소
    홍조가 평균으로는 9.4까지 희석돼 56점(양호)으로 나왔다. 백분위 85로 바꿔 해결했으며,
    이 테스트가 그 회귀를 고정한다.
    """
    flushed = scores_of(draw_localized_flush(radius=15))

    assert clean["REDNESS"] - flushed["REDNESS"] >= 50


def test_redness_worsens_as_flush_spreads(clean: dict[str, int]) -> None:
    """홍조 범위가 넓어질수록 점수가 낮아져야 한다."""
    small = scores_of(draw_localized_flush(radius=15))
    large = scores_of(draw_localized_flush(radius=35))

    assert clean["REDNESS"] > small["REDNESS"] >= large["REDNESS"]


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
