"""Repository helpers for telemetry counters (no payload content storage)."""

from __future__ import annotations

from typing import Any

from app.core.config import get_db_dialect
from app.db.connection import connect, init_db


class TelemetryRepo:
    @staticmethod
    def increment_metric(
        *,
        metric_key: str,
        increment: int,
        duration_ms: int,
        updated_at: str,
    ) -> None:
        init_db()
        dialect = get_db_dialect()
        if dialect == "postgres":
            insert_sql = """
            INSERT INTO telemetry_metrics (metric_key, count, total_duration_ms, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (metric_key) DO UPDATE
            SET count = telemetry_metrics.count + EXCLUDED.count,
                total_duration_ms = telemetry_metrics.total_duration_ms + EXCLUDED.total_duration_ms,
                updated_at = EXCLUDED.updated_at
            """
        else:
            insert_sql = """
            INSERT INTO telemetry_metrics (metric_key, count, total_duration_ms, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(metric_key) DO UPDATE
            SET count = count + excluded.count,
                total_duration_ms = total_duration_ms + excluded.total_duration_ms,
                updated_at = excluded.updated_at
            """
        with connect() as conn:
            conn.execute(insert_sql, (metric_key, increment, duration_ms, updated_at))
            conn.commit()

    @staticmethod
    def list_counters(limit: int = 200) -> list[dict[str, Any]]:
        bounded = max(1, min(limit, 2000))
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT metric_key, count, total_duration_ms, updated_at
                FROM telemetry_metrics
                ORDER BY metric_key ASC
                LIMIT ?
                """,
                (bounded,),
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def purge_older_than(cutoff_ts: str) -> int:
        init_db()
        with connect() as conn:
            cursor = conn.execute(
                "DELETE FROM telemetry_metrics WHERE updated_at < ?",
                (cutoff_ts,),
            )
            conn.commit()
            return int(cursor.rowcount)
