# Slices 76-80 Backend Completion Status (2026-02-16)

## Scope Delivered
- Slice 76: Lifespan startup migration and import-safe app factory discipline.
- Slice 77: Desktop pull delivery v1 for digest visibility.
- Slice 78: USAJOBS mapper coverage hardening.
- Slice 79: Explicit ingestion checkpoint/ledger contract with deterministic resume state.
- Slice 80: Documentation and runbook updates.

## Slice 76
- `app/main.py` uses FastAPI lifespan via `asynccontextmanager`; no deprecated startup/shutdown hooks remain.
- Import safety validated by tests in `tests/test_import_safe_app_factory.py`:
  - importing `app.main` does not create a DB file or instantiate a global app object;
  - app startup emits no `on_event` deprecation warning.
- OpenAPI export remains import-safe with `create_app(mode="openapi")`.

## Slice 77
- Added deterministic desktop digest summary model in `app/models/alert_digest.py` (`DesktopLatestDigestOut`).
- Added service mapping in `app/services/alert_digest_service.py`:
  - derives `run_id`, `created_at`, `jobs_scanned`, `triggers_count`, `suppressed_count`, and safe summary text.
- Added endpoint `GET /api/v1/desktop/digests/latest` in `app/api/v1/desktop.py`.
- Enhanced `/api/v1/desktop/overview` to include `latest_digest_summaries` while preserving existing response fields.
- Added endpoint coverage in `tests/api/alerts/test__categories__alerts_observability_v1.py`.

## Slice 78
- Added mapper-focused tests in `tests/adapters/usajobs/test_mapper.py` for two representative USAJOBS payload fixtures.
- Canonical invariants covered: `id`, `title`, `organization`, `locations`, `open_date`, `close_date`.
- Mapper module coverage moved from 0% to covered in final test run.

## Slice 79
- Added migration `app/db/migrations/009_ingestion_checkpoint_ledger_v1.sql`:
  - `saved_search_ingestion_ledger`
  - `saved_search_checkpoints`
- Added repo/service:
  - `app/db/repo/saved_search_checkpoint_repo.py`
  - `app/services/saved_search_checkpoint_service.py`
- Wired `app/services/alerts_run_service.py` to:
  - fetch checkpoint cursor before each rule run;
  - pass cursor into runner (`resume_cursor`);
  - persist deterministic per-run outcomes (success/failed/skipped) in ledger;
  - update checkpoint only on success.
- Added tests in:
  - `tests/services/test_saved_search_checkpoint_service.py`
  - `tests/api/alerts/test__categories__alerts_run_v1.py` (resume cursor usage assertion).

## Slice 80 Artifacts and Docs
- Routes:
  - before: `docs/status/api-routes.before.txt`
  - after: `docs/status/api-routes.after.txt`
- Status notes: `docs/status/merge-notes.md`
- This snapshot: `docs/status/slices-76-80-status.md`
- Non-technical brief: `docs/change-briefs/slices-76-80.md`

## Verification
- `poetry run ruff check .` -> pass.
- `poetry run mypy .` -> pass.
- `poetry run pytest -q` -> pass (`181 passed`, coverage `90.80%`) when executed outside sandbox due local temp-directory permission restrictions.

## Deferred / Readiness Notes
- No new external services were introduced.
- Postgres implementation is still deferred; checkpoint/ledger contract is documented and implemented for current SQLite runtime with explicit schema/readiness path.
