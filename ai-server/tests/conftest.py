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
    blemish_radius: float = 5.0,
    dark_spots: int = 0,
    dark_spot_radius: float = 10.0,
    dark_spot_bgr: tuple[int, int, int] = (140, 155, 175),
    blur: int = 0,
    brightness: int = 0,
    noise: float = 0.0,
    rotate: float = 0.0,
    noise_seed: int = 0,
) -> np.ndarray:
    """합성 얼굴을 그린다.

    :param skin_bgr: 피부색. 홍조 테스트에서 붉은 쪽으로 밀어 쓴다.
    :param blemishes: 볼에 찍을 트러블 반점 개수. 색이 붉어(a* 상승) TROUBLE·REDNESS 신호를 준다.
    :param blemish_radius: 반점 하나의 반지름(512 기준 px). 여드름 크기가 다양한 상황을
        재현하는 데 쓴다 — 기본값(5)은 좁쌀 여드름, 20 정도는 크고 붉은 뾰루지에 해당한다.
    :param dark_spots: 얼굴 전체에 찍을 색소침착(잡티) 반점 개수. `blemishes`와 달리 붉지 않고
        순수하게 어둡기만 하다 — a*를 거의 건드리지 않아 PIGMENTATION 신호만 준다.
    :param dark_spot_radius: 색소 반점 하나의 반지름(512 기준 px).
    :param dark_spot_bgr: 색소 반점 색. 기본값은 `skin_bgr`을 어둡게만 한 무채색에 가까운 색.
    :param blur: 0보다 크면 가우시안 블러 커널 크기(홀수). 흐린 사진 재현용
    :param brightness: 전체 밝기 가감. 조명 강건성 테스트용
    :param noise: 가우시안 노이즈 표준편차. 같은 장면을 연속 촬영했을 때의 센서 노이즈 재현
    :param rotate: 이미지 회전 각도(도). 얼굴 각도가 조금씩 달라지는 상황 재현
    :param noise_seed: 노이즈 난수 시드. 연속 촬영 각 장을 다르게 만들 때 쓴다
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
            cv2.circle(img, pt(cx + ox, 300 + oy), rad(blemish_radius), (95, 105, 190), -1)

    if dark_spots:
        # 얼굴 전체(이마·볼·턱)에 흩뿌린다 — 색소침착은 트러블과 달리 볼에만 몰리지 않는다.
        rng = np.random.default_rng(7)
        centers = [(220, 190), (300, 195), (180, 290), (330, 290), (256, 340), (220, 340), (300, 330)]
        for i in range(dark_spots):
            cx, cy = centers[i % len(centers)]
            ox = int(rng.integers(-15, 15))
            oy = int(rng.integers(-15, 15))
            cv2.circle(img, pt(cx + ox, cy + oy), rad(dark_spot_radius), dark_spot_bgr, -1)

    if rotate:
        center = (size / 2, size / 2)
        matrix = cv2.getRotationMatrix2D(center, rotate, 1.0)
        img = cv2.warpAffine(
            img, matrix, (size, size), flags=cv2.INTER_CUBIC, borderValue=(235, 235, 235)
        )

    if brightness:
        img = np.clip(img.astype(np.int16) + brightness, 0, 255).astype(np.uint8)

    if blur:
        img = cv2.GaussianBlur(img, (blur, blur), 0)

    if noise:
        rng = np.random.default_rng(noise_seed)
        noisy = img.astype(np.float32) + rng.normal(0, noise, img.shape)
        img = np.clip(noisy, 0, 255).astype(np.uint8)

    return img


def draw_localized_flush(*, radius: int = 25, flush_bgr: tuple[int, int, int] = (120, 140, 235)) -> np.ndarray:
    """볼 중심 일부만 붉은 얼굴을 그린다.

    홍조는 볼 전체에 고르게 퍼지기보다 뺨 중심에 몰려 나타나는 경우가 많다. 이 상황을 재현해야
    "국소 홍조가 평균에 희석되는" 문제(REDNESS가 평균 대신 백분위를 쓰는 이유)를 검증할 수 있다.
    """
    img = draw_face()
    for cx in (170, 342):
        cv2.circle(img, (cx, 300), radius, flush_bgr, -1)
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
