# Merge Notes - Slice 18-20

## Git Context
### git status --short
- M `README.md`
- M `poetry.lock`
- M `pyproject.toml`
- M `scripts/export_openapi.py`
- ?? `.github/workflows/ci.yml`
- ?? `artifacts/day-slice-18-20-this-run.patch`
- ?? `artifacts/day-slice-18-20.patch`
- ?? `docs/reviews/backend-review-slices-3-17.md`
- ?? `scripts/__init__.py`
- ?? `tests/test_category_boundary_security.py`
- ?? `tests/test_export_and_desktop_contracts.py`
- ?? `tests/test_llm_client.py`
- ?? `tests/test_llm_schemas.py`
- ?? `tests/test_openapi_snapshot_regression.py`

### git branch --show-current
- `feature/slice-18-backend-review-coverage-ci-v1`

### git diff --name-status develop...HEAD
- (no output; no commits yet on branch relative to develop)

### git diff --stat develop...HEAD
- (no output; no commits yet on branch relative to develop)

### git diff --stat (working tree)
- `README.md | 55 +`
- `poetry.lock | 141 +`
- `pyproject.toml | 14 + / -`
- `scripts/export_openapi.py | 22 + / -`
- plus new untracked files listed above

## Commands Run and Results
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS
- `poetry run pytest -q` -> PASS
  - coverage gate enforced in pytest config
  - total coverage: **91.50%**

Note:
- Initial `mypy .` run failed once due module naming conflict for `scripts/export_openapi.py`.
- Resolved by adding `scripts/__init__.py`, then re-ran gates successfully.

## Artifacts and Outputs
### Patch files
- `artifacts/day-slice-18-20.patch` -> 0.00 KB
- `artifacts/day-slice-18-20-this-run.patch` -> 22.22 KB

### Contracts/artifacts listing
- `artifacts/contracts/openapi.json` -> 57.29 KB
- `docs/reviews/backend-review-slices-3-17.md` -> 1.66 KB

## Notes
- `artifacts/day-slice-18-20.patch` is empty because `git diff develop...HEAD` compares commits only, and no commit has been created on this branch (per instruction not to commit).

## Merge Notes - Codex Reviewer + Autofix Workflows

### git status --short
- M `README.md`
- ?? `.github/workflows/codex-autofix.yml`
- ?? `.github/workflows/codex-review.yml`
- ?? `artifacts/day-codex-reviewer-autofix-this-run.patch`
- ?? `artifacts/day-codex-reviewer-autofix.patch`

### git branch --show-current
- `chore/codex-github-reviewer-autofix-v1`

### git diff --name-status develop...HEAD
- (no output; branch has no commits ahead of develop)

### git diff --stat develop...HEAD
- (no output; branch has no commits ahead of develop)

### Summary (what/why)
- Added `.github/workflows/codex-review.yml`:
  - PR-triggered Codex review workflow using `openai/codex-action@v1`
  - Guarded to non-fork PRs only
  - Permissions scoped to `contents: read` and `pull-requests: write`
- Added `.github/workflows/codex-autofix.yml`:
  - `workflow_run` trigger tied to CI workflow name `CI`
  - Runs only when CI failed on `develop`
  - Uses Codex to attempt minimal CI fixes and opens PR via `peter-evans/create-pull-request@v6`
  - Uses `CODEX_PR_TOKEN` for PR creation
- Updated `README.md` by appending section `Codex Automated Reviews and Autofix PRs`.

### Commands run
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS
- `poetry run pytest -q` -> PASS (coverage gate remains passing)

### Artifacts
- Generated cumulative patch: `artifacts/day-codex-reviewer-autofix.patch`
- Generated incremental patch: `artifacts/day-codex-reviewer-autofix-this-run.patch`
- `artifacts` listing (size summary):
  - `day-codex-reviewer-autofix-this-run.patch` -> 1.28 KB
  - `day-codex-reviewer-autofix.patch` -> 0.00 KB

### Update after final workflow tweak
- Added explicit `mode` input:
  - `mode: review` in `codex-review.yml`
  - `mode: act` in `codex-autofix.yml`
- Re-ran gates:
  - `poetry run ruff check .` -> PASS
  - `poetry run mypy .` -> PASS
  - `poetry run pytest -q` -> PASS
- Refreshed patch artifacts:
  - `artifacts/day-codex-reviewer-autofix-this-run.patch` -> 3.24 KB
  - `artifacts/day-codex-reviewer-autofix.patch` -> 0.00 KB

## Merge Notes - Stateless Codex Workflows (Option A)

### git status --short
- M `.github/workflows/codex-autofix.yml`
- M `.github/workflows/codex-review.yml`
- M `README.md`
- ?? `scripts/ci_ai/autofix_patch.py`
- ?? `scripts/ci_ai/pr_review.py`

### git branch --show-current
- `chore/codex-github-reviewer-autofix-v1`

### git diff --name-status develop...HEAD
- A `.github/workflows/codex-autofix.yml`
- A `.github/workflows/codex-review.yml`
- M `README.md`
- A `artifacts/day-codex-reviewer-autofix-this-run.patch`
- A `artifacts/day-codex-reviewer-autofix.patch`
- M `merge-notes.md`

### git diff --stat develop...HEAD
- `.github/workflows/codex-autofix.yml | 50 +`
- `.github/workflows/codex-review.yml | 47 +`
- `README.md | 25 +`
- `artifacts/day-codex-reviewer-autofix-this-run.patch | 83 +`
- `artifacts/day-codex-reviewer-autofix.patch | 0`
- `merge-notes.md | 54 +`

### What changed and why
- Replaced Codex workflows to remove all `openai/codex-action` usage.
- Added stateless OpenAI API helper scripts:
  - `scripts/ci_ai/pr_review.py`
  - `scripts/ci_ai/autofix_patch.py`
- `codex-review.yml` now:
  - fetches PR diff/files,
  - calls OpenAI Responses API,
  - posts structured comment.
- `codex-autofix.yml` now:
  - triggers on failed `CI` workflow run for `develop`,
  - reruns quality gates and captures `artifacts/ci-failure-log.txt`,
  - asks OpenAI for patch-only output between markers,
  - applies patch with `git apply`, reruns gates, and opens PR if all pass.
- README section updated to document the new stateless automation behavior.

### Commands run
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS
- `poetry run pytest -q` -> PASS
- `rg -n "openai/codex-action" .github/workflows scripts README.md` -> no matches

### Artifacts listing (`ls -lh artifacts` equivalent)
- `day-codex-reviewer-autofix-this-run.patch` -> 3.24 KB
- `day-codex-reviewer-autofix.patch` -> 0.00 KB
- `day-slice-18-20-this-run.patch` -> 22.22 KB
- `day-slice-18-20.patch` -> 0.00 KB

## Slice 21-25 Kickoff (Initial Logging)

### Required command outputs
- `git status --short`: clean working tree before Slice 21 work.
- `git branch --show-current`: `feature/slices-21-25-jobseeker-api-surface-v1`
- `git diff --name-status develop...HEAD`: includes prior uncommitted codex workflow/script changes.
- `git diff --stat develop...HEAD`: includes prior codex workflow/script/readme/merge-notes diff summary.

### Patch artifacts created
- `artifacts/day-21.patch` generated from `git diff develop...HEAD`
- `artifacts/day-21-this-run.patch` generated from `git diff`

### Artifacts size snapshot
- `day-21.patch`: 65,870 bytes
- `day-21-this-run.patch`: 0 bytes

### Notes
- Requested docs `docs/ai/cursor-house-rules.md`, `docs/ai/testing-standards.md`, and `docs/ai/prompt-header.md` are not present in this repository path; continuing with existing repo conventions.

## Slice 21-25 Completion Update

### Required command outputs (latest)
- `git status --short`:
  - Modified: `app/core/config.py`, `app/main.py`, `artifacts/contracts/openapi.json`, `merge-notes.md`
  - Added (untracked): adapters/usajobs, new v1 routers, new repos/services/models, migrations `003/004`, category tests under `tests/api/*`, and patch artifacts.
- `git branch --show-current`:
  - `feature/slices-21-25-jobseeker-api-surface-v1`
- `git diff --name-status develop...HEAD`:
  - Shows prior committed branch deltas (codex workflow/script docs changes).
- `git diff --stat develop...HEAD`:
  - Shows prior committed branch deltas only; current Slice 21-25 work remains uncommitted in working tree.

### Slices implemented (files grouped)
- Slice 21 (USAJOBS Search):
  - `app/models/job_search.py`
  - `app/adapters/usajobs/client.py`
  - `app/adapters/usajobs/models.py`
  - `app/adapters/usajobs/mapper.py`
  - `app/db/repo/upstream_audit_repo.py`
  - `app/services/job_search_service.py`
  - `app/api/v1/jobs.py`
- Slice 22 (Saved Searches CRUD):
  - `app/models/saved_search.py`
  - `app/db/repo/saved_search_repo.py`
  - `app/services/saved_search_service.py`
  - `app/api/v1/saved_searches.py`
- Slice 23 (Alerts from Saved Runs):
  - `app/models/alerts.py`
  - `app/db/repo/alert_repo.py`
  - `app/services/alert_service.py`
  - `app/api/v1/alerts.py`
- Slice 24 (Profile v1):
  - `app/models/profile_v1.py`
  - `app/db/repo/profile_repo.py`
  - `app/services/profile_service.py`
  - `app/api/v1/profile_v1.py`
- Slice 25 (Advisor Session v1):
  - `app/models/advisor_session.py`
  - `app/db/repo/advisor_session_repo.py`
  - `app/services/advisor_session_service.py`
  - `app/api/v1/advisor_session.py`
- Shared wiring/migrations:
  - `app/db/migrations/003_job_seeker_surface_v1.sql`
  - `app/db/migrations/004_job_seeker_surface_indexes.sql`
  - `app/core/config.py`
  - `app/main.py`
  - `artifacts/contracts/openapi.json`

### Deterministic rules recorded
- USAJOBS mapping is deterministic in mapper/service:
  - stable job_id derivation and normalized field mapping
  - deterministic fallbacks for optional salary/date/location fields
  - deterministic output ordering and pagination passthrough
- Raw upstream audit capture:
  - stores endpoint/query/status/duration/bytes/hash and payload JSON only when env flag enabled
  - payload truncation bounded by `AUDIT_MAX_UPSTREAM_BYTES`
  - auth headers/secrets are not persisted.
- Saved-search filters canonicalization:
  - sorted/deduped list filters, trimmed strings, null removal before persistence.
- Alert derivation:
  - strict job_id set-diff between current and last run
  - dedupe + deterministic ordering before persistence.
- Advisor session events:
  - append-only with deterministic event type and payload size validation.

### Test coverage and categories
- Added category-oriented tests under:
  - `tests/api/jobs/`
  - `tests/api/saved_searches/`
  - `tests/api/alerts/`
  - `tests/api/profile/`
  - `tests/api/advisor_session/`
- Coverage remains >= 90% after Slice 21-25 additions.

### Commands run (latest)
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS
- `poetry run pytest -q` -> PASS
  - `113 passed`
  - Coverage gate: `Total coverage: 91.28%` (required >= 90)

### Patch artifacts refreshed
- `git diff develop...HEAD > artifacts/day-21.patch`
- `git diff > artifacts/day-21-this-run.patch`
- `ls -lh artifacts/` equivalent:
  - `day-21.patch` -> 65,870 bytes
  - `day-21-this-run.patch` -> 78,462 bytes

### Deferred / assumptions
- Requested docs `docs/ai/cursor-house-rules.md`, `docs/ai/testing-standards.md`, `docs/ai/prompt-header.md` are not present in repository path; implementation followed current repo conventions and existing architecture.

## Day 30 – USAJOBS Auth Fix (Slice 26–30)

### Requested docs (missing)
- `docs/ai/cursor-house-rules.md` – not present in repo; noted here and continuing with README/pyproject/repo conventions.
- `docs/ai/testing-standards.md` – not present.
- `docs/ai/prompt-header.md` – not present.

### Git Context
### git status --short
- M `app/adapters/usajobs/client.py`
- M `app/adapters/usajobs/mapper.py`
- M `app/api/v1/alerts.py`
- M `app/api/v1/jobs.py`
- M `app/core/config.py`
- M `app/db/repo/upstream_audit_repo.py`
- M `app/main.py`
- M `app/models/job_search.py`
- M `app/services/alert_service.py`
- M `app/services/job_search_service.py`
- M `artifacts/contracts/openapi.json`
- M `merge-notes.md`
- M `poetry.lock`
- M `pyproject.toml`
- M `tests/api/alerts/test__categories__alerts.py`
- M `tests/api/jobs/test__categories__jobs_search.py`
- M `tests/api/jobs/test__equivalence__job_search_service.py`
- M `tests/api/jobs/test__positive__usajobs_client.py`
- M `tests/conftest.py`
- ?? `app/adapters/usajobs/errors.py`
- ?? `app/adapters/usajobs/normalize.py`
- ?? `app/adapters/usajobs/types.py`
- ?? `app/db/migrations/005_upstream_audit_summary_v1.sql`
- ?? `app/domain/`
- ?? `docs/change-briefs/`
- ?? `tests/api/jobs/test__positive__normalize.py`
- ?? `tests/integration/`
- ?? `tests/test_config.py`

### git branch --show-current
- `feature/slices-26-30`

### git diff --name-status develop...HEAD
- (no output; branch has no commits ahead of develop; all changes in working tree)

### git diff --stat develop...HEAD
- (no output; same as above)

### Commands run and results
- `poetry run ruff check .` -> PASS (All checks passed!)
- `poetry run mypy app tests` -> Success (no issues found in 124 source files)
- `poetry run pytest -q` -> PASS
  - 125 passed (122 + 3 new config tests)
  - Total coverage: 90.42% (>= 90 required)

### Patch artifacts
- `git diff develop...HEAD > artifacts/day-30.patch` -> 0 bytes (branch has no commits)
- `git diff > artifacts/day-30-this-run.patch` -> 71,755 bytes

### Artifacts listing (ls -lh equivalent)
- `day-30.patch` -> 0 bytes
- `day-30-this-run.patch` -> 71,755 bytes
- `day-21.patch` -> 65,870 bytes
- `day-21-this-run.patch` -> 82,330 bytes
- Other prior artifacts present (contracts/, day-codex-*, day-slice-18-20-*)

## Day 30 – Cleanup and missing-key error path (this run)

### Requested docs (unchanged)
- `docs/ai/cursor-house-rules.md` – not present; noted in Day 30 above; continued with README/pyproject.
- `docs/ai/testing-standards.md` – not present.
- `docs/ai/prompt-header.md` – not present.

### Git Context (after cleanup)
- `git status --short`: M client.py, config.py, jobs.py, alerts.py, job_search_service.py, errors.py (modified); M test_config.py, test__positive__usajobs_client.py; ?? test__missing_usajobs_key_returns_config_error.py; plus prior branch modified/untracked files.
- `git branch --show-current`: `feature/slices-26-30`
- `git diff --name-status develop...HEAD`: (no output; branch has no commits ahead of develop)
- `git diff --stat develop...HEAD`: (no output)

### Commands run and results
- `poetry run ruff check .` -> PASS (All checks passed!)
- `poetry run mypy app tests` -> Success (no issues found in 125 source files)
- `poetry run pytest -q` -> PASS
  - 126 passed
  - Total coverage: 90.60% (>= 90 required)

### Patch artifacts (required)
- Cumulative: `git diff develop...HEAD > artifacts/day-30.patch` -> 0 bytes (no commits on branch)
- Incremental: `git diff > artifacts/day-30-this-run.patch` -> regenerated after this run

### Artifacts listing (ls -lh equivalent, after run)
- `artifacts/day-30.patch` -> 0 bytes
- `artifacts/day-30-this-run.patch` -> updated (this run’s diff)
- `artifacts/day-21.patch` -> 65,870 bytes
- `artifacts/day-21-this-run.patch` -> 82,330 bytes
- `artifacts/contracts/` (directory)
- Other prior artifacts (day-codex-*, day-slice-18-20-*, prompts/, rulesets/)

## Day 35 – Slices 31-35 Deterministic Job Scoring + Explainability

### Git Context
- `git status --short`:
  - M `app/adapters/usajobs/normalize.py`
  - M `app/api/v1/jobs.py`
  - M `app/domain/jobs/canonical_models.py`
  - M `artifacts/contracts/openapi.json`
  - ?? `app/models/job_score.py`
  - ?? `app/services/job_scoring_ruleset.py`
  - ?? `app/services/job_scoring_service.py`
  - ?? `docs/change-briefs/day-35-deterministic-scoring.md`
  - ?? `tests/api/jobs/test__categories__job_score.py`
  - ?? `tests/services/test_job_scoring_service.py`
- `git branch --show-current`:
  - `feature/slices-31-35-deterministic-scoring-explainability-v1`
- `git diff --stat develop...HEAD`:
  - (no output; no commits ahead of `develop` on this branch)

### Files changed and why
- Scoring domain + profile contract:
  - `app/models/job_score.py`
  - Added deterministic score result shape, explainability reasons/risks, and profile v1 input model for scoring.
- Ruleset + scoring service:
  - `app/services/job_scoring_ruleset.py`
  - `app/services/job_scoring_service.py`
  - Added versioned default rules and pure deterministic scoring function.
- API contract + routing:
  - `app/api/v1/jobs.py`
  - Added `POST /api/v1/jobs/{job_id}/score` using canonical job resolved from search request, with deterministic error mapping and score audit rows.
- Canonical mapper metadata linkage:
  - `app/domain/jobs/canonical_models.py`
  - `app/adapters/usajobs/normalize.py`
  - Added `mapper_version` metadata to canonical source and normalization output.
- Tests:
  - `tests/services/test_job_scoring_service.py`
  - `tests/api/jobs/test__categories__job_score.py`
  - Added determinism, explainability branch coverage, and API happy/error path coverage.
- Docs/contracts:
  - `docs/change-briefs/day-35-deterministic-scoring.md`
  - `artifacts/contracts/openapi.json`
  - Added scoring brief and refreshed OpenAPI snapshot.

### Commands run and outcomes
- `git status --short --branch` -> branch/state printed.
- `git branch --show-current` -> `feature/slices-31-35-deterministic-scoring-explainability-v1`.
- `poetry run ruff check .` -> PASS.
- `poetry run mypy .` -> PASS.
- `poetry run python scripts/export_openapi.py` -> PASS.
- `poetry run pytest` -> PASS.
  - `138 passed`
  - Coverage gate: `91.09%` (>= 90 required)

### Notes
- `pytest` in sandbox created unreadable temp directories in this environment; full test execution was rerun outside sandbox to complete required gates deterministically.

## Day 45 – Slices 36-45 Saved Searches + Alerts Scheduler v1

### Files changed
- `.github/workflows/ci.yml`
- `app/adapters/usajobs/client.py`
- `app/api/v1/alerts.py`
- `app/db/connection.py`
- `app/db/migrations/006_alerting_scheduler_v1.sql`
- `app/db/repo/alert_delivery_log_repo.py`
- `app/db/repo/alert_rule_repo.py`
- `app/db/repo/alert_run_repo.py`
- `app/db/repo/saved_search_repo.py`
- `app/models/alert_rule.py`
- `app/models/saved_search.py`
- `app/services/alert_evaluator.py`
- `app/services/alert_rule_service.py`
- `app/services/alert_service.py`
- `app/services/alerts_run_service.py`
- `app/services/saved_search_runner_service.py`
- `app/services/saved_search_service.py`
- `app/worker.py`
- `artifacts/contracts/openapi.json`
- `docs/change-briefs/slices-36-45-saved-searches-alerts-scheduler-v1.md`
- `tests/api/alerts/test__categories__alerts_run_v1.py`
- `tests/api/jobs/test__positive__usajobs_client.py`
- `tests/services/test_alert_evaluator.py`
- `tests/services/test_saved_search_runner_service.py`
- `tests/test_worker_alerts.py`

### What / why
- Extended saved-search persistence to include deterministic input payloads:
  - `query_payload`, optional `profile_payload`, `ruleset_version` (while preserving compatibility fields).
- Added alert rule persistence (`alert_rules`) and CRUD API under `/api/v1/alert-rules`.
- Added deterministic alert evaluation engine:
  - threshold checks, daily caps, cooldown suppression, and no re-notify behavior.
- Added idempotent seen/notified tracking (`alert_delivery_log`) with upsert semantics.
- Added manual run endpoint `POST /api/v1/alerts/run`:
  - evaluates enabled rules,
  - runs saved-search scoring internally,
  - records delivery updates and run summary.
- Added `alert_runs` run-audit table + repo for scheduler/worker observability.
- Added background worker entrypoint (`app/worker.py`) with `run_alerts_once()` and hourly loop + deterministic backoff.
- Hardened CI parity by validating OpenAPI snapshot drift in the same CI workflow for both PR and push.
- Added `Host` header in USAJOBS adapter requests to satisfy required header contract.

### Commands run + results
- `git status --short --branch` -> branch/state printed.
- `git branch --show-current` -> `feature/slices-36-45-saved-searches-alerts-scheduler-v1`.
- `poetry run ruff check .` -> PASS.
- `poetry run mypy .` -> PASS.
- `poetry run python scripts/export_openapi.py` -> PASS.
- `poetry run pytest` -> PASS.
  - `145 passed`
  - coverage: `90.38%` (>= 90 required).
- `git diff --name-status develop...HEAD` -> no output (no commits ahead of `develop` on this branch).
- `git diff --stat develop...HEAD` -> no output.

## Day 55 – Slices 46-55 Delta/Digests/Desktop Contract v1

### Git context
- `git status --short --branch`:
  - `## feature/slices-46-55`
  - Working tree includes modified/new files listed below.
- `git branch --show-current`:
  - `feature/slices-46-55`

### Files changed
- Delta + digest + observability data model:
  - `app/db/migrations/007_delta_digest_observability_v1.sql`
  - `app/db/repo/saved_search_snapshot_repo.py`
  - `app/db/repo/alert_digest_repo.py`
  - `app/db/repo/alert_rule_run_repo.py`
  - `app/db/repo/alert_run_repo.py`
  - `app/models/alert_digest.py`
  - `app/services/delta_engine_service.py`
  - `app/services/digest_builder_service.py`
  - `app/services/alert_digest_service.py`
- Guardrails and run orchestration:
  - `app/core/config.py`
  - `app/services/alerts_run_service.py`
- API surface:
  - `app/api/v1/alerts.py`
  - `app/api/v1/desktop.py`
- Supporting model/repo updates:
  - `app/models/alert_rule.py`
  - `app/adapters/usajobs/client.py`
- CI discipline:
  - `.github/workflows/ci.yml`
- Tests:
  - `tests/api/alerts/test__categories__alerts_observability_v1.py`
  - `tests/services/test_delta_engine_service.py`
  - `tests/services/test_digest_builder_service.py`
- Docs/artifacts:
  - `docs/change-briefs/slices-46-55-delta-digests-desktop-contract-v1.md`
  - `docs/reviews/ci-discipline-hardening-v1.md`
  - `artifacts/contracts/openapi.json`

### What / why
- Added deterministic job fingerprinting and snapshot state per saved search for delta classification.
- Added score delta tracking and threshold-crossing metadata in delta output.
- Added digest payload builder + digest persistence for desktop retrieval.
- Added desktop contract endpoints for digests/saved-searches/rules.
- Added observability endpoints for alert runs and per-rule run history.
- Added configurable guardrails to avoid upstream spam:
  - per-rule min interval
  - global jobs scanned cap per run
  - global rules processed cap per run
  - deterministic backoff event tracking
- Added retention endpoints and service methods for digest/run cleanup.
- Hardened CI with OpenAPI drift check in the same quality-gates workflow.

### Commands run and outcomes
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS
- `poetry run python scripts/export_openapi.py` -> PASS
- `poetry run pytest` -> PASS
  - `150 passed`
  - Coverage: `90.66%` (>= 90 required)

## Day 65 – Slices 61-65 Logging Hardening v1

### Commands requested and outputs
- `git status`:
  - On branch `feature/slices-61-65-logging-correlation-migrations-ci-v1`
  - Modified:
    - `.github/workflows/ci.yml`
    - `app/adapters/usajobs/client.py`
    - `app/core/config.py`
    - `app/core/error_handlers.py`
    - `app/db/migrations/runner.py`
    - `app/main.py`
    - `app/middleware/request_id.py`
    - `app/services/alerts_run_service.py`
    - `app/services/saved_search_runner_service.py`
    - `tests/test_error_contract_observability.py`
    - `tests/test_migrations_runner.py`
  - Untracked:
    - `app/core/logging.py`
    - `app/core/request_context.py`
    - `app/db/migration_safety.py`
    - `tests/test_logging_context.py`
- `git branch --show-current`:
  - `feature/slices-61-65-logging-correlation-migrations-ci-v1`
- `git diff --name-status develop...HEAD`:
  - no output (no commits ahead of `develop`)
- `git diff --stat develop...HEAD`:
  - no output (no commits ahead of `develop`)

### What changed and why
- Added structured JSON logging and a deterministic `log_event` helper:
  - `app/core/logging.py`
- Added correlation context propagation helpers:
  - `app/core/request_context.py`
- Upgraded request middleware to set/echo request IDs and emit structured logs:
  - `app/middleware/request_id.py`
- Centralized exception logging with deterministic codes and requestId contracts, including migration-specific error code:
  - `app/core/error_handlers.py`
- Added startup migration safety checks to fail fast with clear remediation when migrations are pending or required columns are missing:
  - `app/db/migration_safety.py`
  - `app/db/migrations/runner.py`
  - `app/main.py`
- Added correlation-aware logs in alert orchestration, saved-search runner, and USAJOBS adapter:
  - `app/services/alerts_run_service.py`
  - `app/services/saved_search_runner_service.py`
  - `app/adapters/usajobs/client.py`
- Added CI OpenAPI drift step messaging with exact local fix command:
  - `.github/workflows/ci.yml`

### Validation commands and outcomes
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS (`Success: no issues found in 166 source files`)
- `poetry run python scripts/export_openapi.py` -> PASS
- `poetry run pytest` -> PASS (`157 passed`)
  - Coverage: `91.01%` (>= 90 required)

## Day 65 – Request Completion Message Fix

### Root cause
- `REQUEST_COMPLETE` logging in `app/middleware/request_id.py` used a single success phrase for all response codes.
- As a result, 4xx and 5xx responses could be logged as if they were successful.

### Fix summary
- Added deterministic status-class branching in `app/middleware/request_id.py`:
  - `< 400`: success message
  - `400-499`: client-error message with corrective next step
  - `>= 500`: server-error message with investigation next step
- Added regression tests in `tests/test_request_completion_logging.py` for:
  - `GET /api/v1/desktop/overview` -> `200` success message
  - `POST /api/v1/desktop/overview` -> `405` client-error message (must not contain "completed successfully")
  - deterministic server error route returning `503` -> server-error message
- Audited log emitters:
  - `REQUEST_COMPLETE` is emitted from the centralized middleware path only.
  - no other request-completion path emits incorrect success language for error statuses.

### How to verify manually
- `curl.exe -i -X POST http://localhost:8000/api/v1/desktop/overview`
  - Expect: `405 Method Not Allowed`
  - Log expectation: `REQUEST_COMPLETE` message explains client error and correction, not success.
- `curl.exe -i -X GET http://localhost:8000/api/v1/desktop/overview`
  - Expect: `200 OK` (with auth configured as needed)
  - Log expectation: `REQUEST_COMPLETE` message explains successful completion.

## Day 60 – Slices 56-60 Delivery/Worker/Idempotency/Metrics v1

### Git context
- `git status --short --branch`:
  - `## feature/slices-56-60-delivery-worker-idempotency-metrics-v2`
  - Modified/new files listed in this section.
- `git branch --show-current`:
  - `feature/slices-56-60-delivery-worker-idempotency-metrics-v2`

### Files changed
- Delivery transport abstraction:
  - `app/services/delivery_transport_service.py`
  - `app/models/alert_digest.py`
- Worker hardening + locking + metrics:
  - `app/worker.py`
  - `app/services/alerts_run_service.py`
  - `app/services/saved_search_runner_service.py`
  - `app/db/repo/alert_scheduler_lock_repo.py`
  - `app/db/repo/alert_run_repo.py`
  - `app/db/migrations/008_delivery_worker_metrics_v1.sql`
  - `app/core/config.py`
- API/desktop contracts:
  - `app/api/v1/alerts.py`
  - `app/api/v1/desktop.py`
  - `artifacts/contracts/openapi.json`
- Tests:
  - `tests/services/test_delivery_transport_service.py`
  - `tests/db/repo/test_alert_scheduler_lock_repo.py`
  - `tests/api/alerts/test__categories__alerts_observability_v1.py`
  - `tests/test_worker_alerts.py`

### What / why
- Added `DeliveryTransport` abstraction with:
  - `LocalDigestTransport` (persist digest payloads; current behavior path).
  - `EmailDigestFutureTransport` placeholder (deterministic no-op).
- Refactored run orchestration to generate `DeliveryIntent` and route by `delivery_mode`.
- Hardened worker entrypoints:
  - `run_once()` structured tick result
  - `run_hourly()` scheduler loop with safe signal shutdown
  - backward-compatible wrappers retained.
- Added DB-backed scheduler lock (`alert_scheduler_locks`) to prevent concurrent re-entry.
- Extended `alert_runs` persistence with deterministic metrics:
  - `usajobs_fetch_ms`, `normalize_ms`, `score_ms`, `delta_ms`, `digest_ms`
  - `suppressed_count`, run-level `backoff_events_json`
  - `lock_acquired`, `lock_released`
- Added observability endpoint:
  - `GET /api/v1/alerts/metrics/recent`
- Added desktop overview contract endpoint:
  - `GET /api/v1/desktop/overview`
  - includes latest digests, saved searches, alert rules, latest run summary, guardrail config.

### Commands run + outcomes
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS
- `poetry run python scripts/export_openapi.py` -> PASS
- `poetry run pytest` -> PASS
  - `154 passed`
  - Coverage: `90.86%` (>= 90 required)

### Requested diff outputs
- `git diff --name-status develop...HEAD` -> no output (no commits ahead of `develop`)
- `git diff --stat develop...HEAD` -> no output (no commits ahead of `develop`)

## 2026-02-20 – USAJOBS Wiring Diagnostics (Slices 76-80 prep)

### Git/runtime context
- `git branch --show-current` -> `develop`
- `git status --short --branch` -> `## develop...origin/develop`

### Files changed
- Added:
  - `docs/diagnostics/usajobs-wiring-report.md`

### What changed and why
- Added a diagnostics report that maps:
  - USAJOBS fetch path (router -> service -> adapter -> mapper -> persistence)
  - Saved-search run and alerts-run call chains with file:line references
  - Desktop digests latest read path
  - Adapter-selection decision tree (including confirmation there is no env-driven mock selector)
  - USAJOBS/env settings table with defaults and runtime-required notes
  - Safe next-step checklist to drive `jobs_scanned > 0` without exposing secrets
- No product behavior changes were made in this run.

### Commands run + outcomes
- `git branch --show-current` -> PASS
- `git status --short --branch` -> PASS
- `rg -n "USAJOBS|usajobs|data\\.usajobs|Authorization-Key|User-Agent|https://data\\.usajobs\\.gov" .` -> PASS
- `rg -n "adapter|mapper|mapUsa|mapUSA|canonical|JobCardModel|JobDetailModel|JobSearchRequest|JobSearchResponse" .` -> PASS
- `rg -n "SavedSearch|saved-search|/saved-searches|run\\(" .` -> PASS
- `rg -n "Alert|alerts|rules_evaluated|jobs_scanned|digest|/desktop/digests" .` -> PASS
- `rg -n "os\\.environ|getenv|pydantic.*Settings|BaseSettings|Settings\\(" .` -> PASS
- `poetry run pytest` -> PASS (`183 passed`, coverage `90.81%`)
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS
- `git diff develop...HEAD > artifacts/slices-76-80.patch` -> PASS (file generated; 0 KB because no commits ahead of `develop`)
- `git diff > artifacts/slices-76-80-this-run.patch` -> PASS
- `ls -lh artifacts` -> PowerShell flag mismatch in this shell (`-lh` unsupported)
- `Get-ChildItem artifacts | Select-Object Name,SizeKB,LastWriteTime` -> PASS

## 2026-02-20 – Slice 76: USAJOBS Config Diagnostics + Honest Skip Reporting

### Files changed
- API / routing:
  - `app/api/v1/diagnostics.py` (new)
  - `app/main.py`
- Models / contracts:
  - `app/models/diagnostics.py` (new)
  - `app/models/alert_rule.py`
  - `app/models/alert_digest.py`
- Services:
  - `app/services/usajobs_diagnostics_service.py` (new)
  - `app/services/job_search_service.py`
  - `app/services/alerts_run_service.py`
  - `app/services/alert_service.py`
- Logging / events:
  - `app/core/event_ids.py`
- Persistence:
  - `app/db/migrations/010_alert_run_skip_reason_v1.sql` (new)
  - `app/db/repo/alert_run_repo.py`
  - `app/db/connection.py`
- Tests:
  - `tests/api/diagnostics/test__categories__usajobs_diagnostics.py` (new)
  - `tests/api/alerts/test__categories__alerts_run_v1.py`
  - `tests/test_log_event_registry_and_schema.py`
  - `tests/test_auth.py`
  - `tests/test_worker_alerts.py`
- Contract artifact:
  - `artifacts/contracts/openapi.json`

### What changed and why
- Added `GET /api/v1/diagnostics/usajobs` with safe response fields:
  - `configured`, `env` (present/missing only), `can_query`, `sample_count`, `duration_ms`, optional `error`.
- Added diagnostics probe flow with deterministic structured events:
  - `usajobs_diagnostics_test_started`, `usajobs_diagnostics_test_completed`, `usajobs_diagnostics_test_failed`.
- Added explicit config-missing event:
  - `usajobs_config_missing`.
- Added explicit alert-run skip event:
  - `alert_run_skipped`.
- Implemented honest skip reporting for `POST /api/v1/alerts/run`:
  - new optional fields `skip_reason`, `skip_details` in summary and run/metrics models.
  - config-missing path sets status `success` with `skip_reason=USJOBS_NOT_CONFIGURED` and `jobs_scanned=0`.
  - run backoff payload now supports structured skip entry:
    - `{"code":"USJOBS_NOT_CONFIGURED","message":"USAJOBS fetch skipped (missing env)."}`.
- Added DB support for skip fields on alert runs:
  - migration + repo read/write support + backward-compatible column guard in `init_db`.
- Updated job search behavior so config-missing is treated as local skip (not upstream attempt):
  - no upstream audit row is written for missing-config path.
- Added saved-search skip honesty when USAJOBS env is missing:
  - returns a safe skip payload with `skip_reason` / `skip_details`.

### Commands run + outcomes
- `poetry run python scripts/export_openapi.py` -> PASS
- `poetry run pytest` -> PASS (`186 passed`, coverage `90.70%`)
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS
- `git diff develop...HEAD > artifacts/slices-76-80.patch` -> PASS (0 bytes on this branch history comparison)
- `git diff > artifacts/slices-76-80-this-run.patch` -> PASS
- `Get-ChildItem artifacts | Select-Object Name,Length,LastWriteTime` -> PASS

## 2026-02-20 – Slice 77: Request Logging Hardening v1 (neutral + domain-aware)

### Files changed (this slice)
- `app/middleware/request_id.py`
- `app/api/v1/alerts.py`
- `tests/test_request_completion_logging.py`

### What changed and why
- Hardened `request_complete` logging in middleware:
  - status-aware neutral messages:
    - 2xx: `Request completed (HTTP {status_code}).`
    - 3xx: `Request redirected (HTTP {status_code}).`
    - 4xx: `Client request rejected (HTTP {status_code}).`
    - 5xx: `Server error (HTTP {status_code}).`
  - status-family aware metadata:
    - `http_outcome`: `success|redirect|client_error|server_error`
    - `status_family`: `2xx|3xx|4xx|5xx`
  - optional `response_bytes` from `Content-Length` header only (no response body logging).
  - log-level mapping:
    - 2xx/3xx => `INFO`
    - 4xx => `WARNING`
    - 5xx => `ERROR`
- Added domain-aware pass-through from `request.state` in `request_complete`:
  - includes `domain_outcome` and `skip_reason` in `details` when present.
  - includes top-level `run_id` / `saved_search_id` when set on request state.
- Added request-state wiring in operational alerts handlers:
  - `/api/v1/alerts/run` sets `run_id`, `domain_outcome`, and `skip_reason` (when present from run summary).
  - `/api/v1/saved-searches/{saved_search_id}/run` sets `saved_search_id`, plus `domain_outcome` / `skip_reason` from service result when present.
- Updated unit tests:
  - `200` -> INFO, neutral message, `http_outcome=success`
  - `404` -> WARNING, `http_outcome=client_error`
  - `503` -> ERROR, `http_outcome=server_error`
  - `request.state.skip_reason` propagation appears in `request_complete` payload.

### Commands run and outcomes
- `poetry run pytest` -> PASS (`187 passed`, coverage `90.64%`)
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS

### Patch artifacts (required)
- `git diff develop...HEAD > artifacts/slices-76-80.patch` -> generated
- `git diff > artifacts/slices-76-80-this-run.patch` -> generated
- `Get-ChildItem artifacts | Select-Object Name,Length,LastWriteTime` -> captured below

## 2026-02-20 – CI Pipeline Enforcement Hardening v1 (PR gates + contract drift)

### Files changed
- `.github/workflows/ci.yml`
- `docs/ci/pr-gates.md`
- `merge-notes.md`
- `artifacts/slices-76-80.patch`
- `artifacts/slices-76-80-this-run.patch`

### What / why
- Confirmed CI workflow exists and is already scoped to `pull_request` and `push` on `develop`.
- Kept required quality gates in CI:
  - `poetry run ruff check .`
  - `poetry run mypy .`
  - `poetry run pytest -q` (coverage threshold enforced by pytest config `--cov-fail-under=90`)
- Kept OpenAPI contract drift gate in CI:
  - export via `poetry run python scripts/export_openapi.py`
  - fail on drift via `git diff --exit-code artifacts/contracts/openapi.json`
- Added minimal migration-file sanity gate in CI:
  - all migration files under `app/db/migrations` must be `NNN_description.sql`
  - sequence numbers must be contiguous
  - SQL files must not be empty
- Added PR check documentation:
  - `docs/ci/pr-gates.md` with required checks, local commands, and contract-drift remediation.

### Commands run + outcomes
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS (`Success: no issues found in 184 source files`)
- `poetry run pytest` -> PASS (`187 passed`, coverage `90.64%`)
- `poetry run python scripts/export_openapi.py` -> PASS
- `git diff --exit-code artifacts/contracts/openapi.json` -> FAIL (detected contract drift; OpenAPI file changed after export)
- `git diff origin/develop...HEAD > artifacts/slices-76-80.patch` -> PASS
- `git diff > artifacts/slices-76-80-this-run.patch` -> PASS
- `Get-ChildItem artifacts | Select-Object Name,Length,LastWriteTime` -> PASS

### Artifacts listing snapshot
- `slices-76-80.patch` -> 0 bytes
- `slices-76-80-this-run.patch` -> 62,396 bytes

## 2026-02-20 – Contract + Error Surface Cleanup v1 (pre-Postgres)

### Files changed
- `app/models/outcome.py` (new shared enums/models)
- `app/models/alert_rule.py`
- `app/models/alert_digest.py`
- `app/models/alerts.py`
- `app/models/diagnostics.py`
- `app/services/alerts_run_service.py`
- `app/services/alert_service.py`
- `app/services/usajobs_diagnostics_service.py`
- `app/api/v1/alerts.py`
- `app/api/v1/diagnostics.py`
- `app/middleware/request_id.py`
- `tests/api/alerts/test__categories__alerts.py`
- `tests/api/alerts/test__categories__alerts_run_v1.py`
- `tests/api/diagnostics/test__categories__usajobs_diagnostics.py`
- `tests/test_error_contract_observability.py`
- `tests/test_request_completion_logging.py`
- `tests/test_worker_alerts.py`
- `tests/test_log_event_registry_and_schema.py`
- `artifacts/contracts/openapi.json`

### What / why
- Standardized domain outcome semantics across contracts:
  - `domain_outcome`: `success|skipped|empty|error`
  - `skip_reason`: `USJOBS_NOT_CONFIGURED|MIN_INTERVAL|LOCKED|BACKOFF|DISABLED|UNKNOWN`
  - `empty_reason`: `UPSTREAM_ZERO_RESULTS|FILTERED_TO_ZERO|NORMALIZED_TO_ZERO|UNKNOWN`
- Applied consistently to:
  - `POST /api/v1/alerts/run`
  - `POST /api/v1/saved-searches/{id}/run`
  - `GET /api/v1/alerts/metrics/recent`
  - `GET /api/v1/alerts/runs`
  - `GET /api/v1/diagnostics/usajobs`
- Tightened `backoff_events` contract from loose int/object union to typed list:
  - `BackoffEvent { code, message, detail? }`
  - Added runtime normalization for historical int entries to preserve backward compatibility.
- Added typed response model for saved-search run endpoint (`SavedSearchRunOut`) with standardized outcome fields.
- Improved request completion logging context to include `empty_reason` when present.
- Preserved audit behavior:
  - upstream attempted => upstream audit row recorded
  - upstream skipped (`USJOBS_NOT_CONFIGURED`) => no upstream audit row
  - added/updated tests to enforce both expectations.
- Strengthened error contract assertions:
  - validation/404/500 tests assert stable codes and clear, non-leaking messages.

### Commands run + outcomes
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS (`Success: no issues found in 185 source files`)
- `poetry run pytest` -> PASS (`191 passed`, coverage `90.84%`)
- `poetry run python scripts/export_openapi.py` -> PASS
- `git diff --exit-code artifacts/contracts/openapi.json` -> FAIL (expected locally due updated OpenAPI snapshot pending commit)
- `git diff origin/develop...HEAD > artifacts/slices-81-85.patch` -> PASS
- `git diff > artifacts/slices-81-85-this-run.patch` -> PASS
- `Get-ChildItem artifacts | Select-Object Name,Length,LastWriteTime` -> PASS

### Artifacts generated
- `artifacts/slices-81-85.patch` -> `0` bytes
- `artifacts/slices-81-85-this-run.patch` -> `55347` bytes

## 2026-02-21 - Testing Hardening v1 (pre-Postgres)

### Step 1: Coverage map (baseline, before this run)
- Baseline command: `poetry run pytest`
- Baseline result: `191 passed`, total coverage `90.84%`
- Top 10 lowest-coverage high-risk files in target areas (`app/db/**`, `app/services/**`, `app/adapters/usajobs/**`):
1. `app/db/repo/alert_delivery_log_repo.py` - 70%
2. `app/db/repo/upstream_audit_repo.py` - 71%
3. `app/services/alert_digest_service.py` - 74%
4. `app/services/audit_service.py` - 80%
5. `app/db/connection.py` - 82%
6. `app/services/job_search_service.py` - 82%
7. `app/services/export_service.py` - 84%
8. `app/services/thread_service.py` - 84%
9. `app/services/alert_rule_service.py` - 85%
10. `app/services/alert_service.py` - 86%
- Untested behavior gaps that mattered most:
1. Scheduler-lock timing boundaries and owner-release semantics under rapid reruns.
2. Skip/outcome consistency (`MIN_INTERVAL`, `USJOBS_NOT_CONFIGURED`) between run summaries and metrics endpoints.
3. Determinism invariants for saved-search fingerprint/order and enabled-rule ordering.
4. Upstream-attempt vs skip-path audit invariants (no audit row when no upstream call should occur).
5. Stable misuse contracts (422 validation envelope, no secret leakage on diagnostics failures).

### Step 2/3: Added tests by case type
- `Use Case`:
1. `tests/use_case/test_use_case_testing_hardening_v1.py`:
`test_use_case__alerts_run_happy_path_attempts_upstream_writes_audit_and_creates_digest`
2. `tests/use_case/test_use_case_testing_hardening_v1.py`:
`test_use_case__saved_search_runner_same_input_produces_same_fingerprint_and_order`
- `Misuse Case`:
1. `tests/misuse_case/test_misuse_case_testing_hardening_v1.py`:
`test_misuse_case__diagnostics_never_leaks_env_secret_values_on_failure`
2. `tests/misuse_case/test_misuse_case_testing_hardening_v1.py`:
`test_misuse_case__malformed_job_search_request_returns_422_without_stack_trace`
- `Boundary`:
1. `tests/boundary/test_boundary_testing_hardening_v1.py`:
`test_boundary__jobs_search_results_per_page_min_max_and_overflow`
2. `tests/boundary/test_boundary_testing_hardening_v1.py`:
`test_boundary__lock_repo_reclaims_expired_lock_at_exact_cutoff`
- `Positive`:
1. `tests/positive/test_positive_testing_hardening_v1.py`:
`test_positive__diagnostics_configured_reports_can_query`
2. `tests/positive/test_positive_testing_hardening_v1.py`:
`test_positive__min_interval_skip_reason_is_consistent_in_run_and_metrics`
- `Negative`:
1. `tests/negative/test_negative_testing_hardening_v1.py`:
`test_negative__alerts_run_not_configured_sets_skip_reason_and_no_upstream_audit`
2. `tests/negative/test_negative_testing_hardening_v1.py`:
`test_negative__run_with_backoff_retries_then_raises_rate_limit`
- `Edge Case`:
1. `tests/edge_case/test_edge_case_testing_hardening_v1.py`:
`test_edge_case__upstream_zero_results_maps_to_empty_with_upstream_reason`
2. `tests/edge_case/test_edge_case_testing_hardening_v1.py`:
`test_edge_case__enabled_rule_order_is_stable_across_runs_and_normalized_to_zero_contract`

### Determinism invariants explicitly covered
1. Same saved-search input -> same fingerprint and ordering:
`tests/use_case/test_use_case_testing_hardening_v1.py`
2. Stable sorting of enabled rules across runs:
`tests/edge_case/test_edge_case_testing_hardening_v1.py`

### Step 4: Validation commands and outcomes
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS (`Success: no issues found in 191 source files`)
- `poetry run pytest` -> PASS (`203 passed`, coverage `90.92%`)

### Coverage summary
- Before: `90.84%` (`191` tests)
- After: `90.92%` (`203` tests)
- Coverage gate remained unchanged and passed (`--cov-fail-under=90`).

### Product-code changes for testability
- None. No production behavior changes were made.

## Postgres Support Behind a Flag v1 (Phase 1)

### Summary (what/why)
- Added `DB_DIALECT` (sqlite|postgres) and `DATABASE_URL` config knobs; default remains SQLite.
- Implemented Postgres connection path with safe timeouts, parameter adaptation, and migration runner compatibility.
- Added Postgres-aware migration safety checks and a local Postgres setup guide.
- Added Postgres-mode smoke coverage (skips when DATABASE_URL/psycopg are unavailable).

### Commands run
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> FAIL (missing psycopg stubs) then PASS after import ignore annotations
- `poetry run pytest` -> FAIL (DB_DIALECT from environment used postgres without psycopg) then PASS after forcing sqlite in tests and adding coverage helpers

### Validation results (latest)
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS
- `poetry run pytest` -> PASS (207 passed, 1 skipped; coverage 90.34%)

### Notes
- Postgres smoke test is skipped when `DATABASE_URL` is not set or `psycopg` is not installed.
- API `/health` in Postgres mode was not exercised here (no live Postgres available in this environment).
- `pwsh`/`powershell` not available in this environment; used `ls -l artifacts` as a substitute listing.

## Postgres Alert Scheduler Lock Fix

### Summary (what/why)
- Made alert scheduler lock acquisition SQL dialect-aware for sqlite vs postgres.
- Added postgres coverage for lock acquisition semantics when `DATABASE_URL` is available.
- Confirmed `alert_scheduler_locks.lock_name` is already a PRIMARY KEY (migration `008_delivery_worker_metrics_v1.sql`), so no new migration required.

### Files touched
- `app/db/repo/alert_scheduler_lock_repo.py`
- `tests/db/repo/test_alert_scheduler_lock_repo.py`
- `tests/test_db_postgres_helpers.py`

### Commands run
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS
- `poetry run pytest` -> PASS
- Postgres smoke run for `POST /api/v1/alerts/run` -> NOT RUN (needs app boot + manual POST)

## Postgres Boolean Predicate Fix - enabled = 1

### Branch
- `feature/postgres-support-flag-v1`

### Files touched in this run
- `app/db/repo/alert_rule_repo.py`
- `tests/db/repo/test_alert_rule_repo.py`
- `artifacts/postgres-support-flag-v1.patch`
- `artifacts/postgres-support-flag-v1-this-run.patch`

### Boolean predicate fixes
- `app/db/repo/alert_rule_repo.py`:
  - `AlertRuleRepo.list_enabled()` now chooses predicate by dialect:
    - sqlite: `enabled = 1`
    - postgres: `enabled IS TRUE`

### Validation
- `poetry run ruff check .` -> PASS
- `poetry run mypy .` -> PASS
- `poetry run pytest` -> PASS (`212 passed`)

### Manual smoke (postgres)
- Boot command: `poetry run uvicorn app.main:create_app --factory`
- Env: `DB_DIALECT=postgres` with `DATABASE_URL` set
- Request: `POST /api/v1/alerts/run`
- Result: HTTP `200`

### Patch artifacts
- `git diff origin/develop...HEAD > artifacts/postgres-support-flag-v1.patch`
- `git diff > artifacts/postgres-support-flag-v1-this-run.patch`
- `ls -lh artifacts` shows:
  - `artifacts/postgres-support-flag-v1.patch` -> `0`
  - `artifacts/postgres-support-flag-v1-this-run.patch` -> `41K`
