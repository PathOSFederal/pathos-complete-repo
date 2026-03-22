# Change Brief — Slices 87–92 Production Hardening Sprint v1

## Summary
This sprint strengthens production safety and operational maturity across database migrations, logging, repository behavior, worker scheduling, CI enforcement, and schema discipline.

## What changed
- Added a startup migration safety check to detect schema revision mismatches and surface readiness status in `/health/ready`.
- Strengthened structured logging to consistently include correlation fields and standard metadata, including worker and migration events.
- Added cross-database contract tests to enforce consistent behavior across SQLite and Postgres.
- Introduced a deterministic scheduling engine for the alert worker with stronger lock, idempotency, and recovery tests.
- Added a CI Postgres job to run dialect-parity checks using an ephemeral Postgres service.
- Added schema versioning discipline policy and a CI script to prevent schema drift without migrations.
- Added pre-commit hooks and CI checks to prevent lint/format regressions from landing.

## Why it changed
- Reduce risk of deploying code against the wrong schema revision.
- Eliminate silent dialect differences that can break deterministic behavior.
- Improve auditability and traceability for later compliance posture.
- Make worker behavior more reliable under retries, crashes, and concurrency.
- Prevent future regressions by enforcing key checks in CI.

## What to watch for
- If schema-related code changes without a matching Alembic migration, CI will fail.
- Postgres CI checks may catch behavior differences that previously went unnoticed in SQLite-only runs.
- Developers should run Ruff via pre-commit to avoid format/lint failures on PRs.
