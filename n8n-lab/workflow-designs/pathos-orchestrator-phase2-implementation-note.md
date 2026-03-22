# PathOS Orchestrator Phase 2 Implementation Note

This note describes the current Phase 2 `pathos-orchestrator` structure node by node.

Source of truth:
- [pathos-orchestrator.json](/C:/dev/PathOS/n8n-lab/workflow-exports/baseline-working/pathos-orchestrator.json)

## Node Flow

### 1. `Webhook`

Purpose:
- receives the incoming POST request at `pathos-orchestrator`
- passes the raw request into the workflow

Important setting:
- Response mode is `responseNode`, so the workflow must terminate through a
  `Respond to Webhook` node

### 2. `Normalize Input`

Purpose:
- reads the request payload from `$json.body.*`
- copies the fields the orchestrator needs into a flat packet

Fields normalized:
- `repoPath`
- `goal`
- `dayNumber`
- `branchName`
- `taskTitle`
- `action`
- `notes`
- `runId`
- `decision`
- `reviewNote`

Teaching-level pseudo-code:

```javascript
// Flatten the request body into top-level fields once so later nodes do not
// need to remember where Webhook placed the payload.
// This reduces branching mistakes and keeps downstream expressions simple.
const packet = {
  repoPath: $json.body.repoPath,
  goal: $json.body.goal,
  dayNumber: $json.body.dayNumber,
  branchName: $json.body.branchName,
  taskTitle: $json.body.taskTitle,
  action: $json.body.action,
  notes: $json.body.notes,
  runId: $json.body.runId,
  decision: $json.body.decision,
  reviewNote: $json.body.reviewNote,
};
```

### 3. `Switch`

Purpose:
- routes the normalized packet to exactly one child workflow based on `action`

Current routes:
- `start_run`
- `apply_review_decision`
- `build_codex_handoff`

Current limitation:
- the baseline export has no explicit default branch for unsupported actions

### 4. `Start Run Request`

Purpose:
- calls the existing dev-run child workflow

Target:
- `http://localhost:5678/webhook/pathos-dev-run`

Request body:
- `repoPath`
- `branchName`
- `goal`
- `dayNumber`
- `taskTitle`
- `notes`

### 5. `Review Decision Request`

Purpose:
- calls the existing review-decision child workflow

Target:
- `http://localhost:5678/webhook/pathos-review-decision`

Request body:
- `runId`
- `decision`
- `reviewNote`

### 6. `Codex Handof Request`

Purpose:
- calls the existing Codex handoff child workflow

Target:
- `http://localhost:5678/webhook/pathos-codex-handoff`

Request body:
- `runId`
- `notes`

### 7. `Respond Orchestrator`

Purpose:
- wraps the child workflow response in the orchestrator success envelope

Current response body:

```javascript
// Keep the child workflow payload intact inside `data` so the caller can still
// inspect run IDs, messages, and status fields returned by the underlying flow.
// Echo the normalized action so the caller can confirm which route was taken.
{
  status: "success",
  action: $("Normalize Input").item.json.action,
  data: $json
}
```

## Current Behavior Summary

- All normal requests enter through one webhook
- The orchestrator normalizes the payload once
- Routing happens only by `action`
- The child workflow does the actual work
- The orchestrator wraps the success response

## Hardening Note

For Phase 2 hardening, the most important missing guard is explicit unsupported-action handling.
