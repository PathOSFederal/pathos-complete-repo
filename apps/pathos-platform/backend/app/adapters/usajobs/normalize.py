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
import re
from typing import Iterable, Literal

from app.adapters.usajobs.models import USAJobsCodeName, USAJobsDetails, USAJobsSearchItem
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


def _clean_text(value: str) -> str:
    """Normalize upstream text/HTML fragments into compact audit-safe strings."""

    without_tags = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", without_tags).strip()


def _text_list(value: str | list[str] | None) -> list[str]:
    """Return deterministic non-empty text fragments from USAJOBS string/list fields."""

    if value is None:
        return []
    raw_values = value if isinstance(value, list) else [value]
    cleaned: list[str] = []
    for item in raw_values:
        text = str(item)
        list_items = re.findall(
            r"<li[^>]*>(.*?)</li>",
            text,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if list_items:
            cleaned.extend(_clean_text(list_item) for list_item in list_items)
        else:
            cleaned.append(_clean_text(text))
    return sorted({item for item in cleaned if item})


def _code_values(values: list[USAJobsCodeName] | None) -> list[str]:
    """Extract stable non-empty code values from USAJOBS code/name arrays."""

    if values is None:
        return []
    codes: list[str] = []
    for item in values:
        if item.Code and item.Code.strip():
            codes.append(item.Code.strip())
    return sorted(set(codes))


def _name_values(values: list[USAJobsCodeName] | None) -> list[str]:
    """Extract stable display names from USAJOBS code/name arrays."""

    if values is None:
        return []
    names: list[str] = []
    for item in values:
        if item.Name and item.Name.strip():
            names.append(item.Name.strip())
    return sorted(set(names))


def _pay_plan(values: list[USAJobsCodeName] | None) -> str | None:
    """Infer a pay plan from grade codes such as GS-2210-12 when available."""

    for code in _code_values(values):
        match = re.match(r"^([A-Za-z]+)", code)
        if match:
            return match.group(1).upper()
    return None


def _source_url(item: USAJobsSearchItem, details: USAJobsDetails | None) -> str | None:
    """Preserve the official USAJOBS announcement URL when upstream provides enough identity."""

    if details and details.PositionURI and details.PositionURI.strip():
        return details.PositionURI.strip()
    if item.MatchedObjectId and item.MatchedObjectId.strip():
        return "https://www.usajobs.gov/job/" + item.MatchedObjectId.strip()
    return None


def _remote_status(
    *,
    details: USAJobsDetails | None,
    descriptor_text: str,
    locations: list[str],
) -> Literal["remote", "onsite", "location_negotiable", "unknown"]:
    """Classify fully remote work without treating telework as remote."""

    combined_text = " ".join([descriptor_text, *locations]).lower()
    if details and details.RemoteIndicator is True:
        return "remote"
    if "location negotiable after selection" in combined_text:
        return "location_negotiable"
    if details and details.RemoteIndicator is False:
        return "onsite"
    exact_remote_locations = {
        "remote",
        "anywhere in the u.s. (remote job)",
        "anywhere in the us (remote job)",
    }
    if any(location.strip().lower() in exact_remote_locations for location in locations):
        return "remote"
    if "remote job" in combined_text:
        return "remote"
    return "unknown"


def _telework_status(
    *,
    details: USAJobsDetails | None,
    descriptor_text: str,
) -> Literal["eligible", "not_eligible", "unknown"]:
    """Classify telework separately from fully remote work."""

    if details and details.TeleworkEligible is True:
        return "eligible"
    if details and details.TeleworkEligible is False:
        return "not_eligible"
    if "telework" in descriptor_text.lower():
        return "eligible"
    return "unknown"


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
        source_url = _source_url(item, details)

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
        detail_job_categories = details.JobCategory if details and details.JobCategory else None
        descriptor_job_categories = descriptor.JobCategory if descriptor.JobCategory else None
        detail_job_grades = details.JobGrade if details and details.JobGrade else None
        descriptor_job_grades = descriptor.JobGrade if descriptor.JobGrade else None
        job_categories = detail_job_categories if detail_job_categories is not None else descriptor_job_categories
        job_grades = detail_job_grades if detail_job_grades is not None else descriptor_job_grades
        descriptor_text_parts = [
            descriptor.PositionLocationDisplay or "",
            " ".join(_text_list(details.MajorDuties if details else None)),
            " ".join(_text_list(details.Requirements if details else None)),
        ]
        descriptor_text = " ".join(descriptor_text_parts)
        qualifications = _text_list(details.QualificationsRequired if details else None)
        qualifications.extend(_text_list(details.QualificationSummary if details else None))
        qualifications.extend(_text_list(details.Requirements if details else None))

        normalized.append(
            NormalizedUSAJobsItem(
                job=CanonicalJob(
                    id=job_id,
                    source_job_id=item.MatchedObjectId.strip() if item.MatchedObjectId and item.MatchedObjectId.strip() else job_id,
                    announcement_number=descriptor.PositionID.strip() if descriptor.PositionID and descriptor.PositionID.strip() else None,
                    title=(descriptor.PositionTitle or "Untitled Position").strip(),
                    organization=(descriptor.OrganizationName or "Unknown Agency").strip(),
                    agency=(descriptor.OrganizationName or "Unknown Agency").strip(),
                    department=(
                        details.DepartmentName.strip()
                        if details and details.DepartmentName and details.DepartmentName.strip()
                        else descriptor.DepartmentName.strip()
                        if descriptor.DepartmentName and descriptor.DepartmentName.strip()
                        else None
                    ),
                    series=_code_values(job_categories),
                    pay_plan=_pay_plan(job_grades),
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
                    remote_status=_remote_status(
                        details=details,
                        descriptor_text=descriptor_text,
                        locations=locations,
                    ),
                    telework_status=_telework_status(
                        details=details,
                        descriptor_text=descriptor_text,
                    ),
                    open_date=details.PublicationStartDate.strip() if details and details.PublicationStartDate else None,
                    close_date=details.ApplicationCloseDate.strip() if details and details.ApplicationCloseDate else None,
                    apply_url=apply_url,
                    source_url=source_url,
                    documents=_text_list(details.RequiredDocuments if details else None),
                    qualifications=sorted(set(qualifications)),
                    duties=_text_list(details.MajorDuties if details else None),
                    who_may_apply=_text_list(details.WhoMayApply if details else None),
                    hiring_path=_name_values(details.HiringPath if details else None),
                    status="open",
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
