# Merge Notes — Phase 4: v0 Design-Reference Intake

**Date:** 2026-03-20
**Phase:** day-phase4-design-reference-intake
**Status:** Implemented, smoke-validated locally, operator retest plan prepared

---

## Summary

This phase adds first-class UI design-reference intake to the existing PathOS start-run pipeline. UI runs can now accept a mockup image, optional design notes, and a design source label, copy those artifacts into the run folder, preserve the copied/original paths in run metadata, and inject that context into the generated Cursor prompt as the explicit UI target.

No new workflow was necessary. The existing start-run path was the right surface:
- `pathos-orchestrator` now forwards the new optional intake fields
- `Webhook Dev Run v1` now passes those fields into `prepare-run.ps1`
- `prepare-run.ps1` now copies and records design-reference artifacts
- `build-prompts.ps1` now teaches Cursor how to use the design-reference inputs

## Why It Changed

The pipeline already handled UI and non-UI execution correctly, but UI work still relied on informal mockup intake. That made the visual target manual and brittle. This phase makes the design-reference screenshot a first-class input artifact so the run packet itself carries the build target before Cursor starts implementation.

## What Changed

### 1. `prepare-run.ps1`

Added optional inputs:
- `ReferenceImagePath`
- `DesignNotesPath`
- `DesignSource`

Added behavior:
- validates `designNotesPath` cannot be used without `referenceImagePath`
- validates `referenceImagePath` exists when supplied
- creates `runs/<runId>/design-reference/`
- copies:
  - `mockup.png`
  - `notes.md` when the optional notes file exists
- writes `design-reference/source.json`
- records these metadata fields in `status.json`:
  - `referenceImagePathOriginal`
  - `referenceImagePathCopied`
  - `designNotesPathOriginal`
  - `designNotesPathCopied`
  - `designSource`

### 2. `build-prompts.ps1`

Prompt generation now reads design-reference metadata from `status.json` and injects a dedicated design-reference section into:
- `cursorPrompt.md`
- `codexPrompt.md`
- `chatgptFinalReview.md`
- `task.md`

The Cursor prompt now explicitly says:
- the mockup is the UI target
- the primary file is `design-reference/mockup.png`
- notes live at `design-reference/notes.md` when present
- these are input/reference artifacts, not implementation-output artifacts
- Cursor should follow layout, grouping, spacing, hierarchy, and implied behavior from the mockup

### 3. `Webhook Dev Run v1`

Updated `Normalize Packet` and `Build Commands` so the existing dev-run workflow now carries:
- `referenceImagePath`
- `designNotesPath`
- `designSource`

The final fix in this session corrected a malformed `Build Commands` string assembly bug so the new fields are now actually passed into `prepare-run.ps1` on the live workflow and in the export JSON.

### 4. `pathos-orchestrator`

Confirmed the existing orchestrator start-run path already cleanly forwards:
- `workType`
- `requiresVisualApproval`
- `referenceImagePath`
- `designNotesPath`
- `designSource`

No additional workflow was needed beyond that forwarding.

## New Workflow?

No. A dedicated child workflow was not necessary.

Reason:
- the work is intake/packet-preparation logic, not a separate runtime stage
- the existing start-run path already owns packet normalization, run-folder creation, and prompt generation
- keeping this inside start-run minimizes new routing, new webhook surface area, and deployment drift risk

## Files Changed

- `C:\dev\PathOS\n8n-lab\scripts\prepare-run.ps1`
- `C:\dev\PathOS\n8n-lab\scripts\build-prompts.ps1`
- `C:\dev\PathOS\n8n-lab\workflow-exports\baseline-working\Webhook Dev Run v1.json`
- `C:\dev\PathOS\n8n-lab\workflow-exports\baseline-working\pathos-orchestrator.json`
- live n8n workflow `GuVjn51Hhf3WDtFh`
- live n8n workflow `QkaeR0TW5Sc09ad0`
- `C:\dev\PathOS\n8n-lab\test-plans\day-phase4-v0-design-reference-intake.md`
- `C:\dev\PathOS\n8n-lab\merge-notes-day-phase4-design-reference-intake.md`
- `C:\dev\PathOS\docs\change-briefs\day-phase4-design-reference-intake.md`

## Smoke Validation Performed

Local script-level smoke validation was performed for one UI run packet with:
- reference image present
- notes file present
- `designSource = v0`

Validated locally:
- `design-reference/mockup.png` copied into the run folder
- `design-reference/notes.md` copied into the run folder
- `design-reference/source.json` written
- `status.json` preserved the original and copied paths
- generated prompts include the design-reference section

No orchestrator regression testing was run in this implementation pass. The operator-facing test plan defines the full validation matrix.

## How To Test

Use:
- `C:\dev\PathOS\n8n-lab\test-plans\day-phase4-v0-design-reference-intake.md`

Recommended test order:
1. UI run with reference image only
2. UI run with reference image and notes
3. Non-UI run with no design-reference fields
4. Invalid `referenceImagePath`
5. Missing optional `designNotesPath`

## Validation Run Results

The full webhook validation matrix was executed against:
- workflow: `Webhook Dev Run v1`
- endpoint: `http://localhost:5678/webhook/pathos-dev-run`

Why these cases matter:
- cases 1 and 2 prove the intended UI intake behavior
- case 3 proves non-UI start-run behavior did not regress
- case 4 proves invalid input handling
- case 5 proves optional notes remain optional

### Case 1: UI run with reference image only

- result: pass
- run: `run-1774042206342`
- response: success JSON
- observed:
  - `design-reference/mockup.png` exists
  - `design-reference/source.json` exists
  - no `notes.md`
  - `status.json` preserved original/copied image paths
  - `designSource` defaulted to `v0`
  - `cursorPrompt.md` included the design-reference section and mockup path
  - run reached `ready_for_cursor`

### Case 2: UI run with reference image plus notes

- result: pass
- run: `run-1774042247933`
- response: success JSON
- observed:
  - `design-reference/mockup.png` exists
  - `design-reference/notes.md` exists
  - `design-reference/source.json` exists
  - `status.json` preserved original/copied image and notes paths
  - `designSource = v0`
  - `cursorPrompt.md` included both the mockup path and notes path
  - run reached `ready_for_cursor`

### Case 3: Non-UI run with no design-reference fields

- result: pass
- run: `run-1774042285248`
- response: success JSON
- observed:
  - no `design-reference` folder created
  - `status.json` design-reference fields remained empty
  - `cursorPrompt.md` did not include design-reference guidance
  - existing non-UI behavior remained intact
  - run reached `ready_for_cursor`

### Case 4: Invalid `referenceImagePath`

- result: fail on response quality, pass on blocking invalid input
- observed:
  - request did not produce a successful prepared run
  - no copied design-reference artifacts were created
  - webhook returned HTTP `200` with an empty response body

Remaining issue:
- the start-run failure path is not yet returning a structured error payload for invalid design-reference input
- this makes operator diagnosis weaker than it should be

### Case 5: Missing optional `designNotesPath`

- result: pass
- run: `run-1774042350827`
- response: success JSON
- observed:
  - `design-reference/mockup.png` exists
  - no `design-reference/notes.md`
  - `design-reference/source.json` exists
  - `status.json` preserved the original requested notes path and left copied notes path empty
  - `cursorPrompt.md` included the design-reference section and explicitly stated that no supplemental design notes file was attached
  - run reached `ready_for_cursor`

## Current Readiness Judgment

Phase 5 design-reference intake is functionally validated for normal usage and non-UI regression protection.

Current status:
- case 1: pass
- case 2: pass
- case 3: pass
- case 4: partial fail
- case 5: pass

Readiness:
- good enough for real UI start-run usage with guardrails
- not fully hardened yet, because invalid `referenceImagePath` does not return a structured failure response

Recommended next hardening item:
- add a clean start-run failure response for `prepare-run.ps1` validation failures so operators receive structured error details instead of HTTP `200` with an empty body

---

## Narrow Hardening Pass: Case 4 Failure Response

### What changed

The `Webhook Dev Run v1` workflow was patched narrowly at the `prepare-run.ps1` boundary:
- `Execute Command` for `prepare-run.ps1` now uses `onError: continueRegularOutput`
- a new `Prepare Run Succeeded?` branch checks whether the node returned an `error`
- a new `Build Prepare Run Failure Response` Code node shapes a structured JSON failure body from the real `Execute Command` error text
- a new `Respond Prepare Run Failure` node returns that JSON with HTTP `422`

No valid-input success routing was changed.

### Why it changed

Invalid `referenceImagePath` already blocked run preparation correctly, but the workflow terminated before response shaping and returned HTTP `200` with an empty body. That made Case 4 hard to diagnose and was the only remaining hardening gap for Phase 5.

### Case 4 retest result

- result: pass
- HTTP status: `422`
- response body: structured JSON
- retest run: `run-1774042847130`

Observed response fields:
- `status = "failure"`
- `message = "Run preparation failed"`
- `reason = "referenceImagePath does not exist: C:\\dev\\PathOS\\n8n-lab\\incoming\\phase5-case4-missing-mockup.png"`
- `runId = "run-1774042847130"`
- `referenceImagePath = "C:\\dev\\PathOS\\n8n-lab\\incoming\\phase5-case4-missing-mockup.png"`
- `failureStage = "prepare_run"`
- `rawError` includes the original command error details

Artifact checks:
- no copied `design-reference/mockup.png`
- no copied `design-reference/source.json`
- no successful run prep occurred

### Updated readiness

Phase 5 is now fully hardened for the design-reference intake cases that were validated:
- case 1: pass
- case 2: pass
- case 3: pass
- case 4: pass
- case 5: pass

## Environment Notes

- `C:\dev\PathOS` is not a git repository
- root-level git status/diff/patch artifacts are therefore not available and were not fabricated
- no commit or push was performed
