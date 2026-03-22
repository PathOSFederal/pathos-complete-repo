# Day Phase 10 - Strict Targeted Worker Contract

## What changed

- Added run metadata support for:
  - `forceTargetedModification`
  - `allowedTargetFiles`
  - `noOpOnTargetFilesIsFailure`
- Updated `build-prompts.ps1` so targeted runs explicitly tell the worker:
  - already-dirty target files are valid implementation targets
  - analysis-only behavior does not satisfy the run
  - no-change outcomes must be justified against named inspected files
- Updated `invoke-cursor.ps1` so strict targeted runs only succeed when at least one allowed target file changes.

## Workflow changes

- Updated `Webhook Dev Run v1` export and live workflow so the new targeting fields flow from webhook input into `prepare-run.ps1`.
- Fixed the live n8n workflow pointer so `activeVersionId` now matches the updated workflow version.

## Verification

Live start-run probe:
- `run-1774055242643`
- `status.json` preserved the strict target metadata
- `cursorPrompt.md` included the strict target section

Worker success probe:
- `strict-target-worker-success-1774055261`
- allowed target file `README.md` changed
- `matchedTargetFiles = [\"README.md\"]`

Worker failure probe:
- `strict-target-worker-failure-1774055291`
- non-target file changed instead
- failure message: `no_target_surface_changes_detected`

## Why it matters

This closes the loophole where Claude could make a real attempt but still leave no required PathAdvisor-surface delta. For strict targeted runs, the pipeline now requires detectable edits on the intended surfaces rather than accepting generic repo activity.
