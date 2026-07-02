from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

import scripts.usajobs_staging_validation as staging_cli

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _summary(*, dry_run: bool) -> dict[str, Any]:
    return {
        "records_fetched": 1,
        "new_count": 1,
        "updated_count": 0,
        "unchanged_count": 0,
        "closed_count": 0,
        "alert_events_queued": 0,
        "indexing_events_queued": 0,
        "sync_run_id": None if dry_run else "sync-run-1",
    }


def _run_cli(monkeypatch, args: list[str]) -> int:
    monkeypatch.setattr(sys, "argv", ["usajobs_staging_validation.py"] + args)
    return staging_cli.main()


def _install_successful_sync(monkeypatch) -> dict[str, Any]:
    observed: dict[str, Any] = {"execute_calls": 0, "ingest_calls": 0}

    def fake_execute_search(**kwargs) -> object:
        observed["execute_calls"] += 1
        observed["record_upstream_audit"] = kwargs["record_upstream_audit"]
        return object()

    def fake_ingest_saved_search_results(**kwargs) -> dict[str, Any]:
        observed["ingest_calls"] += 1
        observed["dry_run"] = kwargs["dry_run"]
        observed["close_missing"] = kwargs["close_missing"]
        observed["partition_complete"] = kwargs.get("partition_complete")
        return _summary(dry_run=bool(kwargs["dry_run"]))

    monkeypatch.setattr(
        staging_cli.JobSearchService,
        "execute_search",
        fake_execute_search,
    )
    monkeypatch.setattr(
        staging_cli.USAJobsIngestionService,
        "ingest_saved_search_results",
        fake_ingest_saved_search_results,
    )
    return observed


def test_staging_cli_write_without_confirmation_is_blocked(
    monkeypatch, capsys
) -> None:
    monkeypatch.setenv("PATHOS_ENV", "staging")

    result = _run_cli(
        monkeypatch,
        ["--mode", "write", "--saved-search-id", "saved-1"],
    )
    error = json.loads(capsys.readouterr().err)

    assert result == 2
    assert error["blocked"] is True
    assert "confirm-staging-write" in error["error_summary"]


def test_staging_cli_script_entrypoint_imports_app_without_pythonpath() -> None:
    env = os.environ.copy()
    env.pop("PYTHONPATH", None)
    env.pop("PATHOS_ENV", None)

    result = subprocess.run(
        [
            sys.executable,
            "scripts/usajobs_staging_validation.py",
            "--mode",
            "write",
            "--saved-search-id",
            "saved-1",
            "--confirm-staging-write",
        ],
        cwd=BACKEND_ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )

    error = json.loads(result.stderr)

    assert result.returncode == 2
    assert "ModuleNotFoundError" not in result.stderr
    assert error["runtime_env"] == "missing"
    assert "PATHOS_ENV is missing" in error["error_summary"]


def test_staging_cli_write_with_missing_env_is_blocked(monkeypatch, capsys) -> None:
    monkeypatch.delenv("PATHOS_ENV", raising=False)

    result = _run_cli(
        monkeypatch,
        [
            "--mode",
            "write",
            "--saved-search-id",
            "saved-1",
            "--confirm-staging-write",
        ],
    )
    error = json.loads(capsys.readouterr().err)

    assert result == 2
    assert error["runtime_env"] == "missing"
    assert "PATHOS_ENV is missing" in error["error_summary"]
    assert "PATHOS_ENV=staging" in error["error_summary"]


def test_staging_cli_write_with_blank_env_is_blocked(monkeypatch, capsys) -> None:
    monkeypatch.setenv("PATHOS_ENV", "   ")

    result = _run_cli(
        monkeypatch,
        [
            "--mode",
            "write",
            "--saved-search-id",
            "saved-1",
            "--confirm-staging-write",
        ],
    )
    error = json.loads(capsys.readouterr().err)

    assert result == 2
    assert error["runtime_env"] == "blank"
    assert "PATHOS_ENV is blank" in error["error_summary"]
    assert "PATHOS_ENV=staging" in error["error_summary"]


@pytest.mark.parametrize("runtime_env", ["production", "prod", "main", "live"])
def test_staging_cli_write_against_production_env_is_blocked(
    monkeypatch, capsys, runtime_env: str
) -> None:
    monkeypatch.setenv("PATHOS_ENV", runtime_env)

    result = _run_cli(
        monkeypatch,
        [
            "--mode",
            "write",
            "--saved-search-id",
            "saved-1",
            "--confirm-staging-write",
        ],
    )
    error = json.loads(capsys.readouterr().err)

    assert result == 2
    assert error["runtime_env"] == runtime_env
    assert "production-like" in error["error_summary"]


@pytest.mark.parametrize("runtime_env", ["stage", "Stage", " stage "])
def test_staging_cli_write_against_stage_alias_is_blocked(
    monkeypatch, capsys, runtime_env: str
) -> None:
    monkeypatch.setenv("PATHOS_ENV", runtime_env)

    result = _run_cli(
        monkeypatch,
        [
            "--mode",
            "write",
            "--saved-search-id",
            "saved-1",
            "--confirm-staging-write",
        ],
    )
    error = json.loads(capsys.readouterr().err)

    assert result == 2
    assert error["runtime_env"] == "stage"
    assert "PATHOS_ENV must be explicitly set" in error["error_summary"]


def test_staging_cli_write_against_unknown_env_is_blocked(
    monkeypatch, capsys
) -> None:
    monkeypatch.setenv("PATHOS_ENV", "unknown")

    result = _run_cli(
        monkeypatch,
        [
            "--mode",
            "write",
            "--saved-search-id",
            "saved-1",
            "--confirm-staging-write",
        ],
    )
    error = json.loads(capsys.readouterr().err)

    assert result == 2
    assert error["runtime_env"] == "unknown"
    assert "PATHOS_ENV must be explicitly set" in error["error_summary"]


@pytest.mark.parametrize(
    ("runtime_env", "expected_runtime_env"),
    [
        ("local", "local"),
        ("dev", "dev"),
        ("development", "development"),
        ("test", "test"),
        ("ci", "ci"),
        ("staging", "staging"),
        ("STAGING", "staging"),
        (" staging ", "staging"),
        ("qa", "qa"),
        ("sandbox", "sandbox"),
    ],
)
def test_staging_cli_write_in_safe_env_with_confirmation_is_allowed(
    monkeypatch, capsys, runtime_env: str, expected_runtime_env: str
) -> None:
    monkeypatch.setenv("PATHOS_ENV", runtime_env)
    observed = _install_successful_sync(monkeypatch)

    result = _run_cli(
        monkeypatch,
        [
            "--mode",
            "write",
            "--saved-search-id",
            "saved-1",
            "--confirm-staging-write",
        ],
    )
    output = json.loads(capsys.readouterr().out)

    assert result == 0
    assert observed["execute_calls"] == 1
    assert observed["ingest_calls"] == 1
    assert observed["record_upstream_audit"] is True
    assert observed["close_missing"] is False
    assert observed["partition_complete"] is None
    assert output["close_missing"] is False
    assert output["partition_complete_for_close_missing"] is False
    assert output["runtime_env"] == expected_runtime_env
    assert output["sync_run_ids"] == ["sync-run-1"]


def test_staging_cli_dry_run_with_missing_env_does_not_require_write_confirmation(
    monkeypatch, capsys
) -> None:
    monkeypatch.delenv("PATHOS_ENV", raising=False)
    observed = _install_successful_sync(monkeypatch)

    result = _run_cli(monkeypatch, ["--mode", "dry-run"])
    output = json.loads(capsys.readouterr().out)

    assert result == 0
    assert observed["execute_calls"] == 1
    assert observed["record_upstream_audit"] is False
    assert observed["dry_run"] is True
    assert observed["close_missing"] is False
    assert output["sync_run_ids"] == []


def test_staging_cli_dry_run_with_production_env_is_allowed(monkeypatch, capsys) -> None:
    monkeypatch.setenv("PATHOS_ENV", "production")
    observed = _install_successful_sync(monkeypatch)

    result = _run_cli(monkeypatch, ["--mode", "dry-run"])
    output = json.loads(capsys.readouterr().out)

    assert result == 0
    assert observed["execute_calls"] == 1
    assert observed["record_upstream_audit"] is False
    assert output["mode"] == "dry-run"
