"""
Why this file exists
--------------------
This script asks OpenAI for a minimal unified diff patch based on CI failures,
without relying on stateful Codex runner files.

How it works
------------
1. Read changed-file summary and failure log captured in CI.
2. Send a constrained prompt to the OpenAI Responses API.
3. Require patch output between strict markers.
4. Extract only patch content and save to a file for `git apply`.

Safety constraints
------------------
- The model is instructed to return patch only (no prose) between markers.
- The workflow applies patch with `git apply --check` first.
- If the patch is missing/invalid, workflow fails safely.

Example
-------
python scripts/ci_ai/autofix_patch.py \
  --changed-files artifacts/changed-files.txt \
  --failure-log artifacts/ci-failure-log.txt \
  --output-patch artifacts/ai-autofix.patch
"""

import argparse
import json
import re
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
MAX_CHANGED_FILES_CHARS = 30_000
MAX_FAILURE_LOG_CHARS = 120_000
PATCH_BEGIN = "---BEGIN_PATCH---"
PATCH_END = "---END_PATCH---"


def _extract_output_text(payload: dict[str, Any]) -> str:
    direct = payload.get("output_text")
    if isinstance(direct, str) and direct.strip():
        return direct.strip()

    parts: list[str] = []
    output = payload.get("output")
    if isinstance(output, list):
        for item in output:
            if not isinstance(item, dict):
                continue
            content = item.get("content")
            if not isinstance(content, list):
                continue
            for chunk in content:
                if not isinstance(chunk, dict):
                    continue
                text = chunk.get("text")
                if isinstance(text, str) and text.strip():
                    parts.append(text.strip())
    return "\n\n".join(parts).strip()


def _call_openai(openai_api_key: str, model: str, system_prompt: str, user_prompt: str) -> str:
    body = {
        "model": model,
        "input": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.0,
    }
    encoded = json.dumps(body).encode("utf-8")
    request = Request(
        OPENAI_RESPONSES_URL,
        data=encoded,
        method="POST",
        headers={
            "Authorization": f"Bearer {openai_api_key}",
            "Content-Type": "application/json",
        },
    )
    with urlopen(request, timeout=90) as response:
        payload = json.loads(response.read().decode("utf-8"))

    text = _extract_output_text(payload)
    if not text:
        raise RuntimeError("OpenAI response did not include patch output")
    return text


def _extract_patch(text: str) -> str:
    pattern = re.compile(rf"{re.escape(PATCH_BEGIN)}\s*(.*?)\s*{re.escape(PATCH_END)}", re.DOTALL)
    match = pattern.search(text)
    if not match:
        raise RuntimeError("Model response missing required patch markers")
    patch = match.group(1).strip("\n")
    if not patch:
        raise RuntimeError("Extracted patch is empty")
    return patch + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate unified diff patch from CI failure context")
    parser.add_argument("--changed-files", required=True)
    parser.add_argument("--failure-log", required=True)
    parser.add_argument("--output-patch", required=True)
    parser.add_argument("--openai-api-key", required=True)
    parser.add_argument("--model", default="gpt-4.1-mini")
    args = parser.parse_args()

    changed_files_text = Path(args.changed_files).read_text(encoding="utf-8", errors="replace")
    failure_log_text = Path(args.failure_log).read_text(encoding="utf-8", errors="replace")

    changed_files_excerpt = changed_files_text[:MAX_CHANGED_FILES_CHARS]
    failure_log_excerpt = failure_log_text[:MAX_FAILURE_LOG_CHARS]

    system_prompt = (
        "You generate minimal unified diff patches only. "
        "Do not include prose. Preserve architecture and behavior contracts."
    )

    user_prompt = (
        "Task: Produce the smallest possible fix so CI passes.\n"
        "Constraints:\n"
        "- Fix only ruff/mypy/pytest/coverage failures\n"
        "- Minimal diffs only\n"
        "- No broad refactors\n"
        "- Preserve deterministic behavior\n"
        "- Preserve ErrorResponse contract and requestId behavior\n"
        "- Keep coverage gate >= 90%\n\n"
        "Return exactly this format:\n"
        f"{PATCH_BEGIN}\n"
        "(unified diff patch only)\n"
        f"{PATCH_END}\n\n"
        "Changed files context:\n"
        f"{changed_files_excerpt}\n\n"
        "CI failure log context:\n"
        f"{failure_log_excerpt}\n"
    )

    model_output = _call_openai(args.openai_api_key, args.model, system_prompt, user_prompt)
    patch = _extract_patch(model_output)

    output_path = Path(args.output_patch)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(patch, encoding="utf-8")


if __name__ == "__main__":
    main()
