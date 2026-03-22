# Test Plan — Phase 4: v0 Design-Reference Intake

## Purpose

Validate that UI run intake now supports first-class design-reference artifacts for v0 mockups without breaking existing non-UI run preparation.

## Scope

- `prepare-run.ps1`
- `build-prompts.ps1`
- `Webhook Dev Run v1`
- `pathos-orchestrator` start-run forwarding

No new workflow is required for this phase. The design-reference intake is handled inside the existing start-run path.

## Case 1: UI run with reference image only

### Request body

```json
{
  "action": "start_run",
  "taskTitle": "Implement Saved Jobs layout refresh",
  "goal": "Match the new v0 mockup for Saved Jobs",
  "workType": "ui",
  "requiresVisualApproval": true,
  "referenceImagePath": "C:\\dev\\PathOS\\n8n-lab\\incoming\\saved-jobs-v0.png",
  "designSource": "v0"
}
```

### Expected run-folder outputs

- `runs/<runId>/design-reference/mockup.png`
- `runs/<runId>/design-reference/source.json`
- no `runs/<runId>/design-reference/notes.md`

### Expected metadata updates

- `referenceImagePathOriginal` = original incoming image path
- `referenceImagePathCopied` = `runs/<runId>/design-reference/mockup.png`
- `designNotesPathOriginal` = `""`
- `designNotesPathCopied` = `""`
- `designSource` = `v0`

### Expected prompt changes

- `cursorPrompt.md` includes a design-reference section
- the prompt explicitly says the mockup is the UI target
- the prompt points Cursor to `design-reference/mockup.png`
- the prompt explicitly says the design-reference files are input artifacts, not output artifacts

### Expected behavior

- request succeeds
- run reaches normal prepared state
- prompt generation succeeds

## Case 2: UI run with reference image and notes

### Request body

```json
{
  "action": "start_run",
  "taskTitle": "Implement Saved Jobs layout refresh",
  "goal": "Match the new v0 mockup for Saved Jobs",
  "workType": "ui",
  "requiresVisualApproval": true,
  "referenceImagePath": "C:\\dev\\PathOS\\n8n-lab\\incoming\\saved-jobs-v0.png",
  "designNotesPath": "C:\\dev\\PathOS\\n8n-lab\\incoming\\saved-jobs-v0-notes.md",
  "designSource": "v0"
}
```

### Expected run-folder outputs

- `runs/<runId>/design-reference/mockup.png`
- `runs/<runId>/design-reference/notes.md`
- `runs/<runId>/design-reference/source.json`

### Expected metadata updates

- `referenceImagePathOriginal` = original incoming image path
- `referenceImagePathCopied` = `runs/<runId>/design-reference/mockup.png`
- `designNotesPathOriginal` = original incoming notes path
- `designNotesPathCopied` = `runs/<runId>/design-reference/notes.md`
- `designSource` = `v0`

### Expected prompt changes

- `cursorPrompt.md` includes the design-reference section
- the prompt points Cursor to both:
  - `design-reference/mockup.png`
  - `design-reference/notes.md`
- the prompt tells Cursor to follow layout, grouping, spacing, hierarchy, and intended behavior implied by the mockup

### Expected behavior

- request succeeds
- run reaches normal prepared state
- prompt generation succeeds

## Case 3: Non-UI run with no design-reference fields

### Request body

```json
{
  "action": "start_run",
  "taskTitle": "Refactor saved jobs adapter",
  "goal": "Simplify adapter branching and preserve behavior",
  "workType": "backend",
  "requiresVisualApproval": false
}
```

### Expected run-folder outputs

- no `runs/<runId>/design-reference/` directory

### Expected metadata updates

- `referenceImagePathOriginal` = `""`
- `referenceImagePathCopied` = `""`
- `designNotesPathOriginal` = `""`
- `designNotesPathCopied` = `""`
- `designSource` = `""`

### Expected prompt changes

- no design-reference section in `cursorPrompt.md`
- no design-reference section in `task.md`

### Expected behavior

- request succeeds
- existing non-UI run behavior is unchanged

## Case 4: Invalid referenceImagePath

### Request body

```json
{
  "action": "start_run",
  "taskTitle": "Implement Saved Jobs layout refresh",
  "goal": "Match the new v0 mockup for Saved Jobs",
  "workType": "ui",
  "requiresVisualApproval": true,
  "referenceImagePath": "C:\\dev\\PathOS\\n8n-lab\\incoming\\missing-mockup.png",
  "designSource": "v0"
}
```

### Expected run-folder outputs

- no copied `design-reference/mockup.png`
- run preparation fails before a valid prepared packet is completed

### Expected metadata updates

- no final successful metadata write for the invalid attachment

### Expected prompt changes

- no design-reference prompt section should be generated for a failed run

### Expected behavior

- request fails cleanly
- error clearly indicates `referenceImagePath` does not exist

## Case 5: Optional designNotesPath missing

### Request body

```json
{
  "action": "start_run",
  "taskTitle": "Implement Saved Jobs layout refresh",
  "goal": "Match the new v0 mockup for Saved Jobs",
  "workType": "ui",
  "requiresVisualApproval": true,
  "referenceImagePath": "C:\\dev\\PathOS\\n8n-lab\\incoming\\saved-jobs-v0.png",
  "designNotesPath": "C:\\dev\\PathOS\\n8n-lab\\incoming\\missing-notes.md",
  "designSource": "v0"
}
```

### Expected run-folder outputs

- `runs/<runId>/design-reference/mockup.png`
- `runs/<runId>/design-reference/source.json`
- no `runs/<runId>/design-reference/notes.md`

### Expected metadata updates

- `referenceImagePathOriginal` = original incoming image path
- `referenceImagePathCopied` = `runs/<runId>/design-reference/mockup.png`
- `designNotesPathOriginal` = original requested notes path
- `designNotesPathCopied` = `""`
- `designSource` = `v0`

### Expected prompt changes

- `cursorPrompt.md` still includes the design-reference section
- the prompt explicitly says no supplemental notes file was attached

### Expected behavior

- request succeeds
- missing optional notes file does not fail the run

## Operator Notes

- Prefer testing through `pathos-orchestrator` with `action = "start_run"` so the full intake contract is exercised.
- After each successful run, inspect:
  - `status.json`
  - `cursorPrompt.md`
  - `task.md`
  - `design-reference/source.json`
- Because `C:\\dev\\PathOS` is not a git repository, there are no root-level git diff or patch artifacts for this phase.
