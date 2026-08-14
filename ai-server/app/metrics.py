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

from app.schema import AnalysisResult, SkinScores

log = logging.getLogger(__name__)

# 측정값을 점수로 옮기는 구간. (좋은 상태의 측정값, 나쁜 상태의 측정값)
# 아래 값들은 tests/conftest.py의 합성 얼굴 실측에서 잡았다.
#   깨끗한 얼굴 / 트러블 14개 얼굴 기준:
#   a*_cheek 5.0 / 8.1,  dark_p98 9.2 / 64.8,  hf_std 4.3 / 10.9
REDNESS_RANGE = (4.0, 16.0)
PIGMENTATION_RANGE = (8.0, 45.0)

# clean 20장(약한 센서 노이즈만 다름) 실측 p99.9가 30.7~32.6으로 안정적이고, 반점 1개짜리
# 미세한 트러블도 1917까지 뛴다(아래 _trouble 참고 — p99.9로 바꾼 이유). 자연 변동 상한(32.6)보다
# 넉넉히 위인 35를 하한으로 잡았다.
#
# 상한은 반점 "심각도"가 아니라 "존재 여부"에 맞춰 잡는다. p99.9는 상위 0.1% 픽셀(사실상 가장
# 튀는 반점 1~2개)만 반영하는 지표라, JPEG 압축까지 거친 전체 파이프라인으로 반점 1~14개를
# 스윕하면 1760~1955 사이에서 순서 없이 흔들린다(실측) — 개수가 늘수록 단조 감소하지 않는다.
# 상한을 이 스윕의 최댓값(1954.8)보다 넉넉히 위(2000)로 잡아야 "반점 있음" 케이스가 0점에
# 포화되어 서로 역전되는 것을 막는다. 즉 이 신호로는 "있다/없다"의 굵은 경계만 신뢰할 수 있고,
# 개수·중증도에 따른 세밀한 차등은 설계상 불가능하다 — 후속 과제(파일 하단 한계 참고).
TROUBLE_RANGE = (35.0, 2000.0)

# PORES는 파이프라인 전체(JPEG 압축 + 리사이즈)를 거친 clean 사진 20장의 hf_std가
# 4.92~6.19로 자연 변동한다(실측). 구간 하한을 이 변동 상한보다 낮게 두면 촬영마다 점수가
# 튄다 — 실제로 (4.0, 14.0)이었을 때 연속 촬영 5장만으로 spread 8점이 났다. 하한을 6.5로
# 올리고 폭을 넓혀 자연 변동을 흡수하면서도 트러블 방향성(x2부터 91→72로 하락)은 유지된다.
PORES_RANGE = (6.5, 16.0)


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


# clean 사진 20장(노이즈만 다름, JPEG+리사이즈 포함)의 hf_std 실측 범위. 측정값이 이 안에 있으면
# "트러블 때문"인지 "그냥 그날의 촬영 잡음"인지 원리적으로 구분할 수 없다 — 신뢰도를 LOW로 내린다.
_PORES_NOISE_FLOOR = 6.2


def _pores(lightness: np.ndarray, skin: np.ndarray) -> tuple[int, str]:
    """모공 — 피부 표면의 고주파 텍스처 세기.

    <strong>네 지표 중 신뢰도가 가장 낮다.</strong> 모공과 카메라 노이즈·압축 아티팩트가 같은
    주파수 대역에 있어 원리적으로 완전히 분리되지 않는다. Phase 3의 품질 게이트로 흐린 사진을
    걷어내 최소한의 조건은 맞추지만, 기기가 바뀌면 값이 흔들릴 수 있다.

    점수 자체를 숨기지 않고 신뢰도를 함께 반환한다. 측정값을 지어내지 않는다는 원칙(다른 지표의
    구간값 결정과 같은 철학)을 신뢰도에도 적용한 것 — "낮은 신뢰도의 점수"와 "점수 없음"은 다른
    정보라 후자로 뭉개면 오히려 정보 손실이다.

    :return: (점수, "LOW" 또는 "NORMAL")
    """
    raw = float((lightness - cv2.GaussianBlur(lightness, (0, 0), 3))[skin > 0].std())
    reliability = "LOW" if raw <= _PORES_NOISE_FLOOR else "NORMAL"
    return _to_score(raw, *PORES_RANGE), reliability


def _trouble(lightness: np.ndarray, a_channel: np.ndarray, skin: np.ndarray) -> int:
    """트러블 — 붉으면서 동시에 국소적으로 도드라지는 작은 영역.

    붉기만으로 판단하면 홍조와 구분되지 않는다. 여드름은 붉고(a* 상승) 주변보다 어둡거나 튀어나와
    음영이 생긴다(국소 명도 편차)는 두 조건을 함께 만족하므로, 두 신호를 곱해 둘 다 큰 곳만 남긴다.

    a*는 중앙값을 빼서 개인 피부 톤을 기준선으로 삼는다. 원래 붉은 편인 사람이 그 이유만으로
    트러블 점수가 깎이지 않게 하기 위함이다.

    <strong>백분위는 99가 아니라 99.9를 쓴다.</strong> 좁쌀만 한 여드름(반지름 2px급)은 피부
    전체 픽셀의 0.2%도 안 돼서 상위 1%(p99) 컷오프 안에 아예 들어오지 못하고 0으로 사라진다
    — 실측으로 확인했다(p99에서는 radius=2 반점이 clean과 구분 불가, p99.9에서는 명확히 분리).
    큰 반점(radius 6 이상)은 전체 픽셀 수가 충분해 p99로도 잡히지만, 작은 것에 맞추면 큰 것도
    함께 잡힌다 — 반대는 성립하지 않는다.
    """
    skin_pixels = skin > 0
    relative_redness = np.clip(a_channel - float(np.median(a_channel[skin_pixels])), 0, None)
    local_shadow = np.clip(cv2.GaussianBlur(lightness, (0, 0), 15) - lightness, 0, None)

    combined = (relative_redness * local_shadow)[skin_pixels]
    return _to_score(float(np.percentile(combined, 99.9)), *TROUBLE_RANGE)


def compute(image_bgr: np.ndarray, masks: dict[str, np.ndarray]) -> AnalysisResult:
    """전처리를 마친 이미지에서 지표 4종과 모공 지표의 신뢰도를 산출한다."""
    lightness, a_channel = _channels(image_bgr)
    skin = masks["skin"]

    pores_score, pores_reliability = _pores(lightness, skin)
    scores = SkinScores(
        TROUBLE=_trouble(lightness, a_channel, skin),
        REDNESS=_redness(a_channel, masks["cheeks"]),
        PORES=pores_score,
        PIGMENTATION=_pigmentation(lightness, skin),
    )
    result = AnalysisResult(scores=scores, pores_reliability=pores_reliability)
    log.info("지표 산출: %s", result.model_dump())
    return result
