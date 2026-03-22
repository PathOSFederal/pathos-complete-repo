[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$WorkspaceRoot,
    [Parameter(Mandatory = $true)][string]$RunId,
    [Parameter(Mandatory = $true)][string]$RepoPath,
    [Parameter(Mandatory = $true)][string]$PromptPath,
    [Parameter(Mandatory = $false)][string]$Executable = "codex",
    [Parameter(Mandatory = $false)][string]$SandboxMode = "workspace-write",
    [Parameter(Mandatory = $false)][string]$ApprovalPolicy = "never",
    [Parameter(Mandatory = $false)][int]$MaxAttempts = 3,
    [Parameter(Mandatory = $false)][int]$InitialBackoffSeconds = 5,
    [Parameter(Mandatory = $false)][int]$MaxBackoffSeconds = 60,
    [Parameter(Mandatory = $false)][string]$ContinueInstruction = ""
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\codex-retry-lib.ps1")

function Read-JsonObjectLocal {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { throw "Missing required file: $Path" }
    return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -AsHashtable)
}

function Write-JsonObjectLocal {
    param([string]$Path, [hashtable]$Data)
    $Data | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $Path -Encoding utf8
}

function Add-RunEventLocal {
    param(
        [string]$EventsPath,
        [string]$RunIdValue,
        [string]$Phase,
        [string]$Status,
        [string]$Engine,
        [string]$Level,
        [string]$Message
    )

    $payload = [ordered]@{
        timestamp        = (Get-Date).ToString("o")
        run_id           = $RunIdValue
        level            = $Level
        command          = "codex-start"
        phase            = $Phase
        status           = $Status
        execution_engine = $Engine
        message          = $Message
    }
    ($payload | ConvertTo-Json -Compress) | Add-Content -LiteralPath $EventsPath -Encoding utf8
}

function Update-RunStateFromStatus {
    param(
        [hashtable]$StatusRecord,
        [string]$RunRoot
    )

    $statePath = Join-Path $RunRoot "state.json"
    $contextPath = Join-Path $RunRoot "run-context.json"
    $eventsPath = Join-Path $RunRoot "events.log"

    $state = Read-JsonObjectLocal -Path $statePath
    $context = Read-JsonObjectLocal -Path $contextPath

    $attemptStamp = if ([string]::IsNullOrWhiteSpace([string]$StatusRecord.ended_at)) { [string]$StatusRecord.started_at } else { [string]$StatusRecord.ended_at }
    $modeSummary = "mode={0}; attempt={1}/{2}; classification={3}" -f [string]$StatusRecord.mode, [int]$StatusRecord.current_attempt, [int]$StatusRecord.total_max_attempts, [string]$StatusRecord.exit_classification
    $commandPreview = if ([string]$StatusRecord.mode -eq "resume") {
        "codex -a never -s workspace-write -C <repo> exec resume --last --json <continue-instruction>"
    }
    else {
        "codex -a never -s workspace-write -C <repo> exec --json <hardening-prompt>"
    }

    $state.codex_execution_last_attempt_at = $attemptStamp
    $state.codex_execution_last_command = $commandPreview
    $state.codex_execution_last_result = $modeSummary
    $context.codex_execution_last_attempt_at = $attemptStamp
    $context.codex_execution_last_command = $commandPreview
    $context.codex_execution_last_result = $modeSummary

    if ([string]$StatusRecord.exit_classification -eq "success") {
        $state.supervisor_state = "healthy"
        $state.last_error_type = ""
        $state.last_error_message = ""
        $state.last_successful_progress_at = $attemptStamp
        $context.supervisor_state = "healthy"
        $context.last_error_type = ""
        $context.last_error_message = ""
        Add-RunEventLocal -EventsPath $eventsPath -RunIdValue $RunId -Phase ([string]$state.phase) -Status ([string]$state.status) -Engine ([string]$state.execution_engine) -Level "info" -Message ("Codex unattended wrapper reported success ({0})." -f $modeSummary)
    }
    elseif ([string]$StatusRecord.exit_classification -eq "terminal_failure") {
        $state.supervisor_state = "worker_blocked"
        $state.last_error_type = "process_crash"
        $state.last_error_message = [string]$StatusRecord.note
        $context.supervisor_state = "worker_blocked"
        $context.last_error_type = "process_crash"
        $context.last_error_message = [string]$StatusRecord.note
        Add-RunEventLocal -EventsPath $eventsPath -RunIdValue $RunId -Phase ([string]$state.phase) -Status ([string]$state.status) -Engine ([string]$state.execution_engine) -Level "warn" -Message ("Codex unattended wrapper exhausted retries ({0})." -f $modeSummary)
    }
    else {
        $state.supervisor_state = "worker_retrying"
        $state.last_error_type = "provider_unavailable"
        $state.last_error_message = [string]$StatusRecord.note
        $context.supervisor_state = "worker_retrying"
        $context.last_error_type = "provider_unavailable"
        $context.last_error_message = [string]$StatusRecord.note
        Add-RunEventLocal -EventsPath $eventsPath -RunIdValue $RunId -Phase ([string]$state.phase) -Status ([string]$state.status) -Engine ([string]$state.execution_engine) -Level "info" -Message ("Codex unattended wrapper scheduled another retry ({0})." -f $modeSummary)
    }

    Write-JsonObjectLocal -Path $statePath -Data $state
    Write-JsonObjectLocal -Path $contextPath -Data $context
}

try {
    if (-not (Test-Path -LiteralPath $PromptPath)) {
        throw "Codex prompt file not found: $PromptPath"
    }

    $promptText = Get-Content -LiteralPath $PromptPath -Raw
    if ([string]::IsNullOrWhiteSpace($promptText)) {
        throw "Codex prompt file is empty: $PromptPath"
    }

    $attemptRoot = Join-Path (Join-Path $WorkspaceRoot ("runs\{0}\artifacts" -f $RunId)) "codex-exec"
    $latestStatusPath = Join-Path $attemptRoot "latest-status.json"
    if (-not (Test-Path -LiteralPath $attemptRoot)) {
        New-Item -ItemType Directory -Path $attemptRoot -Force | Out-Null
    }

    # This script exists so `codex-start` can keep the current spawn/sync process model while the
    # retry loop itself remains isolated, logged, and resilient to transient Codex CLI failures.
    $result = Invoke-CodexCliRetry -RepoPath $RepoPath -PromptText $promptText -AttemptRoot $attemptRoot -LatestStatusPath $latestStatusPath -Executable $Executable -SandboxMode $SandboxMode -ApprovalPolicy $ApprovalPolicy -MaxAttempts $MaxAttempts -InitialBackoffSeconds $InitialBackoffSeconds -MaxBackoffSeconds $MaxBackoffSeconds -ContinueInstruction $ContinueInstruction -OnAttemptFinished {
        param($statusRecord)
        Update-RunStateFromStatus -StatusRecord $statusRecord -RunRoot (Join-Path $WorkspaceRoot ("runs\{0}" -f $RunId))
    }

    if ($null -eq $result -or $null -eq $result.status) {
        throw "Codex retry wrapper returned no status."
    }

    if ([string]$result.status.exit_classification -eq "success") {
        exit 0
    }

    exit 1
}
catch {
    $attemptRoot = Join-Path (Join-Path $WorkspaceRoot ("runs\{0}\artifacts" -f $RunId)) "codex-exec"
    if (-not (Test-Path -LiteralPath $attemptRoot)) {
        New-Item -ItemType Directory -Path $attemptRoot -Force | Out-Null
    }
    $statusPath = Join-Path $attemptRoot "latest-status.json"
    $failure = [ordered]@{
        attempt_id               = "wrapper-startup"
        current_attempt          = 0
        total_max_attempts       = $MaxAttempts
        mode                     = "fresh"
        started_at               = (Get-Date).ToString("o")
        ended_at                 = (Get-Date).ToString("o")
        exit_classification      = "terminal_failure"
        last_detected_event_type = ""
        log_path                 = ""
        stderr_path              = ""
        exit_code                = 1
        codex_session_id         = ""
        fallback_from_resume     = $false
        fallback_reason          = ""
        note                     = $_.Exception.Message
    }
    $failure | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $statusPath -Encoding utf8
    try {
        Update-RunStateFromStatus -StatusRecord $failure -RunRoot (Join-Path $WorkspaceRoot ("runs\{0}" -f $RunId))
    }
    catch { }
    Write-Error $_.Exception.Message
    exit 1
}
