from __future__ import annotations

from fastapi.testclient import TestClient

from app.intelligence.snapshots.models import (
    ApplicationConfidenceSnapshot,
    CareerReadinessSnapshot,
    JobMatchSnapshot,
    ResumeReadinessSnapshot,
)
from app.main import create_app


def _headers() -> dict[str, str]:
    return {"Authorization": "Bearer k1"}


def _career_payload() -> dict:
    return {
        "user_profile": {
            "target_series": ["0343"],
            "skills_keywords": ["analysis", "program", "policy"],
            "grade": "GS-13",
        },
        "target_role": "GS-13 Program Analyst (0343)",
        "resume_id": "resume:master:v3",
    }


def _resume_payload() -> dict:
    return {
        "resume_text": (
            "Program analyst with ten years of federal experience leading cross-functional "
            "initiatives, reducing cycle time, and improving service outcomes."
        ),
        "target_role": "GS-13 Program Analyst (0343)",
    }


def _job_payload() -> dict:
    return {
        "user_profile": {
            "skills_keywords": ["analysis", "program", "leadership", "performance"],
            "grade": "GS-13",
        },
        "job": {
            "id": "USAJOBS-123",
            "title": "Program Analyst",
            "summary": "Lead program analysis, performance reporting, and policy support.",
            "series": "0343",
            "grade": "13",
        },
        "target_role": "GS-13 Program Analyst (0343)",
    }


def test_career_readiness_endpoint_contract_and_determinism(monkeypatch) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    app = create_app(mode="openapi")
    payload = _career_payload()

    with TestClient(app) as client:
        first = client.post(
            "/api/v1/intelligence/career-readiness",
            json=payload,
            headers=_headers(),
        )
        second = client.post(
            "/api/v1/intelligence/career-readiness",
            json=payload,
            headers=_headers(),
        )

    assert first.status_code == 200
    assert second.status_code == 200
    first_model = CareerReadinessSnapshot.model_validate(first.json())
    second_model = CareerReadinessSnapshot.model_validate(second.json())
    assert first_model.meta.rule_version == "snapshot-rules-v1"
    assert first_model.meta.knowledge_pack_version == "career-pack-v1"
    assert first_model.meta.snapshot_id == second_model.meta.snapshot_id
    assert first_model.meta.input_hash == second_model.meta.input_hash


def test_resume_readiness_endpoint_contract_and_determinism(monkeypatch) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    app = create_app(mode="openapi")
    payload = _resume_payload()

    with TestClient(app) as client:
        first = client.post(
            "/api/v1/intelligence/resume-readiness",
            json=payload,
            headers=_headers(),
        )
        second = client.post(
            "/api/v1/intelligence/resume-readiness",
            json=payload,
            headers=_headers(),
        )

    assert first.status_code == 200
    assert second.status_code == 200
    first_model = ResumeReadinessSnapshot.model_validate(first.json())
    second_model = ResumeReadinessSnapshot.model_validate(second.json())
    assert first_model.meta.rule_version == "snapshot-rules-v1"
    assert first_model.meta.knowledge_pack_version == "career-pack-v1"
    assert first_model.meta.snapshot_id == second_model.meta.snapshot_id
    assert first_model.meta.input_hash == second_model.meta.input_hash


def test_job_match_endpoint_contract_and_determinism(monkeypatch) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    app = create_app(mode="openapi")
    payload = _job_payload()

    with TestClient(app) as client:
        first = client.post(
            "/api/v1/intelligence/job-match",
            json=payload,
            headers=_headers(),
        )
        second = client.post(
            "/api/v1/intelligence/job-match",
            json=payload,
            headers=_headers(),
        )

    assert first.status_code == 200
    assert second.status_code == 200
    first_model = JobMatchSnapshot.model_validate(first.json())
    second_model = JobMatchSnapshot.model_validate(second.json())
    assert first_model.meta.rule_version == "snapshot-rules-v1"
    assert first_model.meta.knowledge_pack_version == "career-pack-v1"
    assert first_model.meta.snapshot_id == second_model.meta.snapshot_id
    assert first_model.meta.input_hash == second_model.meta.input_hash


def test_application_confidence_endpoint_contract_and_determinism(monkeypatch) -> None:
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    app = create_app(mode="openapi")

    with TestClient(app) as client:
        career_response = client.post(
            "/api/v1/intelligence/career-readiness",
            json=_career_payload(),
            headers=_headers(),
        )
        job_response = client.post(
            "/api/v1/intelligence/job-match",
            json=_job_payload(),
            headers=_headers(),
        )
        assert career_response.status_code == 200
        assert job_response.status_code == 200
        payload = {
            "career_readiness": career_response.json(),
            "job_match": job_response.json(),
            "heuristics": {"questionnaire_fit": "unknown"},
        }
        first = client.post(
            "/api/v1/intelligence/application-confidence",
            json=payload,
            headers=_headers(),
        )
        second = client.post(
            "/api/v1/intelligence/application-confidence",
            json=payload,
            headers=_headers(),
        )

    assert first.status_code == 200
    assert second.status_code == 200
    first_model = ApplicationConfidenceSnapshot.model_validate(first.json())
    second_model = ApplicationConfidenceSnapshot.model_validate(second.json())
    assert first_model.meta.rule_version == "snapshot-rules-v1"
    assert first_model.meta.knowledge_pack_version == "career-pack-v1"
    assert first_model.meta.snapshot_id == second_model.meta.snapshot_id
    assert first_model.meta.input_hash == second_model.meta.input_hash
