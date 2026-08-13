"""규칙 기반 피부 분석 서버.

Spring Boot의 `LocalVisionSkinAnalysisClient`가 이 서버를 호출한다. 분석 수단이
교체 가능하도록 만들어 둔 `SkinAnalysisClient` 인터페이스(ADR 0003)의 구현체 중 하나다.
"""

import logging

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

from app import pipeline
from app.errors import AnalysisError
from app.schema import AnalyzeErrorResponse, AnalyzeResponse

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="Ildangbaek Skin Analysis", version="0.1.0")


@app.exception_handler(AnalysisError)
async def handle_analysis_error(_request, exc: AnalysisError) -> JSONResponse:
    """파이프라인 실패를 본문 코드로 내려보낸다.

    422로 통일하는 이유는 세 사유 모두 "요청은 도달했으나 이미지를 처리할 수 없다"는
    같은 성격이고, Spring이 상태 코드가 아니라 본문의 `code`로 분기하기 때문이다.
    """
    log.info("분석 실패: code=%s message=%s", exc.code, exc.message)
    body = AnalyzeErrorResponse(code=exc.code, message=exc.message)
    return JSONResponse(status_code=422, content=body.model_dump(mode="json"))


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "UP"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(image: UploadFile = File(...)) -> AnalyzeResponse:
    """얼굴 사진 한 장을 분석해 지표 4종 점수를 반환한다."""
    image_bytes = await image.read()
    log.info("분석 요청: filename=%s bytes=%d", image.filename, len(image_bytes))
    return AnalyzeResponse(scores=pipeline.analyze(image_bytes))
