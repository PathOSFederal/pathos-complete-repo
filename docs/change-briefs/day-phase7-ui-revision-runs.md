# Phase 7 Change Brief

PathOS now supports first-class UI revision runs in the n8n pipeline.

When a UI run is rejected after visual review, the original run stays intact. A new revision run can now be created through the orchestrator with explicit lineage and carried-forward review context instead of restarting manually.

What is new:
- new orchestrator action: `create_revision_run`
- revision runs keep:
  - the prior run link
  - attempt number
  - root lineage id
  - short revision reason
  - full review feedback
- revision prompts now clearly tell the worker:
  - which run is being revised
  - what feedback must be addressed
  - whether the same design reference is still the target

Why this matters:
- preserves trust
- improves auditability
- makes iterative UI work a normal pipeline path instead of a manual workaround

Important current scope:
- this phase is intentionally limited to rejected UI runs
- non-UI flows are unchanged
- no new workflow was added; the existing pipeline was extended in place
