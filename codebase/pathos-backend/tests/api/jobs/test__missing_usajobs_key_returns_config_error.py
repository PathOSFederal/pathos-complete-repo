"""Regression: missing USAJOBS API key returns deterministic 503 config error (not 502).

Uses monkeypatch so the test does not depend on a real .env file.
No live network calls.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import refresh_settings
from app.main import create_app


def test_missing_usajobs_key_returns_503_config_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """POST /api/v1/jobs/search with USAJOBS_API_KEY empty returns 503 with clear message."""
    monkeypatch.setenv("USAJOBS_API_KEY", "")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "PathOSAdvisor (test@pathosadvisor.com)")
    refresh_settings()

    app = create_app(mode="openapi")
    client = TestClient(app)
    response = client.post(
        "/api/v1/jobs/search",
        json={"keyword": "Engineer", "page": 1, "page_size": 10},
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 503
    data = response.json()
    assert "error" in data
    assert data["error"].get("message") == "The service is temporarily unavailable. Retry after a short delay."
    assert data["error"].get("code") == "SERVICE_UNAVAILABLE"
