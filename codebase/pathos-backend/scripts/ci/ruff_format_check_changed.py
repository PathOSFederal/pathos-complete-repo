#!/usr/bin/env python3
"""Run Ruff format --check only on Python files changed against a base ref."""

from __future__ import annotations

import os
import subprocess


def _run_git(
    args: list[str], *, check: bool = True
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], check=check, capture_output=True, text=True)


def _resolve_base_ref() -> str:
    base_ref = os.getenv("GITHUB_BASE_REF", "").strip() or "develop"

    # Ensure a diffable base ref is available in CI even when refs are incomplete.
    if (
        _run_git(
            ["rev-parse", "--verify", f"{base_ref}^{{commit}}"], check=False
        ).returncode
        == 0
    ):
        return base_ref

    remote_base = f"origin/{base_ref}"
    if (
        _run_git(
            ["rev-parse", "--verify", f"{remote_base}^{{commit}}"], check=False
        ).returncode
        == 0
    ):
        return remote_base

    fetch = _run_git(["fetch", "--no-tags", "origin", base_ref], check=False)
    if fetch.returncode != 0:
        print(f"Failed to fetch base ref '{base_ref}':")
        if fetch.stderr.strip():
            print(fetch.stderr.strip())
        return base_ref

    if (
        _run_git(
            ["rev-parse", "--verify", f"{base_ref}^{{commit}}"], check=False
        ).returncode
        == 0
    ):
        return base_ref
    if (
        _run_git(
            ["rev-parse", "--verify", f"{remote_base}^{{commit}}"], check=False
        ).returncode
        == 0
    ):
        return remote_base

    return base_ref


def _changed_python_files(base_ref: str) -> list[str]:
    diff = _run_git(["diff", "--name-only", f"{base_ref}...HEAD"])
    files = [
        line.strip()
        for line in diff.stdout.splitlines()
        if line.strip().endswith(".py")
    ]
    return sorted(set(files))


def main() -> int:
    base_ref = _resolve_base_ref()
    print(f"Ruff format changed-files check base ref: {base_ref}")

    py_files = _changed_python_files(base_ref)
    if not py_files:
        print("No changed Python files detected; skipping Ruff format check.")
        return 0

    print("Changed Python files to check:")
    for path in py_files:
        print(f" - {path}")

    cmd = ["ruff", "format", "--check", *py_files]
    print(f"Running: {' '.join(cmd)}")
    completed = subprocess.run(cmd, check=False, capture_output=True, text=True)
    if completed.stdout.strip():
        print(completed.stdout.strip())
    if completed.stderr.strip():
        print(completed.stderr.strip())
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
