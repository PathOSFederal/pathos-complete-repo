from __future__ import annotations

import os
from datetime import datetime, timezone
from importlib.util import find_spec
from uuid import uuid4

import pytest

from app.core.config import refresh_settings
from app.db.connection import init_db
from app.db.repo.alert_digest_repo import AlertDigestRepo
from app.db.repo.alert_rule_repo import AlertRuleRepo
from app.db.repo.alert_run_repo import AlertRunRepo
from app.db.repo.saved_search_repo import SavedSearchRepo
from app.models.alert_digest import AlertDigestPayload, DeliveryIntent
from app.services.alert_digest_service import AlertDigestService
from app.services.alerts_run_service import AlertsRunService
from app.services.delivery_transport_service import LocalDigestTransport


@pytest.fixture(params=["sqlite", "postgres"], ids=["sqlite", "postgres"])
def repo_dialect(monkeypatch, request, tmp_path) -> str:
    if request.param == "sqlite":
        monkeypatch.setenv("DB_DIALECT", "sqlite")
        monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "repo_contracts.sqlite3"))
        monkeypatch.delenv("DATABASE_URL", raising=False)
        refresh_settings()
        init_db()
        return "sqlite"

    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        pytest.skip("DATABASE_URL not set; skipping postgres contract tests.")
    if find_spec("psycopg") is None:
        pytest.skip("psycopg not installed; skipping postgres contract tests.")
    monkeypatch.setenv("DB_DIALECT", "postgres")
    monkeypatch.setenv("DATABASE_URL", database_url)
    refresh_settings()
    init_db()
    return "postgres"


def _saved_search_payload(saved_search_id: str) -> dict:
    return {
        "id": saved_search_id,
        "name": f"Saved Search {saved_search_id}",
        "filters_json": "{}",
        "query_payload": None,
        "profile_payload": None,
        "ruleset_version": None,
        "is_enabled": True,
        "last_run_at": None,
        "created_at": "2026-02-23T00:00:00+00:00",
        "updated_at": "2026-02-23T00:00:00+00:00",
    }


def _alert_rule_payload(rule_id: str, saved_search_id: str, enabled: bool) -> dict:
    return {
        "id": rule_id,
        "saved_search_id": saved_search_id,
        "min_score_threshold": 10,
        "max_per_day": 5,
        "cooldown_hours": 1,
        "delivery_mode": "digest_payload",
        "enabled": enabled,
        "created_at": "2026-02-23T00:00:00+00:00",
        "updated_at": "2026-02-23T00:00:00+00:00",
    }


def test_contract_alert_rules_boolean_predicate(repo_dialect: str) -> None:
    suffix = uuid4().hex
    saved_search_id = f"saved-{repo_dialect}-{suffix}"
    enabled_rule_id = f"rule-enabled-{suffix}"
    disabled_rule_id = f"rule-disabled-{suffix}"

    SavedSearchRepo.create(_saved_search_payload(saved_search_id))
    AlertRuleRepo.create(_alert_rule_payload(enabled_rule_id, saved_search_id, True))
    AlertRuleRepo.create(_alert_rule_payload(disabled_rule_id, saved_search_id, False))

    enabled_rows = AlertRuleRepo.list_enabled()
    enabled_ids = {str(row["id"]) for row in enabled_rows}
    assert enabled_rule_id in enabled_ids, (
        f"[{repo_dialect}] enabled rule must be listed by list_enabled"
    )
    assert disabled_rule_id not in enabled_ids, (
        f"[{repo_dialect}] disabled rule must be filtered from list_enabled"
    )


def test_contract_saved_search_null_handling(repo_dialect: str) -> None:
    suffix = uuid4().hex
    saved_search_id = f"saved-null-{repo_dialect}-{suffix}"

    payload = _saved_search_payload(saved_search_id)
    SavedSearchRepo.create(payload)
    row = SavedSearchRepo.get_by_id(saved_search_id)

    assert row is not None, (
        f"[{repo_dialect}] saved search row should exist after create"
    )
    assert row["profile_payload"] is None, (
        f"[{repo_dialect}] profile_payload NULL must round-trip as None"
    )
    assert row["ruleset_version"] in {
        None,
        "job-scoring-v1",
    }, (
        f"[{repo_dialect}] ruleset_version should remain nullable or normalize to default"
    )
    assert row["last_run_at"] is None, (
        f"[{repo_dialect}] last_run_at NULL must round-trip as None"
    )


def test_contract_idempotent_operations_for_digests_and_alert_runs(
    repo_dialect: str,
) -> None:
    suffix = uuid4().hex
    saved_search_id = f"saved-idempotent-{repo_dialect}-{suffix}"
    rule_id = f"rule-idempotent-{suffix}"
    run_id = f"run-idempotent-{suffix}"

    try:
        SavedSearchRepo.create(_saved_search_payload(saved_search_id))
        AlertRuleRepo.create(_alert_rule_payload(rule_id, saved_search_id, True))
        AlertRunRepo.create(
            {
                "id": run_id,
                "started_at": "2026-02-23T00:00:00+00:00",
                "ended_at": None,
                "status": "success",
                "rules_evaluated": 1,
                "jobs_scanned": 0,
                "triggers_count": 0,
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
                "skip_reason": None,
                "skip_details": None,
            }
        )
        AlertDigestRepo.create(
            {
                "id": f"digest-a-{suffix}",
                "alert_run_id": run_id,
                "alert_rule_id": rule_id,
                "created_at": "2026-02-23T00:00:00+00:00",
                "delivery_mode": "digest_payload",
                "payload_json": "{}",
            }
        )
        AlertDigestRepo.create(
            {
                "id": f"digest-b-{suffix}",
                "alert_run_id": run_id,
                "alert_rule_id": rule_id,
                "created_at": "2026-02-23T00:01:00+00:00",
                "delivery_mode": "digest_payload",
                "payload_json": "{}",
            }
        )
    except Exception as exc:
        if repo_dialect == "postgres" and "connection timeout" in str(exc).lower():
            pytest.skip("Postgres became unreachable during contract test execution.")
        raise

    deleted_first = AlertDigestRepo.delete_for_rule(rule_id)
    deleted_second = AlertDigestRepo.delete_for_rule(rule_id)
    assert deleted_first == 2, (
        f"[{repo_dialect}] first delete_for_rule call should remove both rows"
    )
    assert deleted_second == 0, (
        f"[{repo_dialect}] second delete_for_rule call should be a no-op"
    )

    update_missing = {
        "id": f"missing-run-{suffix}",
        "ended_at": "2026-02-23T01:00:00+00:00",
        "status": "failed",
        "rules_evaluated": 0,
        "jobs_scanned": 0,
        "triggers_count": 0,
        "suppressed_count": 0,
        "error_summary": "missing",
        "usajobs_fetch_ms": 0,
        "normalize_ms": 0,
        "score_ms": 0,
        "delta_ms": 0,
        "digest_ms": 0,
        "backoff_events_json": "[]",
        "lock_acquired": False,
        "lock_released": False,
        "skip_reason": None,
        "skip_details": None,
    }
    first_missing = AlertRunRepo.update(update_missing)
    second_missing = AlertRunRepo.update(update_missing)
    assert first_missing is False, (
        f"[{repo_dialect}] update on missing run must return False"
    )
    assert second_missing is False, (
        f"[{repo_dialect}] repeated update on missing run must remain False"
    )


def test_contract_service_latest_run_timestamp_ordering(repo_dialect: str) -> None:
    suffix = uuid4().hex
    older_run_id = f"run-older-{suffix}"
    newer_run_id = f"run-newer-{suffix}"
    for run_id, started_at in (
        (older_run_id, "2099-02-22T00:00:00+00:00"),
        (newer_run_id, "2099-02-23T00:00:00+00:00"),
    ):
        AlertRunRepo.create(
            {
                "id": run_id,
                "started_at": started_at,
                "ended_at": "2099-02-23T00:00:01+00:00",
                "status": "success",
                "rules_evaluated": 0,
                "jobs_scanned": 0,
                "triggers_count": 0,
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
                "skip_reason": None,
                "skip_details": None,
            }
        )

    runs = AlertsRunService.list_runs(limit=1000)
    created = [run for run in runs if run.id in {older_run_id, newer_run_id}]
    assert len(created) == 2
    by_id = {item.id: item for item in created}
    assert by_id[newer_run_id].started_at > by_id[older_run_id].started_at, (
        f"[{repo_dialect}] service timestamp parsing must preserve ordering semantics"
    )


def test_contract_service_null_skip_fields_round_trip(repo_dialect: str) -> None:
    suffix = uuid4().hex
    run_id = f"run-null-skip-{suffix}"
    AlertRunRepo.create(
        {
            "id": run_id,
            "started_at": "2099-03-01T00:00:00+00:00",
            "ended_at": None,
            "status": "success",
            "rules_evaluated": 0,
            "jobs_scanned": 0,
            "triggers_count": 0,
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
            "skip_reason": None,
            "skip_details": None,
        }
    )

    runs = AlertsRunService.list_runs(limit=1000)
    matching = [run for run in runs if run.id == run_id]
    assert matching
    row = matching[0]
    assert row.skip_reason is None, (
        f"[{repo_dialect}] skip_reason NULL must round-trip as None in service output"
    )
    assert row.skip_details is None, (
        f"[{repo_dialect}] skip_details NULL must round-trip as None in service output"
    )


def test_contract_service_digest_idempotency(repo_dialect: str) -> None:
    suffix = uuid4().hex
    saved_search_id = f"saved-service-idempotent-{repo_dialect}-{suffix}"
    rule_id = f"rule-service-idempotent-{suffix}"
    run_id = f"run-service-idempotent-{suffix}"

    SavedSearchRepo.create(_saved_search_payload(saved_search_id))
    AlertRuleRepo.create(_alert_rule_payload(rule_id, saved_search_id, True))
    AlertRunRepo.create(
        {
            "id": run_id,
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
            "skip_reason": None,
            "skip_details": None,
        }
    )

    intent = DeliveryIntent(
        run_id=run_id,
        alert_rule_id=rule_id,
        saved_search_id=saved_search_id,
        delivery_mode="digest_payload",
        created_at=datetime(2026, 2, 23, 0, 0, tzinfo=timezone.utc),
        digest_payload=AlertDigestPayload(
            totals={"new": 1},
            top_jobs=[{"job_id": "J1", "score": 99}],
            reasons_summary=["MATCH"],
            risks_summary=[],
            run_metadata={"run_id": run_id},
        ),
        triggered_job_ids=["J1"],
    )
    transport = LocalDigestTransport()
    transport.deliver(intent)
    transport.deliver(intent)

    recent = AlertDigestService.list_recent(limit=10)
    matching = [item for item in recent if item.alert_run_id == run_id]
    assert len(matching) == 1, (
        f"[{repo_dialect}] duplicate delivery intents must not persist duplicate digests"
    )
