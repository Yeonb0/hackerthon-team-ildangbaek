"""분석 서버의 요청·응답 스키마.

Spring의 `SkinAnalysisResult`(지표 4종 0~100 점수)와 1:1로 맞춘다. 필드 이름은
`SkinMetricType` enum 값을 그대로 쓴다 — 양쪽에서 이름이 갈리면 매핑 표가 하나 더 생긴다.
"""

from enum import Enum

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


class AnalyzeResponse(BaseModel):
    scores: SkinScores


class AnalyzeErrorResponse(BaseModel):
    code: AnalysisErrorCode
    message: str
