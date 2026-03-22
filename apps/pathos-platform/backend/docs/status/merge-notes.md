## 2026-02-16 Baseline (Slices 76-80 start)
- Branch: feature/slices-76-80-backend-completion-v1
- `git status`: dirty working tree at start (`app/main.py` modified; `docs/status/api-routes.before.txt` and `docs/status/merge-notes.md` untracked).
- `poetry run pytest -q`: 174 passed, coverage 90.83%.
- `poetry run ruff check .`: failed with `E402` in `scripts/print_api_routes.py:30`.
- `poetry run mypy .`: success.
- Baseline route snapshot refreshed: `docs/status/api-routes.before.txt`.

## 2026-02-16 Implementation (Slices 76-80)
- Lifespan/import-safety hardening: confirmed factory-only app creation, added import safety + startup warning guard tests, and fixed route script import ordering.
- Delivery v1 desktop pull: added `GET /api/v1/desktop/digests/latest`, overview digest summaries, deterministic digest summary model, and digest retrieval assertions in API tests.
- Mapper hardening: added direct coverage tests for `map_usajobs_item` using two representative USAJOBS fixtures with canonical invariant checks.
- Ingestion checkpoint/ledger contract: added migration `009_ingestion_checkpoint_ledger_v1.sql`, checkpoint repo/service, and run-path wiring in alerts orchestration with deterministic outcome accounting and resume cursor usage.
- Postgres remains deferred; SQLite schema + code paths are ready and documented for parity planning.

## 2026-02-16 Verification
- `poetry run ruff check .`: pass.
- `poetry run mypy .`: pass (180 files).
- `poetry run pytest -q`: pass when run outside sandbox due local temp-dir permission issues in sandbox shell (`181 passed`, coverage `90.80%`).
- `poetry run python scripts/export_openapi.py`: regenerated `artifacts/contracts/openapi.json` for new desktop contract fields/endpoints.
- `poetry run python scripts/print_api_routes.py > docs/status/api-routes.after.txt`: refreshed route snapshot.

## 2026-02-16 Delivery v1 Smoke Fixes (Slices 76-80 continuation)
- Scope: fixed saved search run false NOT_FOUND behavior and enabled plural alert-rule creation path expected by clients (`/api/v1/alerts/rules`).

### Required command captures
- `git status`:
  - Branch `feature/slices-76-80-backend-completion-v1`.
  - Working tree has in-progress tracked/untracked changes for slices 76-80 continuation; no commit created.
- `git branch --show-current`:
  - `feature/slices-76-80-backend-completion-v1`
- `git diff --name-status develop...HEAD`:
  - `NO_DIFF_NAME_STATUS` (branch commit range currently reports no committed delta vs `develop`; work is in working tree).
- `git diff --stat develop...HEAD`:
  - `NO_DIFF_STAT` (same reason as above).

### Verification commands and outcomes
- `poetry run ruff check .` -> pass.
- `poetry run mypy .` -> pass (`Success: no issues found in 180 source files`).
- `poetry run pytest -q --cov=app --cov-fail-under=90` -> pass (`183 passed`, coverage `90.81%`).
- `poetry run python scripts/export_openapi.py` -> pass (refreshed `artifacts/contracts/openapi.json` to include new plural alerts/rules compatibility routes).

### Artifacts directory listing summary (`ls -lh artifacts` equivalent)
- Existing historical patch artifacts remain present (`day-21`, `day-30`, `day-65`, `day-70`, `day-75`, `slices-76-80`).
- Updated/generated in this continuation:
  - `artifacts/contracts/openapi.json` (refreshed)
  - `artifacts/day-80-continuation.patch` (new)
  - `artifacts/day-80-continuation-this-run.patch` (new)
