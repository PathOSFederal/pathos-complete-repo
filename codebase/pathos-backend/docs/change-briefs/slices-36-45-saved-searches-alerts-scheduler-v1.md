# Slices 36-45: Saved Searches + Alerts Scheduler (v1)

This milestone upgrades backend alerting from simple saved-search diffs to a deterministic rule-driven system.

What changed:
- Saved searches now store the input query and optional scoring profile snapshot, not output results.
- Alert rules were added so teams can set score thresholds, daily caps, cooldown windows, and enable/disable behavior.
- Alert evaluation is deterministic and idempotent:
  - same state + same inputs => same decisions
  - previously notified jobs are not re-notified
  - seen/notified tracking is persisted for auditability
- A new manual run endpoint (`POST /api/v1/alerts/run`) evaluates all enabled rules and returns a full run summary.
- A background worker entrypoint (`app/worker.py`) was added with:
  - `run_alerts_once()`
  - hourly scheduler loop with safe shutdown and deterministic backoff on upstream failures/rate limits.
- CI was hardened so push/PR quality gates stay aligned and OpenAPI snapshot drift is caught in CI.

Outcome:
- Alert processing is now reproducible, traceable, and safe against duplicate notifications and upstream throttling.
