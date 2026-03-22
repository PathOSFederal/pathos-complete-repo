# Change Brief: Slices 76-80 (Backend)

## Continuation Fixes: Saved Search Runs and Alert Rules
- We fixed a workflow bug where running a saved search by ID could return “not found” even though the search was visible in desktop screens.
- The backend now normalizes and uses the same saved-search UUID path value consistently during run execution.
- We also added explicit run-completion logging for saved-search runs with the saved-search ID in correlation fields, so troubleshooting is clearer.

- We enabled `POST /api/v1/alerts/rules` to match client and OpenAPI expectations.
- Before this fix, rule creation calls to the plural path returned “method not allowed,” so scheduled alert runs evaluated zero rules and no digests appeared.
- After this fix, rules can be created through the plural route, desktop rule lists show them, and alert runs evaluate those rules.

## What Changed for Users
- The desktop app can now pull a clear “latest digests” feed directly from backend endpoints.
- Digest entries now include easy-to-read run details like when it ran, how many jobs were scanned, and how many triggers were raised.

## Reliability Improvements
- Startup behavior was modernized to remove deprecated startup hooks, reducing warning noise and future upgrade risk.
- App imports are safer: loading backend modules no longer performs hidden runtime work like creating app instances or touching the database.
- We added stronger run bookkeeping so each ingestion run records a deterministic outcome.

## Operational Improvements
- The backend now keeps an explicit checkpoint per saved search.
- That checkpoint captures the last successful run state, enabling safer resume behavior and cleaner replayability after interruptions.
- Run ledger records now provide one place to audit run outcomes and counts.

## Quality and Safety
- New tests were added for:
  - desktop digest retrieval,
  - mapper behavior on representative USAJOBS payloads,
  - checkpoint update rules,
  - import-safety/lifespan behavior.
- Coverage gate remains above target (`>= 90%`).

## What Did Not Change
- No new external services were introduced.
- Email delivery remains intentionally deferred (`EmailDigestFutureTransport` stays no-op).
- Postgres rollout is still deferred; this work prepares the contract and readiness path.
