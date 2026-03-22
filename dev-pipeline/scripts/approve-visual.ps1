[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$Notes,

    [Parameter(Mandatory = $false)]
    [string]$RunRoot
)

$ErrorActionPreference = "Stop"

function Get-WorkspaceRoot {
    param([string]$ScriptPath)
    return (Resolve-Path (Join-Path $ScriptPath "..")).Path
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

    $finalNote = if ([string]::IsNullOrWhiteSpace($Notes)) { "Approved for hardening." } else { $Notes.Trim() }
    Write-VisualReviewFile -Path $visualPath -Status "approved" -Note $finalNote

    # Legacy mode (no run root) keeps historical state mutation behavior.
    if ([string]::IsNullOrWhiteSpace($RunRoot)) {
        $newState = [ordered]@{
            task_id                  = [string]$state.task_id
            phase                    = "D"
            status                   = "ready_for_codex"
            task_type                = [string]$state.task_type
            execution_engine         = "codex"
            requires_visual_approval = [bool]$state.requires_visual_approval
            ui_changed               = [bool]$state.ui_changed
            needs_repair_pass        = $false
            iteration                = [int]$state.iteration
        }
        $newState | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $statePath -Encoding utf8
        Write-Host "Visual review approved."
        Write-Host "Phase: D | Status: ready_for_codex | Iteration: $($newState.iteration)"
    }
    else {
        # Run-based pipeline v2: orchestration command is authoritative for transitions.
        Write-Host "Visual review approved."
        Write-Host "State transition is managed by .\\pp.ps1 approve."
    }

    Write-Host "Note: $finalNote"
}
catch {
    Write-Error "approve-visual failed: $($_.Exception.Message)"
    exit 1
}

