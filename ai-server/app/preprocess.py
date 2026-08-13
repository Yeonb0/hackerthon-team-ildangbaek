"""조명·화질 정규화.

이 단계를 건너뛰면 파이프라인 전체가 무의미해진다. 조명이 바뀌면서 생기는 색·밝기 변화가
실제 피부 변화보다 신호가 훨씬 크기 때문이다. "어제보다 점수가 떨어진 게 피부 탓인지 조명
탓인지" 구분하려면 촬영 조건의 영향을 먼저 걷어내야 한다.

보정은 항상 **피부 픽셀만** 기준으로 계산한다. 이미지 전체로 계산하면 배경 색과 옷 색이
보정값을 끌고 가서, 같은 얼굴도 배경이 바뀌면 다른 점수가 나온다.
"""

from __future__ import annotations

import logging

import cv2
import numpy as np

from app.errors import ImageQualityError

log = logging.getLogger(__name__)

# 품질 게이트 임계값. 근거 있는 데이터가 없어 합성 이미지와 육안 확인으로 잡은 초기값이다.
# 실사용 로그가 쌓이면 재조정해야 한다.
MIN_SHARPNESS = 12.0
MAX_OVEREXPOSED_RATIO = 0.25
MAX_UNDEREXPOSED_RATIO = 0.25
MIN_SKIN_PIXELS = 500


def _skin_values(image: np.ndarray, mask: np.ndarray) -> np.ndarray:
    return image[mask > 0]


def check_quality(image_bgr: np.ndarray, skin_mask: np.ndarray) -> None:
    """분석해도 되는 사진인지 판단한다.

    통과하지 못하면 점수를 지어내지 않고 재촬영을 요구한다. 흐린 사진에서 나온 모공 점수는
    피부가 아니라 초점 상태를 재는 것이라 사용자를 오도한다.
    """
    skin_pixels = int((skin_mask > 0).sum())
    if skin_pixels < MIN_SKIN_PIXELS:
        raise ImageQualityError("얼굴이 너무 작게 나왔습니다. 더 가까이서 촬영해주세요.")

    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    # 초점: 피부 영역의 라플라시안 분산. 흐릴수록 고주파 성분이 사라져 값이 작아진다.
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F)[skin_mask > 0].var())
    if sharpness < MIN_SHARPNESS:
        raise ImageQualityError("사진이 흐릿합니다. 초점을 맞춰 다시 촬영해주세요.")

    skin_gray = _skin_values(gray, skin_mask)
    overexposed = float((skin_gray >= 250).mean())
    underexposed = float((skin_gray <= 12).mean())

    if overexposed > MAX_OVEREXPOSED_RATIO:
        raise ImageQualityError("빛이 너무 강합니다. 조명을 줄이고 다시 촬영해주세요.")
    if underexposed > MAX_UNDEREXPOSED_RATIO:
        raise ImageQualityError("사진이 너무 어둡습니다. 밝은 곳에서 다시 촬영해주세요.")

    log.debug(
        "품질 통과: sharpness=%.1f over=%.3f under=%.3f", sharpness, overexposed, underexposed
    )


# Shades of Gray의 Minkowski 차수. 6은 이 방식의 통상적인 기본값이다.
_MINKOWSKI_ORDER = 6


def white_balance(image_bgr: np.ndarray) -> np.ndarray:
    """Shades of Gray로 조명의 색온도만 걷어낸다.

    <strong>피부가 아니라 장면 전체</strong>에서 조명을 추정한다. 피부 평균을 무채색으로
    맞추는 Gray World를 피부에만 적용하면, 보정이 홍조 자체를 지워버린다 — 실측에서 붉은 피부와
    창백한 피부의 a*가 모두 0으로 붙어 홍조 지표가 아무것도 구분하지 못했다.

    조명은 얼굴 밖까지 함께 비추므로 장면 전체로 추정하면 피부색 차이는 남기면서 색온도만
    보정된다. 실측상 같은 얼굴은 조명이 바뀌어도 a*가 5.0~6.0으로 안정적이고, 붉은 피부(12.0)와
    창백한 피부(3.0)는 그대로 갈렸다.

    이득은 0.6~1.6으로 제한해 극단적인 색조명에서 색이 뒤집히는 것을 막는다.
    """
    values = image_bgr.astype(np.float32)
    norms = np.power(np.power(values, _MINKOWSKI_ORDER).mean(axis=(0, 1)), 1.0 / _MINKOWSKI_ORDER)
    if np.any(norms < 1e-3):
        return image_bgr

    gains = np.clip(norms.mean() / norms, 0.6, 1.6)
    return np.clip(values * gains, 0, 255).astype(np.uint8)


def normalize_luminance(image_bgr: np.ndarray) -> np.ndarray:
    """CLAHE로 명암을 고르게 편다.

    <strong>{@link prepare}는 이 함수를 쓰지 않는다.</strong> 국소 대비를 평탄화하는 연산이라
    색소·모공 지표가 읽어야 할 신호까지 같이 지운다. 밝기가 심하게 치우친 사진을 눈으로 확인할 때
    쓰려고 남겨 둔다.

    L 채널에만 건다. a*·b* 채널까지 건드리면 색이 바뀌어 홍조·색소 지표가 오염된다.
    """
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    lightness, a_channel, b_channel = cv2.split(lab)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    merged = cv2.merge([clahe.apply(lightness), a_channel, b_channel])
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


def prepare(image_bgr: np.ndarray, skin_mask: np.ndarray) -> np.ndarray:
    """품질 검사를 통과한 이미지에 색온도 보정을 적용해 돌려준다.

    CLAHE(`normalize_luminance`)는 여기서 적용하지 않는다. 국소 대비를 평탄화하는 연산이라
    색소침착(주변보다 어두운 반점)과 모공(고주파 텍스처)을 함께 지워버린다. 밝기 차이는
    지표 산출 쪽에서 상대값을 써서 흡수한다.
    """
    check_quality(image_bgr, skin_mask)
    return white_balance(image_bgr)
