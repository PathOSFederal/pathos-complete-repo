# USAJOBS Sync Production Readiness Days

This roadmap starts from the Day 46 checkpoint on branch `feature/backend-usajobs-ingestion-v1`.
The branch remains not merge-ready until the safety, queue, canonical-field, lifecycle, health, schema, and runtime-validation work below is complete.

## Day 47: Dry-Run Safety And Environment Gates

- Branch: `feature/voloro-day-47-usajobs-sync-safety-gates`
- Goal: make dry-run non-mutating on success and failure, and prevent accidental write-mode execution outside approved staging/local/test contexts.
- Issues addressed: dry-run upstream audit writes on exceptions; staging write mode can target any configured database; dry-run cache mutation risk.
- Files likely touched: `app/services/job_search_service.py`, `app/services/usajobs_ingestion_service.py`, `scripts/usajobs_staging_validation.py`, `tests/services/test_usajobs_ingestion_service.py`, CLI tests if available, runbook and merge notes.
- Tests to add or update: dry-run upstream-error tests proving no upstream audit write; write-mode environment guard tests; dry-run cache suppression test.
- Validation commands: `poetry run ruff check .`; `poetry run mypy app tests`; targeted sync pytest; staging CLI dry-run command against fixtures or mocked client.
- Acceptance criteria: dry-run creates no durable records in success or exception paths; write mode requires an explicitly set safe environment and `--confirm-staging-write`; missing, blank, production-like, and unknown environments are blocked by default.
- Explicit non-goals: no production scheduler change; no real email delivery; no external indexing submission.
- Day 47 status: implemented in this branch, including the missing/blank `PATHOS_ENV` fail-closed patch; Day 48 queue-event persistence and Day 49 canonical normalization remain separate work.

## Day 48: Real Alert/Indexing Queue Rows With Dedupe

- Branch: `feature/voloro-day-48-usajobs-sync-event-queues`
- Goal: replace queue-count-only behavior with persisted, inspectable queue events that are deduplicated across repeat runs.
- Issues addressed: alert/indexing behavior is documented as queue-only, but implementation currently appears to store counters only.
- Files likely touched: queue model/repo/service files, `app/services/usajobs_ingestion_service.py`, migrations, health repo, tests, runbook.
- Tests to add or update: queue insert and dedupe tests; repeat-run idempotency tests; staging-disabled external delivery tests.
- Validation commands: `poetry run ruff check .`; `poetry run mypy app tests`; targeted queue/sync pytest; migration tests.
- Acceptance criteria: repeat unchanged sync does not create duplicate queue events; updated/closed jobs create the expected queued event rows; staging does not deliver email or call external indexing APIs unless explicit delivery flags are enabled.
- Explicit non-goals: no provider delivery implementation changes beyond gating and queue safety.
- Day 48 status: implemented in this branch with `job_alert_events`, `job_page_indexing_events`, deterministic dedupe keys, inserted-row counter semantics, and tests for queue creation, cross-saved-search indexing dedupe, dry-run suppression, and no legacy delivery rows. Alert dedupe is saved-search-scoped; indexing dedupe is page/job/content-scoped and does not include `saved_search_id`.

## Day 49: Canonical USAJOBS Field Normalization

- Branch: `feature/voloro-day-49-usajobs-canonical-normalization`
- Goal: normalize USAJOBS fields needed for stable content hashing and meaningful change detection from real payloads, not ad hoc test dictionaries.
- Issues addressed: canonical jobs do not appear to carry all tested fields; remote/telework classification is brittle.
- Files likely touched: `app/domain/jobs/canonical_models.py`, `app/adapters/usajobs/normalize.py`, `app/services/job_search_service.py`, ingestion tests and fixtures.
- Tests to add or update: real fixture tests for salary, location, remote status, closing date, documents, qualifications, official apply links, and telework-not-remote behavior.
- Validation commands: `poetry run ruff check .`; `poetry run mypy app tests`; targeted USAJOBS normalization and ingestion pytest.
- Acceptance criteria: production canonical objects include the fields that change detection hashes and compares; explicit USAJOBS remote indicators are used where available; official source and apply-link assumptions remain intact.
- Explicit non-goals: no scraping; no new non-USAJOBS source ingestion.
- Day 49 status: implemented in this branch with real USAJOBS-shaped fixture coverage for canonical fields, remote/telework separation, official apply/source links, document and qualification normalization, stable content hashing, persisted canonical JSON, change logs, queue compatibility, and dry-run suppression. Follow-ups preserved for later hardening: add negative telework phrase handling so text like "telework not available" does not become telework eligible; decide whether `source.mapper_version` should force canonical hash changes and re-indexing; add an explicit JSON key-order hash stability test. Day 50 lifecycle guards remain separate.

## Day 50: Closed-Job And Partial-Partition Lifecycle Guards

- Branch: `feature/voloro-day-50-usajobs-lifecycle-guards`
- Goal: ensure closed/expired jobs cannot remain active while preventing partial staging slices from closing healthy jobs.
- Issues addressed: close-missing is risky for partial partitions; closed and expired lifecycle handling needs stronger guards.
- Files likely touched: `app/db/repo/saved_search_ingested_job_repo.py`, `app/services/usajobs_ingestion_service.py`, staging CLI, migration or model files if partition metadata is needed.
- Tests to add or update: complete-partition close tests; partial-partition no-close tests; expired-date lifecycle tests; reappeared-job reopen tests.
- Validation commands: `poetry run ruff check .`; `poetry run mypy app tests`; lifecycle-focused pytest; migration tests if schema changes.
- Acceptance criteria: close-missing requires an explicit complete-partition signal; expired jobs are not exposed as active; limited staging write runs never close missing jobs by default.
- Explicit non-goals: no scheduler cadence changes.
- Day 50 status: implemented in this branch with close-missing guarded by explicit partition completeness and partition identity, no-close behavior for dry-run/partial/staging-bounded partitions, deterministic close/reopen/expired lifecycle tests, and staging CLI output that keeps bounded validation no-close by default. Follow-ups preserved for later hardening: add direct `max_pages_reached` and `max_records_reached` close-missing skip tests; harden malformed non-ISO `close_date` parsing so it fails open explicitly; decide expired-new queue semantics before external delivery is enabled; add repeat-run assertions for complete-close and reappeared-job idempotency. Day 51 ops health tests remain separate.

## Day 51: Health Endpoint And Ops Visibility Tests

- Branch: `feature/voloro-day-51-usajobs-sync-ops-health`
- Goal: harden `/api/v1/ops/usajobs-sync/health` for auth, no-data, populated-data, and sanitized-error cases.
- Issues addressed: health endpoint needs direct tests and stronger operator confidence.
- Files likely touched: `app/api/v1/ops.py`, `app/db/repo/job_sync_run_repo.py`, API tests, runbook.
- Tests to add or update: auth-required test; empty health response test; populated health response test; sanitized error-summary test.
- Validation commands: `poetry run ruff check .`; `poetry run mypy app tests`; ops endpoint pytest.
- Acceptance criteria: endpoint exposes useful health fields without secrets, raw credentials, provider headers, raw payloads, or stack traces.
- Explicit non-goals: no admin UI build unless separately requested.
- Day 51 status: implemented in this branch with direct endpoint tests for auth, no-row, healthy, stale close-missing skip, degraded success with failed partitions, failed run, queue counters, last-success timing, and sanitized secret/error output. The must-fix sanitizer patch redacts full Authorization values, including unknown, quoted, and multi-token forms with trailing fragments, plus stringified provider headers, API-key patterns, credential-bearing URLs, database URLs, and stack frames; malformed failed or stale partition JSON degrades safely instead of crashing the health endpoint.

## Day 52: Schema Integrity And Migration Hardening

- Branch: `feature/voloro-day-52-usajobs-sync-schema-hardening`
- Goal: strengthen schema constraints, indexes, relationships, and rollback behavior for sync validation tables.
- Issues addressed: `job_change_log.sync_run_id` has no FK/index; lifecycle/status/change fields lack CHECK constraints; queue counter updates should be hardened into a single transaction with queue row creation where practical.
- Files likely touched: SQL migration, Alembic revision, repo tests, migration tests.
- Tests to add or update: migration apply/rollback tests; constraint/index existence tests; invalid enum/status rejection tests where supported; counter atomicity tests if the repo transaction boundary is tightened.
- Validation commands: `poetry run ruff check .`; `poetry run mypy app tests`; migration pytest; targeted repo pytest.
- Acceptance criteria: schema integrity aligns with backend conventions; rollback/downgrade behavior is documented and reasonable.
- Explicit non-goals: no table renames that would churn production planning without need.
- Day 52 status: implemented in this branch with a new SQL and Alembic migration for operational indexes, direct migration assertions, database-enforced queue dedupe preserved, invalid queue-name rejection, and a write transaction boundary that commits canonical job upserts, lifecycle changes, `job_change_log` rows, sync-run creation, queue row insertion, and queue counter updates together. Rollback tests cover queue insertion failure, counter update failure, close-missing lifecycle rollback, reappeared-job rollback, and retry-after-rollback behavior. Deeper table-rebuild constraints, including a retroactive `job_change_log.sync_run_id` foreign key and CHECK constraints for existing tables, remain deferred until they can be reviewed as a dedicated schema rebuild.

## Day 53: Full Pytest Runtime Triage

- Branch: `feature/voloro-day-53-backend-pytest-runtime-triage`
- Goal: isolate the full-suite timeout without changing USAJOBS business logic.
- Issues addressed: `poetry run pytest -q --maxfail=1` timed out after roughly 248 seconds with no failure surfaced.
- Files likely touched: slow or hanging tests identified during triage; pytest configuration only if needed.
- Tests to add or update: no new product tests expected unless a timeout root cause requires one.
- Validation commands: `poetry run pytest --collect-only -q`; `poetry run pytest --no-cov -vv --durations=20 --maxfail=1 tests`; directory-level pytest splits.
- Acceptance criteria: timeout point is identified; full suite either completes or has a documented isolated blocker with the next narrow command.
- Explicit non-goals: no broad refactor of unrelated test suites.

## Day 54: Actual Staging Dry-Run, Write, And Repeat-Run Validation

- Branch: `feature/voloro-day-54-usajobs-staging-validation-run`
- Goal: execute the approved staging validation sequence using official USAJOBS API credentials and bounded partitions.
- Issues addressed: staging validation has not yet been run end-to-end against staging data.
- Files likely touched: runbook, merge notes, validation evidence only unless a staging-only defect is found.
- Tests to add or update: none by default; add regression coverage only for defects discovered during the run.
- Validation commands: local fixture tests; staging dry-run command; limited staging write command; repeat-run idempotency command; health endpoint check.
- Acceptance criteria: dry-run has zero durable writes; bounded write persists expected rows; repeat run is idempotent; health output matches expected counts; no real email or external indexing occurs.
- Explicit non-goals: no production rollout.

## Day 55: Public Job Page Sync Contract Alignment

- Branch: `feature/voloro-day-55-job-page-sync-contract`
- Goal: align public job page assumptions with canonical USAJOBS sync output and lifecycle state.
- Issues addressed: public job pages must not expose stale, duplicate, expired, or non-official apply-link records after sync integration.
- Files likely touched: job query/service/model/API files, public job page contract tests, docs.
- Tests to add or update: active-only job listing tests; expired/closed exclusion tests; official apply-link rendering contract tests.
- Validation commands: backend targeted pytest; frontend typecheck/tests if contract changes surface in UI.
- Acceptance criteria: public job pages consume canonical sync fields safely and do not present closed/expired jobs as active.
- Explicit non-goals: no new recommendation engine behavior.

## Day 56: Production Rollout Readiness

- Branch: `feature/voloro-day-56-usajobs-sync-production-readiness`
- Goal: prepare the final production rollout checklist after safety, queue, normalization, lifecycle, health, schema, runtime, staging, and public-contract work is complete.
- Issues addressed: final merge readiness and rollout sequencing.
- Files likely touched: production runbook, merge notes, change brief, rollout checklist, scheduler documentation.
- Tests to add or update: only final regression or smoke tests found missing during readiness review.
- Validation commands: `poetry run ruff check .`; `poetry run mypy app tests`; full or isolated backend pytest; final staging validation evidence review.
- Acceptance criteria: no scraping; production scheduler changes are reviewed separately; dry-run and staging write modes are safe; queue delivery remains explicitly gated; rollback/reset plan is documented.
- Explicit non-goals: no production enablement without human approval.
