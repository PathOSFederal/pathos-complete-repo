# Day 54: USAJOBS Staging Validation Run

## What Was Run

Day 54 attempted the bounded USAJOBS staging validation sequence from the runbook. The dry-run used the official USAJOBS API path with a small partition: series `2210`, Florida, last 7 days, one page, and page size 25.

## Why Dry-Run Came First

Dry-run is the safety gate before any staging write. It proves the API call, normalization path, and summary output can run without creating sync runs, canonical jobs, snapshots, change logs, alert rows, indexing rows, or queue counters.

## What Failed Previously

The first dry-run did not mutate durable app rows, but it failed safely with `JobSearchUpstreamSchemaError`. The root cause was a legitimate live USAJOBS response shape that was stricter than our model: `WhoMayApply` can arrive as a code/name object, and `HiringPath` can arrive as a list of strings.

## What Was Fixed

The USAJOBS adapter schema and normalizer now accept those official response shapes and normalize them into stable canonical strings. A deterministic regression test covers the live-shaped `WhoMayApply` and `HiringPath` fields.

The run exposed an operator-experience issue: the runbook-style script invocation could fail with `ModuleNotFoundError` when `PYTHONPATH` was not already set. The staging validation script now inserts the backend root into `sys.path` before importing app modules, and a subprocess regression test covers that entrypoint.

## Current Dry-Run Result

After the schema fix, the bounded dry-run succeeded against the official USAJOBS API path. It fetched and previewed 19 normalized jobs for the bounded series `2210`, Florida, last 7 days, one page, page size 25. Durable row counts stayed unchanged.

The continuation pass reran the same bounded dry-run after a fresh redacted staging proof check. The dry-run again fetched 19 records, previewed 19 new jobs, created no sync runs, queued no alert or indexing events, and left durable row counts unchanged.

## Why Write Remains Blocked

The available environment still does not provide an explicit staging runtime or staging database target. `PATHOS_ENV` is not explicitly set to `staging`, the runtime defaults to `local`, the resolved DB target is sqlite rather than a proven staging database, required sync tables are missing in that target, and ops API keys are not configured. Under the Day 54 safety contract, bounded write, repeat-run idempotency, and health endpoint verification must not run until those staging facts are proven.

## External Delivery And Indexing

No write run was performed. No email delivery, Google Indexing API submission, IndexNow submission, production scheduler change, queue worker activation, or scraping occurred.

## What Remains Before Production

Provide an explicitly proven staging runtime and database target, then rerun Day 54 limited write, repeat-run idempotency, persisted-row checks, and health endpoint verification. Day 55 public job page sync contract, Day 56 production rollout readiness, deferred FK/CHECK schema rebuild work, and the preserved Day 49/50 follow-ups remain open.
