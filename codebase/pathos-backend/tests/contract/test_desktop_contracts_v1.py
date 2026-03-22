from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.main import create_app


def _collect_key_paths(value: object, prefix: str = "") -> set[str]:
    paths: set[str] = set()
    if isinstance(value, dict):
        for key, nested in value.items():
            key_name = str(key)
            child_prefix = f"{prefix}.{key_name}" if prefix else key_name
            paths.add(child_prefix)
            paths.update(_collect_key_paths(nested, prefix=child_prefix))
    elif isinstance(value, list):
        for idx, nested in enumerate(value):
            child_prefix = f"{prefix}[{idx}]"
            paths.update(_collect_key_paths(nested, prefix=child_prefix))
    return paths


def test_health_ready_contract_shape_is_stable(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "desktop_contract_health.db"))
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/health/ready")

    assert response.status_code in {200, 503}
    payload = response.json()
    expected_keys = {
        "status",
        "db_revision",
        "alembic_head",
        "migration_status",
        "worker_enabled",
        "alerts_evaluation_enabled",
        "dry_run_mode",
        "worker_operational_state",
        "worker_pause_reason_set",
        "last_worker_run_at",
        "last_worker_status",
        "last_migration_audit_event_at",
        "lock_state_summary",
    }
    assert expected_keys.issubset(set(payload.keys()))
    assert payload["status"] in {"ready", "not_ready"}
    assert isinstance(payload["worker_enabled"], bool)
    assert isinstance(payload["alerts_evaluation_enabled"], bool)
    assert isinstance(payload["dry_run_mode"], bool)
    assert payload["worker_operational_state"] in {"running", "paused"}
    assert isinstance(payload["worker_pause_reason_set"], bool)
    lock_summary = payload["lock_state_summary"]
    assert isinstance(lock_summary, dict)
    assert isinstance(lock_summary["lock_name"], str)
    assert isinstance(lock_summary["lock_held"], bool)
    assert isinstance(lock_summary["active_locks"], int)


def test_diagnostics_snapshot_contract_is_safe_and_stable(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv(
        "PATHOS_DB_PATH", str(tmp_path / "desktop_contract_diagnostics.db")
    )
    monkeypatch.setenv("USAJOBS_API_KEY", "super-secret-key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "private-agent@example.com")
    app = create_app()

    with TestClient(app) as client:
        response = client.get(
            "/api/v1/diagnostics/snapshot", headers={"Authorization": "Bearer k1"}
        )

    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {
        "service_version",
        "environment",
        "db_dialect",
        "alembic_head",
        "db_revision",
        "counts",
        "last_worker_run_at",
        "last_worker_status",
        "last_error_summaries",
    }
    assert isinstance(payload["service_version"], str)
    assert isinstance(payload["environment"], str)
    assert payload["db_dialect"] in {"sqlite", "postgres"}
    counts = payload["counts"]
    assert isinstance(counts, dict)
    assert isinstance(counts["saved_searches"], int)
    assert isinstance(counts["alert_rules"], int)
    assert isinstance(counts["alert_runs"], int)
    assert isinstance(payload["last_error_summaries"], list)

    serialized = json.dumps(payload, sort_keys=True).lower()
    for blocked_value in ("super-secret-key", "private-agent@example.com"):
        assert blocked_value not in serialized
    key_paths = {path.lower() for path in _collect_key_paths(payload)}
    for blocked_key in (
        "api_key",
        "authorization",
        "token",
        "password",
        "secret",
        "raw_payload",
        "upstream_raw",
    ):
        assert not any(blocked_key in key_path for key_path in key_paths)


def test_export_contract_includes_integrity_metadata_with_backward_keys(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "desktop_contract_export.db"))
    app = create_app()

    monkeypatch.setattr(
        "app.api.v1.export.ExportService.export_recent",
        lambda limit: {
            "threads": [],
            "audits": [],
            "export_hash": "abc123",
            "hash_alg": "sha256",
            "export_bytes": 42,
            "timestamp": "2026-02-23T00:00:00+00:00",
        },
    )

    with TestClient(app) as client:
        response = client.get(
            "/api/v1/export/recent?limit=7", headers={"Authorization": "Bearer k1"}
        )

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload["export_hash"], str)
    assert payload["hash_alg"] == "sha256"
    assert isinstance(payload["export_bytes"], int)
    assert isinstance(payload["timestamp"], str)
    # Backward-compatible payload keys consumed by desktop remain at top level.
    assert isinstance(payload["threads"], list)
    assert isinstance(payload["audits"], list)
