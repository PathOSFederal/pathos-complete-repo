from __future__ import annotations

from datetime import datetime, timezone
import logging
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.db.repo.alert_digest_repo import AlertDigestRepo
from app.db.repo.alert_run_repo import AlertRunRepo
from app.models.alert_digest import AlertDigestPayload, DeliveryIntent
from app.models.alert_rule import AlertRunSummary
from app.models.outcome import DomainOutcome
from app.core.startup_validation import StartupValidationError
from app.main import create_app
from app.services.alerts_run_service import AlertsRunService
from app.services.delivery_transport_service import LocalDigestTransport
from app.worker import _worker_startup_preflight, run_alerts_once


def _events_by_id(caplog, event_id: str) -> list[dict[str, Any]]:  # noqa: ANN001
    events: list[dict[str, Any]] = []
    for record in caplog.records:
        payload = getattr(record, "json_extra", None)
        if isinstance(payload, dict) and payload.get("event_id") == event_id:
            events.append(payload)
    return events


def test_worker_run_alerts_once_reuses_service(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "worker_run_once.db"))
    monkeypatch.setattr(
        "app.services.alerts_run_service.AlertsRunService.run_enabled_rules",
        lambda request_id, **kwargs: AlertRunSummary(
            run_id="run-1",
            started_at=datetime(2026, 2, 14, 0, 0, tzinfo=timezone.utc),
            ended_at=datetime(2026, 2, 14, 0, 1, tzinfo=timezone.utc),
            status="success",
            rules_evaluated=1,
            jobs_scanned=2,
            triggers_count=1,
            suppressed_count=1,
            per_rule=[],
            domain_outcome=DomainOutcome.SUCCESS,
            error_summary=None,
        ),
    )

    result = run_alerts_once()
    assert result["status"] == "success"
    assert result["summary"]["run_id"] == "run-1"


def test_worker_startup_preflight_logs_success_event(caplog, monkeypatch) -> None:  # noqa: ANN001
    monkeypatch.setattr("app.worker.validate_startup_config", lambda **_: None)
    monkeypatch.setattr("app.worker.ensure_database_ready", lambda **_: None)
    caplog.set_level(logging.INFO, logger="pathos.worker")

    _worker_startup_preflight()

    payloads = [getattr(record, "json_extra", None) for record in caplog.records]
    events = [
        payload
        for payload in payloads
        if isinstance(payload, dict) and payload.get("event_id") == "worker_startup_ok"
    ]
    assert events


def test_worker_startup_preflight_logs_failure_event(caplog, monkeypatch) -> None:  # noqa: ANN001
    def _raise_validation_error(**_kwargs) -> None:
        raise StartupValidationError("invalid")

    monkeypatch.setattr("app.worker.validate_startup_config", _raise_validation_error)
    caplog.set_level(logging.INFO, logger="pathos.worker")

    with pytest.raises(StartupValidationError):
        _worker_startup_preflight()

    payloads = [getattr(record, "json_extra", None) for record in caplog.records]
    events = [
        payload
        for payload in payloads
        if isinstance(payload, dict)
        and payload.get("event_id") == "worker_startup_failed"
    ]
    assert events


def test_worker_retry_path_does_not_duplicate_digests(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "worker_digest_idempotency.db"))
    app = create_app()
    with TestClient(app) as client:
        saved = client.post(
            "/api/v1/saved-searches",
            json={"name": "S", "query": {"keyword": "analyst"}},
        ).json()
        rule = client.post(
            "/api/v1/alert-rules",
            json={
                "saved_search_id": saved["id"],
                "min_score_threshold": 0,
                "max_per_day": 10,
                "cooldown_hours": 0,
            },
        ).json()
    AlertRunRepo.create(
        {
            "id": "run-idempotent-1",
            "started_at": "2026-02-23T00:00:00+00:00",
            "ended_at": "2026-02-23T00:00:01+00:00",
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
    intent = DeliveryIntent(
        run_id="run-idempotent-1",
        alert_rule_id=rule["id"],
        saved_search_id=saved["id"],
        delivery_mode="digest_payload",
        created_at=datetime(2026, 2, 23, 0, 0, tzinfo=timezone.utc),
        digest_payload=AlertDigestPayload(
            totals={"new": 1},
            top_jobs=[{"job_id": "J1", "score": 95}],
            reasons_summary=["MATCH"],
            risks_summary=[],
            run_metadata={"run_id": "run-idempotent-1"},
        ),
        triggered_job_ids=["J1"],
    )

    transport.deliver(intent)
    transport.deliver(intent)

    assert len(AlertDigestRepo.list_recent(limit=10)) == 1


def test_worker_budget_stop_path_is_deterministic(
    monkeypatch, tmp_path, caplog
) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "worker_budget_stop.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "x")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "test@example.com")
    app = create_app()
    with TestClient(app) as client:
        first_saved = client.post(
            "/api/v1/saved-searches",
            json={"name": "S1", "query": {"keyword": "analyst"}},
        ).json()
        second_saved = client.post(
            "/api/v1/saved-searches",
            json={"name": "S2", "query": {"keyword": "engineer"}},
        ).json()
        client.post(
            "/api/v1/alert-rules",
            json={
                "saved_search_id": first_saved["id"],
                "min_score_threshold": 0,
                "max_per_day": 10,
                "cooldown_hours": 0,
            },
        )
        client.post(
            "/api/v1/alert-rules",
            json={
                "saved_search_id": second_saved["id"],
                "min_score_threshold": 0,
                "max_per_day": 10,
                "cooldown_hours": 0,
            },
        )

    monkeypatch.setattr(
        "app.services.saved_search_runner_service.SavedSearchRunnerService.run_saved_search",
        lambda *args, **kwargs: {
            "results": [],
            "timings_ms": {"usajobs_fetch_ms": 1, "normalize_ms": 1, "score_ms": 1},
            "ruleset_version": "job-scoring-v1",
            "mapper_version": "usajobs-normalize-v1",
            "query_fingerprint": "fp",
            "resume_cursor_used": {"strategy": "full_refresh"},
        },
    )
    monkeypatch.setattr(
        "app.services.delta_engine_service.DeltaEngineService.classify_and_update_snapshots",
        lambda *args, **kwargs: {"deltas": []},
    )
    caplog.set_level(logging.INFO, logger="pathos.alerts")

    summary = AlertsRunService.run_enabled_rules(
        request_id="req-budget-stop", max_rules_evaluated=1
    )

    assert summary.rules_evaluated == 1
    budget_events = _events_by_id(caplog, "budget_exceeded")
    assert budget_events


def test_worker_poison_pill_isolated_and_run_continues(
    monkeypatch, tmp_path, caplog
) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "worker_poison_pill.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "x")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "test@example.com")
    app = create_app()
    with TestClient(app) as client:
        failing_saved = client.post(
            "/api/v1/saved-searches",
            json={"name": "Failing", "query": {"keyword": "analyst"}},
        ).json()
        healthy_saved = client.post(
            "/api/v1/saved-searches",
            json={"name": "Healthy", "query": {"keyword": "engineer"}},
        ).json()
        client.post(
            "/api/v1/alert-rules",
            json={
                "saved_search_id": failing_saved["id"],
                "min_score_threshold": 0,
                "max_per_day": 10,
                "cooldown_hours": 0,
            },
        )
        client.post(
            "/api/v1/alert-rules",
            json={
                "saved_search_id": healthy_saved["id"],
                "min_score_threshold": 0,
                "max_per_day": 10,
                "cooldown_hours": 0,
            },
        )

    def _run_saved_search(saved_search_id: str, **kwargs) -> dict:
        del kwargs
        if saved_search_id == failing_saved["id"]:
            raise ValueError("poison")
        return {
            "results": [],
            "timings_ms": {"usajobs_fetch_ms": 1, "normalize_ms": 1, "score_ms": 1},
            "ruleset_version": "job-scoring-v1",
            "mapper_version": "usajobs-normalize-v1",
            "query_fingerprint": "fp",
            "resume_cursor_used": {"strategy": "full_refresh"},
        }

    monkeypatch.setattr(
        "app.services.saved_search_runner_service.SavedSearchRunnerService.run_saved_search",
        _run_saved_search,
    )
    monkeypatch.setattr(
        "app.services.delta_engine_service.DeltaEngineService.classify_and_update_snapshots",
        lambda *args, **kwargs: {"deltas": []},
    )
    caplog.set_level(logging.INFO, logger="pathos.alerts")

    summary = AlertsRunService.run_enabled_rules(request_id="req-poison-pill")

    assert summary.rules_evaluated == 2
    assert summary.status == "partial_failure"
    poison_events = _events_by_id(caplog, "poison_pill_quarantined")
    evaluated_events = _events_by_id(caplog, "alert_rule_evaluated")
    assert poison_events
    assert evaluated_events
