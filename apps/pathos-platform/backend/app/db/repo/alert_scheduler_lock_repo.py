"""Repository for DB-backed alert scheduler lock rows."""

from __future__ import annotations

from datetime import datetime, timezone

from app.core.config import get_db_dialect
from app.db.connection import connect, init_db


class AlertSchedulerLockRepo:
    @staticmethod
    def try_acquire(
        *, lock_name: str, owner_run_id: str, acquired_at: str, expires_at: str
    ) -> bool:
        init_db()
        with connect() as conn:
            conn.execute(
                "DELETE FROM alert_scheduler_locks WHERE lock_name = ? AND expires_at <= ?",
                (lock_name, acquired_at),
            )
            dialect = get_db_dialect()
            if dialect == "postgres":
                insert_sql = """
                INSERT INTO alert_scheduler_locks (lock_name, owner_run_id, acquired_at, expires_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (lock_name) DO NOTHING
                """
            else:
                insert_sql = """
                INSERT OR IGNORE INTO alert_scheduler_locks (lock_name, owner_run_id, acquired_at, expires_at)
                VALUES (?, ?, ?, ?)
                """
            cursor = conn.execute(
                insert_sql,
                (lock_name, owner_run_id, acquired_at, expires_at),
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def release(*, lock_name: str, owner_run_id: str) -> bool:
        init_db()
        with connect() as conn:
            cursor = conn.execute(
                "DELETE FROM alert_scheduler_locks WHERE lock_name = ? AND owner_run_id = ?",
                (lock_name, owner_run_id),
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def get_lock_state_summary(*, lock_name: str) -> dict[str, str | int | bool | None]:
        init_db()
        now_iso = datetime.now(timezone.utc).isoformat()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT owner_run_id, expires_at
                FROM alert_scheduler_locks
                WHERE lock_name = ? AND expires_at > ?
                ORDER BY expires_at DESC
                LIMIT 1
                """,
                (lock_name, now_iso),
            ).fetchone()
            count_row = conn.execute(
                """
                SELECT COUNT(1) AS c
                FROM alert_scheduler_locks
                WHERE expires_at > ?
                """,
                (now_iso,),
            ).fetchone()
        active_locks = int(count_row["c"]) if count_row else 0
        return {
            "lock_name": lock_name,
            "lock_held": row is not None,
            "owner_run_id": str(row["owner_run_id"]) if row else None,
            "expires_at": str(row["expires_at"]) if row else None,
            "active_locks": active_locks,
        }
