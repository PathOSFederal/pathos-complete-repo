# Day 53: Backend Pytest Runtime Triage

## What Changed

Day 53 investigated the backend full-suite pytest timeout that had been blocking staging validation. The work isolated the timeout to cumulative suite runtime plus a few stale test assumptions, rather than a live USAJOBS call or a single hanging sync path.

The patch keeps USAJOBS sync business logic unchanged. It only updates tests and test artifacts so the suite runs against isolated temporary databases and the current API contract.

## Why This Matters

Staging validation should not begin while the backend test suite appears to hang. A timeout can hide real regressions, stale local database state, or old contract snapshots. Day 53 makes the runtime behavior visible so operators know whether a failure is a product issue, an environment issue, or simply a command timeout that is too short for the current suite.

## What Was Found

The suite was not blocked on live USAJOBS or external network calls. The slowest areas are API and root-level contract tests that create application clients, run migrations, and exercise database-heavy flows.

Several stale test issues were corrected:

- an integration job-search contract expected the older minimal job response instead of the Day 49 canonical fields,
- intelligence contract tests could accidentally use the default local database instead of an isolated temporary database,
- a worker scheduler test used a fixed temporary database path that could retain stale schema,
- the OpenAPI snapshot needed to be refreshed for the current backend contract.

## Current Runtime Expectation

The full backend suite now completes when given enough time. On this machine, final validation runs took about 9-12 minutes depending on coverage mode, and the full coverage run met the configured coverage threshold.

Short command timeouts around four minutes are no longer a useful signal for this branch; they can interrupt a healthy run before the suite reaches the later buckets.

## What Remains Before Production

Day 54 still needs actual staging dry-run, bounded write, and repeat-run validation. Day 55 still needs the public job page sync contract. Day 56 still needs production rollout readiness review. Deferred schema rebuild work and the preserved Day 49 and Day 50 follow-ups remain open.
