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


class AnalysisResult(BaseModel):
    """지표 산출 결과. `pores_reliability`는 모공 지표에만 있다.

    모공은 카메라 노이즈·JPEG 압축 아티팩트와 신호 대역이 겹쳐 원리적으로 신뢰도가 낮다(실측:
    깨끗한 얼굴 20장의 측정값이 촬영마다 흔들리는 폭이 다른 세 지표보다 훨씬 크다). 점수를
    숨기지 않고 신뢰도를 함께 내려보낸다 — "낮은 신뢰도의 점수"와 "점수 없음"은 다른 정보라
    후자로 뭉개면 정보 손실이다. 나머지 세 지표는 이 문제가 없어 신뢰도 필드를 따로 두지 않는다.
    """

    scores: SkinScores
    pores_reliability: Literal["LOW", "NORMAL"]


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
