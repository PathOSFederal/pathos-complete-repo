"""app.api.v1.saved_searches

WHY THIS FILE EXISTS:
Thin API controller for saved-search CRUD operations.

LAYER FIT:
- Router/controller layer.

WHAT THIS FILE MUST NOT DO:
- Must not canonicalize filters itself.
- Must not perform direct DB writes.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.saved_search import SavedSearchCreateRequest, SavedSearchOut, SavedSearchUpdateRequest
from app.services.saved_search_service import SavedSearchNotFoundError, SavedSearchService

router = APIRouter()


@router.post("/saved-searches", response_model=SavedSearchOut)
def create_saved_search(payload: SavedSearchCreateRequest) -> SavedSearchOut:
    """Create deterministic saved search record."""

    return SavedSearchService.create(payload)


@router.get("/saved-searches", response_model=list[SavedSearchOut])
def list_saved_searches() -> list[SavedSearchOut]:
    """List saved searches by recency."""

    return SavedSearchService.list_all()


@router.get("/saved-searches/{saved_search_id}", response_model=SavedSearchOut)
def get_saved_search(saved_search_id: str) -> SavedSearchOut:
    """Fetch one saved search by identifier."""

    try:
        return SavedSearchService.get(saved_search_id)
    except SavedSearchNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "SAVED_SEARCH_NOT_FOUND"}) from exc


@router.put("/saved-searches/{saved_search_id}", response_model=SavedSearchOut)
def update_saved_search(saved_search_id: str, payload: SavedSearchUpdateRequest) -> SavedSearchOut:
    """Update one saved search record."""

    try:
        return SavedSearchService.update(saved_search_id, payload)
    except SavedSearchNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "SAVED_SEARCH_NOT_FOUND"}) from exc


@router.delete("/saved-searches/{saved_search_id}")
def delete_saved_search(saved_search_id: str) -> dict:
    """Delete saved search and related run/alert rows."""

    try:
        SavedSearchService.delete(saved_search_id)
    except SavedSearchNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "SAVED_SEARCH_NOT_FOUND"}) from exc
    return {"deleted": True, "id": saved_search_id}
