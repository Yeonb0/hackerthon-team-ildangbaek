"""지표 4종 산출.

각 지표는 "원시 측정값 → 0~100 점수"의 두 단계를 거친다. 측정값은 영상처리로 얻지만,
**점수로 바꾸는 구간값은 근거 있는 데이터에서 나온 것이 아니다.** 라벨링된 피부 데이터셋이
없어 임상적으로 검증된 기준을 만들 수 없었다. 지금 값은 합성 이미지 실측으로 "정상 얼굴과
문제 있는 얼굴이 갈리는 지점"을 잡은 초기값이며, 실사용 데이터가 쌓이면 반드시 재조정해야 한다.

따라서 이 점수는 **절대 평가가 아니라 같은 사람의 변화 추적용**으로 읽어야 한다.
"타인과 비교해 몇 점"이 아니라 "어제의 나와 비교해 올랐나 내렸나"가 이 지표의 용도다.

모든 지표는 점수가 높을수록 좋은 상태다(ADR 0002).
"""

from __future__ import annotations

import logging

import cv2
import numpy as np

from app.schema import SkinScores

log = logging.getLogger(__name__)

# 측정값을 점수로 옮기는 구간. (좋은 상태의 측정값, 나쁜 상태의 측정값)
# 아래 값들은 tests/conftest.py의 합성 얼굴 실측에서 잡았다.
#   깨끗한 얼굴 / 트러블 14개 얼굴 기준:
#   a*_cheek 5.0 / 8.1,  dark_p98 9.2 / 64.8,  hf_std 4.3 / 10.9,  trouble_p99 0 / 1700+
REDNESS_RANGE = (4.0, 16.0)
PIGMENTATION_RANGE = (8.0, 45.0)
PORES_RANGE = (4.0, 14.0)
TROUBLE_RANGE = (20.0, 1500.0)


def _to_score(value: float, good: float, bad: float) -> int:
    """측정값을 0~100 점수로 옮긴다. 측정값이 클수록 나쁜 지표들이라 방향을 뒤집는다."""
    if bad <= good:
        raise ValueError("나쁜 상태의 기준값이 좋은 상태보다 크거나 같아야 합니다.")
    ratio = (value - good) / (bad - good)
    return int(round(float(np.clip(1.0 - ratio, 0.0, 1.0)) * 100))


def _channels(image_bgr: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """CIELAB의 L(명도)과 a*(적록축)를 돌려준다.

    HSV 대신 CIELAB을 쓰는 이유는 a*가 조명 밝기 변화에 훨씬 덜 흔들리기 때문이다.
    HSV의 색상(H)은 어두운 픽셀에서 값이 크게 요동친다.
    """
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    return lab[:, :, 0], lab[:, :, 1] - 128.0


def _redness(a_channel: np.ndarray, cheeks: np.ndarray) -> int:
    """홍조 — 볼의 a*(붉은기) 평균.

    네 지표 중 가장 신뢰도가 높다. 홍조는 넓은 영역의 색 변화라 화질에 덜 민감하다.
    볼만 보는 이유는 이마·코가 조명 반사로 색이 쉽게 왜곡되기 때문이다.
    """
    return _to_score(float(a_channel[cheeks > 0].mean()), *REDNESS_RANGE)


def _pigmentation(lightness: np.ndarray, skin: np.ndarray) -> int:
    """색소침착 — 주변보다 어두운 반점의 정도.

    큰 스케일로 흐린 영상과의 차분을 써서 "주변 대비 얼마나 어두운가"를 잰다. 절대 밝기가 아니라
    국소 편차라 사람마다 다른 피부 톤과 촬영 밝기에 영향을 덜 받는다.

    평균이 아니라 상위 백분위(98%)를 쓴다. 색소침착은 얼굴 전체가 아니라 일부에 몰려 나타나므로
    평균을 쓰면 넓은 정상 피부에 희석된다.
    """
    background = cv2.GaussianBlur(lightness, (0, 0), 15)
    darker_than_surroundings = np.clip(background - lightness, 0, None)
    return _to_score(float(np.percentile(darker_than_surroundings[skin > 0], 98)), *PIGMENTATION_RANGE)


def _pores(lightness: np.ndarray, skin: np.ndarray) -> int:
    """모공 — 피부 표면의 고주파 텍스처 세기.

    <strong>네 지표 중 신뢰도가 가장 낮다.</strong> 모공과 카메라 노이즈·압축 아티팩트가 같은
    주파수 대역에 있어 원리적으로 완전히 분리되지 않는다. Phase 3의 품질 게이트로 흐린 사진을
    걷어내 최소한의 조건은 맞추지만, 기기가 바뀌면 값이 흔들릴 수 있다.
    """
    high_frequency = lightness - cv2.GaussianBlur(lightness, (0, 0), 3)
    return _to_score(float(high_frequency[skin > 0].std()), *PORES_RANGE)


def _trouble(lightness: np.ndarray, a_channel: np.ndarray, skin: np.ndarray) -> int:
    """트러블 — 붉으면서 동시에 국소적으로 도드라지는 작은 영역.

    붉기만으로 판단하면 홍조와 구분되지 않는다. 여드름은 붉고(a* 상승) 주변보다 어둡거나 튀어나와
    음영이 생긴다(국소 명도 편차)는 두 조건을 함께 만족하므로, 두 신호를 곱해 둘 다 큰 곳만 남긴다.

    a*는 중앙값을 빼서 개인 피부 톤을 기준선으로 삼는다. 원래 붉은 편인 사람이 그 이유만으로
    트러블 점수가 깎이지 않게 하기 위함이다.
    """
    skin_pixels = skin > 0
    relative_redness = np.clip(a_channel - float(np.median(a_channel[skin_pixels])), 0, None)
    local_shadow = np.clip(cv2.GaussianBlur(lightness, (0, 0), 15) - lightness, 0, None)

    combined = (relative_redness * local_shadow)[skin_pixels]
    return _to_score(float(np.percentile(combined, 99)), *TROUBLE_RANGE)


def compute(image_bgr: np.ndarray, masks: dict[str, np.ndarray]) -> SkinScores:
    """전처리를 마친 이미지에서 지표 4종을 산출한다."""
    lightness, a_channel = _channels(image_bgr)
    skin = masks["skin"]

    scores = SkinScores(
        TROUBLE=_trouble(lightness, a_channel, skin),
        REDNESS=_redness(a_channel, masks["cheeks"]),
        PORES=_pores(lightness, skin),
        PIGMENTATION=_pigmentation(lightness, skin),
    )
    log.info("지표 산출: %s", scores.model_dump())
    return scores
