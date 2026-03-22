"""Delivery transport abstraction for deterministic alert digest handling."""

from __future__ import annotations

import json
from typing import Protocol
from uuid import uuid4

from app.db.repo.alert_digest_repo import AlertDigestRepo
from app.models.alert_digest import DeliveryIntent


class DeliveryTransport(Protocol):
    def deliver(self, intent: DeliveryIntent) -> None:
        """Handle one delivery intent without external side effects."""


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
        # Placeholder delivery path: deterministic no-op by design.
        del intent
