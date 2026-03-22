# Change Brief — Phase 3: Cursor Execution Child Workflow

## Title

Make the "PathOS Cursor Execution v1" n8n child workflow operational and harden its response contracts.

## Summary

- This phase adds a working Cursor execution stage to the PathOS pipeline and hardens its response contracts for orchestrator integration. Before this change, the pipeline could start runs, collect review decisions, and build Codex handoffs, but the Cursor execution step in between was a broken skeleton. Now the workflow can receive a run, validate it, execute a simulated Cursor stage, and route the result based on whether the work needs visual approval.
- A hardening pass fixed four contract issues found during direct child-workflow testing: inconsistent field naming (`newStatus` vs `nextStatus`), failure paths returning HTTP 200, overly generic validation errors, and a missing `cursor-result.md` artifact on the failure path.
- The orchestrator now has a matching `execute_cursor` action that forwards `runId` to the live child workflow and returns the child response inside the existing orchestrator wrapper format.

## Scope

- **In scope:**
  - New PowerShell script (`validate-run-state.ps1`) that checks whether a run is eligible for Cursor execution
  - Updated n8n workflow JSON with 21 operational nodes covering all success and failure paths
  - Standardized response contracts: `nextStatus` on all terminal paths, HTTP 422/500 for failures, structured error bodies
  - `cursor-result.md` now written on both success and failure, completing the artifact contract
  - Four new pipeline statuses: `cursor_in_progress`, `awaiting_visual_approval` (post-Cursor), `ready_for_codex` (non-UI auto-approve), `cursor_failed`
  - New orchestrator action `execute_cursor` that routes to the child workflow and preserves the orchestrator wrapper response contract

- **Out of scope:**
  - Real Cursor IDE automation (intentionally simulated)
  - Changes to the orchestrator workflow
  - Changes to the existing start_run, review decision, or Codex handoff workflows
  - Changes to the platform frontend

## User Impact

- **Visible behavior changes:** An operator can now POST to `/webhook/pathos-cursor-execution` with a `runId` and receive a structured JSON response indicating whether the Cursor stage succeeded and what the run's next status is. Failures return non-200 HTTP status codes (422 for validation failures, 500 for execution failures). The run's `status.json` is updated automatically.
- **Internal-only changes:** The workflow validates run eligibility before doing any work. Failure paths produce structured JSON with specific error reasons, run status context, and relevant paths. The visual approval routing decision is based on the run's `requiresVisualApproval` flag from `status.json`.

## What "Cursor Execution" Means Here

In the PathOS pipeline, "Cursor execution" is the stage where an AI coding agent (Cursor) would implement changes based on a prepared prompt and task file. **Right now, this stage is simulated.** The `invoke-cursor.ps1` script validates that the run package is complete, writes placeholder artifacts (`cursor-execution.json`, `cursor-result.md`), and reports success. No actual Cursor IDE session is launched and no repository files are modified. This is intentional — it lets the pipeline shape and routing logic stabilize before real automation is added.

## Response Contract

### Success paths (HTTP 200)

```json
{
  "status": "success",
  "message": "<human-readable summary>",
  "runId": "<runId>",
  "nextStatus": "awaiting_visual_approval | ready_for_codex",
  "workType": "<workType from status.json>"
}
```

### Validation failure (HTTP 422)

```json
{
  "status": "failure",
  "message": "<specific error from validation script>",
  "runId": "<runId>",
  "reason": "<specific error from validation script>",
  "runStatus": "<current runStatus, when available>",
  "reviewStatus": "<current reviewStatus, when available>",
  "runPath": "<path, when available>",
  "statusPath": "<path, when available>"
}
```

### Cursor execution failure (HTTP 500)

```json
{
  "status": "failure",
  "message": "Cursor execution failed",
  "runId": "<runId>",
  "nextStatus": "cursor_failed",
  "stdout": "<invoke-cursor.ps1 stdout>",
  "stderr": "<invoke-cursor.ps1 stderr>",
  "exitCode": "<exit code>"
}
```

## What Is Still Simulated vs Real

| Component | Status |
|---|---|
| Run validation (`validate-run-state.ps1`) | **Real** — actually reads and checks `status.json` |
| Status updates (`update-run-status.ps1`) | **Real** — actually modifies `status.json` and `status-history.json` |
| Cursor execution (`invoke-cursor.ps1`) | **Simulated** — writes placeholder artifacts, no real IDE session |
| Workflow routing (IF branches) | **Real** — operational n8n logic based on exit codes and parsed fields |
| Webhook responses | **Real** — structured JSON with correct HTTP status codes |

## Validation

### Session 1: Initial build
- All five direct child-workflow tests passed (UI happy path, non-UI happy path, invalid state, fake runId, simulated failure).
- Four contract issues identified for hardening.

### Session 2: Hardening pass
- Code changes applied. Retesting required for tests 1, 2, 3, and 5.
- Test 4 (fake runId) not retested — that path was not modified.

### Session 2 retests
- Retest 1 passed
- Retest 2 passed
- Retest 5 passed functionally
- Retest 3 passed partially (HTTP 422 correct, detail fields missing)

### Session 3: Response-detail hardening
- Fixed validation failure response: robust JSON parsing (BOM/noise tolerance, stderr fallback), fields always included
- Fixed Cursor failure response: converted Set node to Code node for reliable cross-node `$("Invoke Cursor")` references
- Retesting required for tests 3 and 5

### Session 6: Permanent validation-contract fix
- Confirmed the live invalid-state failure was caused by workflow logic still branching on `exitCode`, even though `validate-run-state.ps1` had already been changed to return structured JSON with shell exit `0`
- Updated the workflow export and the active n8n workflow so the validation path now branches on `JSON.parse(stdout).status`
- Updated the validation-failure response builder to parse the validator JSON payload from `stdout` and use `raw.error` only as a fallback reason
- Retest 3 is still required to confirm the live webhook now surfaces `runStatus`, `reviewStatus`, `runPath`, and `statusPath`

### Session 7: Final retest outcome
- Retest 3 now passes fully: HTTP `422`, structured detail fields populated, no side effects
- Retest 5 still only passes partially: HTTP `500`, `nextStatus = cursor_failed`, status transition correct, and failure artifacts are complete, but the response body still returns empty `stdout`, `stderr`, and `exitCode`
- The live webhook is now being served by workflow id `ihN7zA3x8fZQ7Rf5`, which indicates workflow-instance drift remains a real operational risk in this n8n lab

### Session 8: Orchestrator integration patch
- Added `execute_cursor` to the live `pathos-orchestrator` workflow and the checked-in orchestrator export
- The orchestrator now forwards `{ "runId": "<runId>" }` to `POST /webhook/pathos-cursor-execution`
- The orchestrator response wrapper remains unchanged: `{ status, action, data }`
- Integration testing is still required before readiness changes again

### Session 9: Orchestrator integration validation
- UI success path passes through the orchestrator wrapper correctly
- Non-UI success path passes through the orchestrator wrapper correctly
- Failure-path integration is still blocked: the orchestrator `Execute Cursor Request` node treats the child workflow's HTTP `500` as a node error and never reaches the wrapper response node

### Session 10: Orchestrator failure-path wrapper fix
- Updated the live orchestrator so `Execute Cursor Request` keeps child HTTP `500` responses in-band instead of throwing
- Updated the orchestrator wrapper so top-level `status` reflects child `status`
- Only the orchestrator was changed; the child workflow and scripts were left alone
- One focused retest of orchestrator Test 3 is still required after this fix

## Risks And Gaps

- Direct child-workflow readiness is resolved.
- Orchestrator success-path integration is working.
- Orchestrator failure-path integration fix is applied but still needs final retest confirmation.
- No git repository exists at the workspace root, so standard diff/patch artifacts could not be generated.
- The non-UI success path auto-approves (`reviewStatus = "approved"`) to enable direct Codex handoff. If the pipeline later requires explicit code review for non-UI work, this needs revisiting.
- Status update nodes use `onError: continueRegularOutput` for resilience but do not branch on their own exit codes. A status update failure would be silent.

## Follow-Up

- Rerun the orchestrator Cursor failure-path test after the in-band failure-wrapper fix.
- Replace the simulated Cursor stage with real Cursor automation when the bridge is ready.
