"""HTTP 경계 검증 — 실패 사유가 Spring이 기대하는 코드로 나가는지 확인한다."""

from __future__ import annotations

import numpy as np
from fastapi.testclient import TestClient

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
    scores = response.json()["scores"]
    assert set(scores) == {"TROUBLE", "REDNESS", "PORES", "PIGMENTATION"}
    assert all(0 <= value <= 100 for value in scores.values())


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
