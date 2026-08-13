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


def test_white_balance_neutralizes_color_cast(face_mask) -> None:
    """붉은 조명이 섞인 사진의 피부 평균이 중립에 가까워져야 한다."""
    warm = draw_face(skin_bgr=(150, 190, 250))
    mask = skin_of(warm)

    before = warm[mask > 0].astype(np.float32).mean(axis=0)
    corrected = preprocess.white_balance(warm, mask)
    after = corrected[mask > 0].astype(np.float32).mean(axis=0)

    assert after.std() < before.std()


def test_white_balance_is_stable_on_neutral_image(face, face_mask) -> None:
    """이미 중립인 사진은 크게 바꾸지 않아야 한다."""
    corrected = preprocess.white_balance(face, face_mask)

    before = face[face_mask > 0].astype(np.float32).mean(axis=0)
    after = corrected[face_mask > 0].astype(np.float32).mean(axis=0)

    assert np.abs(after - before).max() < 40


def test_luminance_normalization_preserves_shape(face) -> None:
    result = preprocess.normalize_luminance(face)

    assert result.shape == face.shape
    assert result.dtype == np.uint8


def test_prepare_reduces_brightness_gap() -> None:
    """같은 얼굴을 밝기만 다르게 찍었을 때, 보정 후 차이가 줄어야 한다."""
    normal = draw_face()
    dark = draw_face(brightness=-40)

    normal_out = preprocess.prepare(normal, skin_of(normal))
    dark_out = preprocess.prepare(dark, skin_of(dark))

    def skin_mean(image: np.ndarray) -> float:
        mask = skin_of(image)
        return float(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)[mask > 0].mean())

    gap_before = abs(skin_mean(normal) - skin_mean(dark))
    gap_after = abs(skin_mean(normal_out) - skin_mean(dark_out))

    assert gap_after < gap_before
