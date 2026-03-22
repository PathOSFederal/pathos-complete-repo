# Retest Plan — Phase 6: Claude Worker Experiment

## Purpose

Verify that the existing implementation-worker stage no longer reports placeholder success and now uses Claude Code as a real implementation worker behind the existing `execute_cursor` pipeline path.

## Scope

- `C:\dev\PathOS\n8n-lab\scripts\invoke-cursor.ps1`
- existing child workflow path `POST /webhook/pathos-cursor-execution`
- existing orchestrator action `execute_cursor`

No workflow shape changes are required for this experiment. The worker behavior changed behind the existing stage.

## Retest 1: Disposable script-level success probe

### Setup

- create a disposable git repo outside the real frontend repo
- create a disposable run folder with:
  - `cursorPrompt.md`
  - `task.md`
  - `status.json`

### Prompt

- instruct Claude Code to append a unique marker line to `README.md`

### Expected result

- `invoke-cursor.ps1` exits `0`
- `cursor-execution.json` shows:
  - `executionMode = claude_code_cli`
  - `implementationAttempted = true`
  - `succeeded = true`
  - `changedFiles` includes `README.md`
- the disposable repo actually changes
- `cursor-result.md` reports real implementation success, not placeholder success

## Retest 2: Direct child workflow failure remains truthful

### Setup

- use a valid `ready_for_cursor` run
- intentionally force the worker to fail in a controlled way if needed, for example:
  - missing required prompt artifact, or
  - use a repo path that cannot be used safely, or
  - use a no-op prompt in a disposable repo and require detectable edits

### Expected result

- child workflow returns structured JSON failure
- run moves to `cursor_failed`
- response includes real failure details from Claude execution or edit-detection logic
- `cursor-execution.json` and `cursor-result.md` remain honest

## Retest 3: Direct child workflow success only after real implementation

### Setup

- use a disposable or low-risk real run where code changes are acceptable
- ensure the repo starts in a known baseline

### Expected result

- `execute_cursor` returns success only if the worker both:
  - completes successfully
  - produces detectable repo changes
- status advances to:
  - `awaiting_visual_approval` for UI
  - `ready_for_codex` for non-UI

### Failure condition

- if Claude runs but produces no detectable repo changes, the stage must fail and must not advance to a success state

## Retest 4: Orchestrator wrapper remains valid

### Request

```json
{
  "action": "execute_cursor",
  "runId": "<runId>"
}
```

### Expected success wrapper

```json
{
  "status": "success",
  "action": "execute_cursor",
  "data": {
    "status": "success",
    "runId": "<runId>",
    "nextStatus": "awaiting_visual_approval | ready_for_codex"
  }
}
```

### Expected failure wrapper

```json
{
  "status": "failure",
  "action": "execute_cursor",
  "data": {
    "status": "failure",
    "runId": "<runId>",
    "nextStatus": "cursor_failed",
    "stdout": "...",
    "stderr": "...",
    "exitCode": "..."
  }
}
```

## Retest 5: Real-feature guarded trial

### Candidate

- rerun the PathAdvisor canonical workspace stabilization task only after explicit operator approval

### Expected result

- the worker stage should either:
  - produce real frontend repo edits and then advance, or
  - fail honestly without claiming implementation success

### Must verify

- actual changed frontend files exist
- changes align with the design-reference run artifacts
- the stage no longer claims success without implementation evidence

## Readiness Gate

The experiment should be considered credible only if:
- script-level disposable success is proven
- live pipeline failure path stays truthful
- live pipeline success path requires detectable repo changes
- orchestrator wrapping remains intact
