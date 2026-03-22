# PathOS Orchestrator Lifecycle Update v1

This file exists as the design and implementation packet for extending
`pathos-orchestrator` with fuller lifecycle control while preserving the current
working behavior.

## Scope

Add two new orchestrator actions:
- `start_full_pipeline`
- `continue_run`

Do not break existing actions:
- `start_run`
- `apply_review_decision`
- `build_codex_handoff`

Keep the orchestrator response contract unchanged:

```json
{
  "status": "success|error",
  "action": "<action>",
  "data": { ... }
}
```

## Current Reality To Preserve

Current proven path:
- `start_run` works through `pathos-orchestrator`
- `apply_review_decision` works through `pathos-orchestrator`
- `build_codex_handoff` works through `pathos-orchestrator`
- child workflows are already working
- smoke-tested status transitions are:
  - `ready_for_cursor`
  - `ready_for_codex`
  - `codex_handoff_built`

## New Orchestrator Goals

### `start_full_pipeline`

This action should:
1. create the run through the existing dev-run child workflow
2. invoke the Cursor execution child workflow automatically
3. stop at `awaiting_visual_approval` for UI/visual-gated work
4. otherwise continue toward Codex readiness

### `continue_run`

This action should:
1. inspect `status.json` for the provided `runId`
2. choose the next legal step
3. execute that step if auto-advance is legal
4. return a wrapped orchestrator response

## Recommended Files

### Add

- `C:\dev\PathOS\n8n-lab\scripts\inspect-run-status.ps1`
- `C:\dev\PathOS\n8n-lab\workflow-designs\pathos-orchestrator-lifecycle-update-v1.md`

### Reuse Existing

- `C:\dev\PathOS\n8n-lab\scripts\invoke-cursor.ps1`
- `C:\dev\PathOS\n8n-lab\workflow-designs\pathos-cursor-execution-v1.md`
- existing child workflows:
  - `Webhook Dev Run v1`
  - `PathOS Cursor Execution v1`
  - `PathOS Review Decision v1`
  - `PathOS Codex Handoff v1`

### Optional Later

- a dedicated final-review child workflow once the lab moves beyond packet generation

## Helper Script Recommendation

Use `inspect-run-status.ps1` as the single read-only source for `continue_run`
decisioning.

Command:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\dev\PathOS\n8n-lab\scripts\inspect-run-status.ps1" -RunId "{{$json.runId}}" -RunsRoot "C:\dev\PathOS\n8n-lab\runs"
```

Why this helper should exist:
- it keeps run-state mapping out of large n8n expressions
- it centralizes compatibility handling for `codex_handoff_built`
- it gives the orchestrator one stable JSON inspection payload

## `continue_run` State Decision Table

| `runStatus` | orchestrator decision | automatic? | result |
|---|---|---:|---|
| `ready_for_cursor` | `invoke_cursor_execution` | yes | call `PathOS Cursor Execution v1` |
| `awaiting_visual_approval` | `wait_for_visual_approval` | no | return success/waiting payload |
| `ready_for_codex` | `invoke_codex_execution` | yes | call `PathOS Codex Execution v1` |
| `codex_review_complete` | `prepare_final_review` | yes | prepare/wrap final review stage |
| `codex_handoff_built` | `invoke_codex_execution` | yes, compatibility mode | treat as handoff-ready state for `PathOS Codex Execution v1` |
| anything else | `unsupported_status` | no | return error |

## Exact `pathos-orchestrator` Workflow Changes

Start from:
- [pathos-orchestrator.json](/C:/dev/PathOS/n8n-lab/workflow-exports/baseline-working/pathos-orchestrator.json)

### 1. Update `Normalize Input`

Keep existing fields.

Add these assignments:

```json
{
  "name": "runsRoot",
  "value": "={{ $json.body.runsRoot || 'C:\\\\dev\\\\PathOS\\\\n8n-lab\\\\runs' }}",
  "type": "string"
}
```

```json
{
  "name": "runPath",
  "value": "={{ $json.body.runPath }}",
  "type": "string"
}
```

```json
{
  "name": "repoPath",
  "value": "={{ $json.body.repoPath }}",
  "type": "string"
}
```

Note:
- `repoPath` already exists in the baseline. Keep it.
- `runsRoot` is needed for `continue_run`.

### 2. Expand `Switch`

Keep the three current action branches unchanged.

Add two more action routes:

```json
{
  "leftValue": "={{ $json.action }}",
  "rightValue": "start_full_pipeline",
  "operator": {
    "type": "string",
    "operation": "equals"
  }
}
```

```json
{
  "leftValue": "={{ $json.action }}",
  "rightValue": "continue_run",
  "operator": {
    "type": "string",
    "operation": "equals"
  }
}
```

Add a default/fallback output path for unsupported actions.

### 3. Add Unsupported-Action Response Path

New node: `Unsupported Action`

Type: `Respond to Webhook`

Status code: `400`

Response:

```json
={{ {
  status: "error",
  action: $("Normalize Input").item.json.action,
  data: {
    message: "Unsupported orchestrator action.",
    supportedActions: [
      "start_run",
      "start_full_pipeline",
      "continue_run",
      "apply_review_decision",
      "build_codex_handoff"
    ]
  }
} }}
```

Why:
- the baseline export has no explicit unsupported-action handling
- adding it makes the contract predictable

## Exact Nodes For `start_full_pipeline`

### Node A1: `Start Full Pipeline - Start Run`

Type: `HTTP Request`

Method: `POST`

URL:

```text
http://localhost:5678/webhook/pathos-dev-run
```

Body:

```json
={{ {
  repoPath: $json.repoPath,
  branchName: $json.branchName,
  goal: $json.goal,
  dayNumber: $json.dayNumber,
  taskTitle: $json.taskTitle,
  notes: $json.notes
} }}
```

### Node A2: `Start Full Pipeline - Normalize Start Response`

Type: `Set`

Keep only set: `true`

Fields:

```json
{
  "action": "start_full_pipeline",
  "startRunResponse": "={{$json}}",
  "runId": "={{$json.data?.runId || $json.runId}}",
  "runPath": "={{$json.data?.runPath || $json.runPath}}",
  "repoPath": "={{$json.data?.repoPath || $('Normalize Input').item.json.repoPath}}",
  "statusAfterStart": "={{$json.data?.runStatus || $json.runStatus}}"
}
```

### Node A3: `Start Full Pipeline - Invoke Cursor`

Type: `HTTP Request`

Method: `POST`

URL:

```text
http://localhost:5678/webhook/pathos-cursor-execution
```

Body:

```json
={{ {
  runId: $json.runId,
  runPath: $json.runPath,
  repoPath: $json.repoPath,
  runsRoot: $('Normalize Input').item.json.runsRoot
} }}
```

### Node A4: `Start Full Pipeline - Respond`

Type: `Respond to Webhook`

Status code: `200`

Response:

```json
={{ {
  status: "success",
  action: "start_full_pipeline",
  data: {
    startRun: $json.startRunResponse,
    cursor: $json,
    runId: $json.runId,
    runPath: $json.runPath,
    repoPath: $json.repoPath,
    runStatus: $json.runStatus,
    reviewStatus: $json.reviewStatus,
    autoAdvanced: true
  }
} }}
```

Behavior:
- UI work should end here with `runStatus=awaiting_visual_approval`
- non-UI work should end here with `runStatus=ready_for_codex`
- do not auto-call Codex from `start_full_pipeline`; let `continue_run` own continuation

Reason:
- it keeps `start_full_pipeline` simple and bounded
- it prevents hidden multi-step fanout in the first lifecycle action

## Exact Nodes For `continue_run`

### Node B1: `Continue Run - Inspect Status`

Type: `Execute Command`

Command:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\dev\PathOS\n8n-lab\scripts\inspect-run-status.ps1" -RunId "{{$json.runId}}" -RunsRoot "{{$json.runsRoot}}"
```

### Node B2: `Continue Run - Parse Inspection`

Type: `Code`

Language: JavaScript

Code:

```javascript
const stdout = $json.stdout || '';
const parsed = JSON.parse(stdout);

return [
  {
    json: {
      action: $('Normalize Input').item.json.action,
      inspection: parsed,
      runId: parsed.runId,
      runPath: parsed.runPath,
      nextOrchestratorAction: parsed.nextOrchestratorAction,
      runStatus: parsed.runStatus,
      normalizedRunStatus: parsed.normalizedRunStatus,
      supported: parsed.supported,
      reason: parsed.reason,
      compatibilityNote: parsed.compatibilityNote,
    },
  },
];
```

### Node B3: `Continue Run - Decision Switch`

Type: `Switch`

Cases:
- `invoke_cursor_execution`
- `wait_for_visual_approval`
- `invoke_codex_execution`
- `prepare_final_review`
- `unsupported_status`

## `continue_run` Branch Details

### Branch B3.1: `invoke_cursor_execution`

Node: `Continue Run - Call Cursor`

Type: `HTTP Request`

URL:

```text
http://localhost:5678/webhook/pathos-cursor-execution
```

Body:

```json
={{ {
  runId: $json.runId,
  runPath: $json.inspection.runPath,
  repoPath: $json.inspection.repoPath,
  runsRoot: $('Normalize Input').item.json.runsRoot
} }}
```

Then respond:

```json
={{ {
  status: "success",
  action: "continue_run",
  data: {
    decision: "invoke_cursor_execution",
    inspection: $json.inspection,
    result: $json
  }
} }}
```

### Branch B3.2: `wait_for_visual_approval`

No child workflow call.

Respond:

```json
={{ {
  status: "success",
  action: "continue_run",
  data: {
    decision: "wait_for_visual_approval",
    inspection: $json.inspection,
    message: "Run is waiting for visual approval. No automatic advance was performed."
  }
} }}
```

### Branch B3.3: `invoke_codex_execution`

Node: `Continue Run - Call Codex Execution`

Type: `HTTP Request`

URL:

```text
http://localhost:5678/webhook/pathos-codex-execution
```

Body:

```json
={{ {
  runId: $json.runId,
  runsRoot: $('Normalize Input').item.json.runsRoot,
  runPath: $json.inspection.runPath,
  repoPath: $json.inspection.repoPath
} }}
```

Then respond:

```json
={{ {
  status: "success",
  action: "continue_run",
  data: {
    decision: "invoke_codex_execution",
    inspection: $json.inspection,
    result: $json
  }
} }}
```

### Branch B3.4: `prepare_final_review`

Current recommendation:
- do not add a new child workflow yet
- return a wrapped success payload that says the run is ready for final-review preparation
- if `chatgptFinalReview.md` already exists, include that fact in the response

Recommended implementation node:

Type: `Code`

Code:

```javascript
const fs = require('fs');
const runPath = $json.inspection.runPath;
const finalReviewPath = `${runPath}\\chatgptFinalReview.md`;

return [
  {
    json: {
      decision: 'prepare_final_review',
      inspection: $json.inspection,
      finalReviewPath,
      finalReviewPacketExists: fs.existsSync(finalReviewPath),
    },
  },
];
```

Then respond:

```json
={{ {
  status: "success",
  action: "continue_run",
  data: {
    decision: "prepare_final_review",
    inspection: $json.inspection,
    finalReviewPath: $json.finalReviewPath,
    finalReviewPacketExists: $json.finalReviewPacketExists
  }
} }}
```

### Branch B3.5: `unsupported_status`

Respond with `400`:

```json
={{ {
  status: "error",
  action: "continue_run",
  data: {
    runId: $json.runId,
    runStatus: $json.runStatus,
    normalizedRunStatus: $json.normalizedRunStatus,
    message: "Run status is not supported by continue_run.",
    inspection: $json.inspection
  }
} }}
```

## Failure Response Rules

Use the same wrapper shape for every failure:

```json
{
  "status": "error",
  "action": "<action>",
  "data": {
    "message": "<human-readable reason>",
    "details": { ... }
  }
}
```

Recommended failure cases:

### Invalid or Unsupported Orchestrator Action

HTTP status: `400`

Payload:

```json
{
  "status": "error",
  "action": "<incoming action>",
  "data": {
    "message": "Unsupported orchestrator action.",
    "supportedActions": [
      "start_run",
      "start_full_pipeline",
      "continue_run",
      "apply_review_decision",
      "build_codex_handoff"
    ]
  }
}
```

### Missing `runId` For `continue_run`

HTTP status: `400`

Payload:

```json
{
  "status": "error",
  "action": "continue_run",
  "data": {
    "message": "runId is required for continue_run."
  }
}
```

### Missing or Unreadable `status.json`

HTTP status: `404`

Payload:

```json
{
  "status": "error",
  "action": "continue_run",
  "data": {
    "message": "Run status could not be loaded.",
    "details": {
      "runId": "<runId>"
    }
  }
}
```

### Child Workflow Failure

HTTP status: `500`

Payload:

```json
{
  "status": "error",
  "action": "<action>",
  "data": {
    "message": "Child workflow call failed.",
    "details": {
      "childWorkflow": "<workflow name>",
      "runId": "<runId>"
    }
  }
}
```

## Suggested Orchestrator Node Layout

Keep existing nodes:
- `Webhook`
- `Normalize Input`
- `Switch`
- `Start Run Request`
- `Review Decision Request`
- `Codex Handof Request`
- `Respond Orchestrator`

Add:
- `Unsupported Action`
- `Start Full Pipeline - Start Run`
- `Start Full Pipeline - Normalize Start Response`
- `Start Full Pipeline - Invoke Cursor`
- `Start Full Pipeline - Respond`
- `Continue Run - Inspect Status`
- `Continue Run - Parse Inspection`
- `Continue Run - Decision Switch`
- `Continue Run - Call Cursor`
- `Continue Run - Waiting Response`
- `Continue Run - Call Codex`
- `Continue Run - Prepare Final Review`
- `Continue Run - Unsupported Status Response`

## Smoke Test Sequence

1. Call `pathos-orchestrator` with `action=start_run` and confirm existing behavior is unchanged.
2. Call `pathos-orchestrator` with `action=apply_review_decision` and confirm existing behavior is unchanged.
3. Call `pathos-orchestrator` with `action=build_codex_handoff` and confirm existing behavior is unchanged.
4. Call `pathos-orchestrator` with `action=start_full_pipeline` for a UI run.
5. Confirm the wrapped response has:
   - `status=success`
   - `action=start_full_pipeline`
   - nested child data
6. Confirm the UI run lands in `awaiting_visual_approval`.
7. Call `pathos-orchestrator` with `action=continue_run` for that UI run.
8. Confirm it returns a waiting payload and does not auto-advance.
9. Approve the UI run through existing review flow.
10. Call `continue_run` again.
11. Confirm it invokes the Codex stage and the run reaches the current proven post-Codex state.
12. Call `start_full_pipeline` for a non-UI run.
13. Confirm it lands in `ready_for_codex`.
14. Call `continue_run` for that non-UI run.
15. Confirm it invokes the Codex stage.
16. Call `continue_run` for a run in `codex_handoff_built`.
17. Confirm it routes into Codex execution compatibility mode instead of final review.
18. Call `pathos-orchestrator` with an unknown action.
19. Confirm it returns the wrapped unsupported-action error.

## Risks And Assumptions

- Assumption: `status.json` remains the canonical state source for `n8n-lab`.
- Assumption: `PathOS Cursor Execution v1` is added before the new orchestrator actions are enabled.
- Assumption: the existing handoff child workflow still ends at `codex_handoff_built`, so `continue_run` needs a compatibility mapping from handoff-built to Codex execution readiness until full rollout is complete.
- Risk: the baseline orchestrator currently has no explicit default branch; adding one is necessary for predictable errors.
- Risk: if child workflow response shapes drift, `start_full_pipeline` normalization may need a small update.
- Risk: there is still no dedicated final-review child workflow, so `prepare_final_review` is currently a wrapped preparation response, not a full downstream execution step.
