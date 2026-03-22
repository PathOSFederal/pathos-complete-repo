# Change Brief — Slices 102–104 Desktop Contracts + Runbook + Telemetry v1

## Summary
This sprint locked desktop-facing backend contracts, added production runbook documentation and incident playbooks, and introduced opt-in beta telemetry with strict privacy constraints.

## What changed
- Standardized desktop-consumed response contracts:
  - `GET /health/ready` now uses explicit `HealthReadyOut` response model.
  - Export endpoints now use explicit integrity metadata model (`export_hash`, `hash_alg`, `export_bytes`, `timestamp`) while preserving endpoint-specific top-level payload keys.
  - Diagnostics snapshot contract remains explicit and stable.
- Added desktop contract test coverage:
  - `tests/contract/test_desktop_contracts_v1.py` validates deterministic keys/types and no secret/raw payload leakage.
- Added operational runbook docs:
  - `docs/runbook/backend-runbook-v1.md`
  - Incident playbooks under `docs/runbook/incidents/` for lock contention, migration mismatch, integrity mismatch, and Postgres timeout.
- Added import-safe operator self-check CLI:
  - `scripts/ops/self_check.py` returns safe/redacted runtime summary (env, version, dialect, revision/head, last worker run, last migration audit).
- Added beta telemetry (off by default):
  - Config flag: `TELEMETRY_ENABLED=false` default.
  - Storage: `telemetry_metrics` table via SQLite migration `app/db/migrations/012_telemetry_metrics_v1.sql` and Alembic migration `alembic/versions/20260223_000003_add_telemetry_metrics_table_v1.py`.
  - Repo/service layer:
    - `app/db/repo/telemetry_repo.py`
    - `app/services/telemetry_service.py`
  - API endpoint:
    - `GET /api/v1/diagnostics/telemetry`
    - deterministic disabled response when telemetry is off.
- Retention/wipe integration:
  - Retention cleanup now purges stale telemetry rows.
  - Wipe operation includes telemetry table cleanup.
- Updated OpenAPI golden snapshot to include new/updated contracts.

## Why it changed
- Desktop clients need stable, explicit response contracts for readiness/diagnostics/export integrity.
- Operations require deterministic, actionable procedures for incident handling.
- Beta telemetry should provide aggregate learning signals without storing sensitive content or raw upstream payloads.

## Privacy/trust constraints enforced
- Telemetry stores counters/timings only.
- Diagnostics/telemetry endpoints do not expose secrets or raw upstream payload content.
- USAJOBS ingestion remains via official API paths.

## Validation performed
- `poetry run ruff check .`
- `poetry run python scripts/ci/ruff_format_check_changed.py`
- `poetry run mypy .`
- `poetry run python scripts/ops/self_check.py`
- `poetry run pytest -q tests/test_health_readiness.py tests/test_log_event_registry_and_schema.py tests/contract/test_desktop_contracts_v1.py --cov=app --cov-fail-under=0`
- `poetry run pytest -q tests/test_diagnostics_snapshot.py tests/test_telemetry_v1.py --cov=app --cov-fail-under=0`
- `poetry run pytest` (`271 passed`, coverage `91.14%`)
