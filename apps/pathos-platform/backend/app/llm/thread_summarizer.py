from __future__ import annotations

import json
import re
from typing import Literal

from pydantic import BaseModel, Field

from app.llm.client import OpenAIClient
from app.models.thread import MessageOut

MAX_SAFE_MESSAGE_PREVIEW = 200
MAX_SUMMARY_LENGTH = 1200


class SummaryRefinement(BaseModel):
    summary: str = Field(min_length=1, max_length=MAX_SUMMARY_LENGTH)


def _sanitize_text(text: str) -> str:
    cleaned = re.sub(r"https?://\S+", "[url]", text)
    cleaned = re.sub(r"\b[\w\.-]+@[\w\.-]+\.\w+\b", "[email]", cleaned)
    cleaned = re.sub(r"\b\d{5,}\b", "[number]", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:MAX_SAFE_MESSAGE_PREVIEW]


def _build_safe_payload(existing_summary: str | None, recent_messages: list[MessageOut]) -> dict:
    return {
        "existing_summary": existing_summary or "",
        "recent_messages": [
            {"role": message.role, "content_preview": _sanitize_text(message.content)} for message in recent_messages
        ],
        "rules": {
            "max_summary_chars": MAX_SUMMARY_LENGTH,
            "no_verbatim_long_quotes": True,
        },
    }


def refine_summary_with_llm(
    deterministic_summary: str, existing_summary: str | None, recent_messages: list[MessageOut]
) -> tuple[str, Literal["llm", "deterministic"]]:
    safe_payload = _build_safe_payload(existing_summary=existing_summary, recent_messages=recent_messages)
    system_prompt = (
        "You refine thread summaries for a job advisor app. "
        "Return strict JSON only with {\"summary\":\"...\"}. "
        "Do not include long verbatim message content."
    )
    user_prompt = (
        "Improve this deterministic summary while keeping stable section labels and concise wording.\n"
        f"deterministic_summary={deterministic_summary}\n"
        f"safe_payload={json.dumps(safe_payload, sort_keys=True)}"
    )
    try:
        raw = OpenAIClient().generate_text(system_prompt=system_prompt, user_prompt=user_prompt)
        payload = json.loads(raw)
        validated = SummaryRefinement.model_validate(payload)
        return validated.summary, "llm"
    except Exception:
        return deterministic_summary, "deterministic"
