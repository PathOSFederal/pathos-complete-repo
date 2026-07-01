# Sync Job Staging Validation

## What Changed

This change makes the USAJOBS sync path safer to test before production. It adds deterministic fixture tests, a dry-run path, a small staging validation script, sync run health output, and a runbook for validating the job with a narrow USAJOBS partition.

The sync still uses only the official USAJOBS API. No scraping was added.

## Why Staging Validation Matters

Federal job data changes frequently. A staging validation pass lets us prove that new jobs, repeated jobs, changed jobs, and closed jobs are handled correctly before the production scheduler depends on the pipeline.

The dry-run mode is intended to let operators fetch and normalize real USAJOBS data without writing staging records. The Day 46 review found one remaining safety gap: upstream error paths can still write audit records, so Day 47 must harden dry-run failure behavior before this is considered production-ready. The limited write mode then tests the real persistence path with a small slice, such as series `2210`, Florida, last 7 days, and 1-2 pages.

## How Duplicate, Stale, And Expired Job Risks Are Controlled

Duplicate jobs are controlled by a unique `saved_search_id, job_id` key. Running the same sync twice updates the existing row instead of creating duplicates.

Stale updates are reduced by hashing only meaningful canonical job fields. A refreshed source retrieval timestamp alone does not make an unchanged job look updated.

Expired or closed jobs are handled through an explicit close-missing mode. Limited staging validation does not close missing jobs because a 1-2 page slice is not a complete partition.

Alert and indexing behavior is queue/accounting-only for this staging validation slice. The change records queued-event counts but does not send real email and does not call external indexing APIs.

## What Remains Before Production

Before production, operators still need dry-run safety hardening, write-mode environment gates, real queue rows with dedupe, canonical USAJOBS field normalization, a final approved staging write run, a repeat-run idempotency check, review of the sync health output, and confirmation that production scheduler settings remain unchanged.

Real external indexing submission remains out of scope unless a separate explicit opt-in flag and production approval are added later.
