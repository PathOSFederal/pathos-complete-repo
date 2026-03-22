"""Repository for saved-search job snapshot state used by delta engine."""

from __future__ import annotations

from typing import Any

from app.db.connection import connect, init_db


class SavedSearchSnapshotRepo:
    @staticmethod
    def list_by_saved_search(saved_search_id: str) -> list[dict[str, Any]]:
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT id, saved_search_id, job_id, first_seen_at, last_seen_at, last_fingerprint, previous_score, last_score, updated_at
                FROM saved_search_job_snapshots
                WHERE saved_search_id = ?
                ORDER BY job_id ASC
                """,
                (saved_search_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def upsert(
        *,
        record_id: str,
        saved_search_id: str,
        job_id: str,
        seen_at: str,
        fingerprint: str,
        score: int | None,
    ) -> None:
        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO saved_search_job_snapshots (
                    id, saved_search_id, job_id, first_seen_at, last_seen_at, last_fingerprint, previous_score, last_score, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
                ON CONFLICT(saved_search_id, job_id) DO UPDATE SET
                    last_seen_at = excluded.last_seen_at,
                    last_fingerprint = excluded.last_fingerprint,
                    previous_score = saved_search_job_snapshots.last_score,
                    last_score = excluded.last_score,
                    updated_at = excluded.updated_at
                """,
                (record_id, saved_search_id, job_id, seen_at, seen_at, fingerprint, score, seen_at),
            )
            conn.commit()
