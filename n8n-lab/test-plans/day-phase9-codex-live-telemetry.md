# Day Phase 9 - Codex Live Telemetry Test Plan

## Goal

Expose the same run-scoped telemetry contract for the Codex stage that now exists for the implementation-worker stage, while keeping the current Codex stage honest about its placeholder status.

## Scope

- `invoke-codex.ps1`
- `get-run-live-status.ps1`

## Cases

### 1. Direct Codex placeholder probe

Request:
- create a temp git repo
- create a temp run folder with `status.json` and `codexHandoff.md`
- run `invoke-codex.ps1`

Expected:
- `codex-live.log` is created
- `codex-events.jsonl` is created
- `codex-status.json` is created
- `codex-baseline.json` is created
- `codex-delta.json` is created
- `codex-execution.json` includes the telemetry artifact paths
- placeholder mode remains explicit and truthful

### 2. Unified live-status read

Request:
- call `get-run-live-status.ps1` for a run that has Codex telemetry artifacts

Expected:
- response includes:
  - `codexStatus`
  - `codexBaseline`
  - `codexDelta`
  - `codexExecutionArtifact`
  - `codexLogTail`
  - `codexEventTail`
- existing worker telemetry fields remain unchanged

## Current Evidence

Verified during implementation:
- disposable probe root: `C:\\dev\\PathOS\\n8n-lab\\tmp\\codex-telemetry-probe-1774053626`
- `invoke-codex.ps1` completed in placeholder mode
- `codex-live.log`, `codex-events.jsonl`, `codex-status.json`, `codex-baseline.json`, and `codex-delta.json` were all written
