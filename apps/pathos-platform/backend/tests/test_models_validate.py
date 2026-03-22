from app.models.advisor import AdvisorInput, AdvisorOutput
from app.models.common import ConfidenceBand, Recommendation
from app.models.job import NormalizedJob
from app.models.narration import NarrationOutput, is_valid_narration_payload, validate_narration_payload
from app.models.profile import UserProfileSnapshot


def sample_advisor_input_fixture() -> dict:
    return {
        "profile": {
            "user_id": "user-123",
            "years_experience": 4,
            "target_roles": ["Backend Engineer"],
            "skills": ["Python", "FastAPI", "SQL"],
            "preferred_locations": ["Remote", "New York, NY"],
            "authorized_to_work": True,
        },
        "job": {
            "job_id": "job-abc",
            "title": "Backend Engineer",
            "company": "Acme",
            "location": {
                "city": "New York",
                "region": "NY",
                "country": "US",
                "remote": True,
            },
            "grade_range": {"min_grade": 4, "max_grade": 6},
            "posting_dates": {
                "posted_date": "2026-02-01",
                "closes_date": "2026-03-01",
            },
            "source_url": "https://example.com/jobs/job-abc",
        },
        "user_notes": "Prefers mission-driven companies",
    }


def test_profile_model_parses() -> None:
    payload = sample_advisor_input_fixture()["profile"]
    profile = UserProfileSnapshot.model_validate(payload)
    assert profile.user_id == "user-123"


def test_job_model_parses() -> None:
    payload = sample_advisor_input_fixture()["job"]
    job = NormalizedJob.model_validate(payload)
    assert job.job_id == "job-abc"


def test_advisor_input_model_parses() -> None:
    advisor_input = AdvisorInput.model_validate(sample_advisor_input_fixture())
    assert advisor_input.job.title == "Backend Engineer"


def test_advisor_output_model_parses() -> None:
    payload = {
        "recommendation": "shortlist",
        "confidence_band": "medium",
        "reasons": [
            {
                "text": "Skills match core backend stack",
                "evidence_refs": [{"source": "resume", "pointer": "skills"}],
            }
        ],
        "risks": [{"text": "No explicit cloud cert listed", "mitigation": "Highlight project depth"}],
        "next_actions": [{"action": "Tailor resume bullets to API scale", "priority": 1}],
        "evidence": [{"source": "job_posting", "pointer": "requirements"}],
        "meta": {"policy_version": "v1", "generated_at": "2026-02-12T12:00:00Z"},
    }
    advisor_output = AdvisorOutput.model_validate(payload)
    assert advisor_output.recommendation == Recommendation.SHORTLIST
    assert advisor_output.confidence_band == ConfidenceBand.MEDIUM


def test_narration_output_model_parses() -> None:
    payload = {
        "headline": "Strong fit with minor gaps",
        "summary": "The candidate aligns well with role scope.",
        "bullets": ["Python/FastAPI experience matches", "Remote preference aligns"],
    }
    narration = NarrationOutput.model_validate(payload)
    assert narration.headline.startswith("Strong fit")


def test_narration_helpers_validate() -> None:
    payload = {
        "headline": "Proceed",
        "summary": "Sufficient signal to continue.",
        "bullets": ["Add quantified impact examples"],
    }
    validated = validate_narration_payload(payload)
    assert validated.summary == "Sufficient signal to continue."
    assert is_valid_narration_payload(payload) is True