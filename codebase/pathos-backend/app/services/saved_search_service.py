"""app.services.saved_search_service

WHY THIS FILE EXISTS:
Orchestrates deterministic CRUD flow for saved search filters with canonical JSON storage.

LAYER FIT:
- Service/business orchestration layer.

WHAT THIS FILE MUST NOT DO:
- Must not call external job APIs directly.
- Must not perform FastAPI routing concerns.
"""

from __future__ import annotations

import copy
import json
from datetime import datetime, timezone
from hashlib import sha256
from typing import Any
from uuid import uuid4

from app.db.repo.saved_search_repo import SavedSearchRepo
from app.db.repo.upstream_audit_repo import UpstreamAuditRepo
from app.models.job_search import JobSearchRequest
from app.models.saved_search import SavedSearchCreateRequest, SavedSearchOut, SavedSearchUpdateRequest


class SavedSearchNotFoundError(Exception):
    """Raised when requested saved search ID does not exist."""


class SavedSearchService:
    """Deterministic service for saved search CRUD."""

    @staticmethod
    def _canonical_filters(filters: JobSearchRequest) -> dict[str, Any]:
        """Canonicalize filters deterministically before persistence.

        Deterministic rules:
        - Drop null values.
        - Trim strings.
        - Sort list values and deduplicate.
        - Include explicit contract version.
        """

        raw = copy.deepcopy(filters.model_dump(exclude_none=True))
        normalized: dict[str, Any] = {}
        for key, value in raw.items():
            if isinstance(value, str):
                trimmed = value.strip()
                if trimmed:
                    normalized[key] = trimmed
            elif isinstance(value, list):
                cleaned = sorted({entry.strip() for entry in value if isinstance(entry, str) and entry.strip()})
                normalized[key] = cleaned
            else:
                normalized[key] = value
        return {
            "contract_version": "v1",
            "filters": normalized,
        }

    @staticmethod
    def _to_out(row: dict[str, Any]) -> SavedSearchOut:
        """Convert repository row to typed API output."""

        query_payload = json.loads(row["query_payload"]) if row.get("query_payload") else json.loads(row["filters_json"])
        profile_payload = json.loads(row["profile_payload"]) if row.get("profile_payload") else None
        return SavedSearchOut(
            id=row["id"],
            name=row["name"],
            query_payload=query_payload,
            profile_payload=profile_payload,
            ruleset_version=row.get("ruleset_version") or "job-scoring-v1",
            filters_json=query_payload,
            is_enabled=bool(row.get("is_enabled", 1)),
            last_run_at=datetime.fromisoformat(row["last_run_at"]) if row.get("last_run_at") else None,
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )

    @staticmethod
    def _record_audit(*, action: str, saved_search_id: str, payload: dict[str, Any]) -> None:
        query_hash = sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
        now = datetime.now(timezone.utc).isoformat()
        UpstreamAuditRepo.save_record(
            {
                "id": str(uuid4()),
                "request_id": f"saved-search-{action}-{saved_search_id}",
                "created_at": now,
                "endpoint": f"/api/v1/saved-searches/{saved_search_id}:{action}",
                "query_hash": query_hash,
                "status_code": 200,
                "latency_ms": 0,
                "result_count": 1,
                "error_class": None,
            }
        )

    @staticmethod
    def create(payload: SavedSearchCreateRequest) -> SavedSearchOut:
        """Create one saved search row."""

        assert payload.query is not None
        canonical = SavedSearchService._canonical_filters(payload.query)
        now = datetime.now(timezone.utc).isoformat()
        row = {
            "id": str(uuid4()),
            "name": payload.name.strip(),
            "filters_json": json.dumps(canonical, sort_keys=True),
            "query_payload": json.dumps(canonical, sort_keys=True),
            "profile_payload": json.dumps(payload.profile.model_dump(mode="json"), sort_keys=True) if payload.profile else None,
            "ruleset_version": payload.ruleset_version,
            "is_enabled": True,
            "last_run_at": None,
            "created_at": now,
            "updated_at": now,
        }
        SavedSearchRepo.create(row)
        SavedSearchService._record_audit(
            action="create",
            saved_search_id=str(row["id"]),
            payload={
                "name": row["name"],
                "query_payload": canonical,
                "profile_payload": payload.profile.model_dump(mode="json") if payload.profile else None,
                "ruleset_version": payload.ruleset_version,
            },
        )
        return SavedSearchService._to_out(row)

    @staticmethod
    def list_all() -> list[SavedSearchOut]:
        """List saved searches ordered by recency."""

        return [SavedSearchService._to_out(row) for row in SavedSearchRepo.list_all()]

    @staticmethod
    def get(saved_search_id: str) -> SavedSearchOut:
        """Fetch one saved search or raise controlled not-found error."""

        row = SavedSearchRepo.get_by_id(saved_search_id)
        if row is None:
            raise SavedSearchNotFoundError(f"Saved search not found for id={saved_search_id}")
        return SavedSearchService._to_out(row)

    @staticmethod
    def update(saved_search_id: str, payload: SavedSearchUpdateRequest) -> SavedSearchOut:
        """Update saved search row deterministically."""

        existing = SavedSearchRepo.get_by_id(saved_search_id)
        if existing is None:
            raise SavedSearchNotFoundError(f"Saved search not found for id={saved_search_id}")

        assert payload.query is not None
        canonical = SavedSearchService._canonical_filters(payload.query)
        row = {
            "id": saved_search_id,
            "name": payload.name.strip(),
            "filters_json": json.dumps(canonical, sort_keys=True),
            "query_payload": json.dumps(canonical, sort_keys=True),
            "profile_payload": json.dumps(payload.profile.model_dump(mode="json"), sort_keys=True) if payload.profile else None,
            "ruleset_version": payload.ruleset_version,
            "is_enabled": bool(existing.get("is_enabled", 1)),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        SavedSearchRepo.update(row)
        SavedSearchService._record_audit(
            action="update",
            saved_search_id=saved_search_id,
            payload={
                "name": row["name"],
                "query_payload": canonical,
                "profile_payload": payload.profile.model_dump(mode="json") if payload.profile else None,
                "ruleset_version": payload.ruleset_version,
            },
        )
        refreshed = SavedSearchRepo.get_by_id(saved_search_id)
        assert refreshed is not None
        return SavedSearchService._to_out(refreshed)

    @staticmethod
    def delete(saved_search_id: str) -> None:
        """Delete saved search row or raise not-found error."""

        deleted = SavedSearchRepo.delete(saved_search_id)
        if not deleted:
            raise SavedSearchNotFoundError(f"Saved search not found for id={saved_search_id}")
        SavedSearchService._record_audit(
            action="delete",
            saved_search_id=saved_search_id,
            payload={"saved_search_id": saved_search_id},
        )
