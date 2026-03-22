from __future__ import annotations
# ruff: noqa: E402

import json
from pathlib import Path
import sys
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import get_db_dialect, get_runtime_env
from app.core.logging import DEFAULT_SERVICE_VERSION
from app.db.connection import connect, init_db
from app.db.migration_safety import get_alembic_head, get_db_revision
from app.db.repo.migration_audit_repo import MigrationAuditRepo
from app.services.alerts_run_service import AlertsRunService


def _safe_db_summary() -> dict[str, Any]:
    summary: dict[str, Any] = {
        "db_dialect": get_db_dialect(),
        "alembic_head": None,
        "db_revision": None,
        "db_state": "unknown",
    }
    try:
        init_db()
        with connect() as conn:
            summary["db_revision"] = get_db_revision(conn)
        summary["alembic_head"] = get_alembic_head()
        summary["db_state"] = "reachable"
        return summary
    except Exception as exc:  # pragma: no cover - defensive runtime guard
        summary["db_state"] = "unavailable"
        summary["db_error"] = exc.__class__.__name__
        return summary


def _safe_latest_worker_run() -> dict[str, Any]:
    try:
        latest_run = AlertsRunService.get_latest_run()
    except Exception as exc:  # pragma: no cover - defensive runtime guard
        return {
            "last_worker_run_at": None,
            "last_worker_status": None,
            "worker_query_error": exc.__class__.__name__,
        }
    if latest_run is None:
        return {"last_worker_run_at": None, "last_worker_status": None}
    return {
        "last_worker_run_at": latest_run.started_at.isoformat(),
        "last_worker_status": latest_run.status,
    }


def _safe_latest_migration_audit() -> dict[str, Any]:
    try:
        latest = MigrationAuditRepo.get_latest()
    except Exception as exc:  # pragma: no cover - defensive runtime guard
        return {
            "last_migration_audit_event_at": None,
            "last_migration_audit_status": None,
            "migration_audit_query_error": exc.__class__.__name__,
        }
    if latest is None:
        return {
            "last_migration_audit_event_at": None,
            "last_migration_audit_status": None,
        }
    return {
        "last_migration_audit_event_at": latest.get("applied_at"),
        "last_migration_audit_status": latest.get("status"),
    }


def main() -> None:
    snapshot: dict[str, Any] = {
        "environment": get_runtime_env(),
        "service_version": DEFAULT_SERVICE_VERSION,
    }
    snapshot.update(_safe_db_summary())
    snapshot.update(_safe_latest_worker_run())
    snapshot.update(_safe_latest_migration_audit())
    print(json.dumps(snapshot, sort_keys=True))


if __name__ == "__main__":
    main()
