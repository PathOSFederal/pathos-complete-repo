"""Adapter client tests for Slice 26.

Coverage intent:
- Positive, Negative, and Edge Case behaviors for USAJOBS client transport/error mapping.
- Tests are fully mocked (no live network calls).
"""

from __future__ import annotations

import json
import types

import pytest

from app.adapters.usajobs.client import USAJobsClient
from app.adapters.usajobs.errors import (
    UpstreamAuthError,
    UpstreamConfigError,
    UpstreamRateLimitError,
    UpstreamResponseError,
    UpstreamUnavailableError,
)
from app.adapters.usajobs.types import USAJobsSearchResponse


class _FakeResponse:
    def __init__(self, status_code: int, content: bytes) -> None:
        self.status_code = status_code
        self.content = content

    def json(self):
        """Return parsed JSON for fake response payload."""

        return json.loads(self.content.decode("utf-8"))


class _FakeClient:
    def __init__(self, response: _FakeResponse):
        self._response = response

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def get(self, url, headers, params):
        """Return deterministic fake response for tests."""

        return self._response


def test_positive__usajobs_client_headers_and_url(monkeypatch) -> None:
    """Validate Host/User-Agent/Authorization-Key headers and URL construction."""
    monkeypatch.setenv("USAJOBS_API_KEY", "test-api-key-123")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "dev@pathosadvisor.com")
    monkeypatch.setenv("USAJOBS_API_BASE_URL", "https://data.usajobs.gov")
    payload = {"SearchResult": {"SearchResultItems": [], "SearchResultCountAll": 0}}
    captured: list[dict] = []

    class _CaptureClient:
        def __init__(self) -> None:
            self._response = _FakeResponse(200, json.dumps(payload).encode("utf-8"))

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def get(self, url: str, headers: dict[str, str], params: dict) -> _FakeResponse:
            captured.append({"url": url, "headers": dict(headers)})
            return self._response

    class _Httpx(types.SimpleNamespace):
        class TimeoutException(Exception):
            pass

        class RequestError(Exception):
            pass

        def Client(self, timeout):
            return _CaptureClient()

    monkeypatch.setattr("app.adapters.usajobs.client.httpx", _Httpx())
    USAJobsClient().search_jobs({"Keyword": "analyst"})
    assert len(captured) == 1
    assert captured[0]["url"] == "https://data.usajobs.gov/api/search"
    assert captured[0]["headers"].get("Host") == "data.usajobs.gov"
    assert captured[0]["headers"].get("User-Agent") == "dev@pathosadvisor.com"
    assert captured[0]["headers"].get("Authorization-Key") == "test-api-key-123"


def test_positive__usajobs_client_url_no_double_slash(monkeypatch) -> None:
    """URL construction avoids double slash when base_url has trailing slash."""
    monkeypatch.setenv("USAJOBS_API_KEY", "k")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "ua")
    monkeypatch.setenv("USAJOBS_API_BASE_URL", "https://data.usajobs.gov/")
    payload = {"SearchResult": {"SearchResultItems": [], "SearchResultCountAll": 0}}
    captured: list[dict] = []

    class _CaptureClient:
        def __init__(self) -> None:
            self._response = _FakeResponse(200, json.dumps(payload).encode("utf-8"))

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def get(self, url: str, headers: dict[str, str], params: dict) -> _FakeResponse:
            captured.append({"url": url})
            return self._response

    class _Httpx(types.SimpleNamespace):
        class TimeoutException(Exception):
            pass

        class RequestError(Exception):
            pass

        def Client(self, timeout):
            return _CaptureClient()

    monkeypatch.setattr("app.adapters.usajobs.client.httpx", _Httpx())
    USAJobsClient().search_jobs({"Keyword": "x"})
    assert captured[0]["url"] == "https://data.usajobs.gov/api/search"


def test_positive__usajobs_client_success(monkeypatch):
    monkeypatch.setenv("USAJOBS_API_KEY", "k")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "user@example.com")
    payload = {"SearchResult": {"SearchResultItems": [], "SearchResultCountAll": 0}}

    class _Httpx(types.SimpleNamespace):
        class TimeoutException(Exception):
            pass

        class RequestError(Exception):
            pass

        def Client(self, timeout):
            return _FakeClient(_FakeResponse(200, json.dumps(payload).encode("utf-8")))

    monkeypatch.setattr("app.adapters.usajobs.client.httpx", _Httpx())
    client = USAJobsClient()
    result = client.search_jobs({"Keyword": "analyst"})
    assert isinstance(result, USAJobsSearchResponse)
    assert result.audit.result_count == 0
    assert result.audit.query_hash


def test_negative__usajobs_client_missing_api_key(monkeypatch) -> None:
    """Missing/empty API key raises UpstreamConfigError before HTTP call."""
    monkeypatch.setenv("USAJOBS_API_KEY", "")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "dev@pathosadvisor.com")
    with pytest.raises(UpstreamConfigError, match="USAJOBS API key not configured"):
        USAJobsClient().search_jobs({"Keyword": "analyst"})


def test_negative__usajobs_client_missing_user_agent(monkeypatch) -> None:
    """Missing/empty user agent raises UpstreamConfigError before HTTP call."""
    monkeypatch.setenv("USAJOBS_API_KEY", "some-key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "")
    with pytest.raises(UpstreamConfigError, match="USAJOBS user agent not configured"):
        USAJobsClient().search_jobs({"Keyword": "analyst"})


def test_negative__usajobs_client_unauthorized(monkeypatch):
    monkeypatch.setenv("USAJOBS_API_KEY", "k")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "user@example.com")

    class _Httpx(types.SimpleNamespace):
        class TimeoutException(Exception):
            pass

        class RequestError(Exception):
            pass

        def Client(self, timeout):
            return _FakeClient(_FakeResponse(401, b"{}"))

    monkeypatch.setattr("app.adapters.usajobs.client.httpx", _Httpx())
    with pytest.raises(UpstreamAuthError):
        USAJobsClient().search_jobs({"Keyword": "analyst"})


def test_negative__usajobs_client_rate_limited(monkeypatch):
    monkeypatch.setenv("USAJOBS_API_KEY", "k")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "user@example.com")

    class _Httpx(types.SimpleNamespace):
        class TimeoutException(Exception):
            pass

        class RequestError(Exception):
            pass

        def Client(self, timeout):
            return _FakeClient(_FakeResponse(429, b"{}"))

    monkeypatch.setattr("app.adapters.usajobs.client.httpx", _Httpx())
    with pytest.raises(UpstreamRateLimitError):
        USAJobsClient().search_jobs({"Keyword": "analyst"})


def test_negative__usajobs_client_invalid_json(monkeypatch):
    monkeypatch.setenv("USAJOBS_API_KEY", "k")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "user@example.com")

    class _Httpx(types.SimpleNamespace):
        class TimeoutException(Exception):
            pass

        class RequestError(Exception):
            pass

        def Client(self, timeout):
            return _FakeClient(_FakeResponse(200, b"not-json"))

    monkeypatch.setattr("app.adapters.usajobs.client.httpx", _Httpx())
    with pytest.raises(UpstreamResponseError):
        USAJobsClient().search_jobs({"Keyword": "analyst"})


def test_edge_case__usajobs_client_timeout(monkeypatch):
    monkeypatch.setenv("USAJOBS_API_KEY", "k")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "user@example.com")

    class _Httpx(types.SimpleNamespace):
        class TimeoutException(Exception):
            pass

        class RequestError(Exception):
            pass

        class _TimeoutClient:
            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

            def get(self, url, headers, params):
                raise _Httpx.TimeoutException("timeout")

        def Client(self, timeout):
            return self._TimeoutClient()

    monkeypatch.setattr("app.adapters.usajobs.client.httpx", _Httpx())
    with pytest.raises(UpstreamUnavailableError):
        USAJobsClient().search_jobs({"Keyword": "analyst"})
