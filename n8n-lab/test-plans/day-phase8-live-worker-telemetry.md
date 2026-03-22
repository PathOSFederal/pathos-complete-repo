# Day Phase 8 - Live Worker Telemetry Test Plan

## Goal

Verify that the implementation-worker stage exposes a trustworthy live execution trail while Claude Code is running, and that the pipeline can inspect that trail without waiting for final completion.

## Scope

- `invoke-cursor.ps1`
- `get-run-live-status.ps1`
- `pathos-orchestrator` action `get_run_live_status`

## Cases

### 1. Disposable worker probe with clean repo

Request:
- create a temp git repo
- create a temp run packet with `task.md`, `cursorPrompt.md`, and `status.json`
- run `invoke-cursor.ps1` directly

Expected:
- `worker-live.log` is created
- `worker-events.jsonl` is created
- `worker-status.json` is created
- `repo-baseline.json` is created
- `repo-delta.json` is created
- `cursor-execution.json` includes telemetry artifact paths
- `changedFiles` contains the modified file
- success is only reported if a real repo edit is detected

### 2. Dirty-file attribution against an already-dirty repo

Request:
- start with a repo that already has tracked dirty files
- run `invoke-cursor.ps1` and make Claude edit one of those already-dirty files

Expected:
- `repo-baseline.json` records the pre-run fingerprint for dirty files
- `repo-delta.json` reports the file in `changedFilesSinceBaseline`
- success is based on fingerprint change, not just newly-dirty path detection

### 3. Live status inspection through the orchestrator

Request:
- call `POST /webhook/pathos-orchestrator` with:
```json
{
  "action": "get_run_live_status",
  "runId": "<runId>",
  "tailLines": "10"
}
```

Expected:
- wrapper shape is preserved
- response includes `workerStatus`, `repoBaseline`, `repoDelta`, `logTail`, and `eventTail`
- response is useful while the worker is still running and after completion

### 4. Honest failure when Claude makes no detectable change

Request:
- run a task that exits without changing the repo

Expected:
- worker does not report success
- `cursor-execution.json` shows `stageStatus = failed`
- `worker-status.json` ends in `state = failed`
- telemetry artifacts remain available for inspection

## Current Evidence

Verified during implementation:
- disposable probe run: `C:\\dev\\PathOS\\n8n-lab\\tmp\\telemetry-probe-1774052550`
- direct worker result: success
- detected changed file: `README.md`
- live telemetry artifacts were written and readable during execution
- orchestrator `get_run_live_status` wrapper was already smoke-tested against a live run
