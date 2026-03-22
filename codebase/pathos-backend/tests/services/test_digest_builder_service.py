from __future__ import annotations

from app.services.digest_builder_service import DigestBuilderService


def test_digest_builder_is_deterministic_and_sorted() -> None:
    ranked = [
        {
            "job": {"id": "B", "title": "B", "organization": "Agency"},
            "score": {
                "final_score": 80,
                "reasons": [{"code": "GRADE_MATCH"}],
                "risks": [{"code": "REMOTE_REQUIRED"}],
            },
        },
        {
            "job": {"id": "A", "title": "A", "organization": "Agency"},
            "score": {
                "final_score": 80,
                "reasons": [{"code": "GRADE_MATCH"}],
                "risks": [{"code": "LOCATION_MISMATCH"}],
            },
        },
    ]
    decisions = [
        {"job_id": "A", "triggered": True},
        {"job_id": "B", "triggered": False},
    ]
    deltas = [
        {"job_id": "A", "status": "new", "score_delta": 0},
        {"job_id": "B", "status": "updated", "score_delta": 3},
    ]

    first = DigestBuilderService.build_digest_payload(
        run_metadata={"ruleset_version": "job-scoring-v1", "mapper_version": "usajobs-normalize-v1"},
        ranked_results=ranked,
        decisions=decisions,
        deltas=deltas,
    )
    second = DigestBuilderService.build_digest_payload(
        run_metadata={"ruleset_version": "job-scoring-v1", "mapper_version": "usajobs-normalize-v1"},
        ranked_results=ranked,
        decisions=decisions,
        deltas=deltas,
    )

    assert first.model_dump(mode="json") == second.model_dump(mode="json")
    assert [row["job_id"] for row in first.top_jobs] == ["A", "B"]
