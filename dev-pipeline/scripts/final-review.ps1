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

try {
    # Resolve pipeline paths relative to script location so this works from any cwd.
    $workspaceRoot = Get-WorkspaceRoot -ScriptPath $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($RunRoot)) {
        $runRootPath = Join-Path $workspaceRoot "ai-pipeline"
        $statePath = Join-Path $runRootPath "pipeline-state.json"
        $taskPath = Join-Path $runRootPath "task.md"
        $currentPath = Join-Path $runRootPath "artifacts\current.md"
        $codexReviewPath = Join-Path $runRootPath "artifacts\codexReview.md"
        $visualPath = Join-Path $runRootPath "visual-review.md"
        $finalPromptPath = Join-Path $runRootPath "artifacts\finalReviewPrompt.md"
        $generatedPromptPath = Join-Path $runRootPath "prompts\final-review-prompt.md"
    }
    else {
        $runRootPath = $RunRoot
        $statePath = Join-Path $runRootPath "state.json"
        $taskPath = Join-Path $runRootPath "artifacts\task.md"
        $currentPath = Join-Path $runRootPath "artifacts\current.md"
        $codexReviewPath = Join-Path $runRootPath "artifacts\codexReview.md"
        $visualPath = Join-Path $runRootPath "artifacts\visual-review.md"
        $finalPromptPath = Join-Path $runRootPath "artifacts\finalReviewPrompt.md"
        $generatedPromptPath = Join-Path $runRootPath "prompts\final-review-prompt.md"
    }

    foreach ($required in @($taskPath, $currentPath, $codexReviewPath, $statePath)) {
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
    if (-not $state.ContainsKey("task_type")) { $state["task_type"] = "unknown" }
    if (-not $state.ContainsKey("ui_changed")) { $state["ui_changed"] = $false }
    if (-not $state.ContainsKey("needs_repair_pass")) { $state["needs_repair_pass"] = $false }

    if ([bool]$state.requires_visual_approval -and -not (Test-Path -LiteralPath $visualPath)) {
        throw "visual-review.md is required because requires_visual_approval=true. Missing file: $visualPath"
    }

    # Move state to final review while preserving stable fields.
    $newState = [ordered]@{
        task_id                  = [string]$state.task_id
        phase                    = "E"
        status                   = "ready_for_final_judgment"
        task_type                = [string]$state.task_type
        execution_engine         = "chatgpt"
        requires_visual_approval = [bool]$state.requires_visual_approval
        ui_changed               = [bool]$state.ui_changed
        needs_repair_pass        = $false
        iteration                = [int]$state.iteration
    }
    $newState | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $statePath -Encoding utf8

    $visualSection = if ([bool]$newState.requires_visual_approval) {
@"
- $visualPath
"@
    }
    else {
@"
- (not required for this task: requires_visual_approval=false)
"@
    }

    # Deterministically generate final ChatGPT handoff prompt.
    $finalPrompt = @"
# Final Review Handoff (ChatGPT)

Please perform final judgment for this task using the artifacts below.

## Task context
- Task ID: $($newState.task_id)
- Phase: $($newState.phase)
- Status: $($newState.status)
- Iteration: $($newState.iteration)
- Requires visual approval: $($newState.requires_visual_approval)

## Required input artifacts
- $taskPath
- $currentPath
- $codexReviewPath
$visualSection
## Requested final output
Provide:
- merge-readiness judgment
- required fixes before merge
- optional improvements
- final recommendation
"@
    Set-Content -LiteralPath $finalPromptPath -Value $finalPrompt -Encoding utf8

    $runIdLabel = Split-Path -Leaf $runRootPath
    $generatedPrompt = @"
# Final Review Prompt

Generated: $(Get-Date -Format o)
Run ID: $runIdLabel
Task ID: $($newState.task_id)
Phase/Status: $($newState.phase) / $($newState.status)

## Review Inputs
- $taskPath
- $currentPath
- $codexReviewPath
- $visualPath

## Requested Output
- merge-readiness judgment
- required fixes before merge
- optional improvements
- final recommendation
"@
    $promptDir = Split-Path -Parent $generatedPromptPath
    if (-not (Test-Path -LiteralPath $promptDir)) {
        New-Item -ItemType Directory -Path $promptDir -Force | Out-Null
    }
    Set-Content -LiteralPath $generatedPromptPath -Value $generatedPrompt -Encoding utf8

    Write-Host "Final review preparation complete."
    Write-Host "Phase: E | Status: ready_for_final_judgment | TaskId: $($newState.task_id)"
    Write-Host "Handoff file: $finalPromptPath"
    Write-Host "Generated prompt: $generatedPromptPath"
}
catch {
    Write-Error "final-review failed: $($_.Exception.Message)"
    exit 1
}

