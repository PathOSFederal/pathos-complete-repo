from __future__ import annotations

import json

from app.models.advisor import AdvisorOutput
from app.models.narration import NarrationOutput


def _evidence_id(source: str, pointer: str | None) -> str:
    return f"{source}:{pointer}" if pointer else source


def validate_narration_output(raw_json_str: str, evaluation: AdvisorOutput) -> NarrationOutput:
    try:
        payload = json.loads(raw_json_str)
    except json.JSONDecodeError as exc:
        raise ValueError("Narration is not valid JSON") from exc

    narration = NarrationOutput.model_validate(payload)
    allowed_reason_codes = {reason.code for reason in evaluation.reasons if reason.code}
    allowed_evidence_refs = {_evidence_id(e.source, e.pointer) for e in evaluation.evidence}

    for citation in narration.citations:
        if citation.reason_code and citation.reason_code not in allowed_reason_codes:
            raise ValueError(f"Unknown reason_code citation: {citation.reason_code}")
        if citation.evidence_ref and citation.evidence_ref not in allowed_evidence_refs:
            raise ValueError(f"Unknown evidence_ref citation: {citation.evidence_ref}")

    if evaluation.recommendation.value != "needs_info" and narration.follow_up_questions:
        raise ValueError("follow_up_questions must be empty unless recommendation == needs_info")

    return narration
