"""테스트 공용 픽스처.

실제 얼굴 사진은 개인정보라 저장소에 두지 않는다. 대신 MediaPipe가 얼굴로 인식하는 합성 이미지를
그려서 쓴다. 점수의 절대값을 검증하는 데는 쓸 수 없지만, 파이프라인이 끝까지 도는지와
마스크가 올바른 부위를 잡는지는 이것으로 확인할 수 있다.
"""

from __future__ import annotations

import cv2
import numpy as np
import pytest


def draw_face(
    *,
    size: int = 512,
    skin_bgr: tuple[int, int, int] = (185, 205, 232),
    blemishes: int = 0,
    blur: int = 0,
    brightness: int = 0,
) -> np.ndarray:
    """합성 얼굴을 그린다.

    :param skin_bgr: 피부색. 홍조 테스트에서 붉은 쪽으로 밀어 쓴다.
    :param blemishes: 볼에 찍을 트러블 반점 개수
    :param blur: 0보다 크면 가우시안 블러 커널 크기(홀수). 흐린 사진 재현용
    :param brightness: 전체 밝기 가감. 조명 강건성 테스트용
    """
    scale = size / 512
    img = np.full((size, size, 3), 235, np.uint8)

    def pt(x: int, y: int) -> tuple[int, int]:
        return int(x * scale), int(y * scale)

    def rad(r: float) -> int:
        return max(int(r * scale), 1)

    cv2.ellipse(img, pt(256, 270), (rad(135), rad(175)), 0, 0, 360, skin_bgr, -1)
    cv2.ellipse(img, pt(256, 200), (rad(120), rad(90)), 0, 0, 360, skin_bgr, -1)

    for cx in (205, 307):
        cv2.ellipse(img, pt(cx, 240), (rad(30), rad(16)), 0, 0, 360, (250, 250, 250), -1)
        cv2.circle(img, pt(cx, 240), rad(13), (90, 70, 55), -1)
        cv2.circle(img, pt(cx, 240), rad(6), (20, 20, 20), -1)
        cv2.ellipse(img, pt(cx, 240), (rad(30), rad(16)), 0, 180, 360, (60, 50, 45), rad(2))

    cv2.ellipse(img, pt(205, 208), (rad(34), rad(12)), 0, 180, 360, (70, 60, 55), rad(7))
    cv2.ellipse(img, pt(307, 208), (rad(34), rad(12)), 0, 180, 360, (70, 60, 55), rad(7))

    cv2.line(img, pt(256, 250), pt(256, 310), (165, 185, 214), rad(3))
    cv2.ellipse(img, pt(256, 315), (rad(18), rad(11)), 0, 0, 360, (170, 190, 218), -1)

    cv2.ellipse(img, pt(256, 370), (rad(44), rad(20)), 0, 0, 360, (120, 120, 195), -1)
    cv2.line(img, pt(212, 370), pt(300, 370), (90, 90, 160), rad(2))

    if blemishes:
        rng = np.random.default_rng(42)
        for i in range(blemishes):
            cx = 205 if i % 2 == 0 else 307
            ox = int(rng.integers(-28, 28))
            oy = int(rng.integers(-20, 24))
            cv2.circle(img, pt(cx + ox, 300 + oy), rad(5), (95, 105, 190), -1)

    if brightness:
        img = np.clip(img.astype(np.int16) + brightness, 0, 255).astype(np.uint8)

    if blur:
        img = cv2.GaussianBlur(img, (blur, blur), 0)

    return img


def encode_jpeg(image: np.ndarray, quality: int = 95) -> bytes:
    ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
    assert ok, "테스트 이미지 인코딩 실패"
    return buffer.tobytes()


@pytest.fixture(scope="session")
def face_image() -> np.ndarray:
    return draw_face()


@pytest.fixture(scope="session")
def face_jpeg(face_image: np.ndarray) -> bytes:
    return encode_jpeg(face_image)
