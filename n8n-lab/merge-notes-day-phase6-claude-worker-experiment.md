# Merge Notes — Phase 6: Claude Worker Experiment

**Date:** 2026-03-20
**Phase:** day-phase6-claude-worker-experiment
**Status:** Implemented at script layer, disposable success probe passed, live pipeline retest still pending

---

## Summary

This phase replaces the old placeholder-only implementation worker behavior with a real Claude Code worker attempt behind the existing `execute_cursor` stage.

The pipeline shape was preserved:
- `pathos-orchestrator` unchanged
- `PathOS Cursor Execution v1` unchanged
- existing response wrappers unchanged

The worker implementation changed:
- old behavior: placeholder artifact writer with fake success
- new behavior: real Claude Code CLI invocation with honest success/failure semantics

## What the Old Stage Did

The previous `invoke-cursor.ps1`:
- validated the run packet
- wrote `cursor-result.md` and `cursor-execution.json`
- explicitly stated that no real Cursor session was launched
- explicitly stated that no repo files were modified
- still exited `0` and emitted success markers

That meant the child workflow advanced to `awaiting_visual_approval` or `ready_for_codex` even when no implementation had actually happened.

## What Changed

### Script updated

Changed file:
- `C:\dev\PathOS\n8n-lab\scripts\invoke-cursor.ps1`

New behavior:
- resolves Claude Code CLI from the local environment
- reads the run artifacts:
  - `cursorPrompt.md`
  - `task.md`
- invokes Claude Code in non-interactive `--print --output-format json` mode
- allows access to both:
  - the repo path
  - the run folder
- captures the Claude JSON result
- detects repo changes before and after execution
- only returns success when:
  - Claude execution completes successfully
  - and detectable repo changes were produced
- writes honest success/failure artifacts

### What did not change

- child workflow routing
- orchestrator wrapper
- status transition structure
- validation/failure response contracts
- capture wrapper script

## Environment Findings

Claude Code availability:
- `claude.cmd` exists at `C:\Users\comps\AppData\Roaming\npm\claude.cmd`
- version: `2.1.74 (Claude Code)`

Claude CLI capabilities confirmed:
- non-interactive mode via `--print`
- JSON output via `--output-format json`
- permission mode selection
- additional allowed directories via `--add-dir`

## Verification Performed

### Direct Claude CLI probe

From the frontend repo:
- command used a trivial prompt with `--print --output-format json`
- result: success
- output returned valid JSON

This confirmed Claude is not only installed, but callable in this environment.

### Disposable worker success probe

A disposable git repo and disposable run folder were created under:
- `C:\dev\PathOS\n8n-lab\tmp\claude-worker-success-probe-1774047086`

The disposable run asked Claude to append `PROBE_SUCCESS` to `README.md`.

Observed result:
- `invoke-cursor.ps1` exited `0`
- `README.md` was actually modified
- `cursor-execution.json` recorded:
  - `executionMode = claude_code_cli`
  - `implementationAttempted = true`
  - `succeeded = true`
  - `changedFiles = ["README.md"]`
- `workerSummary` reported the actual edit Claude made

This proves the stage can now perform a real implementation attempt and detect real file changes.

## Current Truthfulness Status

The fake-success behavior is removed at the worker-script layer.

Current semantics:
- success means Claude Code ran and detectable repo changes were produced
- failure means the worker could not run, returned an error, or produced no detectable repo changes

The stage is now truly automated at the worker-script layer, not placeholder-only.

## Is The Current Pipeline Still Worth Keeping?

Yes, experimentally.

Reason:
- the existing n8n pipeline shape can still provide value as a run-state and artifact coordinator
- the worker stage no longer has to be fake
- the key remaining question is live end-to-end reliability through the real child workflow and orchestrator paths

So the pipeline is still worth keeping for this experiment, but only if the focused live retests confirm the worker behavior stays truthful in the actual `execute_cursor` path.

## Files Changed

- `C:\dev\PathOS\n8n-lab\scripts\invoke-cursor.ps1`
- `C:\dev\PathOS\n8n-lab\test-plans\day-phase6-claude-worker-experiment.md`
- `C:\dev\PathOS\n8n-lab\merge-notes-day-phase6-claude-worker-experiment.md`
- `C:\dev\PathOS\docs\change-briefs\day-phase6-claude-worker-experiment.md`

## Files Not Changed

- `PathOS Cursor Execution v1` workflow JSON
- `pathos-orchestrator` workflow JSON
- `invoke-cursor-capture.ps1`

Reason:
- the live workflow already uses the worker script as the truth source
- the smallest viable experiment was to swap the worker behavior behind the existing stage

## Remaining Work

- run the focused retest plan against the live child workflow and orchestrator
- confirm that live `execute_cursor` now:
  - attempts real implementation
  - never reports false success
  - preserves wrapper contracts

## Environment Note

`C:\dev\PathOS` is not a git repository, so no root-level git outputs or patch artifacts are available.
