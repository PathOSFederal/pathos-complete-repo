from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


RULESET_VERSION = "v0.1.0"
REASON_LIBRARY_PATH = (
    Path(__file__).resolve().parents[2] / "artifacts" / "rulesets" / RULESET_VERSION / "reason_library.json"
)


def _validate_reason_record(record: dict[str, Any], index: int) -> None:
    code = record.get("code")
    title = record.get("title")
    detail_template = record.get("detail_template")
    detail_text = record.get("detail_text")

    if not isinstance(code, str) or not code:
        raise ValueError(f"Reason record #{index} missing non-empty 'code'")
    if not isinstance(title, str) or not title:
        raise ValueError(f"Reason record #{index} missing non-empty 'title'")
    if not isinstance(detail_template, str) and not isinstance(detail_text, str):
        raise ValueError(f"Reason record #{index} requires 'detail_template' or 'detail_text'")


@lru_cache(maxsize=1)
def load_reason_library() -> dict[str, dict[str, str]]:
    payload = json.loads(REASON_LIBRARY_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("Reason library payload must be a list")

    reasons: dict[str, dict[str, str]] = {}
    for idx, record in enumerate(payload):
        if not isinstance(record, dict):
            raise ValueError(f"Reason record #{idx} must be an object")
        _validate_reason_record(record, idx)
        code = record["code"]
        if code in reasons:
            raise ValueError(f"Duplicate reason code: {code}")
        reasons[code] = record
    return reasons


def reason_codes() -> set[str]:
    return set(load_reason_library().keys())


def render_reason_detail(code: str, **kwargs: Any) -> str:
    definition = load_reason_library()[code]
    if "detail_template" in definition:
        template = definition["detail_template"]
        return template.format(**kwargs)
    return definition["detail_text"]
