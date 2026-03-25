"""Delivery transport abstraction for deterministic alert digest handling."""

from __future__ import annotations

import json
import logging
from typing import Protocol
from uuid import uuid4

from app.core.config import get_runtime_env, runtime_env_allows_placeholder_runtime
from app.db.repo.alert_digest_repo import AlertDigestRepo
from app.models.alert_digest import DeliveryIntent

logger = logging.getLogger("pathos.delivery")


class DeliveryTransport(Protocol):
    def deliver(self, intent: DeliveryIntent) -> None:
        """Handle one delivery intent without external side effects."""


class PlaceholderDeliveryDisabledError(RuntimeError):
    """Raised when a placeholder delivery mode is used in a non-local runtime."""


class LocalDigestTransport:
    def deliver(self, intent: DeliveryIntent) -> None:
        if AlertDigestRepo.exists_for_run_rule(
            alert_run_id=intent.run_id, alert_rule_id=intent.alert_rule_id
        ):
            return
        AlertDigestRepo.create(
            {
                "id": str(uuid4()),
                "alert_run_id": intent.run_id,
                "alert_rule_id": intent.alert_rule_id,
                "created_at": intent.created_at.isoformat(),
                "delivery_mode": intent.delivery_mode,
                "payload_json": json.dumps(
                    intent.digest_payload.model_dump(mode="json"), sort_keys=True
                ),
            }
        )


class EmailDigestFutureTransport:
    def deliver(self, intent: DeliveryIntent) -> None:
        runtime_env = get_runtime_env()
        if not runtime_env_allows_placeholder_runtime(runtime_env):
            raise PlaceholderDeliveryDisabledError(
                "email_digest_future delivery mode is disabled outside local/dev/test/ci "
                f"because external email delivery is not implemented. runtime_env={runtime_env}"
            )
        logger.warning(
            "email_digest_future delivery mode is a local-only stub with no external side effect.",
            extra={
                "json_extra": {
                    "event_id": "placeholder_delivery_used",
                    "message": "email_digest_future delivery mode is a local-only stub with no external side effect.",
                    "delivery_mode": intent.delivery_mode,
                    "run_id": intent.run_id,
                    "alert_rule_id": intent.alert_rule_id,
                    "runtime_env": runtime_env,
                }
            },
        )
        del intent
