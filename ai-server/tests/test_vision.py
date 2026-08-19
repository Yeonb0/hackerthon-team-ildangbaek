"""OpenAI Vision 2차 확정 단계 검증.

실 API는 과금·비결정성 때문에 호출하지 않는다. `vision._client`를 monkeypatch로 fake
클라이언트로 바꿔치기해 요청/응답 왕복만 검증한다 — `landmarks._landmarker()`가 lru_cache로
감싸진 싱글턴을 테스트에서 교체하는 것과 같은 접근이다.
"""

from __future__ import annotations

import json

import numpy as np
import openai
import pytest

from app import config, vision
from app.schema import AnalysisResult, RawMeasurements, SkinScores

PRELIMINARY = AnalysisResult(
    scores=SkinScores(TROUBLE=80, REDNESS=70, PORES=60, PIGMENTATION=90),
    raw=RawMeasurements(TROUBLE=120.5, REDNESS=10.2, PORES=7.1, PIGMENTATION=20.3),
    pores_reliability="LOW",
    algorithm_version="cielab-v1",
    normalization_version="to-score-v1",
)


class _FakeMessage:
    def __init__(self, content: str | None) -> None:
        self.content = content


class _FakeChoice:
    def __init__(self, content: str | None) -> None:
        self.message = _FakeMessage(content)


class _FakeResponse:
    def __init__(self, content: str | None) -> None:
        self.choices = [_FakeChoice(content)] if content is not None else []


class _FakeCompletions:
    def __init__(self, *, content: str | None = None, error: Exception | None = None) -> None:
        self._content = content
        self._error = error

    def create(self, **_kwargs: object) -> _FakeResponse:
        if self._error is not None:
            raise self._error
        return _FakeResponse(self._content)


class _FakeChat:
    def __init__(self, completions: _FakeCompletions) -> None:
        self.completions = completions


class _FakeClient:
    def __init__(self, completions: _FakeCompletions) -> None:
        self.chat = _FakeChat(completions)


@pytest.fixture(autouse=True)
def _reset_caches() -> None:
    """설정·클라이언트 lru_cache가 테스트 간에 새지 않게 매 테스트마다 비운다."""
    config.get_settings.cache_clear()
    vision._client.cache_clear()
    yield
    config.get_settings.cache_clear()
    vision._client.cache_clear()


def _set_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")


def _use_fake_client(monkeypatch: pytest.MonkeyPatch, completions: _FakeCompletions) -> None:
    monkeypatch.setattr(vision, "_client", lambda: _FakeClient(completions))


def test_refine_returns_openai_scores_without_clamping(monkeypatch: pytest.MonkeyPatch) -> None:
    """1차 점수와 크게 다른 값도 그대로 통과해야 한다 — 클램핑 없음이 설계 의도다."""
    _set_api_key(monkeypatch)
    far_from_preliminary = {"TROUBLE": 5, "REDNESS": 3, "PORES": 60, "PIGMENTATION": 100}
    _use_fake_client(monkeypatch, _FakeCompletions(content=json.dumps(far_from_preliminary)))

    result = vision.refine(np.zeros((10, 10, 3), np.uint8), PRELIMINARY)

    assert result.scores.model_dump() == far_from_preliminary


def test_refine_preserves_pores_reliability(monkeypatch: pytest.MonkeyPatch) -> None:
    """pores_reliability는 규칙 기반 판정을 그대로 유지하고 OpenAI에 재위임하지 않는다."""
    _set_api_key(monkeypatch)
    scores = {"TROUBLE": 80, "REDNESS": 70, "PORES": 60, "PIGMENTATION": 90}
    _use_fake_client(monkeypatch, _FakeCompletions(content=json.dumps(scores)))

    result = vision.refine(np.zeros((10, 10, 3), np.uint8), PRELIMINARY)

    assert result.pores_reliability == PRELIMINARY.pores_reliability == "LOW"


def test_refine_preserves_raw_and_versions(monkeypatch: pytest.MonkeyPatch) -> None:
    """raw·algorithm_version·normalization_version은 OpenAI가 관여하지 않는 1차 값을 그대로 옮긴다."""
    _set_api_key(monkeypatch)
    scores = {"TROUBLE": 80, "REDNESS": 70, "PORES": 60, "PIGMENTATION": 90}
    _use_fake_client(monkeypatch, _FakeCompletions(content=json.dumps(scores)))

    result = vision.refine(np.zeros((10, 10, 3), np.uint8), PRELIMINARY)

    assert result.raw == PRELIMINARY.raw
    assert result.algorithm_version == PRELIMINARY.algorithm_version
    assert result.normalization_version == PRELIMINARY.normalization_version


def test_refine_raises_when_api_key_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "")

    with pytest.raises(vision.VisionUnavailableError):
        vision.refine(np.zeros((10, 10, 3), np.uint8), PRELIMINARY)


def test_refine_raises_on_malformed_json(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_api_key(monkeypatch)
    _use_fake_client(monkeypatch, _FakeCompletions(content="이건 JSON이 아니다"))

    with pytest.raises(vision.VisionUnavailableError):
        vision.refine(np.zeros((10, 10, 3), np.uint8), PRELIMINARY)


def test_refine_raises_on_out_of_range_score(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_api_key(monkeypatch)
    invalid = {"TROUBLE": 150, "REDNESS": 70, "PORES": 60, "PIGMENTATION": 90}
    _use_fake_client(monkeypatch, _FakeCompletions(content=json.dumps(invalid)))

    with pytest.raises(vision.VisionUnavailableError):
        vision.refine(np.zeros((10, 10, 3), np.uint8), PRELIMINARY)


def test_refine_raises_on_missing_field(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_api_key(monkeypatch)
    incomplete = {"TROUBLE": 80, "REDNESS": 70, "PORES": 60}
    _use_fake_client(monkeypatch, _FakeCompletions(content=json.dumps(incomplete)))

    with pytest.raises(vision.VisionUnavailableError):
        vision.refine(np.zeros((10, 10, 3), np.uint8), PRELIMINARY)


def test_refine_returns_skin_comment(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_api_key(monkeypatch)
    scores = {
        "TROUBLE": 80,
        "REDNESS": 70,
        "PORES": 60,
        "PIGMENTATION": 90,
        "skin_comment": "모공 관리에 신경 써보면 더 좋아질 거예요.",
    }
    _use_fake_client(monkeypatch, _FakeCompletions(content=json.dumps(scores)))

    result = vision.refine(np.zeros((10, 10, 3), np.uint8), PRELIMINARY)

    assert result.skin_comment == "모공 관리에 신경 써보면 더 좋아질 거예요."


def test_refine_skin_comment_defaults_to_none_when_absent(monkeypatch: pytest.MonkeyPatch) -> None:
    """skin_comment 없이도 점수 파싱은 실패하지 않아야 한다 — 필수 계약이 아니다."""
    _set_api_key(monkeypatch)
    scores = {"TROUBLE": 80, "REDNESS": 70, "PORES": 60, "PIGMENTATION": 90}
    _use_fake_client(monkeypatch, _FakeCompletions(content=json.dumps(scores)))

    result = vision.refine(np.zeros((10, 10, 3), np.uint8), PRELIMINARY)

    assert result.skin_comment is None


def test_refine_raises_on_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_api_key(monkeypatch)
    timeout_error = openai.APITimeoutError(request=object())
    _use_fake_client(monkeypatch, _FakeCompletions(error=timeout_error))

    with pytest.raises(vision.VisionUnavailableError):
        vision.refine(np.zeros((10, 10, 3), np.uint8), PRELIMINARY)
