"""조명·화질 정규화 검증 (Phase 3)."""

from __future__ import annotations

import cv2
import numpy as np
import pytest

from app import face_regions, landmarks, preprocess
from app.errors import ImageQualityError
from tests.conftest import draw_face


def skin_of(image: np.ndarray) -> np.ndarray:
    points = landmarks.detect(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    return face_regions.skin_mask(points, image.shape[:2])


@pytest.fixture(scope="module")
def face() -> np.ndarray:
    return draw_face()


@pytest.fixture(scope="module")
def face_mask(face: np.ndarray) -> np.ndarray:
    return skin_of(face)


def test_accepts_normal_image(face, face_mask) -> None:
    preprocess.check_quality(face, face_mask)


def test_rejects_blurry_image() -> None:
    blurred = draw_face(blur=11)

    with pytest.raises(ImageQualityError, match="흐릿"):
        preprocess.check_quality(blurred, skin_of(blurred))


def test_rejects_overexposed_image() -> None:
    bright = draw_face(brightness=60)

    with pytest.raises(ImageQualityError, match="빛이 너무 강합니다"):
        preprocess.check_quality(bright, skin_of(bright))


def test_rejects_too_small_face(face) -> None:
    tiny_mask = np.zeros(face.shape[:2], np.uint8)
    tiny_mask[:10, :10] = 255

    with pytest.raises(ImageQualityError, match="작게"):
        preprocess.check_quality(face, tiny_mask)


def cheek_redness(image: np.ndarray) -> float:
    """볼의 a*(붉은기) 평균. 홍조 지표가 실제로 읽는 값이다."""
    points = landmarks.detect(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    masks = face_regions.region_masks(points, image.shape[:2])
    a_channel = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)[:, :, 1] - 128.0
    return float(a_channel[masks["cheeks"] > 0].mean())


def with_warm_light(image: np.ndarray) -> np.ndarray:
    """백열등처럼 붉은 조명이 장면 전체를 비추는 상황을 흉내낸다."""
    return np.clip(
        image.astype(np.float32) * np.array([0.80, 0.95, 1.20]), 0, 255
    ).astype(np.uint8)


def test_white_balance_removes_illuminant_cast(face) -> None:
    """조명 색온도가 바뀌어도 같은 얼굴의 붉은기는 비슷하게 남아야 한다."""
    neutral = cheek_redness(preprocess.white_balance(face))
    warm = cheek_redness(preprocess.white_balance(with_warm_light(face)))

    assert abs(neutral - warm) <= 2.0


def test_white_balance_preserves_skin_tone_difference() -> None:
    """보정이 피부색 차이까지 지우면 홍조 지표가 아무것도 구분하지 못한다.

    피부 픽셀 기준 Gray World를 쓰던 초기 구현이 정확히 이 문제를 일으켰다 — 붉은 피부와
    창백한 피부의 a*가 둘 다 0으로 붙었다. 조명을 장면 전체에서 추정하도록 바꿔 해결했다.
    """
    red = cheek_redness(preprocess.white_balance(draw_face(skin_bgr=(150, 190, 250))))
    normal = cheek_redness(preprocess.white_balance(draw_face()))
    pale = cheek_redness(preprocess.white_balance(draw_face(skin_bgr=(200, 210, 225))))

    assert red > normal > pale


def test_luminance_normalization_preserves_shape(face) -> None:
    result = preprocess.normalize_luminance(face)

    assert result.shape == face.shape
    assert result.dtype == np.uint8


def test_prepare_does_not_distort_brightness() -> None:
    """`prepare()`는 색온도만 보정하고 밝기는 건드리지 않아야 한다.

    이전 버전은 "밝기 격차가 줄어든다"를 기대했는데, 이는 애초에 성립하지 않는 전제였다.
    `prepare()`는 명도(L) 정규화(CLAHE)를 의도적으로 뺀다 — 색소·모공 신호를 지우기 때문이다
    (Phase 4 결정, `normalize_luminance`의 docstring 참고). Shades of Gray 화이트밸런스는
    채널별 이득만 조정하고 밝기 자체를 평탄화하지 않으므로, 밝기 격차는 보정 전후로 거의
    그대로여야 한다(실측: 40.048 → 40.051, 변화폭 0.1 미만).
    """
    normal = draw_face()
    dark = draw_face(brightness=-40)

    normal_out = preprocess.prepare(normal, skin_of(normal))
    dark_out = preprocess.prepare(dark, skin_of(dark))

    def skin_mean(image: np.ndarray) -> float:
        mask = skin_of(image)
        return float(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)[mask > 0].mean())

    gap_before = abs(skin_mean(normal) - skin_mean(dark))
    gap_after = abs(skin_mean(normal_out) - skin_mean(dark_out))

    assert abs(gap_after - gap_before) < 1.0
