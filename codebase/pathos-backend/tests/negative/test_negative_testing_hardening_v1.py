from __future__ import annotations

import sqlite3

from fastapi.testclient import TestClient
import pytest

from app.main import create_app
from app.services.alerts_run_service import AlertsRunService
from app.services.job_search_service import JobSearchRateLimitedError


def test_negative__alerts_run_not_configured_sets_skip_reason_and_no_upstream_audit(monkeypatch, tmp_path) -> None:
    # Teacher note:
    # Missing USAJOBS config is a controlled skip state, not a failed upstream attempt.
    # If this regresses, we will produce noisy incidents and misleading audit rows.
    db_path = tmp_path / "negative_alerts_not_configured.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setenv("USAJOBS_API_KEY", "")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "")
    app = create_app(mode="openapi")

    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()
        client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": saved["id"], "min_score_threshold": 0, "max_per_day": 10, "cooldown_hours": 0},
        )
        run = client.post("/api/v1/alerts/run")

    assert run.status_code == 200
    assert run.json()["domain_outcome"] == "skipped"
    assert run.json()["skip_reason"] == "USJOBS_NOT_CONFIGURED"
    with sqlite3.connect(db_path) as conn:
        audit_count = conn.execute("SELECT COUNT(1) FROM upstream_api_audit_records WHERE endpoint='/api/search'").fetchone()
    assert audit_count is not None and int(audit_count[0]) == 0


def test_negative__run_with_backoff_retries_then_raises_rate_limit(monkeypatch) -> None:
    # Teacher note:
    # Backoff timing is critical under throttling. We assert retry count and delays to avoid
    # accidental tight loops or silent swallow of terminal failures.
    del monkeypatch
    delays: list[float] = []

    def _always_rate_limited() -> dict:
        raise JobSearchRateLimitedError("429")

    with pytest.raises(JobSearchRateLimitedError):
        AlertsRunService._run_with_backoff(  # noqa: SLF001 - intentional direct unit test of retry helper.
            fn=_always_rate_limited,
            max_attempts=3,
            base_backoff_seconds=1,
            sleep_fn=lambda value: delays.append(value),
        )

    assert delays == [1.0, 2.0]

