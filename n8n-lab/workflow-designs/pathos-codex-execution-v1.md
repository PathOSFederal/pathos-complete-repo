# PathOS Codex Execution v1

This file exists as the implementation guidance packet for the new Codex
execution stage in the PathOS n8n lab pipeline.

It is intentionally designed to keep the existing `PathOS Codex Handoff v1`
workflow intact while adding the next automation step after the handoff is ready.

## Why This Workflow Exists

The current lab can already:
- prepare a run
- collect review decisions
- build a Codex handoff packet

What it cannot yet do is execute the Codex stage after the handoff exists.

`PathOS Codex Execution v1` fills that gap by:
- validating the run is in a legal Codex-start state
- building the handoff first if needed
- running `invoke-codex.ps1`
- writing the expected execution artifacts
- updating the run to `codex_review_complete` on success
- returning a clean JSON response with clear failure paths

## New Script

- [invoke-codex.ps1](/C:/dev/PathOS/n8n-lab/scripts/invoke-codex.ps1)

## Owned Artifacts

After successful Codex execution, the run folder should contain:
- `status.json`
- `status-history.json`
- `codexHandoff.md`
- `codex-execution.json`
- `codexReview.md`

## Recommended Status Transitions

Recommended state machine for the Codex stage:

1. `ready_for_codex`
2. `codex_handoff_built`
3. `codex_in_progress`
4. `codex_review_complete`

### Transition Rules

- If current state is `ready_for_codex`:
  - build `codexHandoff.md` first
  - then move to `codex_in_progress`
  - then execute Codex
  - then move to `codex_review_complete`

- If current state is `codex_handoff_built`:
  - skip the handoff-builder child workflow
  - move to `codex_in_progress`
  - execute Codex
  - move to `codex_review_complete`

- If current state is already `codex_review_complete`:
  - return a controlled no-op or error response

- For any other state:
  - return a controlled error response

## Exact Workflow Plan

Workflow name: `PathOS Codex Execution v1`

Webhook path suggestion: `pathos-codex-execution`

Response mode: `Using Respond to Webhook Node`

## Node 1: Webhook

Type: `Webhook`

Settings:
- HTTP Method: `POST`
- Path: `pathos-codex-execution`
- Response Mode: `Using Respond to Webhook Node`
- JSON/RAW Parameters: JSON

Expected request body:

```json
{
  "runId": "run-1773958692544",
  "runsRoot": "C:\\dev\\PathOS\\n8n-lab\\runs",
  "runPath": "C:\\dev\\PathOS\\n8n-lab\\runs\\run-1773958692544",
  "repoPath": "C:\\dev\\PathOS\\apps\\pathos-platform\\frontend"
}
```

## Node 2: Normalize Packet

Type: `Set`

Mode: Keep Only Set

Fields:

```json
{
  "runId": "={{$json.body.runId || $json.runId}}",
  "runsRoot": "={{$json.body.runsRoot || $json.runsRoot || 'C:\\\\dev\\\\PathOS\\\\n8n-lab\\\\runs'}}",
  "runPath": "={{$json.body.runPath || $json.runPath || (($json.body.runsRoot || $json.runsRoot || 'C:\\\\dev\\\\PathOS\\\\n8n-lab\\\\runs') + '\\\\' + ($json.body.runId || $json.runId))}}",
  "repoPath": "={{$json.body.repoPath || $json.repoPath}}",
  "workflowName": "PathOS Codex Execution v1",
  "requestedAt": "={{$now}}"
}
```

## Node 3: Read Current Status

Type: `Code`

Language: JavaScript

Code:

```javascript
const fs = require('fs');

const runPath = $json.runPath;
const statusPath = `${runPath}\\status.json`;

if (!fs.existsSync(statusPath)) {
  throw new Error(`status.json not found: ${statusPath}`);
}

const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

return [
  {
    json: {
      ...$json,
      statusPath,
      currentStatus: status,
    },
  },
];
```

## Node 4: Validate Legal Start State

Type: `Switch`

Cases:
- `ready_for_codex`
- `codex_handoff_built`
- `codex_review_complete`

Default:
- illegal start state

## Branch A: Current State Is `ready_for_codex`

### Node A1: Call Existing Handoff Workflow

Type: `HTTP Request`

Method: `POST`

URL:

```text
http://localhost:5678/webhook/pathos-codex-handoff
```

Body:

```json
={{ {
  runId: $json.runId,
  runsRoot: $json.runsRoot
} }}
```

### Node A2: Check Handoff Response

Type: `IF`

Condition:
- String
- Value 1: `={{$json.status}}`
- Operation: `equal`
- Value 2: `success`

## Branch B: Current State Is `codex_handoff_built`

Skip the handoff child workflow and continue directly to execution.

## Shared Execution Path After Handoff Exists

### Node 5: Mark Codex In Progress

Type: `Execute Command`

Command:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\dev\PathOS\n8n-lab\scripts\update-run-status.ps1" -RunId "{{$json.runId}}" -RunsRoot "{{$json.runsRoot}}" -NewStatus "codex_in_progress" -ReviewStatus "approved" -StatusNote "Codex execution started by PathOS Codex Execution v1."
```

### Node 6: Execute Codex

Type: `Execute Command`

Command:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\dev\PathOS\n8n-lab\scripts\invoke-codex.ps1" -RunId "{{$json.runId}}" -RunPath "{{$json.runPath}}" -RepoPath "{{$json.repoPath}}"
```

Important settings:
- `Continue On Fail = true`

### Node 7: Parse Codex Output

Type: `Set`

Mode: Keep Only Set

Fields:

```json
{
  "runId": "={{$('Normalize Packet').item.json.runId}}",
  "runsRoot": "={{$('Normalize Packet').item.json.runsRoot}}",
  "runPath": "={{$('Normalize Packet').item.json.runPath}}",
  "repoPath": "={{$('Normalize Packet').item.json.repoPath}}",
  "commandStdout": "={{$json.stdout || ''}}",
  "commandStderr": "={{$json.stderr || ''}}",
  "commandExitCode": "={{$json.exitCode}}",
  "codexCompleted": "={{($json.stdout || '').includes('CODEX_COMPLETED::' + $('Normalize Packet').item.json.runId)}}",
  "codexFailed": "={{($json.stdout || '').includes('CODEX_FAILED::' + $('Normalize Packet').item.json.runId) || Number($json.exitCode) !== 0}}"
}
```

### Node 8: Codex Success?

Type: `IF`

Condition:
- Boolean
- Value 1: `={{$json.codexCompleted}}`
- Operation: `is true`

## Success Branch

### Node 9A: Update Status To `codex_review_complete`

Type: `Execute Command`

Command:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\dev\PathOS\n8n-lab\scripts\update-run-status.ps1" -RunId "{{$json.runId}}" -RunsRoot "{{$json.runsRoot}}" -NewStatus "codex_review_complete" -ReviewStatus "approved" -StatusNote "Codex execution completed successfully and codexReview.md was written."
```

### Node 10A: Respond Success

Type: `Respond to Webhook`

Status code: `200`

Response:

```json
={{
  {
    status: "success",
    workflow: "PathOS Codex Execution v1",
    runId: $json.runId,
    runPath: $json.runPath,
    repoPath: $json.repoPath,
    runStatus: "codex_review_complete",
    artifacts: {
      codexHandoffPath: $json.runPath + "\\codexHandoff.md",
      codexExecutionPath: $json.runPath + "\\codex-execution.json",
      codexReviewPath: $json.runPath + "\\codexReview.md"
    },
    stdoutMarker: "CODEX_COMPLETED::" + $json.runId
  }
}}
```

## Failure Branches

### Branch F1: Handoff Build Failure

Respond with `500`:

```json
={{
  {
    status: "error",
    workflow: "PathOS Codex Execution v1",
    action: "build_handoff_if_needed",
    data: {
      message: "Codex handoff workflow failed.",
      runId: $json.runId,
      childResponse: $json
    }
  }
}}
```

### Branch F2: Illegal Start State

Respond with `400`:

```json
={{
  {
    status: "error",
    workflow: "PathOS Codex Execution v1",
    action: "validate_current_state",
    data: {
      message: "Codex execution is not allowed from the current run status.",
      runId: $json.runId,
      runStatus: $json.currentStatus.runStatus
    }
  }
}}
```

### Branch F3: Already Complete

Respond with `200` no-op:

```json
={{
  {
    status: "success",
    workflow: "PathOS Codex Execution v1",
    runId: $json.runId,
    runStatus: "codex_review_complete",
    message: "Codex review is already complete. No action was taken."
  }
}}
```

### Branch F4: Codex Command Failure

### Node 9B: Reset To Stable Retry State

Command:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\dev\PathOS\n8n-lab\scripts\update-run-status.ps1" -RunId "{{$json.runId}}" -RunsRoot "{{$json.runsRoot}}" -NewStatus "codex_handoff_built" -ReviewStatus "approved" -StatusNote "Codex execution failed. Review codex-execution.json and command output."
```

### Node 10B: Respond Execution Failure

Type: `Respond to Webhook`

Status code: `500`

Response:

```json
={{
  {
    status: "error",
    workflow: "PathOS Codex Execution v1",
    action: "execute_codex",
    data: {
      message: "Codex execution failed.",
      runId: $json.runId,
      runPath: $json.runPath,
      stdout: $json.commandStdout,
      stderr: $json.commandStderr,
      exitCode: $json.commandExitCode,
      expectedFailureMarker: "CODEX_FAILED::" + $json.runId
    }
  }
}}
```

## Exact Smoke Test Commands

### Build handoff for a run that is at `ready_for_codex`

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/pathos-codex-handoff" -ContentType "application/json" -Body (@{
  runId = "run-1773955490596"
  runsRoot = "C:\dev\PathOS\n8n-lab\runs"
} | ConvertTo-Json)
```

### Execute the new Codex workflow for a run that already has `codexHandoff.md`

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/pathos-codex-execution" -ContentType "application/json" -Body (@{
  runId = "run-1773958692544"
  runsRoot = "C:\dev\PathOS\n8n-lab\runs"
  runPath = "C:\dev\PathOS\n8n-lab\runs\run-1773958692544"
  repoPath = "C:\dev\PathOS\apps\pathos-platform\frontend"
} | ConvertTo-Json)
```

### Execute the script directly

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\dev\PathOS\n8n-lab\scripts\invoke-codex.ps1" -RunId "run-1773958692544" -RunPath "C:\dev\PathOS\n8n-lab\runs\run-1773958692544" -RepoPath "C:\dev\PathOS\apps\pathos-platform\frontend"
```

### Verify final status

```powershell
Get-Content "C:\dev\PathOS\n8n-lab\runs\run-1773958692544\status.json"
```

### Verify expected artifacts

```powershell
Get-ChildItem "C:\dev\PathOS\n8n-lab\runs\run-1773958692544" | Where-Object { $_.Name -in @('codexHandoff.md','codex-execution.json','codexReview.md','status.json','status-history.json') } | Select-Object Name,Length,LastWriteTime
```

## Expected Artifact Files After Success

- `codexHandoff.md`
- `codex-execution.json`
- `codexReview.md`
- `status.json`
- `status-history.json`

Expected success indicators:
- `status.json.runStatus = codex_review_complete`
- stdout contains `CODEX_COMPLETED::<runId>`

## Risks And Assumptions

- Assumption: the lab still does not have a live Codex automation bridge, so `invoke-codex.ps1` writes placeholder outputs by design.
- Assumption: `PathOS Codex Handoff v1` remains the only workflow responsible for building `codexHandoff.md`.
- Risk: existing smoke tests currently assert `codex_handoff_built`; once the execution workflow is added, new tests should assert `codex_review_complete` after Codex execution, not after handoff generation.
- Risk: if the orchestrator is updated to call `PathOS Codex Execution v1`, its continuation logic must treat `codex_handoff_built` as execution-ready compatibility state, not final-review-ready state.
