"""Run bounded USAJOBS staging validation through the official API only."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_runtime_env  # noqa: E402
from app.models.job_search import JobSearchRequest  # noqa: E402
from app.models.saved_search import SavedSearchCreateRequest  # noqa: E402
from app.services.job_search_service import JobSearchService  # noqa: E402
from app.services.saved_search_service import SavedSearchService  # noqa: E402
from app.services.usajobs_ingestion_service import USAJobsIngestionService  # noqa: E402

SAFE_WRITE_ENVS = {"local", "dev", "development", "test", "ci", "staging", "qa", "sandbox"}
PRODUCTION_LIKE_ENVS = {"prod", "production", "main", "live"}
SAFE_WRITE_ENV_MESSAGE = "local, dev, development, test, ci, staging, qa, sandbox"


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate the bounded USAJOBS sync path without scraping."
    )
    parser.add_argument("--mode", choices=["dry-run", "write"], required=True)
    parser.add_argument("--series", default="2210")
    parser.add_argument("--location", default="Florida")
    parser.add_argument("--date-posted-days", type=int, default=7)
    parser.add_argument("--max-pages", type=int, default=1)
    parser.add_argument("--page-size", type=int, default=25)
    parser.add_argument("--saved-search-id", default="")
    parser.add_argument("--request-id", default="usajobs-staging-validation")
    parser.add_argument(
        "--confirm-staging-write",
        action="store_true",
        help="Required for --mode write after PATHOS_ENV is verified as non-production.",
    )
    return parser


def _operator_error(message: str, *, mode: str, runtime_env: str) -> None:
    print(
        json.dumps(
            {
                "blocked": True,
                "error_summary": message,
                "mode": mode,
                "runtime_env": runtime_env,
            },
            indent=2,
            sort_keys=True,
        ),
        file=sys.stderr,
    )


def _explicit_runtime_env_for_write() -> tuple[str | None, str]:
    raw_value = os.environ.get("PATHOS_ENV")
    if raw_value is None:
        return None, "missing"
    stripped = raw_value.strip()
    if not stripped:
        return None, "blank"
    normalized = stripped.lower()
    return normalized, normalized


def _runtime_env_for_display(args: argparse.Namespace) -> str:
    if args.mode != "write":
        return get_runtime_env()
    _, display_env = _explicit_runtime_env_for_write()
    return display_env


def _validate_write_gate(args: argparse.Namespace) -> str:
    if args.mode == "dry-run":
        return get_runtime_env()
    if not args.confirm_staging_write:
        raise ValueError(
            "Write mode blocked: pass --confirm-staging-write only after selecting "
            "an explicit safe PATHOS_ENV. For staging validation, set "
            "PATHOS_ENV=staging and rerun with --confirm-staging-write."
        )
    runtime_env, display_env = _explicit_runtime_env_for_write()
    if runtime_env is None:
        raise ValueError(
            f"Write mode blocked: PATHOS_ENV is {display_env}. Set PATHOS_ENV=staging "
            "or another safe non-production value and rerun with --confirm-staging-write."
        )
    if runtime_env in PRODUCTION_LIKE_ENVS:
        raise ValueError(
            f"Write mode blocked: PATHOS_ENV={runtime_env} is production-like. "
            "Use dry-run in production-like environments, or set PATHOS_ENV=staging "
            "for bounded staging write validation."
        )
    if runtime_env not in SAFE_WRITE_ENVS:
        raise ValueError(
            "Write mode blocked: PATHOS_ENV must be explicitly set to one of "
            f"{SAFE_WRITE_ENV_MESSAGE} for staging validation."
        )
    return runtime_env


def _bounded_pages(max_pages: int) -> list[int]:
    if max_pages < 1 or max_pages > 2:
        raise ValueError("Staging validation max-pages must be 1 or 2.")
    return list(range(1, max_pages + 1))


def _search_request(args: argparse.Namespace, *, page: int) -> JobSearchRequest:
    return JobSearchRequest(
        keyword="information technology",
        location=args.location,
        series=[args.series],
        date_posted_days=args.date_posted_days,
        page=page,
        page_size=args.page_size,
    )


def _saved_search_id(args: argparse.Namespace) -> str:
    if args.saved_search_id.strip():
        return args.saved_search_id.strip()
    created = SavedSearchService.create(
        SavedSearchCreateRequest(
            name="USAJOBS staging validation 2210 Florida",
            query=_search_request(args, page=1),
        )
    )
    return created.id


def _empty_totals(mode: str) -> dict[str, Any]:
    return {
        "mode": mode,
        "records_fetched": 0,
        "new_jobs": 0,
        "updated_jobs": 0,
        "unchanged_jobs": 0,
        "closed_jobs": 0,
        "failed_partitions": [],
        "stale_partitions": [],
        "alert_events_queued": 0,
        "indexing_events_queued": 0,
        "sync_run_ids": [],
    }


def main() -> int:
    args = _parser().parse_args()
    runtime_env = _runtime_env_for_display(args)
    try:
        runtime_env = _validate_write_gate(args)
        pages = _bounded_pages(args.max_pages)
    except ValueError as exc:
        _operator_error(str(exc), mode=args.mode, runtime_env=runtime_env)
        return 2
    dry_run = args.mode == "dry-run"
    saved_search_id = "dry-run-preview"
    if not dry_run:
        saved_search_id = _saved_search_id(args)

    totals = _empty_totals(args.mode)
    totals["saved_search_id"] = saved_search_id
    totals["partition"] = {
        "series": args.series,
        "location": args.location,
        "date_posted_days": args.date_posted_days,
        "pages": pages,
        "page_size": args.page_size,
    }
    totals["runtime_env"] = runtime_env
    totals["write_confirmed"] = bool(args.confirm_staging_write)
    totals["close_missing"] = False
    totals["partition_complete_for_close_missing"] = False

    for page in pages:
        search = _search_request(args, page=page)
        partition = {
            "series": args.series,
            "location": args.location,
            "date_posted_days": args.date_posted_days,
            "page": page,
            "page_size": args.page_size,
        }
        try:
            execution = JobSearchService.execute_search(
                search=search,
                request_id=f"{args.request_id}-page-{page}",
                allow_cache=False,
                record_upstream_audit=not dry_run,
            )
            summary = USAJobsIngestionService.ingest_saved_search_results(
                saved_search_id=saved_search_id,
                execution=execution,
                trigger_mode="staging_validation",
                dry_run=dry_run,
                close_missing=False,
            )
        except Exception as exc:  # noqa: BLE001 - CLI surfaces safe summary JSON.
            if dry_run:
                totals["failed_partitions"].append(partition)
            else:
                failure = USAJobsIngestionService.record_failed_partition(
                    saved_search_id=saved_search_id,
                    trigger_mode="staging_validation",
                    partition=partition,
                    error_summary=type(exc).__name__,
                )
                totals["sync_run_ids"].append(failure["sync_run_id"])
                totals["failed_partitions"].append(partition)
            totals["error_summary"] = type(exc).__name__
            continue

        totals["records_fetched"] += int(summary["records_fetched"])
        totals["new_jobs"] += int(summary["new_count"])
        totals["updated_jobs"] += int(summary["updated_count"])
        totals["unchanged_jobs"] += int(summary["unchanged_count"])
        totals["closed_jobs"] += int(summary["closed_count"])
        totals["alert_events_queued"] += int(summary["alert_events_queued"])
        totals["indexing_events_queued"] += int(summary["indexing_events_queued"])
        if not dry_run:
            totals["sync_run_ids"].append(summary["sync_run_id"])

    print(json.dumps(totals, indent=2, sort_keys=True))
    return 1 if totals["failed_partitions"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
