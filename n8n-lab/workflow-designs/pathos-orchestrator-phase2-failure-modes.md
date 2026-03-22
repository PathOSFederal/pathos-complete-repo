# PathOS Orchestrator Phase 2 Failure Modes

This note lists the likely failure modes in the current Phase 2 orchestrator and
the fastest ways to debug them.

## 1. Unsupported Or Missing `action`

Symptom:
- request does not route anywhere
- workflow may appear to stop after `Switch`

Why it happens:
- the baseline switch only defines three explicit action cases
- there is no default/fallback branch in the export

How to debug:
- inspect the incoming request body in the `Webhook` execution data
- confirm `Normalize Input` produced `action`
- confirm `action` exactly matches one of:
  - `start_run`
  - `apply_review_decision`
  - `build_codex_handoff`

Recommended hardening:
- add an explicit unsupported-action response branch

## 2. Payload Not Read From `$json.body.*`

Symptom:
- normalized fields are blank
- child workflow gets empty values

Why it happens:
- Webhook stores incoming JSON under `body`
- if a node reads `$json.repoPath` instead of `$json.body.repoPath`, the field may be empty

How to debug:
- open the `Webhook` node execution payload
- compare raw input with `Normalize Input` output
- verify each field in `Normalize Input` still references `$json.body.*`

Teaching-level pseudo-code:

```javascript
// Good: read from body because Webhook stores request JSON there.
const repoPath = $json.body.repoPath;

// Risky in this workflow: this may be empty unless another node already flattened it.
const repoPathWrong = $json.repoPath;
```

## 3. Child Workflow Not Active Or Webhook Not Registered

Symptom:
- HTTP request node returns `404`
- n8n reports the target webhook is not registered

Why it happens:
- the child workflow is inactive
- the child workflow is only running in one-shot test mode

How to debug:
- confirm the child workflow is active in n8n
- if using test mode, click `Execute workflow` first
- retry the orchestrator request after activating the child webhook

## 4. Child Workflow State Guard Failure

Symptom:
- orchestrator returns success at the HTTP level but nested child data says failure
- stderr or message mentions status guard or illegal current state

Why it happens:
- the child workflow scripts correctly rejected an illegal status transition

How to debug:
- inspect `data.message`, `data.stderr`, and `data.exitCode` in the wrapped response
- inspect the run folder’s `status.json`
- verify the run is actually in the required state before calling the action

## 5. Inconsistent Wrapped Response Shape

Symptom:
- callers cannot reliably parse orchestrator responses
- some branches return raw child data without the wrapper

Why it happens:
- success is currently wrapped in `Respond Orchestrator`
- error branches are not yet fully standardized in the baseline export

How to debug:
- inspect the final `Respond to Webhook` node output
- verify every path returns:
  - `status`
  - `action`
  - `data` on success
  - `message` on error

## 6. Wrong Child Endpoint

Symptom:
- `start_run`, review, or handoff calls the wrong workflow
- returned payload looks unrelated to the requested action

Why it happens:
- the HTTP Request node URL was edited incorrectly

How to debug:
- inspect the URL configured in:
  - `Start Run Request`
  - `Review Decision Request`
  - `Codex Handof Request`
- compare against the intended local endpoints

## 7. Typo Drift In Node Names

Symptom:
- expression references break after a node rename
- wrapped response references the wrong node

Why it happens:
- n8n expressions often reference node names directly

How to debug:
- inspect expressions such as:
  - `$("Normalize Input").item.json.action`
- confirm the referenced node name still exists exactly as written

## Fast Debug Order

When an orchestrator call fails, debug in this order:
1. Check the incoming request body on `Webhook`
2. Check flattened fields on `Normalize Input`
3. Check which branch `Switch` selected
4. Check the child HTTP Request node response
5. Check the final response wrapper
6. Check the run folder artifacts on disk if the child workflow was reached
