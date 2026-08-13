"""분석 파이프라인이 던지는 예외.

파이프라인 각 단계(얼굴 검출·품질 검사·점수 산출)는 자신이 실패한 이유만 알면 되고,
HTTP 응답으로 옮기는 일은 `main.py`의 예외 핸들러 한 곳에서 처리한다.
"""

from app.schema import AnalysisErrorCode


class AnalysisError(Exception):
    def __init__(self, code: AnalysisErrorCode, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class FaceNotDetectedError(AnalysisError):
    def __init__(self, message: str = "사진에서 얼굴을 찾지 못했습니다."):
        super().__init__(AnalysisErrorCode.FACE_NOT_DETECTED, message)


class ImageQualityError(AnalysisError):
    def __init__(self, message: str = "사진 품질이 분석 기준에 미달합니다."):
        super().__init__(AnalysisErrorCode.IMAGE_QUALITY_TOO_LOW, message)


class AnalysisFailedError(AnalysisError):
    def __init__(self, message: str = "피부 분석에 실패했습니다."):
        super().__init__(AnalysisErrorCode.ANALYSIS_FAILED, message)
