# PathOS Orchestrator API Contract

This file defines the Phase 2 API contract for `pathos-orchestrator`.

## Purpose

`pathos-orchestrator` is the intended single webhook entry point for the working
Phase 2 n8n development pipeline.

Direct child workflows still exist and remain useful for debugging, but they are
not the normal interface.

## Webhook

- Method: `POST`
- Path: `http://localhost:5678/webhook/pathos-orchestrator`
- Payload source: `{{$json.body.*}}`

## Supported Actions

- `start_run`
- `apply_review_decision`
- `build_codex_handoff`

Any other action must be treated as unsupported and return an error response.

## Input Normalization Rules

The orchestrator must normalize incoming request values from `body`, not from
top-level fields.

Expected normalized fields:
- `action`
- `repoPath`
- `goal`
- `dayNumber`
- `branchName`
- `taskTitle`
- `notes`
- `runId`
- `decision`
- `reviewNote`

Teaching-level pseudo-code:

```javascript
// Read from body because the Webhook node places the request JSON there.
// This keeps the orchestrator stable even if upstream callers send raw JSON
// instead of pre-normalized n8n packets.
const normalized = {
  action: $json.body.action,
  repoPath: $json.body.repoPath,
  goal: $json.body.goal,
  dayNumber: $json.body.dayNumber,
  branchName: $json.body.branchName,
  taskTitle: $json.body.taskTitle,
  notes: $json.body.notes,
  runId: $json.body.runId,
  decision: $json.body.decision,
  reviewNote: $json.body.reviewNote,
};
```

## Request Contracts

### `start_run`

Required:
- `action`
- `repoPath`
- `branchName`
- `goal`
- `dayNumber`
- `taskTitle`

Optional:
- `notes`

Example:

```json
{
  "action": "start_run",
  "repoPath": "C:\\dev\\PathOS\\apps\\pathos-platform\\frontend",
  "branchName": "feature/day-76-real-run-orchestrated",
  "goal": "Refine dashboard header spacing and alignment",
  "dayNumber": "76",
  "taskTitle": "Dashboard header refinement",
  "notes": "Phase 2 orchestrator regression test"
}
```

### `apply_review_decision`

Required:
- `action`
- `runId`
- `decision`

Optional:
- `reviewNote`

Example:

```json
{
  "action": "apply_review_decision",
  "runId": "run-1773958541586",
  "decision": "approve",
  "reviewNote": "Approved through orchestrator regression test"
}
```

### `build_codex_handoff`

Required:
- `action`
- `runId`

Optional:
- `notes`

Example:

```json
{
  "action": "build_codex_handoff",
  "runId": "run-1773955490596",
  "notes": "Build Codex handoff through orchestrator"
}
```

## Response Contract

### Success Shape

```json
{
  "status": "success",
  "action": "<action>",
  "data": {
    "...": "child workflow response payload"
  }
}
```

### Error Shape

```json
{
  "status": "error",
  "action": "<action>",
  "message": "<reason>"
}
```

## Response Semantics

- `status` tells the caller whether the orchestrator request succeeded.
- `action` must echo the normalized action the orchestrator routed.
- `data` is used only for success payloads.
- `message` is used only for error payloads.

## Child Workflow Routing

Action routing:
- `start_run` -> `http://localhost:5678/webhook/pathos-dev-run`
- `apply_review_decision` -> `http://localhost:5678/webhook/pathos-review-decision`
- `build_codex_handoff` -> `http://localhost:5678/webhook/pathos-codex-handoff`

## Unsupported Action Rule

If `action` is missing or not one of the supported values, the orchestrator
should return:

```json
{
  "status": "error",
  "action": "<received-action-or-empty>",
  "message": "Unsupported orchestrator action."
}
```
