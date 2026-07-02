# Day 48: USAJOBS Sync Event Queues

## What Changed

Day 48 adds durable queue rows for USAJOBS-driven alert and indexing work. The sync now writes `job_alert_events` and `job_page_indexing_events` rows for new, meaningfully updated, and closed jobs during write-mode ingestion.

Dry-run still writes nothing.

## Why Counter-Only Was Not Enough

Counters on `job_sync_runs` showed that work would have been queued, but operators could not inspect the exact jobs, event types, reasons, or dedupe identities behind those counts. Persisted queue rows make staging validation auditable before any production delivery is considered.

## What Queue-Only Means

Queue-only means the sync records durable outbox rows with status `queued`. It does not send email, does not call the Google Indexing API, and does not call IndexNow. External delivery remains a later explicitly gated step.

## Why Dedupe Matters

Each queued event has a deterministic `dedupe_key` based on stable facts. Alert events are saved-search-scoped because each saved search represents a distinct subscriber context. Page indexing events are job/page/content-scoped, so `saved_search_id` does not expand indexing identity. If two saved searches see the same USAJOBS job and content, staging should show two alert rows and one indexing row.

Repeat syncs do not create duplicate queue rows for the same logical event, and sync-run counters reflect newly inserted queue rows only.

## What Remains Before Production

Day 49 still needs canonical USAJOBS normalization hardening. Later work still needs lifecycle guards, ops health tests, schema hardening, counter transaction atomicity hardening, full pytest runtime triage, and actual staging dry-run/write/repeat validation.
