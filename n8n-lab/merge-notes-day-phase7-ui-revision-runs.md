# Merge Notes: Phase 7 UI Revision Runs

## What changed
- added `create_revision_run.ps1` as the revision packet builder for rejected UI runs
- extended `prepare-run.ps1` to persist revision lineage metadata:
  - `revisionOfRunId`
  - `rootRunId`
  - `attemptNumber`
  - `revisionReason`
  - `reviewFeedback`
  - `carryForwardDesignReference`
  - `revisionSummary`
  - previous design-reference fields
- extended `build-prompts.ps1` so revision runs carry reviewer feedback into prompt output
- extended `update-run-index.ps1` so lineage is visible in `run-index.json`
- patched `Webhook Dev Run v1` to accept and persist the new revision metadata
- patched `pathos-orchestrator` to add `create_revision_run` and route it into the existing start-run workflow

## Why this changed
- rejected UI runs previously stopped at `visual_review_failed` and required awkward manual restart
- the pipeline needed a first-class revision loop that preserves trust and auditability
- linked revision runs are cleaner than mutating the original run in place

## New semantics
- revision creation is currently scoped to rejected UI runs only
- original rejected run remains intact
- revision run is a new run folder with explicit lineage metadata
- carried-forward design-reference artifacts remain self-contained in the new run
- `reviewFeedback` stores the full human feedback
- `revisionReason` stores the short machine-friendly revision summary

## Whether a new workflow was required
- no new workflow was required
- the change was implemented by:
  - a new helper script
  - small extensions to the existing start-run workflow
  - a new orchestrator action

## Lineage representation
- `status.json` on revision runs now includes:
  - `revisionOfRunId`
  - `rootRunId`
  - `attemptNumber`
  - `revisionReason`
  - `reviewFeedback`
  - `carryForwardDesignReference`
  - `revisionSummary`
  - `previousDesignSource`
  - `previousReferenceImagePathCopied`
  - `previousDesignNotesPathCopied`
- `run-index.json` now records lineage fields for each run entry
- `cursorPrompt.md` includes a dedicated `Revision Context` section

## Live smoke validation performed
- helper script smoke test:
  - source rejected UI run: `run-1773873563658`
  - output packet correctly produced `attemptNumber = 2`, `rootRunId = run-1773873563658`, `revisionReason = tighten_layout`
- live orchestrator smoke test:
  - request action: `create_revision_run`
  - source run: `run-1773873563658`
  - new revision run created: `run-1774049632883`
- verified on the created revision run:
  - `status.json` contains lineage fields
  - `cursorPrompt.md` includes revision feedback
  - `run-index.json` records the lineage entry

## Operational note
- the running n8n process had to be restarted so the live webhook process picked up the patched workflow history
- restart was performed with:
  - `NODES_EXCLUDE=[]`

## Remaining risks
- carried-forward design-reference smoke validation was done on a rejected UI run that did not have design-reference artifacts, so the design-reference carry-forward path still needs the focused matrix in the attached test plan
- review rejection still stops at `visual_review_failed`; revision creation is explicit, not automatic, by design

## Testing
- focused operator test plan:
  - `n8n-lab/test-plans/day-phase7-ui-revision-runs.md`
