from __future__ import annotations

from app.adapters.usajobs.mapper import map_usajobs_item
from app.adapters.usajobs.models import USAJobsSearchItem


def _fixture_primary() -> dict:
    return {
        "MatchedObjectId": "USA-123",
        "MatchedObjectDescriptor": {
            "PositionID": "POS-123",
            "PositionTitle": "IT Specialist",
            "OrganizationName": "Department of Example",
            "PositionLocationDisplay": "Remote",
            "PositionLocation": [{"LocationName": "Remote"}, {"LocationName": "Anywhere, US"}],
            "PositionRemuneration": [{"MinimumRange": "85000", "MaximumRange": "120000"}],
            "UserArea": {
                "Details": {
                    "LowGrade": "11",
                    "HighGrade": "13",
                    "PublicationStartDate": "2026-02-01",
                    "ApplicationCloseDate": "2026-03-01",
                    "ApplyURI": ["https://example.gov/apply/123"],
                }
            },
        },
    }


def _fixture_secondary() -> dict:
    return {
        "MatchedObjectDescriptor": {
            "PositionID": "POS-456",
            "PositionTitle": "Management Analyst",
            "OrganizationName": "Independent Agency",
            "PositionLocation": [{"LocationName": "Washington, DC"}, {"LocationName": "Chicago, IL"}],
            "PositionRemuneration": [{"MinimumRange": "95000", "MaximumRange": "130000"}],
            "UserArea": {
                "Details": {
                    "LowGrade": "12",
                    "HighGrade": "14",
                    "PublicationStartDate": "2026-02-10",
                    "ApplicationCloseDate": "2026-03-15",
                    "PositionURI": "https://www.usajobs.gov/job/456",
                }
            },
        },
    }


def test_map_usajobs_item__canonical_invariants_primary_fixture() -> None:
    item = USAJobsSearchItem.model_validate(_fixture_primary())
    mapped = map_usajobs_item(item)

    assert mapped.id == "USA-123"
    assert mapped.title == "IT Specialist"
    assert mapped.organization == "Department of Example"
    assert mapped.locations == ["Anywhere, US", "Remote"]
    assert mapped.open_date == "2026-02-01"
    assert mapped.close_date == "2026-03-01"


def test_map_usajobs_item__canonical_invariants_secondary_fixture() -> None:
    item = USAJobsSearchItem.model_validate(_fixture_secondary())
    mapped = map_usajobs_item(item)

    assert mapped.id == "POS-456"
    assert mapped.title == "Management Analyst"
    assert mapped.organization == "Independent Agency"
    assert mapped.locations == ["Chicago, IL", "Washington, DC"]
    assert mapped.open_date == "2026-02-10"
    assert mapped.close_date == "2026-03-15"
