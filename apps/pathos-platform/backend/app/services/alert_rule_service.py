"""Deterministic alert rule CRUD service."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.core.config import get_runtime_env, runtime_env_allows_placeholder_runtime
from app.db.repo.alert_rule_repo import AlertRuleRepo
from app.db.repo.saved_search_repo import SavedSearchRepo
from app.models.alert_rule import AlertRuleCreateRequest, AlertRuleOut, AlertRuleUpdateRequest


class AlertRuleNotFoundError(Exception):
    pass


class AlertRuleValidationError(Exception):
    pass


class AlertRuleService:
    @staticmethod
    def _validate_delivery_mode(delivery_mode: str) -> None:
        runtime_env = get_runtime_env()
        if delivery_mode != "email_digest_future":
            return
        if runtime_env_allows_placeholder_runtime(runtime_env):
            return
        raise AlertRuleValidationError(
            "delivery_mode=email_digest_future is disabled outside local/dev/test/ci "
            f"because external email delivery is not implemented. runtime_env={runtime_env}"
        )

    @staticmethod
    def _to_out(row: dict) -> AlertRuleOut:
        return AlertRuleOut(
            id=row["id"],
            saved_search_id=row["saved_search_id"],
            min_score_threshold=int(row["min_score_threshold"]),
            max_per_day=int(row["max_per_day"]),
            cooldown_hours=int(row["cooldown_hours"]),
            delivery_mode=row["delivery_mode"],
            enabled=bool(row["enabled"]),
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )

    @staticmethod
    def create(payload: AlertRuleCreateRequest) -> AlertRuleOut:
        if SavedSearchRepo.get_by_id(payload.saved_search_id) is None:
            raise AlertRuleValidationError(f"Saved search not found for id={payload.saved_search_id}")
        AlertRuleService._validate_delivery_mode(payload.delivery_mode)
        now = datetime.now(timezone.utc).isoformat()
        row = {
            "id": str(uuid4()),
            "saved_search_id": payload.saved_search_id,
            "min_score_threshold": payload.min_score_threshold,
            "max_per_day": payload.max_per_day,
            "cooldown_hours": payload.cooldown_hours,
            "delivery_mode": payload.delivery_mode,
            "enabled": payload.enabled,
            "created_at": now,
            "updated_at": now,
        }
        AlertRuleRepo.create(row)
        return AlertRuleService._to_out(row)

    @staticmethod
    def list_all() -> list[AlertRuleOut]:
        return [AlertRuleService._to_out(row) for row in AlertRuleRepo.list_all()]

    @staticmethod
    def get(alert_rule_id: str) -> AlertRuleOut:
        row = AlertRuleRepo.get_by_id(alert_rule_id)
        if row is None:
            raise AlertRuleNotFoundError(f"Alert rule not found for id={alert_rule_id}")
        return AlertRuleService._to_out(row)

    @staticmethod
    def update(alert_rule_id: str, payload: AlertRuleUpdateRequest) -> AlertRuleOut:
        existing = AlertRuleRepo.get_by_id(alert_rule_id)
        if existing is None:
            raise AlertRuleNotFoundError(f"Alert rule not found for id={alert_rule_id}")
        AlertRuleService._validate_delivery_mode(payload.delivery_mode)
        row = {
            "id": alert_rule_id,
            "min_score_threshold": payload.min_score_threshold,
            "max_per_day": payload.max_per_day,
            "cooldown_hours": payload.cooldown_hours,
            "delivery_mode": payload.delivery_mode,
            "enabled": payload.enabled,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        AlertRuleRepo.update(row)
        refreshed = AlertRuleRepo.get_by_id(alert_rule_id)
        assert refreshed is not None
        return AlertRuleService._to_out(refreshed)

    @staticmethod
    def delete(alert_rule_id: str) -> None:
        deleted = AlertRuleRepo.delete(alert_rule_id)
        if not deleted:
            raise AlertRuleNotFoundError(f"Alert rule not found for id={alert_rule_id}")
