"""app.services.advisor_session_service

WHY THIS FILE EXISTS:
Provides deterministic append-only advisor session orchestration boundary without LLM behavior.

LAYER FIT:
- Service/business layer.

WHAT THIS FILE MUST NOT DO:
- Must not call narration/LLM systems.
- Must not mutate historical events.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import uuid4

from app.db.repo.advisor_session_repo import AdvisorSessionRepo
from app.models.advisor_session import (
    AdvisorSessionCreateRequest,
    AdvisorSessionEventOut,
    AdvisorSessionEventRequest,
    AdvisorSessionOut,
)


class AdvisorSessionNotFoundError(Exception):
    """Raised when session id does not exist."""


class AdvisorSessionClosedError(Exception):
    """Raised when appending events to closed session."""


class AdvisorSessionValidationError(Exception):
    """Raised when event payload violates deterministic constraints."""


class AdvisorSessionService:
    """Append-only advisor session service."""

    ALLOWED_EVENT_TYPES = {
        "user_note_added",
        "job_selected",
        "job_deselected",
        "advisor_evaluated",
        "advisor_exported",
    }
    MAX_PAYLOAD_BYTES = 8000

    @staticmethod
    def _canonical_payload(payload: dict) -> dict:
        """Canonicalize event/context payload by sorted-key roundtrip."""

        return json.loads(json.dumps(payload, sort_keys=True))

    @staticmethod
    def _to_event(row: dict) -> AdvisorSessionEventOut:
        """Convert repository event row to typed event output."""

        return AdvisorSessionEventOut(
            id=row["id"],
            session_id=row["session_id"],
            event_type=row["event_type"],
            payload_json=json.loads(row["payload_json"]),
            created_at=datetime.fromisoformat(row["created_at"]),
        )

    @staticmethod
    def _to_out(session_row: dict, event_rows: list[dict]) -> AdvisorSessionOut:
        """Convert repository rows into API response model."""

        return AdvisorSessionOut(
            id=session_row["id"],
            created_at=datetime.fromisoformat(session_row["created_at"]),
            closed_at=datetime.fromisoformat(session_row["closed_at"]) if session_row.get("closed_at") else None,
            context_json=json.loads(session_row["context_json"]),
            request_id=session_row["request_id"],
            events=[AdvisorSessionService._to_event(row) for row in event_rows],
        )

    @staticmethod
    def create_session(payload: AdvisorSessionCreateRequest, request_id: str) -> AdvisorSessionOut:
        """Create advisor session with immutable context snapshot."""

        now = datetime.now(timezone.utc).isoformat()
        context = AdvisorSessionService._canonical_payload(
            {
                "profile_snapshot": payload.profile_snapshot,
                "selected_job_ids": sorted(set(payload.selected_job_ids)),
            }
        )
        session_id = str(uuid4())
        record = {
            "id": session_id,
            "created_at": now,
            "closed_at": None,
            "context_json": json.dumps(context, sort_keys=True),
            "request_id": request_id,
        }
        AdvisorSessionRepo.create_session(record)
        session_row = AdvisorSessionRepo.get_session(session_id)
        assert session_row is not None
        return AdvisorSessionService._to_out(session_row, [])

    @staticmethod
    def append_event(session_id: str, payload: AdvisorSessionEventRequest) -> AdvisorSessionEventOut:
        """Append event to open session with deterministic validation."""

        if payload.event_type not in AdvisorSessionService.ALLOWED_EVENT_TYPES:
            raise AdvisorSessionValidationError("Unsupported event_type")

        session_row = AdvisorSessionRepo.get_session(session_id)
        if session_row is None:
            raise AdvisorSessionNotFoundError(f"Advisor session not found for id={session_id}")
        if session_row.get("closed_at"):
            raise AdvisorSessionClosedError("Cannot append event to closed session")

        canonical = AdvisorSessionService._canonical_payload(payload.payload)
        payload_json = json.dumps(canonical, sort_keys=True)
        if len(payload_json.encode("utf-8")) > AdvisorSessionService.MAX_PAYLOAD_BYTES:
            raise AdvisorSessionValidationError("Event payload exceeds max size")

        record = {
            "id": str(uuid4()),
            "session_id": session_id,
            "event_type": payload.event_type,
            "payload_json": payload_json,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        AdvisorSessionRepo.append_event(record)
        return AdvisorSessionService._to_event(record)

    @staticmethod
    def get_session(session_id: str) -> AdvisorSessionOut:
        """Read session with full append-only event list."""

        session_row = AdvisorSessionRepo.get_session(session_id)
        if session_row is None:
            raise AdvisorSessionNotFoundError(f"Advisor session not found for id={session_id}")
        event_rows = AdvisorSessionRepo.list_events(session_id)
        return AdvisorSessionService._to_out(session_row, event_rows)

    @staticmethod
    def close_session(session_id: str) -> AdvisorSessionOut:
        """Close session idempotently and return latest state."""

        closed_at = datetime.now(timezone.utc).isoformat()
        updated = AdvisorSessionRepo.close_session(session_id, closed_at)
        if not updated:
            raise AdvisorSessionNotFoundError(f"Advisor session not found for id={session_id}")
        return AdvisorSessionService.get_session(session_id)
