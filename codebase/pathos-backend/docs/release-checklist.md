# Release Readiness Checklist

## CI checks (required)
- `poetry run ruff check .`
- `poetry run python scripts/ci/ruff_format_check_changed.py`
- `poetry run python scripts/ci/check_schema_migration_discipline.py --base-ref develop`
- `poetry run mypy .`
- `poetry run pytest` (coverage gate must remain `>= 90%`)
- Postgres CI parity job must pass (repository contracts + migration tests + integrity harness no-cov run).

## Manual smoke steps
- Start API locally and verify `GET /health/ready` returns expected shape and readiness state.
- Execute one worker tick (`run_alerts_once`) and verify deterministic status/log events.
- Verify operational status endpoint: `GET /api/v1/ops/status`.
- Run export endpoint and confirm export integrity metadata (`export_hash`, `hash_alg`).

## Migration safety verification
- Confirm database revision/head alignment through `/health/ready` and startup logs.
- Confirm migration audit records are written for startup safety checks.

## Data retention and wipe verification
- Run retention cleanup entrypoint: `poetry run python scripts/ops/run_retention_cleanup.py`.
- Verify cleanup summary is logged via `retention_cleanup_executed`.
- Execute wipe endpoint with confirmation and verify retained data classes are removed.
- Verify wipe logging emits `wipe_operation_completed`.

## Rollback notes
- Roll back deployment to previous artifact if readiness fails.
- Restore previous environment flag values for worker/evaluation/delivery controls if pause state was introduced.
- If schema changes were deployed, run downgrade only if explicitly validated for target environment.

## Release notes prep
- Confirm `docs/merge-notes/current.md` includes final command logs and git snapshots.
- Confirm branch diff is reflected in generated artifacts and change brief before handoff.
