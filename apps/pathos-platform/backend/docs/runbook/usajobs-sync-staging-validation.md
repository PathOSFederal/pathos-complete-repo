# USAJOBS Sync Staging Validation Runbook

This runbook validates the bounded Voloro/PathOS USAJOBS sync path before production. The sync uses only the official USAJOBS API through `app/adapters/usajobs/client.py`; scraping is not allowed.

## What This Validates

- Worker entrypoint: `app/worker/__init__.py` runs alert scheduler ticks.
- Scheduler assumptions: the worker delegates to `SchedulerEngine`, which calls `AlertsRunService.run_enabled_rules`.
- USAJOBS integration path: `USAJobsClient.search_jobs` -> `JobSearchService.execute_search`.
- Canonical job model: `app/domain/jobs/canonical_models.py`.
- Raw source snapshots: `upstream_api_audit_records.payload_json` and `response_sha256`.
- Canonical persisted jobs: `saved_search_ingested_jobs`.
- Sync run health: `job_sync_runs`.
- Change detection: `job_change_log`.
- Alert/indexing behavior: staging validation records queued-event counts only; it does not send email and does not call external indexing APIs.

## Local Fixture Tests

Run deterministic tests without live USAJOBS calls:

```powershell
poetry run pytest -q tests/services/test_usajobs_ingestion_service.py tests/db/repo/test_saved_search_ingested_job_repo.py --cov=app --cov-fail-under=0
```

Run lint for the touched sync-validation files:

```powershell
poetry run ruff check app/services/usajobs_ingestion_service.py app/services/job_search_service.py app/db/repo/saved_search_ingested_job_repo.py app/db/repo/job_sync_run_repo.py app/api/v1/ops.py scripts/usajobs_staging_validation.py tests/services/test_usajobs_ingestion_service.py tests/db/repo/test_saved_search_ingested_job_repo.py
```

## Dry-Run Staging Sync

Dry-run fetches and normalizes official USAJOBS data, computes the same staging summary shape, and suppresses upstream audit writes, ingestion writes, sync run writes, change-log writes, alert/indexing event accounting writes, and cache writes. This read-only behavior applies to successful dry-runs and to upstream error paths.

Dry-run does not require `PATHOS_ENV` or `--confirm-staging-write`.

```powershell
$env:USAJOBS_API_KEY="<staging-usajobs-key>"
$env:USAJOBS_USER_AGENT="<staging-user-agent>"
poetry run python scripts/usajobs_staging_validation.py --mode dry-run --series 2210 --location Florida --date-posted-days 7 --max-pages 1 --page-size 25
```

Expected output:
- `records_fetched` is the number of normalized USAJOBS records returned.
- `sync_run_ids` is empty.
- `alert_events_queued` is `0`.
- `indexing_events_queued` is `0`.

## Limited Staging Write Sync

Use a deliberately small partition: series `2210`, Florida, last 7 days, maximum 1-2 pages.

Write mode is fail-closed. It requires:

- `PATHOS_ENV` set to a safe non-production value such as `staging`, `local`, `dev`, `development`, `test`, `ci`, `qa`, or `sandbox`.
- the explicit `--confirm-staging-write` flag.

`PATHOS_ENV` must be explicitly present. Missing or blank `PATHOS_ENV` values fail closed instead of inheriting the backend config default of `local`.

Write mode uses this explicit Day 47 allowlist only. Backend config aliases do not expand write permissions, so `stage` is intentionally blocked unless it is later approved as an operational environment name. `staging` is the intended staging value.

`production`, `prod`, `main`, `live`, `stage`, `unknown`, and unapproved environment names are blocked by default. Blocked runs print operator-readable JSON to stderr with remediation such as setting `PATHOS_ENV=staging` and do not create saved searches, sync runs, upstream audit rows, canonical jobs, or change logs.

```powershell
$env:PATHOS_ENV="staging"
$env:ALERTS_DELIVERY_ENABLED="false"
$env:DRY_RUN_MODE="false"
$env:USAJOBS_API_KEY="<staging-usajobs-key>"
$env:USAJOBS_USER_AGENT="<staging-user-agent>"
poetry run python scripts/usajobs_staging_validation.py --mode write --confirm-staging-write --series 2210 --location Florida --date-posted-days 7 --max-pages 1 --page-size 25
```

This write mode persists:
- raw upstream snapshot in `upstream_api_audit_records`,
- canonical rows in `saved_search_ingested_jobs`,
- run summary in `job_sync_runs`,
- meaningful changes in `job_change_log`.

It does not mark missing jobs closed because a 1-2 page staging partition is not a complete USAJOBS partition.

## Repeat-Run Idempotency Check

Run the same limited write command twice. On the second run:

- `unchanged_jobs` should increase for jobs already seen.
- duplicate canonical rows should not appear because `saved_search_ingested_jobs` is unique on `saved_search_id, job_id`.
- `updated_jobs` should remain `0` unless USAJOBS changed meaningful canonical content.
- `job_change_log` should not add update rows for only a refreshed source retrieval timestamp.

## Health Output

Call the staging health endpoint after write mode:

```powershell
Invoke-RestMethod `
  -Headers @{ Authorization = "Bearer <staging-api-key>" } `
  https://<staging-host>/api/v1/ops/usajobs-sync/health
```

Expected fields:
- `last_sync_time`
- `records_fetched`
- `new_jobs`
- `updated_jobs`
- `closed_jobs`
- `failed_partitions`
- `stale_partitions`
- `alert_events_queued`
- `indexing_events_queued`
- `duration_ms`
- `error_summary`

## Rollback Or Reset

Preferred staging reset:

1. Delete the validation saved search created by the script if one was created for the run.
2. Confirm cascades removed related `saved_search_ingested_jobs` and `job_change_log` rows.
3. If a full staging reset is approved, use the existing wipe/reset process documented in `docs/runbook/backend-runbook-v1.md`.

Do not edit production scheduler settings for this validation pass.
Do not enable real email delivery.
Do not enable external indexing submissions.
