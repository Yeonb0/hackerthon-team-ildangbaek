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
NOSE = _indices("FACE_LANDMARKS_NOSE")

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

    <strong>윤곽 경계는 10px 침식한다(5px이었던 것을 늘림).</strong> PIGMENTATION 튜닝 중
    5px로는 부족하다는 게 실측으로 드러났다 — 마스크 경계 근처에 남는 국소 명암(주로 조명이
    치우칠 때 두드러짐)이 배경-전경 차분(`_pigmentation`의 `dark_p*`)의 상위 백분위를 오염시켜,
    조명만 바뀐 정상 얼굴이 실제 색소 반점보다 높은 값을 내는 경우가 있었다. cheeks 등 ROI는
    이미 skin 안쪽으로 들어와 있어 추가 침식으로 잃는 픽셀이 2% 미만이라 다른 지표에 미치는
    영향은 작다.
    """
    mask = _polygon_mask(shape, landmarks[FACE_OVAL])

    exclusions = [LEFT_EYE, RIGHT_EYE, LEFT_EYEBROW, RIGHT_EYEBROW, LIPS]
    kernel = np.ones((9, 9), np.uint8)
    for indices in exclusions:
        part = _polygon_mask(shape, landmarks[indices])
        mask = cv2.bitwise_and(mask, cv2.bitwise_not(cv2.dilate(part, kernel)))

    return cv2.erode(mask, np.ones((10, 10), np.uint8))


def pigmentation_mask(landmarks: np.ndarray, shape: tuple[int, int], skin: np.ndarray) -> np.ndarray:
    """PIGMENTATION 측정용으로 skin에서 코와 눈 밑을 추가로 뺀 마스크.

    `_pigmentation`(app/metrics.py)은 "주변보다 어두운 정도"의 상위 백분위를 쓰는데, 콧망울
    옆·눈 밑처럼 얼굴 굴곡 때문에 생기는 그림자도 반점과 똑같이 "주변보다 어둡다"로 잡힌다.
    실사진(정면이 아니거나 조명이 측면에서 오는 경우) 실측에서 이 구조적 음영이 p99.6을
    반점 없는 얼굴에서도 구간 상한 가까이 밀어 올리는 것을 확인했다 — 합성 얼굴은 코가
    평평해 이 문제가 드러나지 않았다.

    코는 눈보다 넓게(반경 방향으로) 팽창해 콧망울 그림자까지 포함해서 뺀다. 눈은 팽창을
    키워 눈 밑 그늘까지 함께 제외한다.
    """
    nose = _polygon_mask(shape, landmarks[NOSE])
    nose = cv2.dilate(nose, np.ones((15, 15), np.uint8))

    eye_shadow_kernel = np.ones((25, 25), np.uint8)
    eyes = cv2.bitwise_or(
        _polygon_mask(shape, landmarks[LEFT_EYE]),
        _polygon_mask(shape, landmarks[RIGHT_EYE]),
    )
    eyes = cv2.dilate(eyes, eye_shadow_kernel)

    excluded = cv2.bitwise_or(nose, eyes)
    return cv2.bitwise_and(skin, cv2.bitwise_not(excluded))


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
        "pigmentation": pigmentation_mask(landmarks, shape, skin),
    }
