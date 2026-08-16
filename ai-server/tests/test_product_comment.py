"""제품 추천 AI 코멘트 배치 생성 검증.

`test_vision.py`와 같은 패턴으로 `product_comment._client`를 fake 클라이언트로
바꿔치기해 요청/응답 왕복만 검증한다. 실 API는 호출하지 않는다.
"""

from __future__ import annotations

import json

import openai
import pytest

from app import config, product_comment
from app.schema import ProductCommentRequest

PRODUCTS = [
    ProductCommentRequest(
        product_id=71,
        name="라로슈포제 시카플라스트",
        brand="라로슈포제",
        matched_ingredients=["판테놀", "마데카소사이드"],
        category="SERUM",
    ),
]


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
    config.get_settings.cache_clear()
    product_comment._client.cache_clear()
    yield
    config.get_settings.cache_clear()
    product_comment._client.cache_clear()


def _set_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")


def _use_fake_client(monkeypatch: pytest.MonkeyPatch, completions: _FakeCompletions) -> None:
    monkeypatch.setattr(product_comment, "_client", lambda: _FakeClient(completions))


def test_generate_returns_comments(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_api_key(monkeypatch)
    payload = {"comments": [{"product_id": 71, "comment": "판테놀이 진정에 도움을 줘요"}]}
    _use_fake_client(monkeypatch, _FakeCompletions(content=json.dumps(payload)))

    comments = product_comment.generate(PRODUCTS)

    assert len(comments) == 1
    assert comments[0].product_id == 71
    assert comments[0].comment == "판테놀이 진정에 도움을 줘요"


def test_generate_raises_when_api_key_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "")

    with pytest.raises(product_comment.ProductCommentUnavailableError):
        product_comment.generate(PRODUCTS)


def test_generate_raises_on_malformed_json(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_api_key(monkeypatch)
    _use_fake_client(monkeypatch, _FakeCompletions(content="이건 JSON이 아니다"))

    with pytest.raises(product_comment.ProductCommentUnavailableError):
        product_comment.generate(PRODUCTS)


def test_generate_raises_on_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    _set_api_key(monkeypatch)
    timeout_error = openai.APITimeoutError(request=object())
    _use_fake_client(monkeypatch, _FakeCompletions(error=timeout_error))

    with pytest.raises(product_comment.ProductCommentUnavailableError):
        product_comment.generate(PRODUCTS)
