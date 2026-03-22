# Slices 46-55: Delta Detection + Digests + Desktop Contract v1

This milestone upgrades alerting from simple trigger logs to deterministic change tracking and digest surfaces.

What was added:
- Delta detection for saved-search jobs:
  - stable job fingerprinting,
  - new/updated/unchanged/disappeared classification,
  - score delta tracking with meaningful-change threshold support.
- Digest payload generation and persistence:
  - deterministic top-job ordering,
  - totals and summary metadata per rule run,
  - persisted digest records for desktop consumption and retention controls.
- Desktop and observability API surfaces:
  - desktop digest/saved-search/rule list endpoints,
  - alert runs list endpoint,
  - per-rule run history endpoint.
- Guardrails for upstream safety:
  - per-rule minimum interval,
  - global jobs-scanned cap per run,
  - global enabled-rules cap per run,
  - deterministic backoff tracking for throttling/unavailable upstream calls.
- Retention controls:
  - purge old digests,
  - keep last N digests per rule,
  - purge rule-specific digest/history logs,
  - purge old run summaries.
- CI hardening:
  - OpenAPI snapshot drift is checked by CI alongside existing quality gates.

Outcome:
- Alert runs are now reproducible, audit-friendly, and easier to inspect in desktop clients without increasing upstream spam risk.
