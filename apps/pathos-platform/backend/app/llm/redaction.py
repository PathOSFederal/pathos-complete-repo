from __future__ import annotations

from app.engine.reason_library import load_reason_library
from app.models.advisor import AdvisorOutput


def _title_from_code(code: str | None) -> str:
    if not code:
        return "Unknown"
    return code.replace("_", " ").title()


def _evidence_id(source: str, pointer: str | None) -> str:
    return f"{source}:{pointer}" if pointer else source


def build_safe_narration_payload(evaluation: AdvisorOutput) -> dict:
    reason_library = load_reason_library()
    reasons = []
    for reason in evaluation.reasons:
        title = reason_library.get(reason.code or "", {}).get("title", _title_from_code(reason.code))
        reasons.append(
            {
                "code": reason.code,
                "title": title,
                "detail": reason.text[:240],
            }
        )

    risks = []
    for risk in evaluation.risks:
        risks.append(
            {
                "code": risk.code,
                "title": _title_from_code(risk.code),
                "detail": risk.text[:240],
            }
        )

    next_actions = []
    for action in evaluation.next_actions:
        next_actions.append({"code": action.code, "title": _title_from_code(action.code)})

    evidence_refs = []
    for evidence in evaluation.evidence:
        evidence_refs.append(_evidence_id(evidence.source, evidence.pointer))

    return {
        "job": {
            "title": None,
            "agency": None,
            "series": None,
            "grade": None,
            "location": None,
        },
        "recommendation": evaluation.recommendation.value,
        "confidence_band": evaluation.confidence_band.value,
        "reasons": reasons,
        "risks": risks,
        "next_actions": next_actions,
        "evidence_refs": evidence_refs,
        "meta": {
            "trace_id": evaluation.meta.trace_id,
            "ruleset_version": evaluation.meta.ruleset_version,
            "engine_version": evaluation.meta.engine_version,
        },
    }
