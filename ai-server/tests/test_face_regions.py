"""얼굴 검출과 피부 영역 마스킹 검증 (Phase 2)."""

from __future__ import annotations

import cv2
import numpy as np
import pytest

from app import face_regions, landmarks
from app.errors import FaceNotDetectedError


@pytest.fixture(scope="module")
def points(face_image: np.ndarray) -> np.ndarray:
    return landmarks.detect(cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB))


def test_detects_face(points: np.ndarray) -> None:
    assert points.shape[1] == 2
    assert len(points) >= 468


def test_raises_when_no_face() -> None:
    blank = np.full((480, 480, 3), 200, np.uint8)
    with pytest.raises(FaceNotDetectedError):
        landmarks.detect(blank)


def test_skin_mask_is_binary_and_nonempty(face_image, points) -> None:
    mask = face_regions.skin_mask(points, face_image.shape[:2])

    assert set(np.unique(mask)).issubset({0, 255})
    assert (mask > 0).sum() > 0


def test_skin_mask_excludes_eyes_and_lips(face_image, points) -> None:
    """눈·입술 중심이 마스크에서 빠져야 한다. 남으면 어두운 픽셀이 지표를 오염시킨다."""
    mask = face_regions.skin_mask(points, face_image.shape[:2])

    for indices in (face_regions.LEFT_EYE, face_regions.RIGHT_EYE, face_regions.LIPS):
        center = points[indices].mean(axis=0).astype(int)
        assert mask[center[1], center[0]] == 0


def test_skin_mask_includes_cheeks(face_image, points) -> None:
    mask = face_regions.skin_mask(points, face_image.shape[:2])
    cheek = points[face_regions.FACE_OVAL].mean(axis=0).astype(int)

    assert mask[cheek[1], cheek[0]] == 255


def test_region_masks_are_subsets_of_skin(face_image, points) -> None:
    """부위 마스크는 모두 피부 마스크 안에 있어야 한다 — 눈이나 배경을 물면 안 된다."""
    masks = face_regions.region_masks(points, face_image.shape[:2])
    skin = masks["skin"]

    for name in ("cheeks", "forehead", "nose", "tzone"):
        outside = cv2.bitwise_and(masks[name], cv2.bitwise_not(skin))
        assert (outside > 0).sum() == 0, f"{name} 마스크가 피부 영역을 벗어났다"
        assert (masks[name] > 0).sum() > 0, f"{name} 마스크가 비어 있다"


def test_face_scale_grows_with_image_size() -> None:
    """얼굴 크기 기준값이 실제 얼굴 크기에 비례해야 스케일 정규화가 성립한다."""
    from tests.conftest import draw_face

    small = draw_face(size=384)
    large = draw_face(size=768)

    small_scale = face_regions.face_scale(
        landmarks.detect(cv2.cvtColor(small, cv2.COLOR_BGR2RGB))
    )
    large_scale = face_regions.face_scale(
        landmarks.detect(cv2.cvtColor(large, cv2.COLOR_BGR2RGB))
    )

    assert large_scale > small_scale * 1.5
