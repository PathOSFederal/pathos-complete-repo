# Day Phase 8 - Live Worker Telemetry

## What changed

- Hardened `invoke-cursor.ps1` so the implementation worker now writes first-class live telemetry artifacts during execution:
  - `worker-live.log`
  - `worker-events.jsonl`
  - `worker-status.json`
  - `repo-baseline.json`
  - `repo-delta.json`
- Added `get-run-live-status.ps1` so operators and workflows can inspect those artifacts in a single structured read.
- Preserved the existing worker stage and orchestrator shape, while adding the `get_run_live_status` action to the live orchestrator.

## Why it changed

The pipeline could previously tell whether a run eventually succeeded or failed, but it could not show what the worker was doing while it ran. That made active UI runs opaque and made dirty-repo attribution ambiguous.

This phase adds explicit run-scoped telemetry so operators can inspect:
- whether the worker is still alive
- the latest live output lines
- the baseline dirty-file set
- which files changed relative to that baseline

## Implementation notes

- Fixed the stdout/stderr polling bug by reading redirected files with `FileShare.ReadWrite`.
- Fixed change detection so edits to already-dirty files are detected by comparing pre-run and live file fingerprints.
- Normalized the worker exit-code handling so successful Claude JSON output is not misclassified if the process object fails to surface a numeric exit code cleanly.

## Verification

Disposable telemetry probe:
- root: `C:\\dev\\PathOS\\n8n-lab\\tmp\\telemetry-probe-1774052550`
- result: pass
- actual repo edit detected: `README.md`
- telemetry artifacts present and readable:
  - `worker-live.log`
  - `worker-events.jsonl`
  - `worker-status.json`
  - `repo-baseline.json`
  - `repo-delta.json`
  - `cursor-execution.json`

Key result:
- the worker now reports success only when a real repo edit is detected
- live telemetry artifacts are available during and after execution

## Remaining risk

- The current worker bridge still records coarse live progress, not semantic "currently editing file X" events from Claude itself.
- For richer live introspection, a future pass should parse more structured Claude output if the CLI exposes it consistently.
