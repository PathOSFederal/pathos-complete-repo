from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.core.readiness import DatabaseReadinessError
from app.core.startup_validation import StartupValidationError
from app.db.migration_safety import MigrationSafetyResult
from app.main import create_app


def _assert_canonical_error(payload: dict) -> None:
    assert "error" in payload
    assert isinstance(payload["error"]["code"], str)
    assert isinstance(payload["error"]["message"], str)
    assert payload["error"]["category"] in {"client_error", "server_error"}
    correlation = payload["error"]["correlation"]
    assert isinstance(correlation["request_id"], str)
    assert "run_id" in correlation
    assert "rule_id" in correlation
    assert "saved_search_id" in correlation


def test_startup_config_validation_fails_fast_and_emits_structured_event(
    monkeypatch, capsys
) -> None:  # noqa: ANN001
    monkeypatch.setenv("USAJOBS_API_KEY", "")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "")

    with pytest.raises(StartupValidationError):
        create_app()

    rows: list[dict] = []
    for line in capsys.readouterr().out.splitlines():
        raw = line.strip()
        if not raw.startswith("{") or not raw.endswith("}"):
            continue
        payload = json.loads(raw)
        if isinstance(payload, dict):
            rows.append(payload)

    assert rows
    failure_rows = [
        row for row in rows if row.get("event_id") == "config_validation_failed"
    ]
    assert failure_rows
    assert isinstance(failure_rows[-1].get("event_id"), str)


def test_create_app_openapi_mode_allows_missing_usajobs_env(monkeypatch) -> None:
    monkeypatch.setenv("USAJOBS_API_KEY", "")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "")
    app = create_app(mode="openapi")
    assert app is not None


def test_health_live_returns_200_without_db_dependency(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "health_live.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "live"}


def test_health_ready_returns_200_when_database_and_migrations_are_ready(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "health_ready_ok.db"))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/health/ready")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ready"
    assert "db_revision" in payload
    assert "alembic_head" in payload
    assert payload["migration_status"] == "ok"
    assert "last_worker_run_at" in payload
    assert "last_worker_status" in payload
    assert "last_migration_audit_event_at" in payload
    assert "lock_state_summary" in payload
    assert "worker_enabled" in payload
    assert "alerts_evaluation_enabled" in payload
    assert "dry_run_mode" in payload
    assert "worker_operational_state" in payload
    assert "worker_pause_reason_set" in payload


def test_health_ready_returns_canonical_error_when_database_unavailable(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "health_ready_db_fail.db"))
    app = create_app()
    monkeypatch.setattr(
        "app.api.v1.health.ensure_database_ready",
        lambda **_: (_ for _ in ()).throw(DatabaseReadinessError("db down")),
    )
    with TestClient(app) as client:
        response = client.get("/health/ready")
    assert response.status_code == 503
    payload = response.json()
    _assert_canonical_error(payload)
    assert payload["error"]["code"] == "DATABASE_UNAVAILABLE"
    assert payload["error"]["category"] == "server_error"


def test_health_ready_returns_not_ready_when_migrations_mismatch(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv(
        "PATHOS_DB_PATH", str(tmp_path / "health_ready_migration_fail.db")
    )
    app = create_app()
    monkeypatch.setattr(
        "app.api.v1.health.ensure_database_ready",
        lambda **_: MigrationSafetyResult(
            db_revision="old_revision",
            alembic_head="new_revision",
            migration_status="mismatch",
            message="Database schema revision mismatch detected.",
        ),
    )
    with TestClient(app) as client:
        response = client.get("/health/ready")
    assert response.status_code == 503
    payload = response.json()
    assert payload["status"] == "not_ready"
    assert payload["db_revision"] == "old_revision"
    assert payload["alembic_head"] == "new_revision"
    assert payload["migration_status"] == "mismatch"
    assert "last_worker_run_at" in payload
    assert "last_worker_status" in payload
    assert "last_migration_audit_event_at" in payload
    assert "lock_state_summary" in payload


def test_diagnostics_snapshot_returns_safe_operational_metadata(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "diagnostics_snapshot.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "super-secret-key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "private-agent@example.com")
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/v1/diagnostics/snapshot")
    assert response.status_code == 200
    payload = response.json()
    assert payload["service_version"]
    assert payload["environment"]
    assert payload["db_dialect"] in {"sqlite", "postgres"}
    assert "counts" in payload
    assert isinstance(payload["counts"]["saved_searches"], int)
    assert isinstance(payload["counts"]["alert_rules"], int)
    assert isinstance(payload["counts"]["alert_runs"], int)
    serialized = json.dumps(payload, sort_keys=True)
    assert "super-secret-key" not in serialized
    assert "private-agent@example.com" not in serialized


def test_health_ready_mismatch_emits_structured_migration_safety_event(
    monkeypatch, tmp_path, capsys
) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv(
        "PATHOS_DB_PATH", str(tmp_path / "health_ready_migration_event.db")
    )
    app = create_app()
    monkeypatch.setattr(
        "app.api.v1.health.ensure_database_ready",
        lambda **_: MigrationSafetyResult(
            db_revision="old_revision",
            alembic_head="new_revision",
            migration_status="mismatch",
            message="Database schema revision mismatch detected.",
        ),
    )
    with TestClient(app) as client:
        response = client.get("/health/ready", headers={"X-Request-ID": "req-slice88"})
    assert response.status_code == 503

    rows: list[dict] = []
    for line in capsys.readouterr().out.splitlines():
        raw = line.strip()
        if not raw.startswith("{") or not raw.endswith("}"):
            continue
        payload = json.loads(raw)
        if isinstance(payload, dict):
            rows.append(payload)
    mismatch_rows = [
        row for row in rows if row.get("event_id") == "migration_safety_mismatch"
    ]
    assert mismatch_rows
    event = mismatch_rows[-1]
    assert event.get("request_id") == "req-slice88"
    assert event.get("details", {}).get("db_revision") == "old_revision"
    assert event.get("details", {}).get("alembic_head") == "new_revision"


def test_health_ready_reflects_worker_paused_state(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "health_ready_paused.db"))
    monkeypatch.setenv("WORKER_ENABLED", "false")
    monkeypatch.setenv("ALERTS_EVALUATION_ENABLED", "true")
    monkeypatch.setenv("DRY_RUN_MODE", "true")
    monkeypatch.setenv("PAUSE_REASON", "maintenance-window")
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/health/ready")

    assert response.status_code == 200
    payload = response.json()
    assert payload["worker_enabled"] is False
    assert payload["alerts_evaluation_enabled"] is True
    assert payload["dry_run_mode"] is True
    assert payload["worker_operational_state"] == "paused"
    assert payload["worker_pause_reason_set"] is True
