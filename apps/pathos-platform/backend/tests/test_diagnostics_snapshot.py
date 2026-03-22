from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.main import create_app


def test_diagnostics_snapshot_contract_is_safe(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "diagnostics_contract.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "top-secret")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "private@example.com")
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
    serialized = json.dumps(payload, sort_keys=True).lower()
    assert "top-secret" not in serialized
    assert "private@example.com" not in serialized
    assert "raw_payload" not in serialized
