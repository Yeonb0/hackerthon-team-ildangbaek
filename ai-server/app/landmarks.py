"""MediaPipe Face Landmarker 래퍼.

모델(`face_landmarker.task`)은 저장소에 넣지 않고 설치 시 내려받는다(3.7MB). 바이너리를 git에
넣지 않기 위함이며, 경로는 `LANDMARKER_MODEL_PATH`로 바꿀 수 있다.

Landmarker 인스턴스는 생성 비용이 커서 프로세스당 하나만 만들어 재사용한다. MediaPipe의
IMAGE 모드 인스턴스는 스레드 안전이 보장되지 않아 락으로 감싼다 — FastAPI가 동기 핸들러를
스레드풀에서 돌리므로 동시 호출이 실제로 일어난다.
"""

from __future__ import annotations

import logging
import os
import threading
from functools import lru_cache

import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

from app.errors import AnalysisFailedError, FaceNotDetectedError

log = logging.getLogger(__name__)

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "models",
    "face_landmarker.task",
)

_lock = threading.Lock()


@lru_cache(maxsize=1)
def _landmarker() -> vision.FaceLandmarker:
    model_path = os.environ.get("LANDMARKER_MODEL_PATH", DEFAULT_MODEL_PATH)
    if not os.path.exists(model_path):
        raise AnalysisFailedError(
            f"얼굴 랜드마크 모델이 없습니다: {model_path}. "
            "ai-server/README.md의 모델 내려받기 절차를 확인하세요."
        )
    options = vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=model_path),
        running_mode=vision.RunningMode.IMAGE,
        num_faces=1,
    )
    log.info("FaceLandmarker 로딩: %s", model_path)
    return vision.FaceLandmarker.create_from_options(options)


def detect(image_rgb: np.ndarray) -> np.ndarray:
    """얼굴 랜드마크를 픽셀 좌표 배열로 반환한다.

    :param image_rgb: RGB 순서의 HxWx3 uint8 배열
    :return: (N, 2) float32 배열. 각 행은 (x, y) 픽셀 좌표
    :raises FaceNotDetectedError: 얼굴을 찾지 못한 경우
    """
    height, width = image_rgb.shape[:2]
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(image_rgb))

    with _lock:
        result = _landmarker().detect(mp_image)

    if not result.face_landmarks:
        raise FaceNotDetectedError()

    landmarks = result.face_landmarks[0]
    points = np.array([[lm.x * width, lm.y * height] for lm in landmarks], dtype=np.float32)
    log.debug("랜드마크 %d개 검출", len(points))
    return points
