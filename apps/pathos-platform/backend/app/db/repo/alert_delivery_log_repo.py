"""Repository for alert delivery seen/notified tracking."""

from __future__ import annotations

from typing import Any

from app.db.connection import connect, init_db


class AlertDeliveryLogRepo:
    @staticmethod
    def upsert_seen(
        *,
        record_id: str,
        alert_rule_id: str,
        job_id: str,
        seen_at: str,
        score: int,
    ) -> None:
        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO alert_delivery_log (
                    id, alert_rule_id, job_id, first_seen_at, last_seen_at, last_score, notified_at, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
                ON CONFLICT(alert_rule_id, job_id) DO UPDATE SET
                    last_seen_at = excluded.last_seen_at,
                    last_score = excluded.last_score,
                    updated_at = excluded.updated_at
                """,
                (record_id, alert_rule_id, job_id, seen_at, seen_at, score, seen_at, seen_at),
            )
            conn.commit()

    @staticmethod
    def mark_notified(*, alert_rule_id: str, job_id: str, notified_at: str) -> None:
        init_db()
        with connect() as conn:
            conn.execute(
                """
                UPDATE alert_delivery_log
                SET notified_at = ?, updated_at = ?
                WHERE alert_rule_id = ? AND job_id = ?
                """,
                (notified_at, notified_at, alert_rule_id, job_id),
            )
            conn.commit()

    @staticmethod
    def get_by_rule_and_job(alert_rule_id: str, job_id: str) -> dict[str, Any] | None:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT id, alert_rule_id, job_id, first_seen_at, last_seen_at, last_score, notified_at, created_at, updated_at
                FROM alert_delivery_log
                WHERE alert_rule_id = ? AND job_id = ?
                """,
                (alert_rule_id, job_id),
            ).fetchone()
        return dict(row) if row else None

    @staticmethod
    def count_notified_since(alert_rule_id: str, since_ts: str) -> int:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT COUNT(1) AS c
                FROM alert_delivery_log
                WHERE alert_rule_id = ? AND notified_at IS NOT NULL AND notified_at >= ?
                """,
                (alert_rule_id, since_ts),
            ).fetchone()
        return int(row["c"]) if row else 0

    @staticmethod
    def is_job_notified(alert_rule_id: str, job_id: str) -> bool:
        row = AlertDeliveryLogRepo.get_by_rule_and_job(alert_rule_id, job_id)
        return bool(row and row.get("notified_at"))

    @staticmethod
    def get_most_recent_notified_at(alert_rule_id: str) -> str | None:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT notified_at
                FROM alert_delivery_log
                WHERE alert_rule_id = ? AND notified_at IS NOT NULL
                ORDER BY notified_at DESC
                LIMIT 1
                """,
                (alert_rule_id,),
            ).fetchone()
        if row is None:
            return None
        return row["notified_at"]

    @staticmethod
    def is_cooldown_active(alert_rule_id: str, cutoff_ts: str) -> bool:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT COUNT(1) AS c
                FROM alert_delivery_log
                WHERE alert_rule_id = ? AND notified_at IS NOT NULL AND notified_at >= ?
                """,
                (alert_rule_id, cutoff_ts),
            ).fetchone()
        return bool(row and int(row["c"]) > 0)

    @staticmethod
    def list_for_rule(alert_rule_id: str) -> list[dict[str, Any]]:
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT id, alert_rule_id, job_id, first_seen_at, last_seen_at, last_score, notified_at, created_at, updated_at
                FROM alert_delivery_log
                WHERE alert_rule_id = ?
                ORDER BY job_id ASC
                """,
                (alert_rule_id,),
            ).fetchall()
        return [dict(row) for row in rows]
