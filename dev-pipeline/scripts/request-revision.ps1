[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("implementation", "spec")]
    [string]$Type,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Notes,

    [Parameter(Mandatory = $false)]
    [string]$RunRoot
)

$ErrorActionPreference = "Stop"

function Get-WorkspaceRoot {
    param([string]$ScriptPath)
    return (Resolve-Path (Join-Path $ScriptPath "..")).Path
}

function Get-RepairEngine {
    param([string]$TaskType)
    if ($TaskType -eq "frontend") { return "cursor" }
    return "claude"
}

function Write-VisualReviewFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Status,
        [Parameter(Mandatory = $true)][string]$Note
    )

    # Deterministically rewrite visual-review.md with the canonical structure.
    $content = @"
# Visual Review

Status: $Status

## Notes
- $Note

## Decision rules
- approved = proceed to Phase D
- needs_revision = loop back to Phase C
- spec_revision = loop back to Phase B
"@
    Set-Content -LiteralPath $Path -Value $content -Encoding utf8
}

try {
    $workspaceRoot = Get-WorkspaceRoot -ScriptPath $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($RunRoot)) {
        $runRootPath = Join-Path $workspaceRoot "ai-pipeline"
        $statePath = Join-Path $runRootPath "pipeline-state.json"
        $visualPath = Join-Path $runRootPath "visual-review.md"
    }
    else {
        $runRootPath = $RunRoot
        $statePath = Join-Path $runRootPath "state.json"
        $visualPath = Join-Path $runRootPath "artifacts\visual-review.md"
    }

    if (-not (Test-Path -LiteralPath $statePath)) {
        throw "Missing required file: $statePath"
    }
    if (-not (Test-Path -LiteralPath $visualPath)) {
        throw "Missing required file: $visualPath"
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

    $noteText = $Notes.Trim()
    $nextIteration = [int]$state.iteration + 1

    if ($Type -eq "implementation") {
        Write-VisualReviewFile -Path $visualPath -Status "needs_revision" -Note $noteText
        $repairEngine = Get-RepairEngine -TaskType ([string]$state.task_type)
        $repairStatus = if ($repairEngine -eq "cursor") { "ready_for_cursor" } else { "needs_repair_pass" }
        $newState = [ordered]@{
            task_id                  = [string]$state.task_id
            phase                    = "C"
            status                   = $repairStatus
            task_type                = [string]$state.task_type
            execution_engine         = $repairEngine
            requires_visual_approval = [bool]$state.requires_visual_approval
            ui_changed               = $true
            needs_repair_pass        = $true
            iteration                = $nextIteration
        }
    }
    else {
        Write-VisualReviewFile -Path $visualPath -Status "spec_revision" -Note $noteText
        $newState = [ordered]@{
            task_id                  = [string]$state.task_id
            phase                    = "B"
            status                   = "spec_revision_required"
            task_type                = [string]$state.task_type
            execution_engine         = "chatgpt"
            requires_visual_approval = [bool]$state.requires_visual_approval
            ui_changed               = [bool]$state.ui_changed
            needs_repair_pass        = $false
            iteration                = $nextIteration
        }
    }

    $newState | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $statePath -Encoding utf8

    Write-Host "Revision requested."
    Write-Host "Type: $Type | Phase: $($newState.phase) | Status: $($newState.status) | Iteration: $($newState.iteration)"
    Write-Host "Note: $noteText"
}
catch {
    Write-Error "request-revision failed: $($_.Exception.Message)"
    exit 1
}

