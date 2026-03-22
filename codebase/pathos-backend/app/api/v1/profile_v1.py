"""app.api.v1.profile_v1

WHY THIS FILE EXISTS:
Thin API controller for job seeker profile v1.

LAYER FIT:
- Router/controller layer.

WHAT THIS FILE MUST NOT DO:
- Must not run canonicalization heuristics directly.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.profile_v1 import ProfileOut, ProfileUpdateRequest
from app.services.profile_service import ProfileSensitiveInputError, ProfileService

router = APIRouter()


@router.get("/profile", response_model=ProfileOut)
def get_profile() -> ProfileOut:
    """Return default profile snapshot."""

    return ProfileService.get_profile()


@router.put("/profile", response_model=ProfileOut)
def put_profile(payload: ProfileUpdateRequest) -> ProfileOut:
    """Update profile with deterministic canonicalization."""

    try:
        return ProfileService.update_profile(payload)
    except ProfileSensitiveInputError as exc:
        raise HTTPException(status_code=400, detail={"code": "BAD_REQUEST"}) from exc
