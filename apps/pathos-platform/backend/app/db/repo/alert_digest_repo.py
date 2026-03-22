"""Repository for persisted alert digest payloads."""

from __future__ import annotations

from typing import Any

from app.db.connection import connect, init_db


class AlertDigestRepo:
    @staticmethod
    def create(record: dict[str, Any]) -> None:
        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO alert_digests (id, alert_run_id, alert_rule_id, created_at, delivery_mode, payload_json)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record["alert_run_id"],
                    record["alert_rule_id"],
                    record["created_at"],
                    record["delivery_mode"],
                    record["payload_json"],
                ),
            )
            conn.commit()

    @staticmethod
    def list_recent(limit: int = 50) -> list[dict[str, Any]]:
        bounded = max(1, min(limit, 500))
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT id, alert_run_id, alert_rule_id, created_at, delivery_mode, payload_json
                FROM alert_digests
                ORDER BY created_at DESC, id DESC
                LIMIT ?
                """,
                (bounded,),
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def list_by_rule(alert_rule_id: str, limit: int = 50) -> list[dict[str, Any]]:
        bounded = max(1, min(limit, 500))
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT id, alert_run_id, alert_rule_id, created_at, delivery_mode, payload_json
                FROM alert_digests
                WHERE alert_rule_id = ?
                ORDER BY created_at DESC, id DESC
                LIMIT ?
                """,
                (alert_rule_id, bounded),
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def exists_for_run_rule(*, alert_run_id: str, alert_rule_id: str) -> bool:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT 1
                FROM alert_digests
                WHERE alert_run_id = ? AND alert_rule_id = ?
                LIMIT 1
                """,
                (alert_run_id, alert_rule_id),
            ).fetchone()
        return row is not None

    @staticmethod
    def purge_older_than(cutoff_ts: str) -> int:
        init_db()
        with connect() as conn:
            cursor = conn.execute(
                "DELETE FROM alert_digests WHERE created_at < ?", (cutoff_ts,)
            )
            conn.commit()
            return int(cursor.rowcount)

    @staticmethod
    def keep_last_n_per_rule(keep_n: int) -> int:
        bounded = max(1, min(keep_n, 5000))
        init_db()
        with connect() as conn:
            cursor = conn.execute(
                """
                DELETE FROM alert_digests
                WHERE id IN (
                    SELECT id FROM (
                        SELECT id,
                               ROW_NUMBER() OVER (PARTITION BY alert_rule_id ORDER BY created_at DESC, id DESC) AS rn
                        FROM alert_digests
                    )
                    WHERE rn > ?
                )
                """,
                (bounded,),
            )
            conn.commit()
            return int(cursor.rowcount)

    @staticmethod
    def delete_for_rule(alert_rule_id: str) -> int:
        init_db()
        with connect() as conn:
            cursor = conn.execute(
                "DELETE FROM alert_digests WHERE alert_rule_id = ?", (alert_rule_id,)
            )
            conn.commit()
            return int(cursor.rowcount)
