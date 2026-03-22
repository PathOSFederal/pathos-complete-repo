import json
from pathlib import Path

import pytest

from app.engine.evaluator import evaluate_advisor_input
from app.engine.reason_library import reason_codes
from app.models.advisor import AdvisorInput

FIXTURES_DIR = Path(__file__).parent / "fixtures"

EXPECTED_BY_FIXTURE = {
    "advisor_input_apply_remote.json": {
        "recommendation": "apply",
        "confidence_band": "high",
        "reason_codes": [
            "EXPERIENCE_IN_RANGE",
            "LOCATION_MATCH",
            "ROLE_MATCH_STRONG",
            "SKILL_OVERLAP_HIGH",
            "WORK_AUTHORIZED",
        ],
        "risk_codes": [],
        "action_codes": ["ACT_APPLY", "ACT_PREP_INTERVIEW"],
    },
    "advisor_input_shortlist_junior.json": {
        "recommendation": "apply",
        "confidence_band": "high",
        "reason_codes": [
            "EXPERIENCE_IN_RANGE",
            "LOCATION_MATCH",
            "ROLE_MATCH_STRONG",
            "SKILL_OVERLAP_HIGH",
            "WORK_AUTHORIZED",
        ],
        "risk_codes": [],
        "action_codes": ["ACT_APPLY", "ACT_PREP_INTERVIEW"],
    },
    "advisor_input_needs_info_mismatch.json": {
        "recommendation": "needs_info",
        "confidence_band": "medium",
        "reason_codes": [
            "EXPERIENCE_IN_RANGE",
            "LOCATION_MISMATCH",
            "ROLE_MATCH_WEAK",
            "SKILL_OVERLAP_HIGH",
            "WORK_AUTHORIZED",
        ],
        "risk_codes": ["RISK_LOCATION"],
        "action_codes": ["ACT_VERIFY_LOCATION"],
    },
    "advisor_input_skip_unauthorized.json": {
        "recommendation": "skip",
        "confidence_band": "low",
        "reason_codes": [
            "EXPERIENCE_IN_RANGE",
            "LOCATION_MATCH",
            "ROLE_MATCH_STRONG",
            "SKILL_OVERLAP_HIGH",
            "WORK_AUTH_MISSING",
        ],
        "risk_codes": ["RISK_AUTH"],
        "action_codes": ["ACT_CONFIRM_AUTH"],
    },
    "advisor_input_shortlist_unknown_range.json": {
        "recommendation": "shortlist",
        "confidence_band": "medium",
        "reason_codes": [
            "EXPERIENCE_RANGE_UNKNOWN",
            "LOCATION_MATCH",
            "ROLE_MATCH_WEAK",
            "SKILL_OVERLAP_HIGH",
            "WORK_AUTHORIZED",
        ],
        "risk_codes": [],
        "action_codes": ["ACT_APPLY", "ACT_PREP_INTERVIEW"],
    },
}


@pytest.mark.parametrize("fixture_name", sorted(EXPECTED_BY_FIXTURE.keys()))
def test_advisor_engine_golden(fixture_name: str) -> None:
    fixture_payload = json.loads((FIXTURES_DIR / fixture_name).read_text(encoding="utf-8"))
    advisor_input = AdvisorInput.model_validate(fixture_payload)

    output1 = evaluate_advisor_input(advisor_input)
    output2 = evaluate_advisor_input(advisor_input)
    assert output1.model_dump(mode="json") == output2.model_dump(mode="json")

    expected = EXPECTED_BY_FIXTURE[fixture_name]
    assert output1.recommendation.value == expected["recommendation"]
    assert output1.confidence_band.value == expected["confidence_band"]

    reason_codes_out = [reason.code or "" for reason in output1.reasons]
    risk_codes_out = [risk.code or "" for risk in output1.risks]
    action_codes_out = [action.code or "" for action in output1.next_actions]

    assert reason_codes_out == sorted(reason_codes_out)
    assert risk_codes_out == sorted(risk_codes_out)
    assert action_codes_out == sorted(action_codes_out)

    assert reason_codes_out == expected["reason_codes"]
    assert risk_codes_out == expected["risk_codes"]
    assert action_codes_out == expected["action_codes"]

    allowed_reason_codes = reason_codes()
    assert set(reason_codes_out).issubset(allowed_reason_codes)
