"""Additional Slice 21 category coverage for service canonicalization and mapper edge paths.
Covers Equivalence, Boundary, and Edge Case determinism.
"""

from __future__ import annotations

from app.adapters.usajobs.normalize import normalize_search_items
from app.adapters.usajobs.models import USAJobsSearchItem
from app.models.job_search import JobSearchRequest
from app.services.job_search_service import JobSearchService


def test_equivalence__job_search_service_canonical_query_param_order() -> None:
    request_a = JobSearchRequest(keyword="analyst", agency_codes=["B", "A"], series=["2210", "0343"])
    request_b = JobSearchRequest(keyword="analyst", agency_codes=["A", "B"], series=["0343", "2210"])
    assert JobSearchService._canonical_query_params(request_a) == JobSearchService._canonical_query_params(request_b)


def test_boundary__job_search_service_fingerprint_stable() -> None:
    request = JobSearchRequest(keyword="analyst", page=1, page_size=20)
    first = JobSearchService.fingerprint_params(request)
    second = JobSearchService.fingerprint_params(request)
    assert first == second


def test_edge_case__mapper_missing_fields_still_maps() -> None:
    item = USAJobsSearchItem.model_validate(
        {
            "MatchedObjectDescriptor": {
                "PositionTitle": "Title",
                "OrganizationName": "Agency",
                "PositionLocation": [{"LocationName": "B"}, {"LocationName": "A"}],
                "PositionRemuneration": [],
                "UserArea": {"Details": {"RemoteIndicator": False}},
            }
        }
    )
    result = normalize_search_items([item])[0]
    assert result.locations == ["A", "B"]
    assert result.compensation.salary_min is None
    assert result.apply_url == "https://www.usajobs.gov/Search"
