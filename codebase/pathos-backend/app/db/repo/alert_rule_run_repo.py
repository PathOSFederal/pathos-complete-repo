"""Repository for per-rule run history observability rows."""

from __future__ import annotations

from typing import Any

from app.db.connection import connect, init_db


class AlertRuleRunRepo:
    @staticmethod
    def create(record: dict[str, Any]) -> None:
        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO alert_rule_runs (
                    id, alert_run_id, alert_rule_id, started_at, ended_at, status, jobs_scanned, triggers_count, suppressed_count, error_summary, backoff_events_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record["alert_run_id"],
                    record["alert_rule_id"],
                    record["started_at"],
                    record["ended_at"],
                    record["status"],
                    record["jobs_scanned"],
                    record["triggers_count"],
                    record["suppressed_count"],
                    record.get("error_summary"),
                    record["backoff_events_json"],
                ),
            )
            conn.commit()

    @staticmethod
    def list_by_rule(alert_rule_id: str, limit: int = 50) -> list[dict[str, Any]]:
        bounded = max(1, min(limit, 500))
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT id, alert_run_id, alert_rule_id, started_at, ended_at, status, jobs_scanned, triggers_count, suppressed_count, error_summary, backoff_events_json
                FROM alert_rule_runs
                WHERE alert_rule_id = ?
                ORDER BY started_at DESC, id DESC
                LIMIT ?
                """,
                (alert_rule_id, bounded),
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def get_latest_for_rule(alert_rule_id: str) -> dict[str, Any] | None:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT id, alert_run_id, alert_rule_id, started_at, ended_at, status, jobs_scanned, triggers_count, suppressed_count, error_summary, backoff_events_json
                FROM alert_rule_runs
                WHERE alert_rule_id = ?
                ORDER BY started_at DESC, id DESC
                LIMIT 1
                """,
                (alert_rule_id,),
            ).fetchone()
        return dict(row) if row else None

    @staticmethod
    def delete_by_rule(alert_rule_id: str) -> int:
        init_db()
        with connect() as conn:
            cursor = conn.execute("DELETE FROM alert_rule_runs WHERE alert_rule_id = ?", (alert_rule_id,))
            conn.commit()
            return int(cursor.rowcount)
