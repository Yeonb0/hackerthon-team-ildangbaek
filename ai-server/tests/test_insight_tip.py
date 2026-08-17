"""요인 상세 관리 팁 생성 검증.

`test_product_comment.py`와 같은 패턴으로 `insight_tip._client`를 fake 클라이언트로
바꿔치기해 요청/응답 왕복만 검증한다. 실 API는 호출하지 않는다.
"""

from __future__ import annotations

import json

import openai
import pytest

from app import config, insight_tip
from app.schema import InsightTipRequest

OBSERVED = InsightTipRequest(
    title="레티놀",
    metric="트러블",
    summary="레티놀 사용 후 평균 2일 뒤 트러블 수치가 올라가는 패턴이 감지되었어요.",
    confidence="OBSERVED",
    lag_days=2,
    average_delta=18.0,
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
        self.captured: dict[str, object] = {}

    def create(self, **kwargs: object) -> _FakeResponse:
        self.captured = kwargs
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
    config.get_settings.cache_clear()
    insight_tip._client.cache_clear()
    yield
    config.get_settings.cache_clear()
    insight_tip._client.cache_clear()


def _set_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")


def _use_fake_client(monkeypatch: pytest.MonkeyPatch, completions: _FakeCompletions) -> None:
    monkeypatch.setattr(insight_tip, "_client", lambda: _FakeClient(completions))


def test_generate_returns_tip(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_api_key(monkeypatch)
    payload = {"tip": "주 2~3회로 줄이거나 보습제를 함께 써 보세요."}
    _use_fake_client(monkeypatch, _FakeCompletions(content=json.dumps(payload)))

    assert insight_tip.generate(OBSERVED) == "주 2~3회로 줄이거나 보습제를 함께 써 보세요."


def test_prompt_carries_evidence(monkeypatch: pytest.MonkeyPatch) -> None:
    """근거를 프롬프트에 실어야 AI가 수치를 지어내지 않는다(ADR 0028)."""
    _set_api_key(monkeypatch)
    completions = _FakeCompletions(content=json.dumps({"tip": "..."}))
    _use_fake_client(monkeypatch, completions)

    insight_tip.generate(OBSERVED)

    user_prompt = completions.captured["messages"][1]["content"]
    assert "레티놀" in user_prompt
    assert "트러블" in user_prompt
    assert "OBSERVED" in user_prompt
    assert "2일" in user_prompt


def test_prompt_states_direction_from_delta_sign(monkeypatch: pytest.MonkeyPatch) -> None:
    """지표값은 높을수록 나쁘다 — 부호의 의미를 프롬프트가 풀어 줘야 방향이 뒤집히지 않는다."""
    _set_api_key(monkeypatch)
    completions = _FakeCompletions(content=json.dumps({"tip": "..."}))
    _use_fake_client(monkeypatch, completions)

    insight_tip.generate(OBSERVED)
    assert "악화" in completions.captured["messages"][1]["content"]

    insight_tip.generate(InsightTipRequest(
        title="판테놀", metric="트러블", summary=None,
        confidence="OBSERVED", lag_days=2, average_delta=-7.0))
    assert "완화" in completions.captured["messages"][1]["content"]


def test_prompt_marks_direction_unknown_without_delta(monkeypatch: pytest.MonkeyPatch) -> None:
    """변화량이 없으면 방향을 알 수 없다.

    이 지시가 없으면 모델이 성분 일반 지식으로 좋고 나쁨을 채워 "개선에 도움이 된다"고
    근거 없이 단정한다(실측). BR 2가 프롬프트 층에서 지켜지는 자리다.
    """
    _set_api_key(monkeypatch)
    completions = _FakeCompletions(content=json.dumps({"tip": "..."}))
    _use_fake_client(monkeypatch, completions)

    insight_tip.generate(InsightTipRequest(
        title="판테놀", metric="트러블", summary=None, confidence="OBSERVING"))

    user_prompt = completions.captured["messages"][1]["content"]
    assert "OBSERVING" in user_prompt
    assert "아직 알 수 없다" in user_prompt
    assert "시차" not in user_prompt
    assert "분석 요약" not in user_prompt


def test_generate_raises_when_api_key_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "")

    with pytest.raises(insight_tip.InsightTipUnavailableError):
        insight_tip.generate(OBSERVED)


def test_generate_raises_on_malformed_json(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_api_key(monkeypatch)
    _use_fake_client(monkeypatch, _FakeCompletions(content="이건 JSON이 아니다"))

    with pytest.raises(insight_tip.InsightTipUnavailableError):
        insight_tip.generate(OBSERVED)


def test_generate_raises_on_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_api_key(monkeypatch)
    timeout_error = openai.APITimeoutError(request=object())
    _use_fake_client(monkeypatch, _FakeCompletions(error=timeout_error))

    with pytest.raises(insight_tip.InsightTipUnavailableError):
        insight_tip.generate(OBSERVED)
