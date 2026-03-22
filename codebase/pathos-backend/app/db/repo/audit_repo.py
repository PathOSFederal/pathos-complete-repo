from __future__ import annotations

from typing import Any

from app.db.connection import connect, init_db


class AuditRepo:
    @staticmethod
    def save_evaluation(record: dict[str, Any]) -> None:
        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO audit_records (
                    trace_id,
                    created_at,
                    input_hash,
                    ruleset_version,
                    engine_version,
                    evaluation_json,
                    narration_json,
                    narration_mode,
                    prompt_bundle_version
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(trace_id) DO NOTHING
                """,
                (
                    record["trace_id"],
                    record.get("created_at"),
                    record.get("input_hash"),
                    record.get("ruleset_version"),
                    record.get("engine_version"),
                    record["evaluation_json"],
                    record.get("narration_json"),
                    record.get("narration_mode"),
                    record.get("prompt_bundle_version"),
                ),
            )
            conn.commit()

    @staticmethod
    def get_by_trace_id(trace_id: str) -> dict[str, Any] | None:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT
                    trace_id,
                    created_at,
                    input_hash,
                    ruleset_version,
                    engine_version,
                    evaluation_json,
                    narration_json,
                    narration_mode,
                    prompt_bundle_version
                FROM audit_records
                WHERE trace_id = ?
                """,
                (trace_id,),
            ).fetchone()
        return dict(row) if row is not None else None

    @staticmethod
    def list_recent(limit: int) -> list[dict[str, Any]]:
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    trace_id,
                    created_at,
                    input_hash,
                    ruleset_version,
                    engine_version,
                    evaluation_json,
                    narration_json,
                    narration_mode,
                    prompt_bundle_version
                FROM audit_records
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def attach_narration(
        trace_id: str,
        narration_json: str,
        narration_mode: str,
        prompt_bundle_version: str,
    ) -> bool:
        init_db()
        with connect() as conn:
            cursor = conn.execute(
                """
                UPDATE audit_records
                SET
                    narration_json = ?,
                    narration_mode = ?,
                    prompt_bundle_version = ?
                WHERE trace_id = ?
                """,
                (narration_json, narration_mode, prompt_bundle_version, trace_id),
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def trace_exists(trace_id: str) -> bool:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT 1
                FROM audit_records
                WHERE trace_id = ?
                """,
                (trace_id,),
            ).fetchone()
        return row is not None

    @staticmethod
    def get_audits_by_trace_ids(trace_ids: list[str]) -> list[dict[str, Any]]:
        if not trace_ids:
            return []
        init_db()
        placeholders = ",".join(["?"] * len(trace_ids))
        with connect() as conn:
            rows = conn.execute(
                f"""
                SELECT
                    trace_id,
                    created_at,
                    input_hash,
                    ruleset_version,
                    engine_version,
                    evaluation_json,
                    narration_json,
                    narration_mode,
                    prompt_bundle_version
                FROM audit_records
                WHERE trace_id IN ({placeholders})
                ORDER BY created_at DESC
                """,
                tuple(trace_ids),
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def list_recent_audits(limit: int) -> list[dict[str, Any]]:
        return AuditRepo.list_recent(limit=limit)

    @staticmethod
    def delete_audit(trace_id: str) -> bool:
        init_db()
        with connect() as conn:
            cursor = conn.execute(
                """
                DELETE FROM audit_records
                WHERE trace_id = ?
                """,
                (trace_id,),
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def delete_all_audits() -> int:
        init_db()
        with connect() as conn:
            cursor = conn.execute("DELETE FROM audit_records")
            conn.commit()
            return cursor.rowcount

    @staticmethod
    def purge_older_than(cutoff_ts: str) -> int:
        init_db()
        with connect() as conn:
            cursor = conn.execute(
                "DELETE FROM audit_records WHERE created_at < ?",
                (cutoff_ts,),
            )
            conn.commit()
            return int(cursor.rowcount)
