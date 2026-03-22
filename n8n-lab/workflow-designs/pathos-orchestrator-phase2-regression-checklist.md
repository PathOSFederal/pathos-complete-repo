# PathOS Orchestrator Phase 2 Regression Checklist

Use this checklist to confirm the orchestrator still behaves correctly for the
three supported actions and for unsupported input.

## Preconditions

- n8n is running on `http://localhost:5678`
- `pathos-orchestrator` is active
- child workflows are active:
  - `Webhook Dev Run v1`
  - `PathOS Review Decision v1`
  - `PathOS Codex Handoff v1`

## 1. Regression: `start_run`

Send:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/pathos-orchestrator" -ContentType "application/json" -Body (@{
  action = "start_run"
  repoPath = "C:\dev\PathOS\apps\pathos-platform\frontend"
  branchName = "feature/orchestrator-phase2-regression"
  goal = "Regression test orchestrator start_run"
  dayNumber = "76"
  taskTitle = "Orchestrator start_run regression"
  notes = "Phase 2 orchestrator regression"
} | ConvertTo-Json)
```

Verify:
- response contains `"status": "success"`
- response contains `"action": "start_run"`
- response contains `data.runId`
- new run folder exists under `C:\dev\PathOS\n8n-lab\runs`

## 2. Regression: `apply_review_decision`

Precondition:
- pick a run currently waiting for review

Send:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/pathos-orchestrator" -ContentType "application/json" -Body (@{
  action = "apply_review_decision"
  runId = "run-1773958541586"
  decision = "approve"
  reviewNote = "Phase 2 orchestrator approval regression"
} | ConvertTo-Json)
```

Verify:
- response contains `"status": "success"`
- response contains `"action": "apply_review_decision"`
- target run `status.json` updates as expected
- no direct child workflow call was needed by the operator

## 3. Regression: `build_codex_handoff`

Precondition:
- pick a run that is legally ready for Codex handoff

Send:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/pathos-orchestrator" -ContentType "application/json" -Body (@{
  action = "build_codex_handoff"
  runId = "run-1773955490596"
  notes = "Phase 2 orchestrator Codex handoff regression"
} | ConvertTo-Json)
```

Verify:
- response contains `"status": "success"`
- response contains `"action": "build_codex_handoff"`
- `codexHandoff.md` exists in the run folder
- `status.json.runStatus` becomes `codex_handoff_built`

## 4. Regression: Unsupported Action

Send:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:5678/webhook/pathos-orchestrator" -ContentType "application/json" -Body (@{
  action = "not_a_real_action"
} | ConvertTo-Json)
```

Verify:
- response contains `"status": "error"`
- response echoes the attempted `action`
- response includes a clear error reason in `message`

## 5. Payload Normalization Check

For each regression above, confirm the request body was accepted from the
normal POST JSON payload shape and did not require top-level pre-normalized n8n fields.

## 6. Final Pass Criteria

Phase 2 orchestrator regression is acceptable only if:
- all three supported actions still work through the orchestrator
- the response wrapper is consistent
- unsupported actions fail cleanly
- direct child workflows remain optional debugging tools, not required operator entry points
