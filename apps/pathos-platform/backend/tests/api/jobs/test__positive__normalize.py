"""Normalization unit tests for Slice 27.

Coverage intent:
- Confirms deterministic canonical mapping from minimal USAJOBS fixture payload.
- Verifies defensive handling of missing optional fields.
"""

from __future__ import annotations

from app.adapters.usajobs.models import USAJobsEnvelope
from app.adapters.usajobs.normalize import (
    WARNING_INVALID_GRADE_DROPPED,
    WARNING_INVALID_SALARY_DROPPED,
    WARNING_MISSING_APPLY_URL_FALLBACK_USED,
    WARNING_MISSING_JOB_ID_FALLBACK_USED,
    WARNING_MISSING_LOCATION_FALLBACK_USED,
    normalize_search_items,
    normalize_search_items_with_warnings,
)


def test_positive__normalize_usajobs_payload_to_canonical_job() -> None:
    payload = {
        "SearchResult": {
            "SearchResultCountAll": 1,
            "SearchResultItems": [
                {
                    "MatchedObjectId": "A1",
                    "MatchedObjectDescriptor": {
                        "PositionTitle": "Program Analyst",
                        "OrganizationName": "Example Agency",
                        "PositionLocationDisplay": "Remote",
                        "PositionLocation": [{"LocationName": "Remote"}],
                        "PositionRemuneration": [{"MinimumRange": "75000", "MaximumRange": "98000"}],
                        "UserArea": {
                            "Details": {
                                "LowGrade": "11",
                                "HighGrade": "12",
                                "ApplyURI": ["https://www.usajobs.gov/job/A1/apply"],
                                "PublicationStartDate": "2026-02-01",
                                "ApplicationCloseDate": "2026-02-10",
                            }
                        },
                    },
                }
            ],
        }
    }
    envelope = USAJobsEnvelope.model_validate(payload)
    rows = normalize_search_items(envelope.SearchResult.SearchResultItems, retrieved_at="2026-02-13T00:00:00+00:00")
    assert len(rows) == 1
    row = rows[0]
    assert row.id == "A1"
    assert row.organization == "Example Agency"
    assert row.locations == ["Remote"]
    assert row.compensation.grade_min == 11
    assert row.compensation.salary_max == 98000
    assert row.source.source == "USAJOBS"
    assert row.source.retrieved_at == "2026-02-13T00:00:00+00:00"


def test_edge_case__normalize_missing_optional_fields() -> None:
    payload = {
        "SearchResult": {
            "SearchResultCountAll": 1,
            "SearchResultItems": [
                {
                    "MatchedObjectDescriptor": {
                        "PositionTitle": "Analyst",
                        "OrganizationName": "Agency",
                        "PositionLocation": [],
                        "PositionRemuneration": [],
                        "UserArea": {"Details": {}},
                    }
                }
            ],
        }
    }
    envelope = USAJobsEnvelope.model_validate(payload)
    row = normalize_search_items(envelope.SearchResult.SearchResultItems)[0]
    assert row.locations == ["Unspecified"]
    assert row.compensation.salary_min is None
    assert row.apply_url == "https://www.usajobs.gov/Search"


def test_edge_case__normalize_collects_deterministic_warnings() -> None:
    payload = {
        "SearchResult": {
            "SearchResultCountAll": 1,
            "SearchResultItems": [
                {
                    "MatchedObjectDescriptor": {
                        "PositionTitle": "Analyst",
                        "OrganizationName": "Agency",
                        "PositionLocation": [],
                        "PositionRemuneration": [{"MinimumRange": "oops"}],
                        "UserArea": {"Details": {"LowGrade": "99", "ApplyURI": []}},
                    }
                }
            ],
        }
    }
    envelope = USAJobsEnvelope.model_validate(payload)
    row = normalize_search_items_with_warnings(envelope.SearchResult.SearchResultItems)[0]
    assert row.job.id == "unknown-analyst"
    assert row.warnings == (
        WARNING_INVALID_GRADE_DROPPED,
        WARNING_INVALID_SALARY_DROPPED,
        WARNING_MISSING_APPLY_URL_FALLBACK_USED,
        WARNING_MISSING_JOB_ID_FALLBACK_USED,
        WARNING_MISSING_LOCATION_FALLBACK_USED,
    )
