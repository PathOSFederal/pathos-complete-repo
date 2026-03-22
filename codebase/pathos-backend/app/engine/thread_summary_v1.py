from __future__ import annotations

import re

from app.models.thread import MessageOut

SUMMARY_VERSION = "v1"
MAX_SUMMARY_LENGTH = 1200
SECTION_ORDER = [
    "User goal",
    "Constraints",
    "Target roles",
    "Key preferences",
    "Open questions",
    "Recent decisions",
]

ROLE_KEYWORDS = [
    "backend engineer",
    "software engineer",
    "data scientist",
    "data analyst",
    "product manager",
    "devops engineer",
    "frontend engineer",
    "full stack engineer",
]


def _clip(text: str, max_len: int = 180) -> str:
    normalized = re.sub(r"\s+", " ", text.strip())
    if len(normalized) <= max_len:
        return normalized
    return normalized[: max_len - 1].rstrip() + "…"


def _parse_existing(existing_summary: str | None) -> dict[str, str]:
    parsed = {section: "" for section in SECTION_ORDER}
    if not existing_summary:
        return parsed
    for line in existing_summary.splitlines():
        if ":" not in line:
            continue
        label, value = line.split(":", 1)
        label = label.strip()
        if label in parsed:
            parsed[label] = value.strip()
    return parsed


def _find_locations(text: str) -> list[str]:
    locations = re.findall(r"\b[A-Z][a-z]+,\s*[A-Z]{2}\b", text)
    if re.search(r"\bremote\b", text, flags=re.IGNORECASE):
        locations.append("Remote")
    return sorted(set(locations))


def _find_roles(text: str) -> list[str]:
    lowered = text.lower()
    hits = {role.title() for role in ROLE_KEYWORDS if role in lowered}
    pattern_hits = re.findall(
        r"\b([A-Za-z][A-Za-z\s]{0,24}(engineer|developer|analyst|scientist|manager|designer))\b",
        text,
        flags=re.IGNORECASE,
    )
    for role, _suffix in pattern_hits:
        hits.add(_clip(role.title(), max_len=60))
    return sorted(hits)


def summarize(existing_summary: str | None, recent_messages: list[MessageOut]) -> str:
    sections = _parse_existing(existing_summary)
    joined_text = "\n".join(message.content for message in recent_messages)

    user_messages = [message.content for message in recent_messages if message.role == "user"]
    assistant_messages = [message.content for message in recent_messages if message.role == "assistant"]

    goals = [
        _clip(msg, max_len=120)
        for msg in user_messages
        if re.search(r"\b(want|looking|aim|goal|target|seeking|interested)\b", msg, flags=re.IGNORECASE)
    ]
    if goals:
        sections["User goal"] = goals[-1]

    constraints = [
        _clip(msg, max_len=100)
        for msg in user_messages
        if re.search(r"\b(must|can't|cannot|prefer|avoid|only|no )\b", msg, flags=re.IGNORECASE)
    ]
    if constraints:
        sections["Constraints"] = "; ".join(sorted(set(constraints))[:3])

    roles = _find_roles(joined_text)
    if roles:
        sections["Target roles"] = ", ".join(roles[:5])

    preferences = _find_locations(joined_text)
    if preferences:
        sections["Key preferences"] = ", ".join(preferences[:5])

    questions = [
        _clip(message.content, max_len=90)
        for message in recent_messages
        if message.content.strip().endswith("?")
    ]
    if questions:
        sections["Open questions"] = " | ".join(sorted(set(questions))[:3])

    decisions = [
        _clip(msg, max_len=100)
        for msg in assistant_messages
        if re.search(r"\b(recommend|decision|next step|should|suggest)\b", msg, flags=re.IGNORECASE)
    ]
    if decisions:
        sections["Recent decisions"] = "; ".join(decisions[-3:])

    lines = [f"{section}: {sections[section] or '-'}" for section in SECTION_ORDER]
    summary = "\n".join(lines)
    if len(summary) <= MAX_SUMMARY_LENGTH:
        return summary
    return summary[: MAX_SUMMARY_LENGTH - 1].rstrip() + "…"
