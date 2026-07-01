# Day 52: USAJOBS Sync Schema Hardening

## What Changed

Day 52 tightens the persistence layer behind the USAJOBS sync. It adds schema indexes for sync runs, change logs, canonical ingested jobs, and lifecycle/status lookups. It also makes the non-dry-run write phase use one consistency boundary for canonical job rows, lifecycle changes, change logs, sync-run rows, alert queue rows, indexing queue rows, and queue counter updates.

## Why Schema Integrity Matters

The sync job writes several related records: canonical jobs, change logs, sync runs, alert queue rows, and indexing queue rows. Operators need those records to stay queryable and internally consistent when staging validation looks at what happened.

## Why Transaction Consistency Matters

Queue counters on `job_sync_runs` mean newly inserted queue rows only. If an error happens while canonical rows, change logs, lifecycle changes, queue rows, or counter updates are being written, the sync rolls that write phase back together. That prevents a retry from seeing a half-written canonical job as unchanged and missing the alert or indexing queue rows it still needs to create.

## How Dedupe Is Enforced

Alert and indexing queue tables still enforce unique `dedupe_key` values at the database level. The repo keeps conflict-safe insertion behavior and now rejects unknown queue names instead of silently sending them to the wrong table.

## What Remains Before Production

Day 53 full pytest runtime triage, Day 54 actual staging dry-run/write/repeat validation, Day 55 public job page sync contract alignment, and Day 56 production rollout readiness remain open. Deeper table rebuilds for additional CHECK/FK constraints should stay in later production-readiness work if they are needed after staging evidence.
