"""Repository for deterministic alert rules."""

from __future__ import annotations

from typing import Any

from app.core.config import get_db_dialect
from app.db.connection import connect, init_db


class AlertRuleRepo:
    @staticmethod
    def _enabled_predicate() -> str:
        return "enabled IS TRUE" if get_db_dialect() == "postgres" else "enabled = 1"

    @staticmethod
    def create(record: dict[str, Any]) -> None:
        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO alert_rules (
                    id,
                    saved_search_id,
                    min_score_threshold,
                    max_per_day,
                    cooldown_hours,
                    delivery_mode,
                    enabled,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record["saved_search_id"],
                    record["min_score_threshold"],
                    record["max_per_day"],
                    record["cooldown_hours"],
                    record["delivery_mode"],
                    bool(record["enabled"]),
                    record["created_at"],
                    record["updated_at"],
                ),
            )
            conn.commit()

    @staticmethod
    def list_all() -> list[dict[str, Any]]:
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT id, saved_search_id, min_score_threshold, max_per_day, cooldown_hours, delivery_mode, enabled, created_at, updated_at
                FROM alert_rules
                ORDER BY updated_at DESC
                """
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def list_enabled() -> list[dict[str, Any]]:
        init_db()
        predicate = AlertRuleRepo._enabled_predicate()
        with connect() as conn:
            rows = conn.execute(
                f"""
                SELECT id, saved_search_id, min_score_threshold, max_per_day, cooldown_hours, delivery_mode, enabled, created_at, updated_at
                FROM alert_rules
                WHERE {predicate}
                ORDER BY id ASC
                """
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def get_by_id(alert_rule_id: str) -> dict[str, Any] | None:
        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT id, saved_search_id, min_score_threshold, max_per_day, cooldown_hours, delivery_mode, enabled, created_at, updated_at
                FROM alert_rules
                WHERE id = ?
                """,
                (alert_rule_id,),
            ).fetchone()
        return dict(row) if row else None

    @staticmethod
    def update(record: dict[str, Any]) -> bool:
        init_db()
        with connect() as conn:
            cursor = conn.execute(
                """
                UPDATE alert_rules
                SET min_score_threshold = ?, max_per_day = ?, cooldown_hours = ?, delivery_mode = ?, enabled = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    record["min_score_threshold"],
                    record["max_per_day"],
                    record["cooldown_hours"],
                    record["delivery_mode"],
                    bool(record["enabled"]),
                    record["updated_at"],
                    record["id"],
                ),
            )
            conn.commit()
            return cursor.rowcount > 0

    @staticmethod
    def delete(alert_rule_id: str) -> bool:
        init_db()
        with connect() as conn:
            conn.execute(
                "DELETE FROM alert_delivery_log WHERE alert_rule_id = ?",
                (alert_rule_id,),
            )
            cursor = conn.execute(
                "DELETE FROM alert_rules WHERE id = ?", (alert_rule_id,)
            )
            conn.commit()
            return cursor.rowcount > 0
