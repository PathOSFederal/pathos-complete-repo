# Change Brief — Phase 6: Claude Worker Experiment

## Title

Replace the fake implementation bridge with a real Claude Code worker attempt behind the existing `execute_cursor` pipeline stage.

## Summary

The old implementation stage in the n8n pipeline was not real. It validated the run packet, wrote artifacts, and then reported success even though no Cursor session was launched and no repo files were changed.

This phase changes that.

The existing stage now uses Claude Code as the implementation worker experiment behind the same pipeline path. Success now means Claude Code actually ran and detectable repository changes were produced. If Claude cannot run, returns an error, or makes no detectable changes, the stage fails honestly instead of pretending implementation succeeded.

## Scope

- **In scope:**
  - replace placeholder-only behavior in `invoke-cursor.ps1`
  - invoke Claude Code CLI in non-interactive JSON mode
  - detect actual repo changes before reporting success
  - preserve existing pipeline shape and wrappers

- **Out of scope:**
  - renaming the whole `execute_cursor` pipeline path
  - redesigning child or orchestrator workflows unless needed
  - broad pipeline re-architecture

## What Changed

The implementation-worker script now:
- reads the generated run artifacts
- invokes Claude Code against the repo and run folder
- captures Claude’s JSON output
- compares repo change state before and after the run
- succeeds only when real changes are detected
- writes honest execution artifacts for both success and failure

## What Did Not Change

- `start_run`
- `apply_review_decision`
- `build_codex_handoff`
- orchestrator response wrapper shape
- child workflow routing structure

## Validation Status

Environment validation:
- Claude Code is installed locally
- Claude CLI supports a non-interactive JSON mode suitable for automation

Disposable proof:
- a temporary git repo was created
- the worker script was asked to append a marker to `README.md`
- Claude made the real edit
- the worker script detected the repo change and returned success honestly

That confirms the worker stage can now perform a real implementation attempt instead of only writing placeholder artifacts.

## Current Meaning Of Success

Success now means:
- Claude Code was actually invoked
- and detectable repo changes were produced

Failure now means:
- Claude Code could not run
- or it returned an error
- or it completed without producing detectable repo changes

## Why This Matters

The pipeline can no longer claim implementation success when no implementation occurred.

That restores trust in the `execute_cursor` stage without forcing a full pipeline redesign first. The naming is still temporary and a little misleading, but the worker behavior is now honest.

## Remaining Question

The script-layer experiment is proven. The next step is a focused live retest of the existing child workflow and orchestrator path to confirm the real Claude-backed worker behaves correctly end to end.

## Environment Note

`C:\dev\PathOS` is not a git repository, so root-level git diff and patch artifacts are not available here.
