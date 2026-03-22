"""app.services.profile_service

WHY THIS FILE EXISTS:
Provides deterministic profile read/update flow with basic sensitive-pattern guardrails.

LAYER FIT:
- Service/business layer.

WHAT THIS FILE MUST NOT DO:
- Must not claim full data-classification accuracy.
- Must not call external APIs.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone

from app.db.repo.profile_repo import ProfileRepo
from app.models.profile_v1 import ProfileOut, ProfileUpdateRequest


class ProfileSensitiveInputError(Exception):
    """Raised when profile payload appears to include sensitive restricted patterns."""


class ProfileService:
    """Deterministic profile service with canonical list normalization."""

    SENSITIVE_PATTERNS = [
        re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
        re.compile(r"\btop\s*secret\b", re.IGNORECASE),
        re.compile(r"\bsecret\b", re.IGNORECASE),
    ]

    @staticmethod
    def _canonical_list(values: list[str]) -> list[str]:
        """Canonicalize list values by trim/dedupe/sort."""

        return sorted({value.strip() for value in values if value.strip()})

    @staticmethod
    def _contains_sensitive_patterns(payload: ProfileUpdateRequest) -> bool:
        """Best-effort guardrail for obvious sensitive-like text.

        This is intentionally simple and deterministic; it is not a classifier.
        """

        fields = [payload.persona, payload.remote_preference or ""]
        fields.extend(payload.target_series)
        fields.extend(payload.target_locations)
        fields.extend(payload.skills_keywords)
        joined = "\n".join(fields)
        return any(pattern.search(joined) for pattern in ProfileService.SENSITIVE_PATTERNS)

    @staticmethod
    def _to_out(row: dict) -> ProfileOut:
        """Convert repository row to typed profile output."""

        return ProfileOut(
            id=row["id"],
            persona=row["persona"],
            target_series=json.loads(row["target_series_json"]),
            grade_min=row["grade_min"],
            grade_max=row["grade_max"],
            target_locations=json.loads(row["target_locations_json"]),
            remote_preference=row["remote_preference"],
            skills_keywords=json.loads(row["skills_keywords_json"]),
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )

    @staticmethod
    def get_profile() -> ProfileOut:
        """Return default profile; create deterministic empty profile when missing."""

        row = ProfileRepo.get_default()
        if row is None:
            now = datetime.now(timezone.utc).isoformat()
            ProfileRepo.upsert_default(
                {
                    "persona": "job_seeker",
                    "target_series_json": json.dumps([], sort_keys=True),
                    "grade_min": None,
                    "grade_max": None,
                    "target_locations_json": json.dumps([], sort_keys=True),
                    "remote_preference": None,
                    "skills_keywords_json": json.dumps([], sort_keys=True),
                    "created_at": now,
                    "updated_at": now,
                }
            )
            row = ProfileRepo.get_default()
            assert row is not None
        return ProfileService._to_out(row)

    @staticmethod
    def update_profile(payload: ProfileUpdateRequest) -> ProfileOut:
        """Validate and persist canonical profile settings."""

        if ProfileService._contains_sensitive_patterns(payload):
            raise ProfileSensitiveInputError("Profile payload contains restricted sensitive-looking text")

        existing = ProfileRepo.get_default()
        now = datetime.now(timezone.utc).isoformat()
        created_at = existing["created_at"] if existing else now

        ProfileRepo.upsert_default(
            {
                "persona": payload.persona.strip(),
                "target_series_json": json.dumps(ProfileService._canonical_list(payload.target_series), sort_keys=True),
                "grade_min": payload.grade_min,
                "grade_max": payload.grade_max,
                "target_locations_json": json.dumps(
                    ProfileService._canonical_list(payload.target_locations), sort_keys=True
                ),
                "remote_preference": payload.remote_preference.strip() if payload.remote_preference else None,
                "skills_keywords_json": json.dumps(
                    ProfileService._canonical_list(payload.skills_keywords), sort_keys=True
                ),
                "created_at": created_at,
                "updated_at": now,
            }
        )
        row = ProfileRepo.get_default()
        assert row is not None
        return ProfileService._to_out(row)
