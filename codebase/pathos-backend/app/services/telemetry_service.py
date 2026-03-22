"""Telemetry service for bounded counters/timings with no content capture."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.core.config import get_telemetry_enabled
from app.core.logging import log_event
from app.db.repo.telemetry_repo import TelemetryRepo
from app.models.diagnostics import DiagnosticsTelemetrySummaryOut, TelemetryCounterOut

logger = logging.getLogger("pathos.telemetry")


class TelemetryService:
    @staticmethod
    def record_metric(
        *,
        metric_key: str,
        duration_ms: int = 0,
        increment: int = 1,
    ) -> bool:
        if not get_telemetry_enabled():
            return False
        bounded_increment = max(1, min(int(increment), 100000))
        bounded_duration = max(0, min(int(duration_ms), 3_600_000))
        now_iso = datetime.now(timezone.utc).isoformat()
        TelemetryRepo.increment_metric(
            metric_key=metric_key,
            increment=bounded_increment,
            duration_ms=bounded_duration,
            updated_at=now_iso,
        )
        log_event(
            logger,
            level=logging.INFO,
            event_id="telemetry_recorded",
            message="Telemetry counter recorded.",
            details={
                "metric_key": metric_key,
                "increment": bounded_increment,
                "duration_ms": bounded_duration,
            },
        )
        return True

    @staticmethod
    def get_summary() -> DiagnosticsTelemetrySummaryOut:
        now_iso = datetime.now(timezone.utc).isoformat()
        if not get_telemetry_enabled():
            return DiagnosticsTelemetrySummaryOut(
                telemetry_enabled=False,
                generated_at=now_iso,
                counters=[],
                message="telemetry_disabled",
            )

        rows = TelemetryRepo.list_counters(limit=200)
        counters = [
            TelemetryCounterOut(
                metric_key=str(row["metric_key"]),
                count=int(row["count"]),
                total_duration_ms=int(row["total_duration_ms"]),
                avg_duration_ms=(
                    float(row["total_duration_ms"]) / float(row["count"])
                    if int(row["count"]) > 0
                    else 0.0
                ),
                updated_at=str(row["updated_at"]),
            )
            for row in rows
        ]
        log_event(
            logger,
            level=logging.INFO,
            event_id="telemetry_summary_generated",
            message="Telemetry summary generated.",
            details={"counter_count": len(counters)},
        )
        return DiagnosticsTelemetrySummaryOut(
            telemetry_enabled=True,
            generated_at=now_iso,
            counters=counters,
            message=None,
        )
