# Change Brief — Slices 96–98 Worker Parity + Observability v1

## Summary
This cycle productionizes the alert worker for bounded/idempotent execution, extends sqlite/postgres parity coverage into service-level semantics, and adds an operational observability pack for readiness and diagnostics.

## What changed
- Slice 96 (Alert Worker Productionization)
  - Added deterministic worker retry policy module with bounded exponential backoff:
    - `app/core/worker_retry_policy.py`
  - Added worker run budget config/getters and wired them into worker orchestration:
    - `PATHOS_WORKER_MAX_RUN_SECONDS`
    - `PATHOS_WORKER_MAX_JOBS_SCANNED`
    - `PATHOS_WORKER_MAX_RULES_EVALUATED`
    - files: `app/core/config.py`, `app/worker/__init__.py`
  - Enforced deterministic budget behavior and logging in alert run orchestration:
    - emits `budget_exceeded`
    - trims/stops deterministically at configured caps
    - file: `app/services/alerts_run_service.py`
  - Added poison-pill isolation signaling for repeatedly failing rule paths:
    - emits `poison_pill_quarantined`
    - continues run for other rules
    - file: `app/services/alerts_run_service.py`
  - Strengthened crash tolerance in scheduler engine:
    - evaluation exceptions now return failed result with `worker_run_failed` log event while always attempting lock release
    - file: `app/worker/scheduler_engine.py`
  - Added digest idempotency guard to avoid duplicate digest persistence on retry-like re-delivery:
    - `AlertDigestRepo.exists_for_run_rule(...)`
    - `LocalDigestTransport` short-circuits duplicate run/rule inserts
    - files: `app/db/repo/alert_digest_repo.py`, `app/services/delivery_transport_service.py`

- Slice 97 (Postgres Parity Expansion)
  - Expanded parity tests at service level for both sqlite and postgres (`DATABASE_URL`-gated):
    - timestamp ordering/serialization behavior (service output semantics)
    - null handling in service outputs
    - idempotent digest service behavior
    - file: `tests/db/repo/test_repository_contracts.py`
  - Added optional Postgres CI harness execution (no-cov) for the integrity harness:
    - file: `.github/workflows/ci.yml`

- Slice 98 (Operational Observability Pack)
  - Expanded `/health/ready` stable response shape with operational metadata:
    - `last_worker_run_at`
    - `last_worker_status`
    - `last_migration_audit_event_at`
    - `lock_state_summary`
    - file: `app/api/v1/health.py`
  - Added safe diagnostics snapshot endpoint:
    - `GET /api/v1/diagnostics/snapshot`
    - includes service/env/db revision/head, entity counts, last worker status, bounded error summaries
    - file: `app/api/v1/diagnostics.py`
    - model additions: `app/models/diagnostics.py`
  - Added migration audit read helper:
    - `app/db/repo/migration_audit_repo.py`
  - Added lock-state summary helper:
    - `AlertSchedulerLockRepo.get_lock_state_summary(...)`
    - file: `app/db/repo/alert_scheduler_lock_repo.py`
  - Added migration audit write event emission:
    - emits `migration_audit_written`
    - file: `app/db/connection.py`
  - Added explicit export hash generation event:
    - emits `export_hash_generated` (keeps existing export event behavior)
    - file: `app/services/export_service.py`
  - Updated event registry:
    - added `budget_exceeded`, `poison_pill_quarantined`, `worker_run_failed`, `migration_audit_written`, `export_hash_generated`
    - file: `app/core/event_ids.py`

## Tests and validation performed
- Step 1 target validation:
  - `poetry run ruff check .`
  - `poetry run pytest -q tests/test_worker_scheduler_engine.py tests/test_worker_alerts.py --cov=app --cov-fail-under=0`
- Step 2 target validation:
  - `poetry run ruff check .`
  - `poetry run pytest -q tests/db/repo/test_repository_contracts.py tests/integrity/test_system_integrity_harness_v1.py --cov=app --cov-fail-under=0`
  - `poetry run pytest -q tests/db/repo/test_repository_contracts.py -k postgres --cov=app --cov-fail-under=0`
- Step 3 target validation:
  - `poetry run ruff check .`
  - `poetry run pytest -q tests/test_health_readiness.py tests/test_log_event_registry_and_schema.py --cov=app --cov-fail-under=0`
- Final validation:
  - `poetry run python scripts/ci/ruff_format_check_changed.py`
  - `poetry run pytest`
  - Result: `257 passed`, total coverage `90.80%`.

## Notes / risks
- OpenAPI snapshot was updated to include new diagnostics contracts and endpoint.
- Postgres contract tests now avoid global-latest assumptions by filtering service outputs to inserted run IDs, reducing shared-DB flakiness.
- No commit/push performed in this cycle.
