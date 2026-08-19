"""분석 서버의 요청·응답 스키마.

Spring의 `SkinAnalysisResult`(지표 4종 0~100 점수)와 1:1로 맞춘다. 필드 이름은
`SkinMetricType` enum 값을 그대로 쓴다 — 양쪽에서 이름이 갈리면 매핑 표가 하나 더 생긴다.
"""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class AnalysisErrorCode(str, Enum):
    """Spring의 `ErrorCode`로 그대로 옮겨지는 실패 사유.

    HTTP 상태로 구분하지 않고 본문 코드로 내려보낸다. 분석 실패는 대부분 422(얼굴 미검출,
    품질 미달)라 상태 코드만으로는 원인을 구분할 수 없기 때문이다.
    """

    FACE_NOT_DETECTED = "FACE_NOT_DETECTED"
    IMAGE_QUALITY_TOO_LOW = "IMAGE_QUALITY_TOO_LOW"
    ANALYSIS_FAILED = "ANALYSIS_FAILED"


class SkinScores(BaseModel):
    """지표 4종 점수. 높을수록 좋은 상태다(ADR 0002)."""

    TROUBLE: int = Field(ge=0, le=100)
    REDNESS: int = Field(ge=0, le=100)
    PORES: int = Field(ge=0, le=100)
    PIGMENTATION: int = Field(ge=0, le=100)


class RawMeasurements(BaseModel):
    """지표 4종의 1차(규칙 기반) 원시 측정값. `app/metrics.py`의 각 `_to_score` 호출 직전 값이다.

    `vision.refine()`이 최종 score를 OpenAI 판단으로 덮어쓸 수 있어(ADR 0022), 이 값에서
    `_to_score`를 거쳐 최종 score가 그대로 재현된다는 보장은 없다 — OpenAI가 개입하지 않은
    (폴백) 응답에서만 그 관계가 성립한다.
    """

    TROUBLE: float
    REDNESS: float
    PORES: float
    PIGMENTATION: float


class AnalysisResult(BaseModel):
    """지표 산출 결과. `pores_reliability`는 모공 지표에만 있다.

    모공은 카메라 노이즈·JPEG 압축 아티팩트와 신호 대역이 겹쳐 원리적으로 신뢰도가 낮다(실측:
    깨끗한 얼굴 20장의 측정값이 촬영마다 흔들리는 폭이 다른 세 지표보다 훨씬 크다). 점수를
    숨기지 않고 신뢰도를 함께 내려보낸다 — "낮은 신뢰도의 점수"와 "점수 없음"은 다른 정보라
    후자로 뭉개면 정보 손실이다. 나머지 세 지표는 이 문제가 없어 신뢰도 필드를 따로 두지 않는다.

    `algorithm_version`/`normalization_version`은 `app/metrics.py`의 `ALGORITHM_VERSION`·
    `NORMALIZATION_VERSION` 상수를 그대로 옮긴다 — 구간값(`REDNESS_RANGE` 등)이나 `_to_score`
    공식이 바뀌면 그 상수도 함께 올려서, 과거에 저장된 rawValue가 어떤 기준으로 만들어졌는지
    추적할 수 있게 한다.

    `skin_comment`는 `vision.refine()`이 OpenAI Vision으로 최종 점수를 확정하면서 함께 받는
    피부 상태 코멘트다(ADR 0022 연장). 규칙 기반 1차 점수에는 근거가 없어 값을 지어낼 수 없으므로,
    OpenAI 확정이 실패해 1차 점수로 폴백한 경우 `None`이다 — Spring은 이 필드가 없을 수 있다는
    전제로 다뤄야 한다.
    """

    scores: SkinScores
    raw: RawMeasurements
    pores_reliability: Literal["LOW", "NORMAL"]
    algorithm_version: str
    normalization_version: str
    skin_comment: str | None = None


class AnalyzeResponse(AnalysisResult):
    pass


class AnalyzeErrorResponse(BaseModel):
    code: AnalysisErrorCode
    message: str


class ProductCommentRequest(BaseModel):
    """코멘트를 생성할 제품 한 건. Spring의 `CheckRecommendationResponse` 조립 시점 정보다."""

    product_id: int
    name: str
    brand: str
    matched_ingredients: list[str]
    category: str


class ProductCommentBatchRequest(BaseModel):
    products: list[ProductCommentRequest]


class ProductComment(BaseModel):
    product_id: int
    comment: str


class ProductCommentBatchResponse(BaseModel):
    comments: list[ProductComment]


class InsightTipRequest(BaseModel):
    """관리 팁을 생성할 인사이트 한 건. Spring의 `ReportInsightDetailResponse` 조립 시점 정보다.

    분석·판정은 Spring이 이미 끝낸 상태다. 여기서는 그 결과를 근거로 조언 문장만 쓴다 —
    수치를 새로 만들거나 패턴 판정을 바꾸지 않는다.
    """

    title: str
    metric: str
    summary: str | None = None
    confidence: str
    lag_days: int | None = None
    average_delta: float | None = None


class InsightTipResponse(BaseModel):
    tip: str
