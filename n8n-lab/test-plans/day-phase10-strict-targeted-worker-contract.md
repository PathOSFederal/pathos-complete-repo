# Day Phase 10 - Strict Targeted Worker Contract Retest Plan

## Goal

Prove that targeted UI standardization runs can no longer silently no-op on the intended PathAdvisor surfaces, even when those files are already dirty.

## Required retests

### 1. Live start_run packet carries strict target metadata

Request body:
```json
{
  "repoPath": "C:\\dev\\PathOS\\apps\\pathos-platform\\frontend",
  "branchName": "feature/pathadvisor-canonical-workspace-stabilization",
  "goal": "Standardize PathAdvisor canonically across screens",
  "dayNumber": "10",
  "taskTitle": "Strict targeted PathAdvisor run",
  "notes": "Target the PathAdvisor surfaces directly.",
  "workType": "ui",
  "requiresVisualApproval": "true",
  "forceTargetedModification": "true",
  "allowedTargetFiles": [
    "packages/ui/src/shell/PathAdvisorCard.tsx",
    "packages/ui/src/shell/PathAdvisorRail.tsx",
    "packages/ui/src/stores/pathAdvisorScreenOverridesStore.ts",
    "packages/ui/src/screens/CareerReadinessScreen.tsx"
  ],
  "noOpOnTargetFilesIsFailure": "true",
  "referenceImagePath": "C:\\dev\\PathOS\\n8n-lab\\incoming\\pathAdvisorMockup.png",
  "designSource": "v0"
}
```

Expected:
- `status.json` includes:
  - `forceTargetedModification = true`
  - `allowedTargetFiles = [...]`
  - `noOpOnTargetFilesIsFailure = true`
- `cursorPrompt.md` includes the `Strict Targeted Execution Contract` section

### 2. Worker success when an already-dirty allowed target file changes

Expected:
- worker detects a baseline fingerprint for the dirty file
- worker still succeeds if the file changes again during the run
- `matchedTargetFiles` contains the changed allowed target path

### 3. Worker failure when no allowed target file changes

Expected:
- stage fails with `message = no_target_surface_changes_detected`
- `matchedTargetFiles = []`
- telemetry remains available

### 4. Live telemetry still works

Expected:
- `worker-status.json` includes:
  - `allowedTargetFiles`
  - `matchedTargetFiles`
- `worker-events.jsonl` includes:
  - `baseline_captured`
  - `worker_started`
  - `completed` or `failed`

### 5. Orchestrator wrapper still works

Expected:
- success and failure responses remain wrapped as:
```json
{
  "status": "<success|failure>",
  "action": "execute_cursor",
  "data": { ...child response... }
}
```

## Current implementation evidence

- live `start_run` strict-target probe: `run-1774055242643`
- direct worker strict-target success probe:
  - root: `C:\\dev\\PathOS\\n8n-lab\\tmp\\strict-target-worker-success-1774055261`
- direct worker strict-target failure probe:
  - root: `C:\\dev\\PathOS\\n8n-lab\\tmp\\strict-target-worker-failure-1774055291`
