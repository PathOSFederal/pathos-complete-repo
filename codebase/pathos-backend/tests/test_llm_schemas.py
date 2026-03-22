from __future__ import annotations

import pytest

from app.llm.schemas import validate_narration_output
from app.models.advisor import AdvisorMeta, AdvisorOutput, EvidenceRef, NextActionItem, ReasonItem, RiskItem
from app.models.common import ConfidenceBand, Recommendation


def _evaluation_output(recommendation: Recommendation = Recommendation.APPLY) -> AdvisorOutput:
    return AdvisorOutput(
        recommendation=recommendation,
        confidence_band=ConfidenceBand.HIGH,
        reasons=[ReasonItem(code="R1", text="Reason one")],
        risks=[RiskItem(code="K1", text="Risk one")],
        next_actions=[NextActionItem(code="N1", action="Do thing", priority=1)],
        evidence=[EvidenceRef(source="job", pointer="title"), EvidenceRef(source="profile", pointer=None)],
        meta=AdvisorMeta(),
    )


def test_validate_narration_output_accepts_valid_citations() -> None:
    evaluation = _evaluation_output()
    raw = (
        '{"headline":"h","summary":"s","bullets":["b"],'
        '"follow_up_questions":[],"citations":[{"reason_code":"R1","evidence_ref":"job:title"},'
        '{"reason_code":null,"evidence_ref":"profile"}]}'
    )

    output = validate_narration_output(raw, evaluation)
    assert output.headline == "h"
    assert len(output.citations) == 2


def test_validate_narration_output_rejects_bad_reason_code() -> None:
    evaluation = _evaluation_output()
    raw = (
        '{"headline":"h","summary":"s","bullets":[],"follow_up_questions":[],'
        '"citations":[{"reason_code":"BAD","evidence_ref":"job:title"}]}'
    )

    with pytest.raises(ValueError, match="Unknown reason_code"):
        validate_narration_output(raw, evaluation)


def test_validate_narration_output_rejects_bad_evidence_ref() -> None:
    evaluation = _evaluation_output()
    raw = (
        '{"headline":"h","summary":"s","bullets":[],"follow_up_questions":[],'
        '"citations":[{"reason_code":"R1","evidence_ref":"unknown:ptr"}]}'
    )

    with pytest.raises(ValueError, match="Unknown evidence_ref"):
        validate_narration_output(raw, evaluation)


def test_validate_narration_output_rejects_followups_unless_needs_info() -> None:
    evaluation = _evaluation_output(recommendation=Recommendation.SKIP)
    raw = (
        '{"headline":"h","summary":"s","bullets":[],"follow_up_questions":["q?"],'
        '"citations":[{"reason_code":"R1","evidence_ref":"job:title"}]}'
    )

    with pytest.raises(ValueError, match="follow_up_questions"):
        validate_narration_output(raw, evaluation)
