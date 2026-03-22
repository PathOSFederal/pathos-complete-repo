# Change Brief — Slices 99–101 Operational Controls + Retention + Release v1

## Summary
This sprint adds operational safety controls, retention/wipe guarantees, and release-readiness guardrails for PathOS backend beta operations.

## What changed
- Added operational runtime flags with safe defaults in config:
  - `WORKER_ENABLED`
  - `ALERTS_EVALUATION_ENABLED`
  - `ALERTS_DELIVERY_ENABLED`
  - `DRY_RUN_MODE`
  - `PAUSE_REASON`
- Worker orchestration now reads operational flags once per run and behaves deterministically:
  - clean paused exit when worker/evaluation is disabled
  - dry-run evaluation without digest/delivery side effects
  - explicit delivery-disabled handling
- Added safe ops API endpoint:
  - `GET /api/v1/ops/status` returns operational flag state without secrets
- Expanded readiness metadata to include deterministic worker operational state.
- Added/expanded structured event coverage for operational controls:
  - `worker_paused`, `worker_resumed`, `dry_run_enabled`, `delivery_disabled`
- Added retention policy configuration:
  - `RETENTION_DAYS_AUDIT`
  - `RETENTION_DAYS_DIGESTS`
  - `RETENTION_DAYS_THREAD_SUMMARIES`
  - `RETENTION_DAYS_UPSTREAM_RAW`
- Implemented deterministic retention cleanup service and import-safe CLI entry:
  - `app/services/retention_service.py`
  - `scripts/ops/run_retention_cleanup.py`
- Extended wipe behavior to cover operational/retained entities consistently.
- Added/updated event IDs for lifecycle observability:
  - `retention_cleanup_executed`, `wipe_operation_completed`
- Added release checklist documentation:
  - `docs/release-checklist.md`
- Updated test coverage and OpenAPI golden snapshot to reflect new ops endpoint and worker behavior.

## Why it changed
- Introduce safe operational controls for pausing/limiting behavior without code changes.
- Enforce bounded retention and explicit cleanup paths for trust and privacy posture.
- Make release validation repeatable with explicit readiness checks and operational runbooks.

## What to watch for
- `DRY_RUN_MODE=true` intentionally suppresses digest/delivery writes while still running evaluation.
- `ALERTS_DELIVERY_ENABLED=false` allows deterministic evaluation while skipping delivery side effects.
- Ops status is intentionally read-only and non-secret; no raw upstream payloads or secrets are exposed.
- Retention windows should be reviewed per environment before production rollout.
- OpenAPI snapshot must be regenerated when API surface changes (for example new ops routes).

## Validation performed
- `poetry run ruff check .`
- `poetry run python scripts/ci/ruff_format_check_changed.py`
- `poetry run python scripts/ci/check_schema_migration_discipline.py --base-ref develop`
- `poetry run mypy .`
- `poetry run pytest` (264 passed, coverage 90.97%)
