# Change Brief — Phase 4: v0 Design-Reference Intake

## Title

Make UI run packets carry first-class v0 design-reference artifacts before Cursor implementation begins.

## Summary

This phase teaches the PathOS pipeline to treat the v0 mockup screenshot as an input artifact for UI work, not as an output artifact. UI runs can now accept a reference image, optional design notes, and a design source label during `start_run`, copy those materials into the run folder under `design-reference/`, preserve the original and copied paths in metadata, and include that context in the generated Cursor prompt so the mockup becomes the explicit build target.

No new workflow was required. The change fits cleanly into the existing start-run pipeline.

## Scope

- **In scope:**
  - optional UI intake fields:
    - `referenceImagePath`
    - `designNotesPath`
    - `designSource`
  - copying design-reference artifacts into the run folder
  - preserving copied/original design-reference paths in `status.json`
  - updating prompt generation so Cursor is instructed to use the mockup as the UI target
  - forwarding the new intake fields through the existing start-run orchestrator path

- **Out of scope:**
  - implementation screenshot capture
  - UI verification screenshots
  - a new dedicated design-reference child workflow
  - changes to Cursor execution or Codex execution logic

## User Impact

- **Visible behavior changes:** Operators can now attach a v0 mockup image and optional notes directly when creating a UI run. Those files are copied into the run packet so the visual target travels with the run instead of living outside the pipeline.
- **Internal-only changes:** The run metadata now records both the original and copied design-reference paths. Prompt generation now includes a dedicated design-reference section that tells Cursor exactly where the reference files live and how to use them.

## Run Packet Contract

For UI work, `start_run` now supports these optional fields:

```json
{
  "referenceImagePath": "C:\\dev\\PathOS\\n8n-lab\\incoming\\saved-jobs-v0.png",
  "designNotesPath": "C:\\dev\\PathOS\\n8n-lab\\incoming\\saved-jobs-v0-notes.md",
  "designSource": "v0"
}
```

## Run Folder Layout

When design-reference inputs are provided, the run packet now contains:

```text
runs/<runId>/design-reference/
  mockup.png
  notes.md
  source.json
```

`notes.md` is optional and only appears when a valid notes file is available.

## Metadata Added

`status.json` now preserves:

- `referenceImagePathOriginal`
- `referenceImagePathCopied`
- `designNotesPathOriginal`
- `designNotesPathCopied`
- `designSource`

## Prompt Behavior

The Cursor prompt now explicitly says:

- the design-reference image is the implementation target
- it lives at `design-reference/mockup.png`
- optional notes live at `design-reference/notes.md`
- these are input/reference artifacts, not output artifacts
- Cursor should follow layout, grouping, spacing, hierarchy, and intended behavior implied by the mockup

This same context is also surfaced into the task and review artifacts so later stages can understand what UI target the run was built against.

## Validation Status

Implementation status:
- scripts updated
- existing dev-run workflow updated
- existing orchestrator forwarding confirmed
- no new workflow required

Smoke validation completed locally for one UI run packet with both a mockup image and notes file. That confirmed:
- artifact copy behavior
- metadata preservation
- prompt content updates

The full operator test matrix is documented in:
- `C:\dev\PathOS\n8n-lab\test-plans\day-phase4-v0-design-reference-intake.md`

Full webhook validation status:
- UI run with reference image only: pass
- UI run with reference image and notes: pass
- non-UI run with no design-reference fields: pass
- invalid `referenceImagePath`: pass
- missing optional `designNotesPath`: pass

Hardening follow-up completed:
- invalid design-reference input now returns a structured JSON failure body
- HTTP status now returns `422` for invalid `referenceImagePath`

So this phase is now validated and hardened for the tested intake matrix, and is ready for real UI start_run usage.

## Risks And Follow-Up

- This phase assumes the supplied `referenceImagePath` is a local file the n8n host can read.
- Missing optional notes do not fail the run; that is intentional, but operators should know the prompt will explicitly state that no notes file was attached.
- The pipeline still does not yet include first-class implementation screenshot capture or structured UI comparison. That remains a later verification phase, not part of this intake phase.
- `C:\dev\PathOS` is not a git repository, so root-level git diff and patch artifacts are not available here.
