[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$RunRoot
)

$ErrorActionPreference = "Stop"

function Get-WorkspaceRoot {
    param([string]$ScriptPath)
    return (Resolve-Path (Join-Path $ScriptPath "..")).Path
}

function Get-VisualStatus {
    param([string]$VisualReviewPath)
    $raw = Get-Content -LiteralPath $VisualReviewPath -Raw
    $match = [regex]::Match($raw, "(?m)^Status:\s*(.+?)\s*$")
    if (-not $match.Success) {
        throw "Could not determine visual-review status from: $VisualReviewPath"
    }
    return $match.Groups[1].Value.Trim()
}

try {
    # Resolve pipeline paths relative to script location so this works from any cwd.
    $workspaceRoot = Get-WorkspaceRoot -ScriptPath $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($RunRoot)) {
        $runRootPath = Join-Path $workspaceRoot "ai-pipeline"
        $statePath = Join-Path $runRootPath "pipeline-state.json"
        $taskPath = Join-Path $runRootPath "task.md"
        $currentPath = Join-Path $runRootPath "artifacts\current.md"
        $promptPath = Join-Path $runRootPath "prompts\codex-review.md"
        $visualPath = Join-Path $runRootPath "visual-review.md"
        $handoffPath = Join-Path $runRootPath "artifacts\codex-handoff.md"
    }
    else {
        $runRootPath = $RunRoot
        $statePath = Join-Path $runRootPath "state.json"
        $taskPath = Join-Path $runRootPath "artifacts\task.md"
        $currentPath = Join-Path $runRootPath "artifacts\current.md"
        $promptPath = Join-Path $runRootPath "prompts\codex-review.md"
        $visualPath = Join-Path $runRootPath "artifacts\visual-review.md"
        $handoffPath = Join-Path $runRootPath "artifacts\codex-handoff.md"
    }
    $reposPath = Join-Path $workspaceRoot "repos.json"

    foreach ($required in @($taskPath, $currentPath, $promptPath, $statePath, $reposPath)) {
        if (-not (Test-Path -LiteralPath $required)) {
            throw "Missing required file: $required"
        }
    }

    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json -AsHashtable
    foreach ($requiredKey in @("task_id", "requires_visual_approval", "iteration")) {
        if (-not $state.ContainsKey($requiredKey)) {
            throw "Invalid pipeline-state.json format: missing '$requiredKey'."
        }
    }
    if (-not $state.ContainsKey("requires_runtime_validation")) { $state["requires_runtime_validation"] = $false }
    if (-not $state.ContainsKey("runtime_validation_completed")) { $state["runtime_validation_completed"] = $false }
    if (-not $state.ContainsKey("task_type")) { $state["task_type"] = "unknown" }
    if (-not $state.ContainsKey("ui_changed")) { $state["ui_changed"] = $false }
    if (-not $state.ContainsKey("needs_repair_pass")) { $state["needs_repair_pass"] = $false }

    if ([bool]$state.requires_visual_approval) {
        if (-not (Test-Path -LiteralPath $visualPath)) {
            throw "Visual approval is required but visual-review.md is missing: $visualPath"
        }
        $visualStatus = Get-VisualStatus -VisualReviewPath $visualPath
        if ($visualStatus -ne "approved") {
            throw "Visual approval is required. Current visual-review status is '$visualStatus' (expected 'approved')."
        }
    }
    if ([bool]$state.requires_runtime_validation -and -not [bool]$state.runtime_validation_completed) {
        throw "Runtime validation is required and not complete. Run runtime-start/runtime-done before hardening."
    }

    # Move state to hardening while preserving stable fields.
    $newState = [ordered]@{
        task_id                  = [string]$state.task_id
        phase                    = "D"
        status                   = "hardening"
        task_type                = [string]$state.task_type
        execution_engine         = "codex"
        requires_visual_approval = [bool]$state.requires_visual_approval
        requires_runtime_validation = [bool]$state.requires_runtime_validation
        runtime_validation_mode  = if ($state.ContainsKey("runtime_validation_mode")) { [string]$state.runtime_validation_mode } else { "none" }
        runtime_validation_completed = [bool]$state.runtime_validation_completed
        ui_changed               = [bool]$state.ui_changed
        needs_repair_pass        = $false
        iteration                = [int]$state.iteration
    }
    $newState | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $statePath -Encoding utf8

    $reposDoc = Get-Content -LiteralPath $reposPath -Raw | ConvertFrom-Json -AsHashtable
    if (-not $reposDoc.ContainsKey("repos")) {
        throw "Invalid repos.json format: missing 'repos' object."
    }

    # Deterministically generate Codex handoff context.
    $handoff = @"
# Codex Hardening Handoff

## Current task
- Task ID: $($newState.task_id)
- Phase: $($newState.phase)
- Status: $($newState.status)
- Iteration: $($newState.iteration)
- Requires visual approval: $($newState.requires_visual_approval)

## Canonical repos
- frontend: $($reposDoc.repos.frontend)
- backend: $($reposDoc.repos.backend)
- desktop_legacy: $($reposDoc.repos.desktop_legacy)

## Next instruction
Run Codex hardening using:
- runs/<run-id>/prompts/codex-review.md

## Required input artifacts
- runs/<run-id>/artifacts/task.md
- runs/<run-id>/artifacts/current.md
- runs/<run-id>/prompts/codex-review.md

## Output artifact to update
- runs/<run-id>/artifacts/codexReview.md
"@
    Set-Content -LiteralPath $handoffPath -Value $handoff -Encoding utf8

    Write-Host "Codex review preparation complete."
    Write-Host "Phase: D | Status: hardening | TaskId: $($newState.task_id)"
    Write-Host "Use next: $promptPath"
    Write-Host "Handoff file: $handoffPath"
}
catch {
    Write-Error "run-codex-review failed: $($_.Exception.Message)"
    exit 1
}

