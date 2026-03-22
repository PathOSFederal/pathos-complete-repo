"""app.adapters.usajobs.mapper

WHY THIS FILE EXISTS:
Legacy compatibility shim for earlier code paths that imported `map_usajobs_item`.
Current canonical mapping lives in `app.adapters.usajobs.normalize`.

LAYER FIT:
- Pure mapping layer in adapter boundary.

WHAT THIS FILE MUST NOT DO:
- Must not perform HTTP requests.
- Must not perform database writes.
- Must not use FastAPI request context.
"""

from __future__ import annotations

from app.adapters.usajobs.models import USAJobsSearchItem
from app.adapters.usajobs.normalize import normalize_search_items
from app.domain.jobs.canonical_models import CanonicalJob


def map_usajobs_item(item: USAJobsSearchItem) -> CanonicalJob:
    """Map one item to canonical job using the centralized normalization function."""

    return normalize_search_items([item])[0]
