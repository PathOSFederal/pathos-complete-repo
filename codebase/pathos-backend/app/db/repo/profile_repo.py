"""app.db.repo.profile_repo

WHY THIS FILE EXISTS:
Persistence adapter for single-job-seeker profile state.

LAYER FIT:
- Repository layer.

WHAT THIS FILE MUST NOT DO:
- Must not run profile canonicalization logic.
"""

from __future__ import annotations

from typing import Any

from app.db.connection import connect, init_db


DEFAULT_PROFILE_ID = "default"


class ProfileRepo:
    """SQLite repository for profile table."""

    @staticmethod
    def get_default() -> dict[str, Any] | None:
        """Return default profile row or None when not created."""

        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT id, persona, target_series_json, grade_min, grade_max, target_locations_json,
                       remote_preference, skills_keywords_json, created_at, updated_at
                FROM profiles
                WHERE id = ?
                """,
                (DEFAULT_PROFILE_ID,),
            ).fetchone()
        return dict(row) if row else None

    @staticmethod
    def upsert_default(record: dict[str, Any]) -> None:
        """Upsert default profile row deterministically."""

        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO profiles (
                    id, persona, target_series_json, grade_min, grade_max, target_locations_json,
                    remote_preference, skills_keywords_json, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    persona = excluded.persona,
                    target_series_json = excluded.target_series_json,
                    grade_min = excluded.grade_min,
                    grade_max = excluded.grade_max,
                    target_locations_json = excluded.target_locations_json,
                    remote_preference = excluded.remote_preference,
                    skills_keywords_json = excluded.skills_keywords_json,
                    updated_at = excluded.updated_at
                """,
                (
                    DEFAULT_PROFILE_ID,
                    record["persona"],
                    record["target_series_json"],
                    record.get("grade_min"),
                    record.get("grade_max"),
                    record["target_locations_json"],
                    record.get("remote_preference"),
                    record["skills_keywords_json"],
                    record["created_at"],
                    record["updated_at"],
                ),
            )
            conn.commit()
