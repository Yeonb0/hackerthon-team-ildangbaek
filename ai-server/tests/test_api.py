"""HTTP 경계 검증 — 실패 사유가 Spring이 기대하는 코드로 나가는지 확인한다."""

from __future__ import annotations

import json

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import config, insight_tip, product_comment, vision
from app.main import app
from tests.conftest import draw_face, encode_jpeg

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "UP"}


def test_analyze_returns_four_metrics(face_jpeg: bytes) -> None:
    response = client.post("/analyze", files={"image": ("face.jpg", face_jpeg, "image/jpeg")})

    assert response.status_code == 200
    body = response.json()
    scores = body["scores"]
    assert set(scores) == {"TROUBLE", "REDNESS", "PORES", "PIGMENTATION"}
    assert all(0 <= value <= 100 for value in scores.values())
    assert body["pores_reliability"] in ("LOW", "NORMAL")


def test_analyze_returns_skin_comment_from_vision(
    face_jpeg: bytes, monkeypatch: pytest.MonkeyPatch
) -> None:
    """`/analyze` 핸들러가 pipeline 결과의 skin_comment를 HTTP 응답까지 그대로 옮기는지 검증한다.

    pipeline.analyze()가 skin_comment를 채워도 main.py의 AnalyzeResponse 조립이 필드를
    누락하면 응답에서는 null로 사라진다 — 이 회귀를 잡기 위한 엔드포인트 레벨 테스트다.
    """
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    config.get_settings.cache_clear()
    vision._client.cache_clear()

    class _FakeMessage:
        content = json.dumps(
            {"TROUBLE": 50, "REDNESS": 50, "PORES": 50, "PIGMENTATION": 50,
             "skin_comment": "트러블은 적지만 모공 관리가 필요해요."}
        )

    class _FakeChoice:
        message = _FakeMessage()

    class _FakeResponse:
        choices = [_FakeChoice()]

    class _FakeCompletions:
        def create(self, **_kwargs: object) -> _FakeResponse:
            return _FakeResponse()

    class _FakeChat:
        completions = _FakeCompletions()

    class _FakeClient:
        chat = _FakeChat()

    monkeypatch.setattr(vision, "_client", lambda: _FakeClient())

    response = client.post("/analyze", files={"image": ("face.jpg", face_jpeg, "image/jpeg")})

    assert response.status_code == 200
    assert response.json()["skin_comment"] == "트러블은 적지만 모공 관리가 필요해요."
    config.get_settings.cache_clear()


def test_no_face_returns_face_not_detected() -> None:
    blank = encode_jpeg(np.full((480, 480, 3), 200, np.uint8))

    response = client.post("/analyze", files={"image": ("blank.jpg", blank, "image/jpeg")})

    assert response.status_code == 422
    assert response.json()["code"] == "FACE_NOT_DETECTED"


def test_blurry_returns_quality_too_low() -> None:
    blurred = encode_jpeg(draw_face(blur=11))

    response = client.post("/analyze", files={"image": ("blur.jpg", blurred, "image/jpeg")})

    assert response.status_code == 422
    assert response.json()["code"] == "IMAGE_QUALITY_TOO_LOW"


def test_garbage_returns_analysis_failed() -> None:
    response = client.post("/analyze", files={"image": ("x.jpg", b"not-an-image", "image/jpeg")})

    assert response.status_code == 422
    assert response.json()["code"] == "ANALYSIS_FAILED"


def test_product_comments_empty_list_returns_empty() -> None:
    response = client.post("/product-comments", json={"products": []})

    assert response.status_code == 200
    assert response.json() == {"comments": []}


def test_product_comments_returns_generated_comments(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    config.get_settings.cache_clear()
    product_comment._client.cache_clear()

    class _FakeMessage:
        content = json.dumps({"comments": [{"product_id": 71, "comment": "판테놀이 잘 맞아요"}]})

    class _FakeChoice:
        message = _FakeMessage()

    class _FakeResponse:
        choices = [_FakeChoice()]

    class _FakeCompletions:
        def create(self, **_kwargs: object) -> _FakeResponse:
            return _FakeResponse()

    class _FakeChat:
        completions = _FakeCompletions()

    class _FakeClient:
        chat = _FakeChat()

    monkeypatch.setattr(product_comment, "_client", lambda: _FakeClient())

    response = client.post(
        "/product-comments",
        json={
            "products": [
                {
                    "product_id": 71,
                    "name": "라로슈포제 시카플라스트",
                    "brand": "라로슈포제",
                    "matched_ingredients": ["판테놀"],
                    "category": "SERUM",
                }
            ]
        },
    )

    assert response.status_code == 200
    assert response.json() == {"comments": [{"product_id": 71, "comment": "판테놀이 잘 맞아요"}]}
    config.get_settings.cache_clear()


def test_product_comments_falls_back_to_502_on_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "")
    config.get_settings.cache_clear()

    response = client.post(
        "/product-comments",
        json={
            "products": [
                {
                    "product_id": 71,
                    "name": "라로슈포제 시카플라스트",
                    "brand": "라로슈포제",
                    "matched_ingredients": ["판테놀"],
                    "category": "SERUM",
                }
            ]
        },
    )

    assert response.status_code == 502
    assert response.json()["code"] == "COMMENT_UNAVAILABLE"
    config.get_settings.cache_clear()


INSIGHT_TIP_BODY = {
    "title": "레티놀",
    "metric": "트러블",
    "summary": "레티놀 사용 후 평균 2일 뒤 트러블 수치가 올라가는 패턴이 감지되었어요.",
    "confidence": "OBSERVED",
    "lag_days": 2,
    "average_delta": 18.0,
}


def test_insight_tips_returns_generated_tip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    config.get_settings.cache_clear()
    insight_tip._client.cache_clear()

    class _FakeMessage:
        content = json.dumps({"tip": "주 2~3회로 줄여 보세요."})

    class _FakeChoice:
        message = _FakeMessage()

    class _FakeResponse:
        choices = [_FakeChoice()]

    class _FakeCompletions:
        def create(self, **_kwargs: object) -> _FakeResponse:
            return _FakeResponse()

    class _FakeChat:
        completions = _FakeCompletions()

    class _FakeClient:
        chat = _FakeChat()

    monkeypatch.setattr(insight_tip, "_client", lambda: _FakeClient())

    response = client.post("/insight-tips", json=INSIGHT_TIP_BODY)

    assert response.status_code == 200
    assert response.json() == {"tip": "주 2~3회로 줄여 보세요."}
    config.get_settings.cache_clear()


def test_insight_tips_falls_back_to_502_on_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "")
    config.get_settings.cache_clear()

    response = client.post("/insight-tips", json=INSIGHT_TIP_BODY)

    assert response.status_code == 502
    assert response.json()["code"] == "TIP_UNAVAILABLE"
    config.get_settings.cache_clear()
