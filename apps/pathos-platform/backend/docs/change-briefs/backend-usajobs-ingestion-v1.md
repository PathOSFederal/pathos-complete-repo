# Backend USAJOBS Ingestion v1

## What changed

The backend now has a real bounded USAJOBS ingestion path instead of treating federal job results as transient response data only.

When a saved search runs, the backend now:
- fetches jobs only through the official USAJOBS API path already used by the runtime
- normalizes those jobs into the backend-owned canonical format
- stores bounded canonical job records per saved search
- keeps upstream audit references, mapper version, query fingerprint, and ingest warnings with those records

## Why it matters

This gives PathOS a real audited data foundation for later intelligence work. Phase 3 qualification logic can now evaluate stable canonical job records instead of depending on one-off fetch responses or client-side state.

## User and operator impact

Saved-search and alert-run flows still behave the same from a user point of view, but the backend now keeps a trustworthy record of what it saw from USAJOBS for each bounded run.

Operators get:
- clearer provenance for debugging
- bounded ingestion instead of open-ended harvesting
- safer replay and comparison behavior across runs

## Trust and audit impact

The backend now preserves more lineage instead of flattening away important context. It retains:
- official source identity
- upstream audit linkage
- mapper version
- query fingerprint and bounded slice context
- warnings when upstream fields are incomplete or malformed

This improves explainability and makes later decision-engine outputs easier to audit.

## Intentionally deferred

This phase does not add broad crawling, warehouse-style backfills, or learning/training pipelines.

It also does not implement qualification or recommendation intelligence yet. That remains the next backend phase.
