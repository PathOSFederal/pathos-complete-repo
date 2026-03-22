# Phase 7 Recursive UI Revision Support Test Plan

## Goal
Validate that rejected UI runs can spawn linked revision runs through the live pipeline without mutating the original run in place.

## Scope
- `pathos-orchestrator` action: `create_revision_run`
- existing `Webhook Dev Run v1` start-run path
- lineage metadata in `status.json` and `run-index.json`
- prompt carry-forward in `cursorPrompt.md`
- non-UI isolation

## Case 1
Original UI run rejected, then revision run created

Request:
```json
{
  "action": "create_revision_run",
  "runId": "<REJECTED_UI_RUN_ID>",
  "revisionReason": "tighten_layout",
  "reviewFeedback": "Tighten header spacing and align card rhythm before another UI pass.",
  "carryForwardDesignReference": "true"
}
```

Expected:
- HTTP body is non-empty JSON
- wrapper shape remains `status`, `action`, `data`
- top-level `action = create_revision_run`
- `data.status = success`
- a new run folder is created
- new run `status.json` includes:
  - `revisionOfRunId = <REJECTED_UI_RUN_ID>`
  - `rootRunId`
  - `attemptNumber = prior + 1`
  - `revisionReason`
  - `reviewFeedback`
  - `carryForwardDesignReference = true`
- original rejected run remains unchanged

## Case 2
Revision run preserves original design-reference artifacts

Setup:
- use a rejected UI run that already contains `design-reference/mockup.png`
- do not provide override design-reference paths

Expected:
- new run has its own `design-reference/` directory
- `design-reference/mockup.png` exists in the new run
- `design-reference/source.json` exists in the new run
- `status.json` in the new run preserves:
  - `previousDesignSource`
  - `previousReferenceImagePathCopied`
  - `previousDesignNotesPathCopied`
- copied design-reference artifacts are self-contained in the new run folder

## Case 3
Revision feedback appears in prompt output

Expected:
- `cursorPrompt.md` includes a `Revision Context` section
- prompt includes:
  - prior run id
  - root lineage id
  - attempt number
  - `revisionReason`
  - `reviewFeedback`
- prompt states the revision is still targeting the same design-reference unless explicitly changed

## Case 4
Non-UI runs are unaffected

Request:
- normal `start_run` backend request with no revision metadata

Expected:
- existing non-UI start-run behavior remains unchanged
- no `Revision Context` appears in `cursorPrompt.md`
- run still reaches normal `ready_for_cursor`
- no `create_revision_run` behavior is accidentally invoked

## Case 5
Multiple revision attempts preserve lineage cleanly

Flow:
1. reject original UI run
2. create revision run A
3. reject revision run A
4. create revision run B from revision run A

Expected:
- revision run A:
  - `revisionOfRunId = original`
  - `rootRunId = original`
  - `attemptNumber = 2`
- revision run B:
  - `revisionOfRunId = revision run A`
  - `rootRunId = original`
  - `attemptNumber = 3`
- `run-index.json` entries preserve the lineage chain cleanly

## Failure Cases

### Rejected-run guard
Request `create_revision_run` for:
- non-UI run
- UI run with `reviewStatus != rejected`
- UI run with `runStatus != visual_review_failed`

Expected:
- structured failure JSON
- no new run folder
- reason clearly states why revision creation is blocked

### Design-reference override validation
Request `create_revision_run` with:
- invalid `referenceImagePath`

Expected:
- `start_run` still returns structured failure
- no misleading success packet
- original run remains unchanged
