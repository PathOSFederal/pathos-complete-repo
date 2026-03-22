[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$TaskId,

    [Parameter(Mandatory = $false)]
    [ValidateSet("frontend", "backend", "desktop_legacy")]
    [string]$Repo,

    [Parameter(Mandatory = $false)]
    [switch]$RequiresVisualApproval,

    [Parameter(Mandatory = $false)]
    [string]$StatePath
)

$ErrorActionPreference = "Stop"

function Get-WorkspaceRoot {
    param([string]$ScriptPath)
    return (Resolve-Path (Join-Path $ScriptPath "..")).Path
}

function Get-TaskTypeForRepo {
    param([string]$RepoKey)
    if ([string]::IsNullOrWhiteSpace($RepoKey)) { return "unknown" }
    if ($RepoKey -eq "frontend") { return "frontend" }
    if ($RepoKey -eq "backend") { return "backend" }
    if ($RepoKey -eq "desktop_legacy") { return "tooling" }
    return "unknown"
}

function Get-InitialExecutionEngine {
    param([string]$TaskType)
    if ($TaskType -eq "unknown") { return "none" }
    return "claude"
}

try {
    # Resolve all control files relative to this script so invocation location does not matter.
    $workspaceRoot = Get-WorkspaceRoot -ScriptPath $PSScriptRoot
    $reposPath = Join-Path $workspaceRoot "repos.json"
    $statePath = if ([string]::IsNullOrWhiteSpace($StatePath)) {
        Join-Path $workspaceRoot "ai-pipeline\pipeline-state.json"
    }
    else {
        $StatePath
    }

    if (-not (Test-Path -LiteralPath $reposPath)) {
        throw "Missing required file: $reposPath"
    }
    if (-not (Test-Path -LiteralPath $statePath)) {
        throw "Missing required state file path: $statePath"
    }

    # Read repos.json and validate the provided repo key when one is supplied.
    $reposDoc = Get-Content -LiteralPath $reposPath -Raw | ConvertFrom-Json -AsHashtable
    if (-not $reposDoc.ContainsKey("repos")) {
        throw "Invalid repos.json format: missing 'repos' object."
    }
    if ($PSBoundParameters.ContainsKey("Repo") -and -not $reposDoc.repos.ContainsKey($Repo)) {
        throw "Repo '$Repo' is not defined in repos.json."
    }

    # Build and write the locked state for a new task run.
    $taskType = Get-TaskTypeForRepo -RepoKey $Repo
    $executionEngine = Get-InitialExecutionEngine -TaskType $taskType
    $uiChanged = [bool]$RequiresVisualApproval -or ($taskType -eq "frontend")
    $newState = [ordered]@{
        task_id                  = $TaskId
        phase                    = "B"
        status                   = "spec_locked"
        task_type                = $taskType
        execution_engine         = $executionEngine
        requires_visual_approval = [bool]$RequiresVisualApproval
        ui_changed               = [bool]$uiChanged
        needs_repair_pass        = $false
        iteration                = 0
    }
    $newState | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $statePath -Encoding utf8

    $repoSummary = if ($PSBoundParameters.ContainsKey("Repo")) { $Repo } else { "not specified" }
    Write-Host "Task started."
    Write-Host "TaskId: $TaskId"
    Write-Host "Repo: $repoSummary"
    Write-Host "Phase: B | Status: spec_locked | RequiresVisualApproval: $([bool]$RequiresVisualApproval) | Iteration: 0"
}
catch {
    Write-Error "start-task failed: $($_.Exception.Message)"
    exit 1
}
