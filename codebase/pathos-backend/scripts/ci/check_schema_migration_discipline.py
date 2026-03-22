#!/usr/bin/env python3
"""Fail CI when schema-relevant changes are missing a matching Alembic migration."""

from __future__ import annotations

import argparse
import os
import subprocess
from fnmatch import fnmatch

SCHEMA_RELEVANT_PATTERNS = (
    "app/db/migrations/*.sql",
    "app/db/sqlalchemy_metadata.py",
    "alembic/env.py",
)
MIGRATION_FILE_PATTERN = "alembic/versions/*.py"


def _run_git(
    args: list[str], *, check: bool = True
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], check=check, capture_output=True, text=True)


def _resolve_base_ref(base_ref: str) -> str:
    # CI checkouts can be shallow and may not include local branch refs.
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

    # Fetch deterministically, then prefer local ref if it now resolves, else remote.
    fetch = _run_git(["fetch", "--no-tags", "origin", base_ref], check=False)
    if fetch.returncode != 0:
        fetch = _run_git(["fetch", "--no-tags", "origin", remote_base], check=False)
    if fetch.returncode != 0:
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


def _changed_files(base_ref: str) -> list[str]:
    resolved_base = _resolve_base_ref(base_ref)
    print(f"Schema discipline check base ref: {resolved_base}")
    diff = _run_git(["diff", "--name-only", f"{resolved_base}...HEAD"])
    raw = diff.stdout.strip()
    if not raw:
        return []
    return [line.strip() for line in raw.splitlines() if line.strip()]


def _is_schema_relevant(path: str) -> bool:
    return any(fnmatch(path, pattern) for pattern in SCHEMA_RELEVANT_PATTERNS)


def _is_migration_file(path: str) -> bool:
    return fnmatch(path, MIGRATION_FILE_PATTERN)


def _is_override_enabled() -> bool:
    return (
        os.getenv("ALLOW_SCHEMA_CHANGE_WITHOUT_MIGRATION", "").strip().lower() == "true"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-ref",
        default="develop",
        help="Git ref used as diff baseline (default: develop).",
    )
    args = parser.parse_args()

    changed = _changed_files(args.base_ref)
    schema_changes = sorted(path for path in changed if _is_schema_relevant(path))
    migration_changes = sorted(path for path in changed if _is_migration_file(path))

    if not schema_changes:
        print("Schema discipline check passed: no schema-relevant changes detected.")
        return 0

    if migration_changes:
        print(
            "Schema discipline check passed: schema changes include Alembic migration files."
        )
        return 0

    if _is_override_enabled():
        print(
            "Schema discipline override enabled via ALLOW_SCHEMA_CHANGE_WITHOUT_MIGRATION=true."
        )
        return 0

    print("Schema discipline check failed.")
    print("Schema-relevant files changed but no Alembic migration file was changed.")
    print("Schema-relevant files:")
    for path in schema_changes:
        print(f" - {path}")
    print("Expected at least one changed file matching: alembic/versions/*.py")
    print("To override intentionally, set ALLOW_SCHEMA_CHANGE_WITHOUT_MIGRATION=true")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
