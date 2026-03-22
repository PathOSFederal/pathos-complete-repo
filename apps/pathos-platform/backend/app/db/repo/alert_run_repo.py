"""Repository for scheduler/manual alert run audit rows."""

from __future__ import annotations

from typing import Any

from app.db.connection import connect, init_db


class AlertRunRepo:
    @staticmethod
    def create(record: dict[str, Any]) -> None:
        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO alert_runs (
                    id, started_at, ended_at, status, rules_evaluated, jobs_scanned, triggers_count, suppressed_count,
                    error_summary, usajobs_fetch_ms, normalize_ms, score_ms, delta_ms, digest_ms,
                    backoff_events_json, lock_acquired, lock_released, skip_reason, skip_details
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record["started_at"],
                    record.get("ended_at"),
                    record["status"],
                    record["rules_evaluated"],
                    record["jobs_scanned"],
                    record["triggers_count"],
                    record["suppressed_count"],
                    record.get("error_summary"),
                    record.get("usajobs_fetch_ms", 0),
                    record.get("normalize_ms", 0),
                    record.get("score_ms", 0),
                    record.get("delta_ms", 0),
                    record.get("digest_ms", 0),
                    record.get("backoff_events_json", "[]"),
                    int(bool(record.get("lock_acquired", False))),
                    int(bool(record.get("lock_released", False))),
                    record.get("skip_reason"),
                    record.get("skip_details"),
                ),
            )
            conn.commit()

    @staticmethod
    def update(record: dict[str, Any]) -> bool:
        init_db()
        with connect() as conn:
            cursor = conn.execute(
                """
                UPDATE alert_runs
                SET ended_at = ?, status = ?, rules_evaluated = ?, jobs_scanned = ?, triggers_count = ?, suppressed_count = ?,
                    error_summary = ?, usajobs_fetch_ms = ?, normalize_ms = ?, score_ms = ?, delta_ms = ?, digest_ms = ?,
                    backoff_events_json = ?, lock_acquired = ?, lock_released = ?, skip_reason = ?, skip_details = ?
                WHERE id = ?
                """,
                (
                    record.get("ended_at"),
                    record["status"],
                    record["rules_evaluated"],
                    record["jobs_scanned"],
                    record["triggers_count"],
                    record["suppressed_count"],
                    record.get("error_summary"),
                    record.get("usajobs_fetch_ms", 0),
                    record.get("normalize_ms", 0),
                    record.get("score_ms", 0),
                    record.get("delta_ms", 0),
                    record.get("digest_ms", 0),
                    record.get("backoff_events_json", "[]"),
                    int(bool(record.get("lock_acquired", False))),
                    int(bool(record.get("lock_released", False))),
                    record.get("skip_reason"),
                    record.get("skip_details"),
                    record["id"],
                ),
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def list_recent(limit: int = 50) -> list[dict[str, Any]]:
        bounded = max(1, min(limit, 500))
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT id, started_at, ended_at, status, rules_evaluated, jobs_scanned, triggers_count, suppressed_count,
                       error_summary, usajobs_fetch_ms, normalize_ms, score_ms, delta_ms, digest_ms, backoff_events_json,
                       lock_acquired, lock_released, skip_reason, skip_details
                FROM alert_runs
                ORDER BY started_at DESC, id DESC
                LIMIT ?
                """,
                (bounded,),
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def get_latest() -> dict[str, Any] | None:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT id, started_at, ended_at, status, rules_evaluated, jobs_scanned, triggers_count, suppressed_count,
                       error_summary, usajobs_fetch_ms, normalize_ms, score_ms, delta_ms, digest_ms, backoff_events_json,
                       lock_acquired, lock_released, skip_reason, skip_details
                FROM alert_runs
                ORDER BY started_at DESC, id DESC
                LIMIT 1
                """
            ).fetchone()
        return dict(row) if row else None

    @staticmethod
    def purge_older_than(cutoff_ts: str) -> int:
        init_db()
        with connect() as conn:
            cursor = conn.execute("DELETE FROM alert_runs WHERE started_at < ?", (cutoff_ts,))
            conn.commit()
            return int(cursor.rowcount)
