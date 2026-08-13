"""랜드마크에서 피부 영역 마스크와 관심영역(ROI)을 만든다.

BiSeNet 같은 별도 세그멘테이션 모델을 쓰지 않는다. 얼굴 윤곽 폴리곤에서 눈·눈썹·입술을
빼는 것만으로 피부 픽셀을 충분히 분리할 수 있고, 200MB급 모델을 추가로 싣지 않아도 되기
때문이다. 머리카락과 배경은 윤곽 폴리곤 밖이라 자동으로 제외된다.

랜드마크 인덱스는 하드코딩하지 않고 MediaPipe가 정의한 연결 정보에서 끌어온다. 직접 적어 두면
라이브러리가 바뀔 때 조용히 어긋난다.
"""

from __future__ import annotations

import cv2
import numpy as np
from mediapipe.tasks.python.vision import FaceLandmarksConnections as _Connections


def _indices(group_name: str) -> list[int]:
    connections = getattr(_Connections, group_name)
    points: set[int] = set()
    for connection in connections:
        points.add(connection.start)
        points.add(connection.end)
    return sorted(points)


FACE_OVAL = _indices("FACE_LANDMARKS_FACE_OVAL")
LEFT_EYE = _indices("FACE_LANDMARKS_LEFT_EYE")
RIGHT_EYE = _indices("FACE_LANDMARKS_RIGHT_EYE")
LEFT_EYEBROW = _indices("FACE_LANDMARKS_LEFT_EYEBROW")
RIGHT_EYEBROW = _indices("FACE_LANDMARKS_RIGHT_EYEBROW")
LIPS = _indices("FACE_LANDMARKS_LIPS")

# 볼·이마 ROI의 중심으로 쓰는 개별 랜드마크.
# MediaPipe Face Mesh 표준 인덱스이며, 연결 그룹으로는 얻을 수 없어 상수로 둔다.
_LEFT_CHEEK_CENTER = 330
_RIGHT_CHEEK_CENTER = 101
_FOREHEAD_CENTER = 151
_NOSE_TIP = 4
_CHIN = 152


def _polygon_mask(shape: tuple[int, int], points: np.ndarray) -> np.ndarray:
    mask = np.zeros(shape, dtype=np.uint8)
    cv2.fillConvexPoly(mask, cv2.convexHull(points.astype(np.int32)), 255)
    return mask


def skin_mask(landmarks: np.ndarray, shape: tuple[int, int]) -> np.ndarray:
    """얼굴에서 피부 픽셀만 남긴 이진 마스크(0 또는 255)를 만든다.

    눈·눈썹·입술은 팽창(dilate)해서 넉넉히 제외한다. 경계에 딱 맞춰 빼면 속눈썹이나 입술 외곽의
    어두운 픽셀이 남아 트러블·색소 지표를 오염시킨다.
    """
    mask = _polygon_mask(shape, landmarks[FACE_OVAL])

    exclusions = [LEFT_EYE, RIGHT_EYE, LEFT_EYEBROW, RIGHT_EYEBROW, LIPS]
    kernel = np.ones((9, 9), np.uint8)
    for indices in exclusions:
        part = _polygon_mask(shape, landmarks[indices])
        mask = cv2.bitwise_and(mask, cv2.bitwise_not(cv2.dilate(part, kernel)))

    # 윤곽 경계의 배경 픽셀을 물지 않도록 안쪽으로 한 겹 줄인다.
    return cv2.erode(mask, np.ones((5, 5), np.uint8))


def _disc_mask(shape: tuple[int, int], center: np.ndarray, radius: float) -> np.ndarray:
    mask = np.zeros(shape, dtype=np.uint8)
    cv2.circle(mask, (int(center[0]), int(center[1])), max(int(radius), 1), 255, -1)
    return mask


def face_scale(landmarks: np.ndarray) -> float:
    """얼굴 크기의 기준 길이(눈썹~턱 세로 길이). ROI 반지름을 얼굴 크기에 비례시키는 데 쓴다."""
    return float(np.linalg.norm(landmarks[_CHIN] - landmarks[_FOREHEAD_CENTER]))


def region_masks(landmarks: np.ndarray, shape: tuple[int, int]) -> dict[str, np.ndarray]:
    """지표별로 관심 있는 부위 마스크를 만든다.

    지표마다 봐야 할 곳이 다르다. 모공·트러블은 T존과 볼, 홍조는 볼과 코가 핵심이다.
    얼굴 전체 평균만 쓰면 부위별 신호가 서로 상쇄된다.
    """
    scale = face_scale(landmarks)
    radius = scale * 0.13

    skin = skin_mask(landmarks, shape)

    def limited(mask: np.ndarray) -> np.ndarray:
        return cv2.bitwise_and(mask, skin)

    cheeks = cv2.bitwise_or(
        _disc_mask(shape, landmarks[_LEFT_CHEEK_CENTER], radius),
        _disc_mask(shape, landmarks[_RIGHT_CHEEK_CENTER], radius),
    )
    forehead = _disc_mask(shape, landmarks[_FOREHEAD_CENTER], radius)
    nose = _disc_mask(shape, landmarks[_NOSE_TIP], radius * 0.8)

    return {
        "skin": skin,
        "cheeks": limited(cheeks),
        "forehead": limited(forehead),
        "nose": limited(nose),
        "tzone": limited(cv2.bitwise_or(forehead, nose)),
    }
