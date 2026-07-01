"""app.adapters.usajobs.normalize

WHY THIS FILE EXISTS:
This module converts validated USAJOBS payloads into canonical domain jobs.
Normalization is deterministic and defensive so API contracts remain stable across upstream variance.

LAYER FIT:
- Pure adapter normalization layer.

WHAT THIS FILE MUST NOT DO:
- Must not perform HTTP calls.
- Must not persist data.
- Must not import FastAPI-specific modules.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

from app.adapters.usajobs.models import USAJobsSearchItem
from app.domain.jobs.canonical_models import CanonicalCompensation, CanonicalJob, CanonicalSourceMetadata

USAJOBS_MAPPER_VERSION = "usajobs-normalize-v1"

WARNING_MISSING_JOB_ID_FALLBACK_USED = "MISSING_JOB_ID_FALLBACK_USED"
WARNING_MISSING_LOCATION_FALLBACK_USED = "MISSING_LOCATION_FALLBACK_USED"
WARNING_MISSING_APPLY_URL_FALLBACK_USED = "MISSING_APPLY_URL_FALLBACK_USED"
WARNING_INVALID_GRADE_DROPPED = "INVALID_GRADE_DROPPED"
WARNING_INVALID_SALARY_DROPPED = "INVALID_SALARY_DROPPED"


@dataclass(frozen=True)
class NormalizedUSAJobsItem:
    """Normalized canonical job plus deterministic mapper warnings."""

    job: CanonicalJob
    warnings: tuple[str, ...]


def _safe_int(value: str | None) -> int | None:
    """Parse number-like strings deterministically; return None when missing/invalid."""

    if value is None:
        return None
    text = value.strip().replace(",", "")
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def _salary_value(value: str | None, *, warnings: list[str]) -> int | None:
    parsed = _safe_int(value)
    if value is not None and value.strip() and parsed is None:
        warnings.append(WARNING_INVALID_SALARY_DROPPED)
    return parsed


def _safe_grade(value: str | None) -> int | None:
    """Parse grade values and keep only plausible federal range (1..15)."""

    parsed = _safe_int(value)
    if parsed is None:
        return None
    if parsed < 1 or parsed > 15:
        return None
    return parsed


def _grade_value(value: str | None, *, warnings: list[str]) -> int | None:
    parsed = _safe_grade(value)
    if value is not None and value.strip() and parsed is None:
        warnings.append(WARNING_INVALID_GRADE_DROPPED)
    return parsed


def _deterministic_locations(item: USAJobsSearchItem) -> list[str]:
    """Return sorted unique location list with stable fallback behavior."""

    descriptor = item.MatchedObjectDescriptor
    values: list[str] = []
    if descriptor.PositionLocationDisplay and descriptor.PositionLocationDisplay.strip():
        values.append(descriptor.PositionLocationDisplay.strip())
    for node in descriptor.PositionLocation or []:
        if node.LocationName and node.LocationName.strip():
            values.append(node.LocationName.strip())
    deduped = sorted({value for value in values if value})
    if deduped:
        return deduped
    return ["Unspecified"]


def _derive_job_id(item: USAJobsSearchItem) -> tuple[str, bool]:
    """Build stable job identifier using explicit fallback order."""

    descriptor = item.MatchedObjectDescriptor
    details = descriptor.UserArea.Details if descriptor.UserArea and descriptor.UserArea.Details else None
    for candidate in (item.MatchedObjectId, descriptor.PositionID, details.PositionURI if details else None):
        if candidate and candidate.strip():
            return candidate.strip(), False
    title = (descriptor.PositionTitle or "unknown").strip().lower().replace(" ", "-")
    return f"unknown-{title}", True


def normalize_search_items_with_warnings(
    items: Iterable[USAJobsSearchItem],
    *,
    retrieved_at: str | None = None,
) -> list[NormalizedUSAJobsItem]:
    """Normalize USAJOBS items while preserving deterministic warning metadata."""

    timestamp = retrieved_at or datetime.now(timezone.utc).isoformat()
    normalized: list[NormalizedUSAJobsItem] = []
    for item in items:
        warnings: list[str] = []
        descriptor = item.MatchedObjectDescriptor
        details = descriptor.UserArea.Details if descriptor.UserArea and descriptor.UserArea.Details else None
        remuneration = descriptor.PositionRemuneration[0] if descriptor.PositionRemuneration else None

        apply_url = "https://www.usajobs.gov/Search"
        if details:
            for candidate in details.ApplyURI or []:
                if candidate and candidate.strip():
                    apply_url = candidate.strip()
                    break
            if apply_url == "https://www.usajobs.gov/Search" and details.PositionURI and details.PositionURI.strip():
                apply_url = details.PositionURI.strip()
        if apply_url == "https://www.usajobs.gov/Search":
            warnings.append(WARNING_MISSING_APPLY_URL_FALLBACK_USED)

        locations = _deterministic_locations(item)
        if locations == ["Unspecified"]:
            warnings.append(WARNING_MISSING_LOCATION_FALLBACK_USED)

        job_id, used_fallback_job_id = _derive_job_id(item)
        if used_fallback_job_id:
            warnings.append(WARNING_MISSING_JOB_ID_FALLBACK_USED)

        normalized.append(
            NormalizedUSAJobsItem(
                job=CanonicalJob(
                    id=job_id,
                    title=(descriptor.PositionTitle or "Untitled Position").strip(),
                    organization=(descriptor.OrganizationName or "Unknown Agency").strip(),
                    locations=locations,
                    compensation=CanonicalCompensation(
                        grade_min=_grade_value(details.LowGrade if details else None, warnings=warnings),
                        grade_max=_grade_value(details.HighGrade if details else None, warnings=warnings),
                        salary_min=_salary_value(
                            remuneration.MinimumRange if remuneration else None,
                            warnings=warnings,
                        ),
                        salary_max=_salary_value(
                            remuneration.MaximumRange if remuneration else None,
                            warnings=warnings,
                        ),
                    ),
                    open_date=details.PublicationStartDate.strip() if details and details.PublicationStartDate else None,
                    close_date=details.ApplicationCloseDate.strip() if details and details.ApplicationCloseDate else None,
                    apply_url=apply_url,
                    source=CanonicalSourceMetadata(
                        source="USAJOBS",
                        retrieved_at=timestamp,
                        mapper_version=USAJOBS_MAPPER_VERSION,
                    ),
                ),
                warnings=tuple(sorted(set(warnings))),
            )
        )
    return normalized


def normalize_search_items(
    items: Iterable[USAJobsSearchItem],
    *,
    retrieved_at: str | None = None,
) -> list[CanonicalJob]:
    """Normalize upstream USAJOBS search items into canonical deterministic jobs.

    Inputs:
    - `items`: validated USAJOBS records.
    - `retrieved_at`: optional precomputed ISO timestamp for deterministic test injection.

    Outputs:
    - Canonical jobs list in input order.
    """

    return [
        normalized_item.job
        for normalized_item in normalize_search_items_with_warnings(
            items,
            retrieved_at=retrieved_at,
        )
    ]
