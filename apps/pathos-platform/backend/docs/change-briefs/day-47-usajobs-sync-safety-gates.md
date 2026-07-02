# Day 47 USAJOBS Sync Safety Gates

## What Changed

Day 47 makes USAJOBS staging validation safer before any production rollout. Dry-run searches now skip upstream audit writes on both successful responses and upstream failures, and they do not use the in-memory job-search cache. The staging validation CLI now blocks write mode unless the operator explicitly sets a safe non-production `PATHOS_ENV` and passes `--confirm-staging-write`.

The sync still uses only the official USAJOBS API. No scraping, scheduler changes, email delivery, or external indexing submission was added.

## Why Dry-Run Safety Matters

Dry-run is the safest way to inspect real USAJOBS responses before writing staging data. It must not leave behind audit rows, sync runs, source snapshots, canonical jobs, change logs, alert/indexing events, or cache entries. That guarantee now applies even when USAJOBS returns rate-limit, auth, unavailable, schema, or unexpected errors.

## Why Production Write Blocking Matters

The validation script is intentionally small and bounded, but write mode still creates real records. It now fails closed for missing, blank, production-like, alias-only, or unknown environments so an operator cannot accidentally run staging validation writes against production credentials or a production database.

## What Operators Can Safely Run Now

Operators can run dry-run mode without `PATHOS_ENV` and without write confirmation:

```powershell
poetry run python scripts/usajobs_staging_validation.py --mode dry-run --series 2210 --location Florida --date-posted-days 7 --max-pages 1 --page-size 25
```

Operators can run limited write mode only after explicitly setting a safe environment, such as `PATHOS_ENV=staging`, and passing `--confirm-staging-write`. Safe values are `local`, `dev`, `development`, `test`, `ci`, `staging`, `qa`, and `sandbox`. Backend config aliases do not expand write permissions, so `stage` remains blocked unless later approved as an operational environment name. Production-like aliases such as `production`, `prod`, `main`, and `live` remain blocked.

## What Remains Before Production

Day 48 must add real alert/indexing queue rows with dedupe. Day 49 must normalize the remaining canonical USAJOBS fields from production payloads. Later days still need lifecycle guards, health endpoint tests, schema hardening, full pytest runtime triage, and actual staging dry-run/write/repeat validation.
