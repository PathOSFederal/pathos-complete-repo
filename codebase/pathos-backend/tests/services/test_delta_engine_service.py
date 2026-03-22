from __future__ import annotations

from app.models.job_search import JobSearchRequest
from app.models.saved_search import SavedSearchCreateRequest
from app.services.delta_engine_service import DeltaEngineService, canonical_job_fingerprint
from app.services.saved_search_service import SavedSearchService


def _result(job_id: str, score: int, title: str = "Analyst") -> dict:
    return {
        "job": {
            "id": job_id,
            "title": title,
            "organization": "Agency",
            "locations": ["Remote"],
            "compensation": {"grade_min": 11, "grade_max": 12, "salary_min": 1, "salary_max": 2},
            "open_date": None,
            "close_date": None,
            "apply_url": "https://example.com",
            "source": {"mapper_version": "usajobs-normalize-v1"},
        },
        "score": {"final_score": score},
    }


def test_fingerprint_is_stable_for_same_canonical_payload() -> None:
    payload = _result("J1", 70)["job"]
    assert canonical_job_fingerprint(payload) == canonical_job_fingerprint(payload)


def test_delta_classification_new_updated_unchanged_disappeared(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "delta_classification.db"))
    saved = SavedSearchService.create(
        SavedSearchCreateRequest(name="S", query=JobSearchRequest(keyword="analyst"), ruleset_version="job-scoring-v1")
    )

    first = DeltaEngineService.classify_and_update_snapshots(
        saved_search_id=saved.id,
        ranked_results=[_result("A", 70), _result("B", 80)],
    )
    second = DeltaEngineService.classify_and_update_snapshots(
        saved_search_id=saved.id,
        ranked_results=[_result("A", 70), _result("B", 85, title="Analyst II"), _result("C", 90)],
    )

    assert first["counts"]["new"] == 2
    assert second["counts"]["new"] == 1
    assert second["counts"]["updated"] == 1
    assert second["counts"]["unchanged"] == 1
    assert second["counts"]["disappeared"] == 0
