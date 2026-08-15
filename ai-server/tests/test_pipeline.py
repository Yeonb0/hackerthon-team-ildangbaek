"""파이프라인 전 구간 동작 검증."""

from __future__ import annotations

import numpy as np
import pytest

from app import config, pipeline
from app.errors import AnalysisFailedError, FaceNotDetectedError
from tests.conftest import draw_face, encode_jpeg


def test_analyze_returns_all_four_metrics(face_jpeg: bytes) -> None:
    result = pipeline.analyze(face_jpeg)

    for value in result.scores.model_dump().values():
        assert 0 <= value <= 100
    assert result.pores_reliability in ("LOW", "NORMAL")


def test_rejects_empty_image() -> None:
    with pytest.raises(AnalysisFailedError):
        pipeline.analyze(b"")


def test_rejects_undecodable_image() -> None:
    with pytest.raises(AnalysisFailedError):
        pipeline.analyze(b"not-an-image")


def test_rejects_image_without_face() -> None:
    blank = encode_jpeg(np.full((480, 480, 3), 200, np.uint8))

    with pytest.raises(FaceNotDetectedError):
        pipeline.analyze(blank)


def test_is_deterministic(face_jpeg: bytes) -> None:
    """같은 입력에 같은 점수. 분석 파이프라인 검증의 전제다."""
    first = pipeline.analyze(face_jpeg)
    second = pipeline.analyze(face_jpeg)

    assert first == second


def test_scale_normalization_makes_sizes_comparable() -> None:
    """촬영 거리가 달라도 같은 얼굴이면 비슷한 점수가 나와야 한다."""
    small = encode_jpeg(draw_face(size=384))
    large = encode_jpeg(draw_face(size=768))

    small_scores = pipeline.analyze(small).scores.model_dump()
    large_scores = pipeline.analyze(large).scores.model_dump()

    for metric, value in small_scores.items():
        assert abs(value - large_scores[metric]) <= 12, f"{metric}이 촬영 거리에 크게 흔들린다"


def test_analyze_falls_back_to_rule_based_without_openai_key(
    face_jpeg: bytes, monkeypatch: pytest.MonkeyPatch
) -> None:
    """OPENAI_API_KEY가 없으면 OpenAI 확정을 건너뛰고 1차 규칙 기반 점수를 그대로 반환한다.

    CI 환경에는 실 API 키가 없으므로, 이 폴백 경로가 스위트 전체의 기본 실행 경로가 된다.
    이 테스트는 `analyze()`가 예외 없이 끝까지 돌고 유효한 점수를 낸다는 것만 확인한다 —
    "왜" 폴백했는지(키 부재)는 `test_vision.py`의 `test_refine_raises_when_api_key_missing`이
    이미 검증한다.
    """
    monkeypatch.setenv("OPENAI_API_KEY", "")
    config.get_settings.cache_clear()

    result = pipeline.analyze(face_jpeg)

    for value in result.scores.model_dump().values():
        assert 0 <= value <= 100
    assert result.pores_reliability in ("LOW", "NORMAL")
