"""Operational controls status endpoints for safe runtime observability."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import (
    get_alerts_delivery_enabled,
    get_alerts_evaluation_enabled,
    get_dry_run_mode,
    get_pause_reason,
    get_worker_enabled,
)

router = APIRouter()


@router.get("/ops/status")
def ops_status() -> dict[str, object]:
    """Expose current operational flags without including secrets."""
    pause_reason = get_pause_reason()
    return {
        "worker_enabled": get_worker_enabled(),
        "alerts_evaluation_enabled": get_alerts_evaluation_enabled(),
        "alerts_delivery_enabled": get_alerts_delivery_enabled(),
        "dry_run_mode": get_dry_run_mode(),
        "pause_reason": pause_reason,
        "pause_reason_set": bool(pause_reason),
    }
