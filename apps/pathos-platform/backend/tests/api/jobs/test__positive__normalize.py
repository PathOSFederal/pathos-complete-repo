"""Normalization unit tests for Slice 27.

Coverage intent:
- Confirms deterministic canonical mapping from minimal USAJOBS fixture payload.
- Verifies defensive handling of missing optional fields.
"""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path

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
from app.db.repo.saved_search_ingested_job_repo import SavedSearchIngestedJobRepo


FIXTURE_PATH = Path(__file__).parents[2] / "fixtures" / "usajobs_search_day49_canonical.json"


def _day49_fixture_payload() -> dict:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def _day49_fixture_rows():
    envelope = USAJobsEnvelope.model_validate(_day49_fixture_payload())
    return normalize_search_items(
        envelope.SearchResult.SearchResultItems,
        retrieved_at="2026-06-10T00:00:00+00:00",
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


def test_positive__normalizes_real_usajobs_shape_to_canonical_fields() -> None:
    rows = _day49_fixture_rows()
    row = rows[0]

    assert row.id == "800000001"
    assert row.source_job_id == "800000001"
    assert row.announcement_number == "DE-800000001-26"
    assert row.title == "IT Specialist (Policy and Planning)"
    assert row.organization == "Office of Personnel Management"
    assert row.agency == "Office of Personnel Management"
    assert row.department == "Office of Personnel Management"
    assert row.series == ["2210"]
    assert row.pay_plan == "GS"
    assert row.compensation.grade_min == 13
    assert row.compensation.grade_max == 13
    assert row.compensation.salary_min == 99200
    assert row.compensation.salary_max == 153354
    assert row.locations == ["Anywhere in the U.S. (remote job)"]
    assert row.remote_status == "remote"
    assert row.telework_status == "not_eligible"
    assert row.open_date == "2026-06-01"
    assert row.close_date == "2027-06-15"
    assert row.apply_url == "https://www.usajobs.gov/job/800000001/apply"
    assert row.source_url == "https://www.usajobs.gov/job/800000001"
    assert row.documents == ["Resume", "SF-50"]
    assert row.qualifications == [
        "Experience with secure cloud delivery is qualifying.",
        "Must be able to obtain a public trust clearance.",
        "One year of specialized experience supporting federal IT systems.",
    ]
    assert row.duties == [
        "Build secure workforce systems.",
        "Coordinate incident response planning.",
    ]
    assert row.who_may_apply == ["The public"]
    assert row.hiring_path == ["Open to the public"]
    assert row.status == "open"
    assert row.source.source == "USAJOBS"
    assert row.source.mapper_version == "usajobs-normalize-v1"


def test_positive__normalizes_live_usajobs_who_may_apply_and_hiring_path_shapes() -> None:
    payload = {
        "SearchResult": {
            "SearchResultCountAll": 1,
            "SearchResultItems": [
                {
                    "MatchedObjectId": "900000001",
                    "MatchedObjectDescriptor": {
                        "PositionID": "DE-900000001-26",
                        "PositionTitle": "IT Specialist",
                        "OrganizationName": "Example Agency",
                        "PositionLocationDisplay": "Florida",
                        "PositionLocation": [{"LocationName": "Miami, Florida"}],
                        "PositionRemuneration": [
                            {"MinimumRange": "90000", "MaximumRange": "120000"}
                        ],
                        "UserArea": {
                            "Details": {
                                "LowGrade": "12",
                                "HighGrade": "13",
                                "ApplyURI": ["https://www.usajobs.gov/job/900000001/apply"],
                                "PositionURI": "https://www.usajobs.gov/job/900000001",
                                "WhoMayApply": {
                                    "Code": "public",
                                    "Name": "The public",
                                },
                                "HiringPath": ["public", "vet"],
                            }
                        },
                    },
                }
            ],
        }
    }

    envelope = USAJobsEnvelope.model_validate(payload)
    row = normalize_search_items(envelope.SearchResult.SearchResultItems)[0]

    assert row.who_may_apply == ["The public"]
    assert row.hiring_path == ["public", "vet"]


def test_positive__normalizes_remote_and_telework_as_separate_fields() -> None:
    rows = {row.id: row for row in _day49_fixture_rows()}

    assert rows["800000001"].remote_status == "remote"
    assert rows["800000001"].telework_status == "not_eligible"
    assert rows["800000002"].remote_status == "onsite"
    assert rows["800000002"].telework_status == "eligible"
    assert rows["800000003"].remote_status == "location_negotiable"
    assert rows["800000003"].telework_status == "unknown"
    assert rows["800000004"].remote_status == "onsite"
    assert rows["800000004"].telework_status == "not_eligible"
    assert rows["800000005"].remote_status == "unknown"
    assert rows["800000005"].telework_status == "unknown"


def test_positive__canonical_hash_ignores_upstream_noise_and_retrieval_time() -> None:
    payload = _day49_fixture_payload()
    noisy_payload = deepcopy(payload)
    noisy_descriptor = noisy_payload["SearchResult"]["SearchResultItems"][0]["MatchedObjectDescriptor"]
    noisy_descriptor["IgnoredUpstreamField"] = {"fetched_at": "2026-06-10T01:00:00Z"}
    noisy_descriptor["UserArea"]["Details"]["IgnoredDetailField"] = "volatile"

    base = USAJobsEnvelope.model_validate(payload)
    noisy = USAJobsEnvelope.model_validate(noisy_payload)
    base_job = normalize_search_items(
        base.SearchResult.SearchResultItems,
        retrieved_at="2026-06-10T00:00:00+00:00",
    )[0]
    noisy_job = normalize_search_items(
        noisy.SearchResult.SearchResultItems,
        retrieved_at="2026-06-10T01:00:00+00:00",
    )[0]

    assert SavedSearchIngestedJobRepo.canonical_hash(base_job.model_dump(mode="json")) == (
        SavedSearchIngestedJobRepo.canonical_hash(noisy_job.model_dump(mode="json"))
    )


def test_positive__canonical_hash_changes_for_meaningful_normalized_fields() -> None:
    payload = _day49_fixture_payload()
    changed_payload = deepcopy(payload)
    details = changed_payload["SearchResult"]["SearchResultItems"][0]["MatchedObjectDescriptor"]["UserArea"]["Details"]
    details["RequiredDocuments"] = "<ul><li>Resume</li><li>SF-50</li><li>Transcripts</li></ul>"
    details["QualificationsRequired"] = "Two years of specialized experience supporting federal IT systems."

    base = USAJobsEnvelope.model_validate(payload)
    changed = USAJobsEnvelope.model_validate(changed_payload)
    base_job = normalize_search_items(base.SearchResult.SearchResultItems)[0]
    changed_job = normalize_search_items(changed.SearchResult.SearchResultItems)[0]

    assert SavedSearchIngestedJobRepo.canonical_hash(base_job.model_dump(mode="json")) != (
        SavedSearchIngestedJobRepo.canonical_hash(changed_job.model_dump(mode="json"))
    )


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
