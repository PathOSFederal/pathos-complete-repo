from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.adapters.usajobs.errors import UpstreamAuthError
from app.main import create_app


def test_misuse_case__diagnostics_never_leaks_env_secret_values_on_failure(monkeypatch, tmp_path) -> None:
    # Teacher note:
    # Diagnostics is intentionally public-ish observability. If this leaks raw secret values,
    # we create an incident-grade exposure. We assert presence-only semantics even on failures.
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "misuse_diagnostics_secret_safety.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "super-secret-key-value")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "secret-user@example.com")

    def _raise_auth(self, query_params):  # noqa: ANN001
        del self, query_params
        raise UpstreamAuthError("rejected")

    monkeypatch.setattr("app.services.usajobs_diagnostics_service.USAJobsClient.search_jobs", _raise_auth)
    app = create_app(mode="openapi")

    with TestClient(app) as client:
        response = client.get("/api/v1/diagnostics/usajobs")

    assert response.status_code == 200
    body = response.json()
    assert body["env"]["USAJOBS_API_KEY"] == "present"
    assert body["env"]["USAJOBS_USER_AGENT"] == "present"
    serialized = json.dumps(body, sort_keys=True)
    assert "super-secret-key-value" not in serialized
    assert "secret-user@example.com" not in serialized


def test_misuse_case__malformed_job_search_request_returns_422_without_stack_trace(monkeypatch, tmp_path) -> None:
    # Teacher note:
    # Misuse inputs should fail with a stable 422 contract instead of internal details.
    # If this regresses, API consumers see brittle errors and potential implementation leakage.
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "misuse_bad_job_request.db"))
    app = create_app()

    with TestClient(app) as client:
        response = client.post("/api/v1/jobs/search", json={"keyword": "", "page": 0, "page_size": 101})

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"]["code"] == "VALIDATION_ERROR"
    assert payload["error"]["category"] == "client_error"
    assert "traceback" not in json.dumps(payload, sort_keys=True).lower()

