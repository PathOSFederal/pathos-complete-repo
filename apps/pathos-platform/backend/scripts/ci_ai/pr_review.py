"""
Why this file exists
--------------------
GitHub runners cannot rely on stateful Codex CLI artifacts (for example ~/.codex/*.json).
This script implements a stateless PR review flow using only:
- GitHub REST API (for PR files + unified diff)
- OpenAI Responses API (for analysis)

How it works
------------
1. Fetch changed files and unified diff for a pull request.
2. Cap the input size to avoid prompt overflows.
3. Ask the model for a concise, structured review with fixed headings.
4. Write markdown output for a workflow step to post as a PR comment.

Safety constraints
------------------
- No repository writes.
- No secret output.
- No broad code generation; review-only text output.

Example
-------
python scripts/ci_ai/pr_review.py \
  --repo owner/repo \
  --pr-number 123 \
  --github-token "$GITHUB_TOKEN" \
  --openai-api-key "$OPENAI_API_KEY" \
  --output-file artifacts/pr-review-comment.md
"""

import argparse
import json
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
MAX_DIFF_CHARS = 120_000
MAX_DIFF_LINES = 1_500
MAX_FILE_LIST = 300


def _http_json(url: str, token: str, accept: str = "application/vnd.github+json") -> Any:
    request = Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": accept,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "pathos-codex-pr-review",
        },
    )
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def _http_text(url: str, token: str, accept: str) -> str:
    request = Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": accept,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "pathos-codex-pr-review",
        },
    )
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def _fetch_pr_files(repo: str, pr_number: int, token: str) -> list[str]:
    files: list[str] = []
    page = 1
    while True:
        url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}/files?per_page=100&page={page}"
        payload = _http_json(url, token)
        if not payload:
            break
        for entry in payload:
            filename = entry.get("filename")
            status = entry.get("status", "modified")
            if isinstance(filename, str):
                files.append(f"{status}\t{filename}")
        page += 1
    return files


def _fetch_pr_diff(repo: str, pr_number: int, token: str) -> str:
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}"
    return _http_text(url, token, "application/vnd.github.v3.diff")


def _trim_diff(diff_text: str) -> tuple[str, bool]:
    if len(diff_text) <= MAX_DIFF_CHARS and diff_text.count("\n") <= MAX_DIFF_LINES:
        return diff_text, False

    lines = diff_text.splitlines()
    trimmed_lines = lines[:MAX_DIFF_LINES]
    trimmed_text = "\n".join(trimmed_lines)
    if len(trimmed_text) > MAX_DIFF_CHARS:
        trimmed_text = trimmed_text[:MAX_DIFF_CHARS]
    return trimmed_text, True


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
        "temperature": 0.1,
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
    with urlopen(request, timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))
    text = _extract_output_text(payload)
    if not text:
        raise RuntimeError("OpenAI response did not include review text")
    return text


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a stateless PR review comment")
    parser.add_argument("--repo", required=True)
    parser.add_argument("--pr-number", required=True, type=int)
    parser.add_argument("--github-token", required=True)
    parser.add_argument("--openai-api-key", required=True)
    parser.add_argument("--output-file", required=True)
    parser.add_argument("--model", default="gpt-4.1-mini")
    args = parser.parse_args()

    try:
        changed_files = _fetch_pr_files(args.repo, args.pr_number, args.github_token)
        diff_text = _fetch_pr_diff(args.repo, args.pr_number, args.github_token)
    except (HTTPError, URLError) as exc:
        raise RuntimeError(f"Failed to fetch PR context from GitHub API: {exc}") from exc

    trimmed_diff, was_trimmed = _trim_diff(diff_text)
    limited_files = changed_files[:MAX_FILE_LIST]

    system_prompt = (
        "You are a strict backend code reviewer. "
        "Return concise markdown using exactly these headings: "
        "Summary, Risks, Suggested Changes, Tests/Quality Gates, Security Notes. "
        "Be specific and actionable; avoid fluff."
    )

    user_prompt = (
        f"Repository: {args.repo}\n"
        f"PR number: {args.pr_number}\n"
        f"Changed files (status + path):\n{chr(10).join(limited_files) if limited_files else '(none)'}\n\n"
        f"Diff excerpt ({'TRUNCATED' if was_trimmed else 'FULL'}):\n"
        "```diff\n"
        f"{trimmed_diff}\n"
        "```\n\n"
        "Review focus:\n"
        "- correctness and regressions\n"
        "- determinism and contract compatibility\n"
        "- test and quality gate sufficiency\n"
        "- security boundaries and auth behavior\n"
    )

    review_markdown = _call_openai(args.openai_api_key, args.model, system_prompt, user_prompt)
    output_path = Path(args.output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(review_markdown + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
