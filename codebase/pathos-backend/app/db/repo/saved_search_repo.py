"""app.db.repo.saved_search_repo

WHY THIS FILE EXISTS:
Persistence adapter for saved searches and saved search runs.

LAYER FIT:
- Repository layer.

WHAT THIS FILE MUST NOT DO:
- Must not perform upstream API calls.
- Must not embed business orchestration.
"""

from __future__ import annotations

from typing import Any

from app.db.connection import connect, init_db


class SavedSearchRepo:
    """SQLite repository for saved search records."""

    @staticmethod
    def create(record: dict[str, Any]) -> None:
        """Insert saved search row."""

        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO saved_searches (
                    id,
                    name,
                    filters_json,
                    query_payload,
                    profile_payload,
                    ruleset_version,
                    is_enabled,
                    last_run_at,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record["name"],
                    record["filters_json"],
                    record.get("query_payload"),
                    record.get("profile_payload"),
                    record.get("ruleset_version"),
                    bool(record["is_enabled"]),
                    record.get("last_run_at"),
                    record["created_at"],
                    record["updated_at"],
                ),
            )
            conn.commit()

    @staticmethod
    def list_all() -> list[dict[str, Any]]:
        """Return all saved searches ordered by updated time descending."""

        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    id,
                    name,
                    filters_json,
                    query_payload,
                    profile_payload,
                    ruleset_version,
                    is_enabled,
                    last_run_at,
                    created_at,
                    updated_at
                FROM saved_searches
                ORDER BY updated_at DESC
                """
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def get_by_id(saved_search_id: str) -> dict[str, Any] | None:
        """Return one saved search row by id."""

        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT
                    id,
                    name,
                    filters_json,
                    query_payload,
                    profile_payload,
                    ruleset_version,
                    is_enabled,
                    last_run_at,
                    created_at,
                    updated_at
                FROM saved_searches
                WHERE id = ?
                """,
                (saved_search_id,),
            ).fetchone()
        return dict(row) if row else None

    @staticmethod
    def update(record: dict[str, Any]) -> bool:
        """Update saved search row and report whether row existed."""

        init_db()
        with connect() as conn:
            cursor = conn.execute(
                """
                UPDATE saved_searches
                SET
                    name = ?,
                    filters_json = ?,
                    query_payload = ?,
                    profile_payload = ?,
                    ruleset_version = ?,
                    is_enabled = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    record["name"],
                    record["filters_json"],
                    record.get("query_payload"),
                    record.get("profile_payload"),
                    record.get("ruleset_version"),
                    bool(record["is_enabled"]),
                    record["updated_at"],
                    record["id"],
                ),
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def delete(saved_search_id: str) -> bool:
        """Delete saved search row and report whether it existed."""

        init_db()
        with connect() as conn:
            conn.execute(
                """
                DELETE FROM alert_delivery_log
                WHERE alert_rule_id IN (SELECT id FROM alert_rules WHERE saved_search_id = ?)
                """,
                (saved_search_id,),
            )
            conn.execute(
                "DELETE FROM alert_rules WHERE saved_search_id = ?", (saved_search_id,)
            )
            conn.execute(
                "DELETE FROM saved_search_runs WHERE saved_search_id = ?",
                (saved_search_id,),
            )
            conn.execute(
                "DELETE FROM alerts WHERE saved_search_id = ?", (saved_search_id,)
            )
            cursor = conn.execute(
                "DELETE FROM saved_searches WHERE id = ?", (saved_search_id,)
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def set_last_run(saved_search_id: str, run_at: str) -> None:
        """Update last_run_at/updated_at timestamps after successful run."""

        init_db()
        with connect() as conn:
            conn.execute(
                """
                UPDATE saved_searches
                SET last_run_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (run_at, run_at, saved_search_id),
            )
            conn.commit()

    @staticmethod
    def create_run(record: dict[str, Any]) -> None:
        """Insert saved search run record."""

        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO saved_search_runs (
                    id, saved_search_id, run_at, query_fingerprint, job_ids_json, total, request_id, upstream_trace_hash
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record["saved_search_id"],
                    record["run_at"],
                    record["query_fingerprint"],
                    record["job_ids_json"],
                    record["total"],
                    record["request_id"],
                    record["upstream_trace_hash"],
                ),
            )
            conn.commit()

    @staticmethod
    def get_last_run(saved_search_id: str) -> dict[str, Any] | None:
        """Return most recent run record for diff comparisons."""

        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT id, saved_search_id, run_at, query_fingerprint, job_ids_json, total, request_id, upstream_trace_hash
                FROM saved_search_runs
                WHERE saved_search_id = ?
                ORDER BY run_at DESC
                LIMIT 1
                """,
                (saved_search_id,),
            ).fetchone()
        return dict(row) if row else None
