from __future__ import annotations

import json
from pathlib import Path

from app.llm.client import OpenAIClient
from app.llm.redaction import build_safe_narration_payload
from app.llm.schemas import validate_narration_output
from app.models.advisor import AdvisorOutput
from app.models.narration import NarrationCitation, NarrationOutput

PROMPT_BUNDLE_VERSION = "v0.1.0"
PROMPT_DIR = Path(__file__).resolve().parents[2] / "artifacts" / "prompts" / PROMPT_BUNDLE_VERSION


def _read_prompt(filename: str) -> str:
    return (PROMPT_DIR / filename).read_text(encoding="utf-8").strip()


def build_prompt(evaluation: AdvisorOutput, tone: str | None) -> tuple[str, str]:
    system_prompt = _read_prompt("system.txt")
    instructions = _read_prompt("narrator_instructions.txt")
    safe_payload = build_safe_narration_payload(evaluation)
    tone_value = tone or "default"
    user_prompt = (
        f"{instructions}\n\n"
        f"tone={tone_value}\n"
        f"safe_payload={json.dumps(safe_payload, sort_keys=True)}"
    )
    return system_prompt, user_prompt


def _fallback_narration(evaluation: AdvisorOutput) -> NarrationOutput:
    top_reasons = evaluation.reasons[:2]
    top_risk = evaluation.risks[0] if evaluation.risks else None
    top_actions = evaluation.next_actions[:2]

    bullets: list[str] = []
    for reason in top_reasons:
        bullets.append(reason.text)
    if top_risk is not None:
        bullets.append(f"Risk to watch: {top_risk.text}")

    summary_suffix = "This summary is a deterministic fallback because live narration is unavailable right now."
    summary = (
        f"Recommendation is {evaluation.recommendation.value} with {evaluation.confidence_band.value} confidence. "
        f"{summary_suffix}"
    )

    citations = [NarrationCitation(reason_code=reason.code) for reason in top_reasons if reason.code]
    if evaluation.recommendation.value == "needs_info":
        follow_up_questions = ["What missing context would most change this recommendation?"]
    else:
        follow_up_questions = []

    action_lines = [f"Next: {action.action}" for action in top_actions]
    bullets.extend(action_lines)

    return NarrationOutput(
        headline="Deterministic Guidance Summary",
        summary=summary,
        bullets=bullets[:5],
        follow_up_questions=follow_up_questions,
        citations=citations,
    )


def narrate_with_fallback(evaluation: AdvisorOutput, tone: str | None) -> tuple[NarrationOutput, str]:
    system_prompt, user_prompt = build_prompt(evaluation=evaluation, tone=tone)
    try:
        raw = OpenAIClient().generate_text(system_prompt=system_prompt, user_prompt=user_prompt)
        narration = validate_narration_output(raw_json_str=raw, evaluation=evaluation)
        return narration, "llm"
    except Exception:
        return _fallback_narration(evaluation), "fallback"
