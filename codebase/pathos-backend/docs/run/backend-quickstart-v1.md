# Backend Quickstart v1

## Prerequisites
- Python/Poetry environment installed.
- From repo root: `poetry install`.

## Run API Locally (SQLite default)
1. Optional env setup:
   - `export PATHOS_DB_PATH=data/pathos.db`
   - `export PATHOS_API_KEYS=dev-key`
   - `export USAJOBS_API_KEY=<official-usajobs-key>`
   - `export USAJOBS_USER_AGENT=<email-or-app-id>`
2. Start API:
   - `poetry run uvicorn app.main:create_app --factory --reload`
3. Quick checks:
   - `curl http://127.0.0.1:8000/health/live`
   - `curl http://127.0.0.1:8000/health/ready`

## Run API Locally (Postgres optional)
1. Set Postgres env:
   - `export DB_DIALECT=postgres`
   - `export DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/<db>`
2. Start API:
   - `poetry run uvicorn app.main:create_app --factory --reload`
3. Readiness check:
   - `curl http://127.0.0.1:8000/health/ready`

## Run Worker
- One-off worker run:
  - `poetry run python -c "from app.worker import run_alerts_once; print(run_alerts_once())"`
- Scheduler loop:
  - `poetry run python app/worker/__init__.py`

## Operational Flags (Worker Controls)
- `WORKER_ENABLED` (default `true`): pause/resume worker execution.
- `ALERTS_EVALUATION_ENABLED` (default `true`): disable evaluation path.
- `ALERTS_DELIVERY_ENABLED` (default `true`): disable delivery side-effects.
- `DRY_RUN_MODE` (default `false`): evaluate without digest/delivery writes.
- `PAUSE_REASON` (optional): operator reason; redacted in logs.

Quick visibility:
- `GET /api/v1/ops/status`
- `GET /health/ready` (check `worker_operational_state`).

## Self-check CLI
- Command:
  - `poetry run python scripts/ops/self_check.py`
- Output:
  - Safe JSON summary only (`environment`, `service_version`, `db_dialect`, `db_revision`, `alembic_head`, `last_worker_run_at`, `last_migration_audit_event_at`).
- Guarantees:
  - No secrets.
  - No raw upstream payload content.

## Key Env Vars
- Core:
  - `PATHOS_ENV`, `PATHOS_API_KEYS`, `PATHOS_LOG_LEVEL`
- DB:
  - `DB_DIALECT`, `PATHOS_DB_PATH`, `DATABASE_URL`
- USAJOBS:
  - `USAJOBS_API_KEY`, `USAJOBS_USER_AGENT`, `USAJOBS_API_BASE_URL`, `USAJOBS_HOST`
- Worker ops:
  - `WORKER_ENABLED`, `ALERTS_EVALUATION_ENABLED`, `ALERTS_DELIVERY_ENABLED`, `DRY_RUN_MODE`, `PAUSE_REASON`
- Retention/telemetry:
  - `RETENTION_DAYS_AUDIT`, `RETENTION_DAYS_DIGESTS`, `RETENTION_DAYS_THREAD_SUMMARIES`, `RETENTION_DAYS_UPSTREAM_RAW`, `TELEMETRY_ENABLED`
