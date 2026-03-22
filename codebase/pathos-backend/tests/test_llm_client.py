from __future__ import annotations

import sys
import types
from typing import Literal

import pytest

from app.llm.client import OpenAIClient


class _FakeResponse:
    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class _FakeClient:
    def __init__(self, response_payload: dict) -> None:
        self.response_payload = response_payload
        self.calls: list[tuple[str, dict, dict]] = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb) -> Literal[False]:
        return False

    def post(self, url: str, headers: dict, json: dict):
        self.calls.append((url, headers, json))
        return _FakeResponse(self.response_payload)


def test_llm_client_requires_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    client = OpenAIClient()
    with pytest.raises(RuntimeError, match="OPENAI_API_KEY"):
        client.generate_text("system", "user")


def test_llm_client_returns_text_and_sends_bearer(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "k-test")
    fake = _FakeClient(
        {
            "choices": [
                {
                    "message": {
                        "content": "hello from llm",
                    }
                }
            ]
        }
    )

    class _FakeHttpx(types.SimpleNamespace):
        def Client(self, timeout: float):
            assert timeout == 8.0
            return fake

    monkeypatch.setitem(sys.modules, "httpx", _FakeHttpx())
    client = OpenAIClient()

    response_text = client.generate_text("system prompt", "user prompt")

    assert response_text == "hello from llm"
    assert len(fake.calls) == 1
    url, headers, payload = fake.calls[0]
    assert url == "https://api.openai.com/v1/chat/completions"
    assert headers["Authorization"] == "Bearer k-test"
    assert payload["messages"][0]["role"] == "system"
    assert payload["messages"][1]["role"] == "user"


def test_llm_client_rejects_missing_choices(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "k-test")

    class _FakeHttpx(types.SimpleNamespace):
        def Client(self, timeout: float):
            return _FakeClient({"choices": []})

    monkeypatch.setitem(sys.modules, "httpx", _FakeHttpx())
    client = OpenAIClient()

    with pytest.raises(RuntimeError, match="choices"):
        client.generate_text("system", "user")


def test_llm_client_rejects_blank_content(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "k-test")

    class _FakeHttpx(types.SimpleNamespace):
        def Client(self, timeout: float):
            return _FakeClient({"choices": [{"message": {"content": "   "}}]})

    monkeypatch.setitem(sys.modules, "httpx", _FakeHttpx())
    client = OpenAIClient()

    with pytest.raises(RuntimeError, match="text content"):
        client.generate_text("system", "user")
