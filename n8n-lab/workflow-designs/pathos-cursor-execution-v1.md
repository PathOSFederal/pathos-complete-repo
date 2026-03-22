# PathOS Cursor Execution v1

This file exists as the workflow design packet and implementation note for the next
stage of the PathOS n8n lab pipeline.

It documents the exact n8n node plan needed to insert an automated Cursor stage
after run preparation without breaking the currently proven child workflows:
- `Webhook Dev Run v1`
- `PathOS Review Decision v1`
- `PathOS Codex Handoff v1`
- `pathos-orchestrator`

It also documents the status-machine update that this workflow introduces.

## Why This Workflow Exists

The current lab flow already prepares a run package and can later build a Codex
handoff. What is missing is the execution step between those states.

`PathOS Cursor Execution v1` exists to:
- accept a webhook request for a prepared run
- verify the run is legally ready for Cursor work
- execute `invoke-cursor.ps1`
- record deterministic execution artifacts
- route UI work to visual approval
- route non-UI work directly to Codex handoff readiness

## Owned Files

- `C:\dev\PathOS\n8n-lab\scripts\invoke-cursor.ps1`
- `C:\dev\PathOS\n8n-lab\runs\<runId>\cursor-execution.json`
- `C:\dev\PathOS\n8n-lab\runs\<runId>\cursor-result.md`

## Status-Machine Update

Add or document these states in the n8n-lab plan:
- `cursor_in_progress`
- `awaiting_visual_approval`
- `ready_for_codex`
- `codex_in_progress`
- `codex_review_complete`

### Transition Rules

1. Prep remains unchanged:
   - `initialized` -> `ready_for_cursor`

2. Cursor execution adds an explicit in-flight state:
   - `ready_for_cursor` -> `cursor_in_progress`

3. Cursor completion becomes the routing point:
   - if `requiresVisualApproval == "true"` or `workType == "ui"`:
     `cursor_in_progress` -> `awaiting_visual_approval`
   - otherwise:
     `cursor_in_progress` -> `ready_for_codex`

4. Review approval for UI work becomes:
   - `awaiting_visual_approval` -> `ready_for_codex`

5. Codex stage should be documented as:
   - `ready_for_codex` -> `codex_in_progress` -> `codex_review_complete`

### Compatibility Note

`apply-review-decision.ps1` now accepts review decisions from either:
- `ready_for_cursor`
- `awaiting_visual_approval`

That keeps previously proven behavior valid while enabling the new Cursor-first UI path.

## Exact n8n Workflow-Node Plan

Workflow name: `PathOS Cursor Execution v1`

Webhook path suggestion: `pathos-cursor-execution`

Response mode: `Last Node`

### Node 1: Webhook

Type: `Webhook`

Settings:
- HTTP Method: `POST`
- Path: `pathos-cursor-execution`
- Response Mode: `Using Respond to Webhook Node`
- JSON/RAW Parameters: JSON

Expected request body:

```json
{
  "runId": "run-1773958541586",
  "runsRoot": "C:\\dev\\PathOS\\n8n-lab\\runs",
  "runPath": "C:\\dev\\PathOS\\n8n-lab\\runs\\run-1773958541586",
  "repoPath": "C:\\dev\\PathOS\\apps\\pathos-platform\\frontend"
}
```

### Node 2: Normalize Request

Type: `Set`

Mode: Keep Only Set

Fields to set:

```json
{
  "runId": "={{$json.body.runId || $json.runId}}",
  "runsRoot": "={{$json.body.runsRoot || $json.runsRoot || 'C:\\\\dev\\\\PathOS\\\\n8n-lab\\\\runs'}}",
  "runPath": "={{$json.body.runPath || $json.runPath || ($json.body.runsRoot || $json.runsRoot || 'C:\\\\dev\\\\PathOS\\\\n8n-lab\\\\runs') + '\\\\' + ($json.body.runId || $json.runId)}}",
  "repoPath": "={{$json.body.repoPath || $json.repoPath}}",
  "workflowName": "PathOS Cursor Execution v1",
  "requestedAt": "={{$now}}"
}
```

Why this node exists:
- It gives every downstream node one normalized packet shape.
- It prevents later nodes from mixing webhook-body and top-level references.

### Node 3: Read Status File

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

Why this node exists:
- It loads the legal source of truth before any transition happens.

### Node 4: Validate Legal Current State

Type: `IF`

Condition:
- String
- Value 1: `={{$json.currentStatus.runStatus}}`
- Operation: `equal`
- Value 2: `ready_for_cursor`

True branch:
- continue to Cursor start

False branch:
- return a controlled error response

Why this node exists:
- It protects existing workflows from duplicate or out-of-order execution.

### Node 5: Mark Cursor In Progress

Type: `Execute Command`

Command:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\dev\PathOS\n8n-lab\scripts\update-run-status.ps1" -RunId "{{$json.runId}}" -RunsRoot "{{$json.runsRoot}}" -NewStatus "cursor_in_progress" -ReviewStatus "{{$json.currentStatus.reviewStatus || 'pending'}}" -StatusNote "Cursor execution started by PathOS Cursor Execution v1."
```

Why this node exists:
- It creates an explicit in-flight state before local execution begins.

### Node 6: Execute Cursor

Type: `Execute Command`

Command:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\dev\PathOS\n8n-lab\scripts\invoke-cursor.ps1" -RunId "{{$json.runId}}" -RunPath "{{$json.runPath}}" -RepoPath "{{$json.repoPath}}"
```

Important Execute Command settings:
- Continue On Fail: `true`
- Shell: default PowerShell host on the machine

Why this node exists:
- It runs the deterministic local Cursor stage.
- `Continue On Fail` is required so the workflow can branch on stdout/exit outcome and still update status/history on failures.

### Node 7: Parse Cursor Output

Type: `Set`

Mode: Keep Only Set

Fields to set:

```json
{
  "runId": "={{$('Normalize Request').item.json.runId}}",
  "runsRoot": "={{$('Normalize Request').item.json.runsRoot}}",
  "runPath": "={{$('Normalize Request').item.json.runPath}}",
  "repoPath": "={{$('Normalize Request').item.json.repoPath}}",
  "currentStatus": "={{$('Read Status File').item.json.currentStatus}}",
  "commandStdout": "={{$json.stdout || ''}}",
  "commandStderr": "={{$json.stderr || ''}}",
  "commandExitCode": "={{$json.exitCode}}",
  "cursorCompleted": "={{($json.stdout || '').includes('CURSOR_COMPLETED::' + $('Normalize Request').item.json.runId)}}",
  "cursorFailed": "={{($json.stdout || '').includes('CURSOR_FAILED::' + $('Normalize Request').item.json.runId) || Number($json.exitCode) !== 0}}"
}
```

Why this node exists:
- It converts raw command output into booleans that downstream branches can use cleanly.

### Node 8: Cursor Success?

Type: `IF`

Condition:
- Boolean
- Value 1: `={{$json.cursorCompleted}}`
- Operation: `is true`

True branch:
- success routing

False branch:
- failure routing

## Success Branch

### Node 9A: Route Target State

Type: `Set`

Mode: Keep Only Set

Fields to set:

```json
{
  "runId": "={{$json.runId}}",
  "runsRoot": "={{$json.runsRoot}}",
  "runPath": "={{$json.runPath}}",
  "repoPath": "={{$json.repoPath}}",
  "commandStdout": "={{$json.commandStdout}}",
  "commandExitCode": "={{$json.commandExitCode}}",
  "requiresVisualApproval": "={{$json.currentStatus.requiresVisualApproval || 'false'}}",
  "workType": "={{$json.currentStatus.workType || 'unknown'}}",
  "nextRunStatus": "={{(($json.currentStatus.requiresVisualApproval || '').toLowerCase() === 'true' || ($json.currentStatus.workType || '').toLowerCase() === 'ui') ? 'awaiting_visual_approval' : 'ready_for_codex'}}",
  "nextReviewStatus": "={{(($json.currentStatus.requiresVisualApproval || '').toLowerCase() === 'true' || ($json.currentStatus.workType || '').toLowerCase() === 'ui') ? ($json.currentStatus.reviewStatus || 'pending') : 'approved'}}",
  "nextAllowCodexHandoff": "={{(($json.currentStatus.requiresVisualApproval || '').toLowerCase() === 'true' || ($json.currentStatus.workType || '').toLowerCase() === 'ui') ? 'false' : 'true'}}"
}
```

Why this node exists:
- It makes the UI/non-UI routing decision explicit and testable.

### Node 10A: Update Status

Type: `Execute Command`

Command:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\dev\PathOS\n8n-lab\scripts\update-run-status.ps1" -RunId "{{$json.runId}}" -RunsRoot "{{$json.runsRoot}}" -NewStatus "{{$json.nextRunStatus}}" -ReviewStatus "{{$json.nextReviewStatus}}" -StatusNote "Cursor execution completed successfully. Routed to {{$json.nextRunStatus}}."
```

Why this node exists:
- It appends the state transition to both `status.json` and `status-history.json`.

### Node 11A: Persist allowCodexHandoff When Needed

Type: `Code`

Language: JavaScript

Code:

```javascript
const fs = require('fs');

const runPath = $json.runPath;
const statusPath = `${runPath}\\status.json`;
const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

status.allowCodexHandoff = $json.nextAllowCodexHandoff;

if ($json.nextRunStatus === 'ready_for_codex' && (!status.reviewStatus || status.reviewStatus === 'pending')) {
  status.reviewStatus = 'approved';
}

status.lastStatusTimestamp = new Date().toISOString();
status.lastStatusNote = `Cursor execution completed successfully. Routed to ${$json.nextRunStatus}.`;

fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));

return [{ json: { ...$json, statusPath } }];
```

Why this node exists:
- `update-run-status.ps1` handles run status and history well.
- This node performs the one extra field mutation needed for automatic non-UI routing without rewriting unrelated scripts.

### Node 12A: Respond Success

Type: `Respond to Webhook`

Status Code: `200`

Response Body:

```json
{
  "ok": true,
  "workflow": "PathOS Cursor Execution v1",
  "runId": "={{$json.runId}}",
  "runPath": "={{$json.runPath}}",
  "repoPath": "={{$json.repoPath}}",
  "runStatus": "={{$json.nextRunStatus}}",
  "reviewStatus": "={{$json.nextReviewStatus}}",
  "allowCodexHandoff": "={{$json.nextAllowCodexHandoff}}",
  "stdoutMarker": "={{$json.nextRunStatus === 'ready_for_codex' ? 'CURSOR_COMPLETED::' + $json.runId : 'CURSOR_COMPLETED::' + $json.runId}}"
}
```

## Failure Branch

### Node 9B: Mark Cursor Failed

Type: `Execute Command`

Command:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\dev\PathOS\n8n-lab\scripts\update-run-status.ps1" -RunId "{{$json.runId}}" -RunsRoot "{{$json.runsRoot}}" -NewStatus "cursor_failed" -ReviewStatus "{{$json.currentStatus.reviewStatus || 'pending'}}" -StatusNote "Cursor execution failed. Review cursor-execution.json and command output."
```

Why this node exists:
- It moves the run into an explicit failure state instead of incorrectly leaving it in progress.

### Node 10B: Respond Failure

Type: `Respond to Webhook`

Status Code: `500`

Response Body:

```json
{
  "ok": false,
  "workflow": "PathOS Cursor Execution v1",
  "runId": "={{$json.runId}}",
  "runPath": "={{$json.runPath}}",
  "repoPath": "={{$json.repoPath}}",
  "runStatus": "cursor_failed",
  "stdout": "={{$json.commandStdout}}",
  "stderr": "={{$json.commandStderr}}",
  "exitCode": "={{$json.commandExitCode}}",
  "expectedFailureMarker": "={{'CURSOR_FAILED::' + $json.runId}}"
}
```

## Orchestrator Integration Note

After `Webhook Dev Run v1` completes preparation and the run reaches `ready_for_cursor`,
the orchestrator should call `PathOS Cursor Execution v1` before any visual-review or
Codex-routing decision.

Routing after Cursor should be:
- UI or visual-gated work -> `awaiting_visual_approval`
- non-UI work -> `ready_for_codex`

## Smoke Test Plan

1. Create a fresh run through the existing prep workflow and confirm `runStatus=ready_for_cursor`.
2. Call `PathOS Cursor Execution v1` for a UI run where `workType=ui` and `requiresVisualApproval=true`.
3. Confirm stdout contains `CURSOR_COMPLETED::<runId>`.
4. Confirm these files exist in the run folder:
   - `cursor-execution.json`
   - `cursor-result.md`
   - `status.json`
   - `status-history.json`
5. Confirm the UI run now has:
   - `runStatus=awaiting_visual_approval`
   - `reviewStatus=pending`
   - `allowCodexHandoff=false`
6. Submit the existing `PathOS Review Decision v1` approval for that UI run.
7. Confirm the UI run moves to:
   - `runStatus=ready_for_codex`
   - `reviewStatus=approved`
8. Create a fresh non-UI run where `workType=backend` and `requiresVisualApproval=false`.
9. Call `PathOS Cursor Execution v1` for that non-UI run.
10. Confirm the non-UI run moves directly to:
    - `runStatus=ready_for_codex`
    - `reviewStatus=approved`
    - `allowCodexHandoff=true`
11. Call the existing `PathOS Codex Handoff v1` workflow for the non-UI run.
12. Confirm the Codex workflow still succeeds from `ready_for_codex`.

## Risks And Assumptions

- Assumption: the lab still does not have a real local Cursor automation bridge.
- Assumption: `status.json` remains the canonical source of routing metadata.
- Risk: the `Code` node that patches `allowCodexHandoff` writes `status.json` directly, so its field names must stay aligned with the existing schema.
- Risk: if the orchestrator still routes review directly from `ready_for_cursor`, UI runs will bypass the new Cursor stage unless the orchestrator is updated.
- Risk: once `cursor_failed` is active, any retry flow must explicitly decide whether to recover back to `ready_for_cursor` or execute directly from `cursor_failed`.
