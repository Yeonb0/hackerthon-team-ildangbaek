"""피부 분석 파이프라인.

Phase 1에서는 고정 점수를 돌려주는 골격만 둔다. 얼굴 검출·전처리·지표 산출은
Phase 2~4에서 이 모듈을 채워 나간다. 골격을 먼저 세우는 이유는 Spring 연동과
알고리즘 작업을 분리해, 알고리즘이 길어져도 연동은 이미 검증된 상태를 유지하기 위함이다.
"""

from app.schema import SkinScores

# Phase 1 자리표시자. Phase 4에서 실제 산출값으로 대체한다.
_PLACEHOLDER_SCORES = SkinScores(TROUBLE=70, REDNESS=70, PORES=70, PIGMENTATION=70)


def analyze(image_bytes: bytes) -> SkinScores:
    """이미지 바이트를 받아 지표 4종 점수를 산출한다.

    :raises AnalysisError: 얼굴 미검출 · 품질 미달 · 분석 실패
    """
    if not image_bytes:
        from app.errors import AnalysisFailedError

        raise AnalysisFailedError("빈 이미지입니다.")

    return _PLACEHOLDER_SCORES
