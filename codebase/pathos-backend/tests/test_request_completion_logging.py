from __future__ import annotations

import logging

from fastapi import HTTPException
from fastapi import Request
from fastapi.testclient import TestClient

from app.main import create_app


def _request_complete_entries(caplog) -> list[tuple[logging.LogRecord, dict]]:  # noqa: ANN001
    entries: list[tuple[logging.LogRecord, dict]] = []
    for record in caplog.records:
        payload = getattr(record, "json_extra", None)
        if isinstance(payload, dict) and payload.get("event_id") == "request_complete":
            entries.append((record, payload))
    return entries


def test_request_complete_uses_neutral_success_message_for_200(caplog, monkeypatch, tmp_path) -> None:  # noqa: ANN001
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "request_complete_200.db"))
    app = create_app()
    caplog.set_level(logging.INFO, logger="pathos.request")

    with TestClient(app) as client:
        response = client.get("/api/v1/desktop/overview", headers={"Authorization": "Bearer k1"})

    assert response.status_code == 200
    record, payload = _request_complete_entries(caplog)[-1]
    assert record.levelno == logging.INFO
    assert payload["message"] == "Request completed (HTTP 200)."
    assert payload["details"]["status_code"] == 200
    assert payload["details"]["status_family"] == "2xx"
    assert payload["details"]["http_outcome"] == "success"


def test_request_complete_uses_client_error_message_for_404(caplog, monkeypatch, tmp_path) -> None:  # noqa: ANN001
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "request_complete_404.db"))
    app = create_app()
    caplog.set_level(logging.INFO, logger="pathos.request")

    with TestClient(app) as client:
        response = client.get("/api/v1/request-complete-not-found", headers={"Authorization": "Bearer k1"})

    assert response.status_code == 404
    record, payload = _request_complete_entries(caplog)[-1]
    assert record.levelno == logging.WARNING
    assert payload["message"] == "Client request rejected (HTTP 404)."
    assert payload["details"]["status_code"] == 404
    assert payload["details"]["status_family"] == "4xx"
    assert payload["details"]["http_outcome"] == "client_error"


def test_request_complete_uses_server_error_message_for_500(caplog, monkeypatch, tmp_path) -> None:  # noqa: ANN001
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "request_complete_500.db"))
    app = create_app()
    caplog.set_level(logging.INFO, logger="pathos.request")

    @app.get("/api/v1/test-request-complete-500")
    def test_request_complete_500() -> dict:
        # Teaching note:
        # We raise an HTTPException with a 5xx code instead of a raw runtime
        # exception so the middleware receives a concrete response object and
        # emits REQUEST_COMPLETE for the server-error status class.
        raise HTTPException(status_code=503, detail={"code": "SERVICE_UNAVAILABLE"})

    with TestClient(app) as client:
        response = client.get("/api/v1/test-request-complete-500")

    assert response.status_code == 503
    record, payload = _request_complete_entries(caplog)[-1]
    assert record.levelno == logging.ERROR
    assert payload["message"] == "Server error (HTTP 503)."
    assert payload["details"]["status_code"] == 503
    assert payload["details"]["status_family"] == "5xx"
    assert payload["details"]["http_outcome"] == "server_error"


def test_request_complete_includes_skip_reason_when_set_on_request_state(caplog, monkeypatch, tmp_path) -> None:  # noqa: ANN001
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "request_complete_skip_reason.db"))
    app = create_app()
    caplog.set_level(logging.INFO, logger="pathos.request")

    @app.get("/api/v1/test-request-complete-skip")
    def test_request_complete_skip(request: Request) -> dict:
        request.state.domain_outcome = "skipped"
        request.state.skip_reason = "MIN_INTERVAL"
        request.state.run_id = "run-min-interval"
        request.state.saved_search_id = "saved-123"
        return {"ok": True}

    with TestClient(app) as client:
        response = client.get("/api/v1/test-request-complete-skip")

    assert response.status_code == 200
    _, payload = _request_complete_entries(caplog)[-1]
    assert payload["details"]["skip_reason"] == "MIN_INTERVAL"
    assert payload["details"]["domain_outcome"] == "skipped"
    assert payload["run_id"] == "run-min-interval"
    assert payload["saved_search_id"] == "saved-123"


def test_request_complete_includes_empty_reason_when_set_on_request_state(caplog, monkeypatch, tmp_path) -> None:  # noqa: ANN001
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "request_complete_empty_reason.db"))
    app = create_app()
    caplog.set_level(logging.INFO, logger="pathos.request")

    @app.get("/api/v1/test-request-complete-empty")
    def test_request_complete_empty(request: Request) -> dict:
        request.state.domain_outcome = "empty"
        request.state.empty_reason = "UPSTREAM_ZERO_RESULTS"
        return {"ok": True}

    with TestClient(app) as client:
        response = client.get("/api/v1/test-request-complete-empty")

    assert response.status_code == 200
    _, payload = _request_complete_entries(caplog)[-1]
    assert payload["details"]["domain_outcome"] == "empty"
    assert payload["details"]["empty_reason"] == "UPSTREAM_ZERO_RESULTS"
