from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi.testclient import TestClient
import pytest

from app.db.repo.alert_digest_repo import AlertDigestRepo
from app.db.repo.alert_run_repo import AlertRunRepo
from app.main import create_app
from app.models.alert_digest import AlertDigestPayload, DeliveryIntent
from app.services.delivery_transport_service import (
    EmailDigestFutureTransport,
    LocalDigestTransport,
    PlaceholderDeliveryDisabledError,
)


def _intent(*, run_id: str, alert_rule_id: str) -> DeliveryIntent:
    return DeliveryIntent(
        run_id=run_id,
        alert_rule_id=alert_rule_id,
        saved_search_id="saved-1",
        delivery_mode="digest_payload",
        created_at=datetime(2026, 2, 14, 0, 0, tzinfo=timezone.utc),
        digest_payload=AlertDigestPayload(
            totals={"new": 1},
            top_jobs=[{"job_id": "J1", "score": 90}],
            reasons_summary=["GRADE_MATCH"],
            risks_summary=[],
            run_metadata={"ruleset_version": "job-scoring-v1"},
        ),
        triggered_job_ids=["J1"],
    )


def test_local_digest_transport_persists_digest(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "delivery_transport.db"))
    app = create_app()
    with TestClient(app) as client:
        saved = client.post("/api/v1/saved-searches", json={"name": "S", "query": {"keyword": "analyst"}}).json()
        rule = client.post(
            "/api/v1/alert-rules",
            json={"saved_search_id": saved["id"], "min_score_threshold": 0, "max_per_day": 10, "cooldown_hours": 0},
        ).json()
    AlertRunRepo.create(
        {
            "id": "run-1",
            "started_at": "2026-02-14T00:00:00+00:00",
            "ended_at": "2026-02-14T00:00:01+00:00",
            "status": "success",
            "rules_evaluated": 1,
            "jobs_scanned": 1,
            "triggers_count": 1,
            "suppressed_count": 0,
            "error_summary": None,
            "usajobs_fetch_ms": 0,
            "normalize_ms": 0,
            "score_ms": 0,
            "delta_ms": 0,
            "digest_ms": 0,
            "backoff_events_json": "[]",
            "lock_acquired": True,
            "lock_released": True,
        }
    )
    transport = LocalDigestTransport()

    transport.deliver(_intent(run_id="run-1", alert_rule_id=rule["id"]))

    rows = AlertDigestRepo.list_recent(limit=5)
    assert len(rows) == 1
    payload = json.loads(rows[0]["payload_json"])
    assert payload["totals"]["new"] == 1


def test_email_digest_future_transport_is_noop(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "delivery_transport_noop.db"))
    monkeypatch.setenv("PATHOS_ENV", "local")
    transport = EmailDigestFutureTransport()

    transport.deliver(_intent(run_id="run-1", alert_rule_id="rule-1"))

    rows = AlertDigestRepo.list_recent(limit=5)
    assert rows == []


def test_email_digest_future_transport_is_disabled_outside_local(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "delivery_transport_prod.db"))
    monkeypatch.setenv("PATHOS_ENV", "staging")
    transport = EmailDigestFutureTransport()

    with pytest.raises(PlaceholderDeliveryDisabledError, match="disabled outside local/dev/test/ci"):
        transport.deliver(_intent(run_id="run-2", alert_rule_id="rule-2"))
