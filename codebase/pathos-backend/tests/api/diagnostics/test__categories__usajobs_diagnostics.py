from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.adapters.usajobs.types import USAJobsSearchResponse, UpstreamAuditSummary
from app.main import create_app


def test_use_case__diagnostics_returns_not_configured_when_env_missing(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "diag_missing.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "")
    app = create_app(mode="openapi")

    with TestClient(app) as client:
        response = client.get("/api/v1/diagnostics/usajobs")

    assert response.status_code == 200
    body = response.json()
    assert body["configured"] is False
    assert body["can_query"] is False
    assert body["sample_count"] == 0
    assert body["duration_ms"] == 0
    assert body["domain_outcome"] == "skipped"
    assert body["skip_reason"] == "USJOBS_NOT_CONFIGURED"
    assert body["env"]["USAJOBS_API_KEY"] == "missing"
    assert body["env"]["USAJOBS_USER_AGENT"] == "missing"
    assert body["error"]["code"] == "USJOBS_NOT_CONFIGURED"


def test_negative__diagnostics_response_never_returns_secret_values(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "diag_present.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "very-secret-key-123")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "secret.user@example.com")

    def _fake_search(self, query_params):  # noqa: ANN001
        del self, query_params
        return USAJobsSearchResponse(
            payload={"SearchResult": {"SearchResultItems": []}},
            audit=UpstreamAuditSummary(
                endpoint="/api/search",
                query_hash="h",
                status_code=200,
                latency_ms=5,
                result_count=0,
                error_class=None,
            ),
        )

    monkeypatch.setattr("app.services.usajobs_diagnostics_service.USAJobsClient.search_jobs", _fake_search)
    app = create_app(mode="openapi")

    with TestClient(app) as client:
        response = client.get("/api/v1/diagnostics/usajobs")

    assert response.status_code == 200
    body = response.json()
    assert body["domain_outcome"] == "empty"
    assert body["empty_reason"] == "UPSTREAM_ZERO_RESULTS"
    assert body["env"]["USAJOBS_API_KEY"] == "present"
    assert body["env"]["USAJOBS_USER_AGENT"] == "present"
    payload = json.dumps(body, sort_keys=True)
    assert "very-secret-key-123" not in payload
    assert "secret.user@example.com" not in payload
