from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.db.connection import connect
from app.db.repo.telemetry_repo import TelemetryRepo
from app.main import create_app
from app.services.retention_service import RetentionService
from app.services.telemetry_service import TelemetryService


def test_telemetry_disabled_returns_deterministic_summary_and_no_write(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "telemetry_disabled.db"))
    monkeypatch.setenv("TELEMETRY_ENABLED", "false")
    app = create_app()

    wrote = TelemetryService.record_metric(
        metric_key="worker_runs_count", duration_ms=5
    )
    assert wrote is False

    with TestClient(app) as client:
        response = client.get(
            "/api/v1/diagnostics/telemetry", headers={"Authorization": "Bearer k1"}
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["telemetry_enabled"] is False
    assert payload["counters"] == []
    assert payload["message"] == "telemetry_disabled"


def test_telemetry_enabled_records_and_exports_summary(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "telemetry_enabled.db"))
    monkeypatch.setenv("TELEMETRY_ENABLED", "true")
    app = create_app()

    assert (
        TelemetryService.record_metric(metric_key="worker_runs_count", duration_ms=120)
        is True
    )
    assert (
        TelemetryService.record_metric(metric_key="worker_runs_count", duration_ms=80)
        is True
    )

    with TestClient(app) as client:
        response = client.get(
            "/api/v1/diagnostics/telemetry", headers={"Authorization": "Bearer k1"}
        )
    assert response.status_code == 200
    payload = response.json()
    assert payload["telemetry_enabled"] is True
    metric = next(
        item
        for item in payload["counters"]
        if item["metric_key"] == "worker_runs_count"
    )
    assert metric["count"] == 2
    assert metric["total_duration_ms"] == 200
    assert metric["avg_duration_ms"] == 100.0


def test_telemetry_retention_cleanup_purges_old_rows(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "telemetry_retention.db"))
    monkeypatch.setenv("TELEMETRY_ENABLED", "true")
    monkeypatch.setenv("RETENTION_DAYS_AUDIT", "1")
    create_app()

    assert (
        TelemetryService.record_metric(metric_key="requests_count.jobs", duration_ms=7)
        is True
    )
    stale_ts = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    with connect() as conn:
        conn.execute(
            "UPDATE telemetry_metrics SET updated_at = ? WHERE metric_key = ?",
            (stale_ts, "requests_count.jobs"),
        )
        conn.commit()

    summary = RetentionService.cleanup()
    assert summary.telemetry_deleted >= 1
    assert TelemetryRepo.list_counters(limit=20) == []
