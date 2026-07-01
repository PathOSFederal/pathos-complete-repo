"""Run bounded USAJOBS staging validation through the official API only."""

from __future__ import annotations

import argparse
import json
from typing import Any

from app.models.job_search import JobSearchRequest
from app.models.saved_search import SavedSearchCreateRequest
from app.services.job_search_service import JobSearchService
from app.services.saved_search_service import SavedSearchService
from app.services.usajobs_ingestion_service import USAJobsIngestionService


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
    return parser


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
    pages = _bounded_pages(args.max_pages)
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
