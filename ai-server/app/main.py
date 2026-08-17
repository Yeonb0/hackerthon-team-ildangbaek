"""규칙 기반 피부 분석 서버.

Spring Boot의 `LocalVisionSkinAnalysisClient`가 이 서버를 호출한다. 분석 수단이
교체 가능하도록 만들어 둔 `SkinAnalysisClient` 인터페이스(ADR 0003)의 구현체 중 하나다.
"""

import logging

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

from app import insight_tip, pipeline, product_comment
from app.errors import AnalysisError
from app.insight_tip import InsightTipUnavailableError
from app.product_comment import ProductCommentUnavailableError
from app.schema import (
    AnalyzeErrorResponse,
    AnalyzeResponse,
    InsightTipRequest,
    InsightTipResponse,
    ProductCommentBatchRequest,
    ProductCommentBatchResponse,
)

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
    """얼굴 사진 한 장을 분석해 지표 4종 점수와 모공 지표 신뢰도를 반환한다."""
    image_bytes = await image.read()
    log.info("분석 요청: filename=%s bytes=%d", image.filename, len(image_bytes))
    result = pipeline.analyze(image_bytes)
    return AnalyzeResponse(
        scores=result.scores,
        raw=result.raw,
        pores_reliability=result.pores_reliability,
        algorithm_version=result.algorithm_version,
        normalization_version=result.normalization_version,
    )


@app.post("/product-comments", response_model=ProductCommentBatchResponse)
async def product_comments(request: ProductCommentBatchRequest) -> ProductCommentBatchResponse:
    """추천 제품 목록에 대한 한 줄 코멘트를 배치로 생성한다.

    추천 여부·순서는 Spring이 이미 규칙 기반으로 정한 상태다. 이 엔드포인트는 그 결과를
    받아 코멘트만 덧붙인다. OpenAI 실패는 502로 응답한다 — Spring이 이를 잡아 코멘트
    없이(aiComment=null) 추천 자체는 정상 반환하도록 폴백한다(ADR 0022와 동일한 패턴).
    """
    if not request.products:
        return ProductCommentBatchResponse(comments=[])

    try:
        comments = product_comment.generate(request.products)
    except ProductCommentUnavailableError as e:
        log.warning("제품 코멘트 생성 실패, 폴백: %s", e)
        return JSONResponse(status_code=502, content={"code": "COMMENT_UNAVAILABLE"})

    return ProductCommentBatchResponse(comments=comments)


@app.post("/insight-tips", response_model=InsightTipResponse)
async def insight_tips(request: InsightTipRequest) -> InsightTipResponse:
    """요인 상세(REPORT-02) 인사이트 한 건에 대한 관리 팁을 생성한다.

    패턴 판정·수치는 Spring이 이미 확정한 상태다. 이 엔드포인트는 그 근거를 받아 조언
    문장만 덧붙인다. OpenAI 실패는 502로 응답한다 — Spring이 이를 잡아 팁 없이(tip=null)
    상세 응답 자체는 정상 반환하도록 폴백한다(ADR 0025와 동일한 패턴).
    """
    try:
        tip = insight_tip.generate(request)
    except InsightTipUnavailableError as e:
        log.warning("인사이트 관리 팁 생성 실패, 폴백: %s", e)
        return JSONResponse(status_code=502, content={"code": "TIP_UNAVAILABLE"})

    return InsightTipResponse(tip=tip)
