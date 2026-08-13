"""피부 분석 파이프라인.

    이미지 디코딩 → 얼굴 검출 → 피부 영역 분리 → 정규화 → 지표 산출
"""

from __future__ import annotations

import logging

import cv2
import numpy as np

from app import face_regions, landmarks, metrics, preprocess
from app.errors import AnalysisFailedError
from app.schema import AnalysisResult

log = logging.getLogger(__name__)

# 분석 해상도. 모공·트러블 검출은 픽셀 스케일에 민감해서 얼굴 크기를 항상 같게 맞춘다.
# 원본 해상도를 그대로 쓰면 같은 피부라도 촬영 거리에 따라 점수가 달라진다.
TARGET_FACE_SCALE = 320.0


def _decode(image_bytes: bytes) -> np.ndarray:
    if not image_bytes:
        raise AnalysisFailedError("빈 이미지입니다.")
    buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise AnalysisFailedError("이미지를 디코딩할 수 없습니다.")
    return image


def _normalize_scale(image_bgr: np.ndarray, points: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """얼굴 크기가 항상 같아지도록 이미지와 랜드마크를 함께 확대/축소한다."""
    scale = face_regions.face_scale(points)
    if scale <= 0:
        raise AnalysisFailedError("얼굴 크기를 계산할 수 없습니다.")

    ratio = TARGET_FACE_SCALE / scale
    if abs(ratio - 1.0) < 0.02:
        return image_bgr, points

    height, width = image_bgr.shape[:2]
    size = (max(int(round(width * ratio)), 1), max(int(round(height * ratio)), 1))
    interpolation = cv2.INTER_AREA if ratio < 1 else cv2.INTER_CUBIC
    return cv2.resize(image_bgr, size, interpolation=interpolation), points * ratio


def analyze(image_bytes: bytes) -> AnalysisResult:
    """이미지 바이트를 받아 지표 4종 점수와 모공 지표 신뢰도를 산출한다.

    :raises AnalysisError: 얼굴 미검출 · 품질 미달 · 분석 실패
    """
    image_bgr = _decode(image_bytes)
    points = landmarks.detect(cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB))
    image_bgr, points = _normalize_scale(image_bgr, points)

    masks = face_regions.region_masks(points, image_bgr.shape[:2])
    if int((masks["skin"] > 0).sum()) == 0:
        raise AnalysisFailedError("피부 영역을 찾지 못했습니다.")

    prepared = preprocess.prepare(image_bgr, masks["skin"])
    return metrics.compute(prepared, masks)
