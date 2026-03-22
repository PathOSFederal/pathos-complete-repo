[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet("start", "build", "implementation-done", "claude-start", "claude-check", "claude-finish", "reconcile-claude-completion", "codex-start", "codex-check", "codex-finish", "reconcile-codex-completion", "runtime-start", "runtime-done", "runtime-fail", "worker-start", "worker-heartbeat", "worker-fail", "worker-retry", "worker-status", "scheduler-run", "scheduler-loop", "scheduler-status", "scheduler-unlock", "service-start", "service-status", "auto-consume", "notify-test", "final-review", "status", "approve", "revise", "commit", "no-commit", "resume", "events", "doctor", "archive-runs", "current", "runs", "use")]
    [string]$Command,

    [Parameter(Mandatory = $false)]
    [string]$TaskId,

    [Parameter(Mandatory = $false)]
    [ValidateSet("frontend", "backend", "desktop_legacy")]
    [string]$Repo,

    [Parameter(Mandatory = $false)]
    [ValidateSet("frontend", "backend", "fullstack", "tooling")]
    [string]$Flow,

    [Parameter(Mandatory = $false)]
    [switch]$RequiresVisualApproval,

    [Parameter(Mandatory = $false)]
    [switch]$CreateBranch,

    [Parameter(Mandatory = $false)]
    [string]$BranchName,

    [Parameter(Mandatory = $false)]
    [ValidateSet("implementation", "spec")]
    [string]$Type,

    [Parameter(Mandatory = $false)]
    [string]$Notes,

    [Parameter(Mandatory = $false)]
    [string]$Message,

    [Parameter(Mandatory = $false)]
    [string]$RunId,

    [Parameter(Mandatory = $false)]
    [ValidateRange(1, 200)]
    [int]$Tail = 5,

    [Parameter(Mandatory = $false)]
    [ValidateSet("network_timeout", "provider_unavailable", "process_crash", "auth_failure", "file_lock", "unknown")]
    [string]$ErrorType = "unknown",

    [Parameter(Mandatory = $false)]
    [string]$ErrorMessage,

    [Parameter(Mandatory = $false)]
    [string]$Step,

    [Parameter(Mandatory = $false)]
    [string]$Worker,

    [Parameter(Mandatory = $false)]
    [string]$WorkerStatus = "running",

    [Parameter(Mandatory = $false)]
    [switch]$PrepareOnly
,
    [Parameter(Mandatory = $false)]
    [switch]$AllRuns,

    [Parameter(Mandatory = $false)]
    [switch]$DryRun,

    [Parameter(Mandatory = $false)]
    [switch]$ConsumeCompletions,

    [Parameter(Mandatory = $false)]
    [ValidateRange(1, 3600)]
    [int]$IntervalSeconds = 45,

    [Parameter(Mandatory = $false)]
    [ValidateRange(0, 100000)]
    [int]$MaxCycles = 20,

    [Parameter(Mandatory = $false)]
    [ValidateRange(0, 1440)]
    [int]$MaxMinutes = 0,

    [Parameter(Mandatory = $false)]
    [switch]$IfStale,

    [Parameter(Mandatory = $false)]
    [switch]$Force,

    [Parameter(Mandatory = $false)]
    [switch]$Json
)

$ErrorActionPreference = "Stop"

function Get-WorkspaceRoot {
    param([string]$ScriptPath)
    return (Resolve-Path (Join-Path $ScriptPath "..")).Path
}

function Get-NowIso {
    return (Get-Date).ToString("o")
}

function Read-JsonObject {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing required file: $Path"
    }
    return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -AsHashtable)
}

function Write-JsonObject {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][hashtable]$Data
    )
    $Data | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $Path -Encoding utf8
}

function Test-ValidRunId {
    param([string]$Value)
    return (-not [string]::IsNullOrWhiteSpace($Value)) -and ($Value -match '^[a-zA-Z0-9._-]+$')
}

function Assert-ValidRunId {
    param([string]$Value)
    if (-not (Test-ValidRunId -Value $Value)) {
        throw "Invalid run id '$Value'. Use only letters, numbers, dot, underscore, and hyphen."
    }
}

function Get-RunPaths {
    param([string]$WorkspaceRoot, [string]$RunId)
    $runsRoot = Join-Path $WorkspaceRoot "runs"
    $runRoot = Join-Path $runsRoot $RunId
    $artifactsDir = Join-Path $runRoot "artifacts"
    $promptsDir = Join-Path $runRoot "prompts"
    return [ordered]@{
        runs_root                = $runsRoot
        run_root                 = $runRoot
        events_path              = Join-Path $runRoot "events.log"
        notifications_path       = Join-Path $runRoot "notifications.log"
        state_path               = Join-Path $runRoot "state.json"
        run_context_path         = Join-Path $runRoot "run-context.json"
        artifacts_dir            = $artifactsDir
        design_reference_dir     = Join-Path $artifactsDir "design-reference"
        design_notes_path        = Join-Path (Join-Path $artifactsDir "design-reference") "design-notes.md"
        prompts_dir              = $promptsDir
        task_path                = Join-Path $artifactsDir "task.md"
        current_artifact_path    = Join-Path $artifactsDir "current.md"
        runtime_validation_path  = Join-Path $artifactsDir "runtime-validation.md"
        runtime_validation_playwright_result_path = Join-Path $artifactsDir "runtime-validation.playwright.json"
        worker_heartbeat_path    = Join-Path $artifactsDir "worker-heartbeat.json"
        claude_handoff_path      = Join-Path $artifactsDir "claude-handoff.md"
        claude_completion_path   = Join-Path $artifactsDir "claude-completion.json"
        codex_completion_path    = Join-Path $artifactsDir "codex-completion.json"
        codex_review_path        = Join-Path $artifactsDir "codexReview.md"
        codex_handoff_path       = Join-Path $artifactsDir "codex-handoff.md"
        final_review_prompt_path = Join-Path $artifactsDir "finalReviewPrompt.md"
        visual_review_path       = Join-Path $artifactsDir "visual-review.md"
        cursor_prompt_path       = Join-Path $promptsDir "cursor-implement.md"
        codex_prompt_path        = Join-Path $promptsDir "codex-review.md"
        builder_prompt_path      = Join-Path $promptsDir "builder-prompt.md"
        codex_hardening_prompt_path = Join-Path $promptsDir "codex-hardening-prompt.md"
        final_review_generated_prompt_path = Join-Path $promptsDir "final-review-prompt.md"
    }
}

function Ensure-RunsStore {
    param([string]$WorkspaceRoot)
    $runsRoot = Join-Path $WorkspaceRoot "runs"
    if (-not (Test-Path -LiteralPath $runsRoot)) { New-Item -ItemType Directory -Path $runsRoot -Force | Out-Null }
    $indexPath = Join-Path $runsRoot "index.json"
    if (-not (Test-Path -LiteralPath $indexPath)) {
        Write-JsonObject -Path $indexPath -Data ([ordered]@{ runs = @() })
    }
}

function Read-RunIndex {
    param([string]$WorkspaceRoot)
    Ensure-RunsStore -WorkspaceRoot $WorkspaceRoot
    $doc = Read-JsonObject -Path (Join-Path $WorkspaceRoot "runs\index.json")
    if (-not $doc.ContainsKey("runs") -or $null -eq $doc.runs) { $doc["runs"] = @() }
    return $doc
}

function Write-RunIndex {
    param([string]$WorkspaceRoot, [hashtable]$IndexDoc)
    $IndexDoc["runs"] = @($IndexDoc.runs | Sort-Object -Property run_id)
    Write-JsonObject -Path (Join-Path $WorkspaceRoot "runs\index.json") -Data $IndexDoc
}

function Get-TaskTypeForRepo {
    param([string]$RepoKey)
    if ([string]::IsNullOrWhiteSpace($RepoKey)) { return "unknown" }
    if ($RepoKey -eq "frontend") { return "frontend" }
    if ($RepoKey -eq "backend") { return "backend" }
    if ($RepoKey -eq "desktop_legacy") { return "tooling" }
    return "unknown"
}

function Get-FlowTypeForRepo {
    param([string]$RepoKey)
    if ([string]::IsNullOrWhiteSpace($RepoKey)) { return "unknown" }
    if ($RepoKey -eq "frontend") { return "frontend" }
    if ($RepoKey -eq "backend") { return "backend" }
    if ($RepoKey -eq "desktop_legacy") { return "tooling" }
    return "unknown"
}

function Get-FlowTypeForTaskType {
    param([string]$TaskType)
    if ([string]::IsNullOrWhiteSpace($TaskType)) { return "unknown" }
    if ($TaskType -eq "frontend") { return "frontend" }
    if ($TaskType -eq "backend") { return "backend" }
    if ($TaskType -in @("fullstack", "mixed")) { return "fullstack" }
    if ($TaskType -eq "tooling") { return "tooling" }
    return "unknown"
}

function Resolve-FlowType {
    param(
        [string]$ExplicitFlow,
        [string]$RepoKey,
        [string]$TaskType
    )
    if (-not [string]::IsNullOrWhiteSpace($ExplicitFlow)) { return $ExplicitFlow.Trim().ToLowerInvariant() }
    $repoFlow = Get-FlowTypeForRepo -RepoKey $RepoKey
    if ($repoFlow -ne "unknown") { return $repoFlow }
    $taskFlow = Get-FlowTypeForTaskType -TaskType $TaskType
    if ($taskFlow -ne "unknown") { return $taskFlow }
    return "frontend"
}

function Get-FlowDefaults {
    param([string]$FlowType)
    $flow = if ([string]::IsNullOrWhiteSpace($FlowType)) { "frontend" } else { $FlowType.Trim().ToLowerInvariant() }
    switch ($flow) {
        "backend" {
            return [ordered]@{
                flow_type                  = "backend"
                task_type                  = "backend"
                execution_engine           = "claude"
                requires_visual_approval   = $false
                requires_runtime_validation = $true
                runtime_validation_mode    = "contract_service"
                ui_changed                 = $false
                touches_persistence        = $false
                touches_api_contract       = $true
                touches_navigation         = $false
                touches_saved_state        = $false
                touches_privacy_or_trust_copy = $false
                touches_external_api       = $false
                touches_database           = $false
            }
        }
        "fullstack" {
            return [ordered]@{
                flow_type                  = "fullstack"
                task_type                  = "fullstack"
                execution_engine           = "claude"
                requires_visual_approval   = $true
                requires_runtime_validation = $true
                runtime_validation_mode    = "fullstack_user_flow"
                ui_changed                 = $true
                touches_persistence        = $true
                touches_api_contract       = $true
                touches_navigation         = $false
                touches_saved_state        = $true
                touches_privacy_or_trust_copy = $false
                touches_external_api       = $false
                touches_database           = $false
            }
        }
        "tooling" {
            return [ordered]@{
                flow_type                  = "tooling"
                task_type                  = "tooling"
                execution_engine           = "claude"
                requires_visual_approval   = $false
                requires_runtime_validation = $false
                runtime_validation_mode    = "tooling_behavior"
                ui_changed                 = $false
                touches_persistence        = $false
                touches_api_contract       = $false
                touches_navigation         = $false
                touches_saved_state        = $false
                touches_privacy_or_trust_copy = $false
                touches_external_api       = $false
                touches_database           = $false
            }
        }
        default {
            return [ordered]@{
                flow_type                  = "frontend"
                task_type                  = "frontend"
                execution_engine           = "claude"
                requires_visual_approval   = $true
                requires_runtime_validation = $true
                runtime_validation_mode    = "ui_workflow"
                ui_changed                 = $true
                touches_persistence        = $false
                touches_api_contract       = $false
                touches_navigation         = $false
                touches_saved_state        = $false
                touches_privacy_or_trust_copy = $false
                touches_external_api       = $false
                touches_database           = $false
            }
        }
    }
}

function Get-DefaultImplementationEngine {
    param([string]$TaskType, [bool]$NeedsRepairPass)
    if ($TaskType -eq "unknown") { return "none" }
    if ($NeedsRepairPass -and $TaskType -eq "frontend") { return "cursor" }
    return "claude"
}

function Get-EngineLabel {
    param([string]$ExecutionEngine)
    $engine = [string]$ExecutionEngine
    if ($engine -eq "claude") { return "Claude" }
    if ($engine -eq "cursor") { return "Cursor" }
    if ($engine -eq "codex") { return "Codex" }
    if ($engine -eq "chatgpt") { return "ChatGPT" }
    return "Unknown engine"
}

function Ensure-RunContext {
    param([string]$Path)
    $default = [ordered]@{
        task_id                  = $null
        repo                     = $null
        branch                   = $null
        flow_type                = "frontend"
        task_type                = "unknown"
        execution_engine         = "none"
        last_implementation_engine = "none"
        requires_visual_approval = $false
        requires_runtime_validation = $false
        runtime_validation_mode  = "none"
        runtime_validation_completed = $false
        touches_persistence      = $false
        touches_navigation       = $false
        touches_import_flow      = $false
        touches_api_contract     = $false
        touches_external_api     = $false
        touches_database         = $false
        touches_saved_state      = $false
        touches_privacy_or_trust_copy = $false
        supervisor_state         = "healthy"
        retry_count              = 0
        last_retry_at            = ""
        next_retry_at            = ""
        last_error_type          = ""
        last_error_message       = ""
        last_successful_progress_at = ""
        worker_heartbeat_path    = ""
        has_design_reference     = $false
        design_reference_path    = ""
        notification_state       = "none"
        last_notification_at     = ""
        last_notified_reason     = ""
        claude_adapter_mode      = "unknown"
        claude_execution_last_result = ""
        claude_execution_last_command = ""
        claude_execution_last_attempt_at = ""
        codex_adapter_mode       = "unknown"
        codex_execution_last_result = ""
        codex_execution_last_command = ""
        codex_execution_last_attempt_at = ""
        ui_changed               = $false
        needs_repair_pass        = $false
        phase                    = ""
        status                   = ""
        started_at               = ""
        updated_at               = ""
        pending_action           = "idle"
        commit_decision          = "undecided"
    }
    if (-not (Test-Path -LiteralPath $Path)) {
        Write-JsonObject -Path $Path -Data $default
        return
    }
    $current = Read-JsonObject -Path $Path
    foreach ($k in $default.Keys) { if (-not $current.ContainsKey($k)) { $current[$k] = $default[$k] } }
    Write-JsonObject -Path $Path -Data $current
}

function Ensure-StateFile {
    param([string]$Path)
    if (Test-Path -LiteralPath $Path) { return }
    Write-JsonObject -Path $Path -Data ([ordered]@{
        task_id                  = $null
        phase                    = ""
        status                   = ""
        flow_type                = "frontend"
        task_type                = "unknown"
        execution_engine         = "none"
        requires_visual_approval = $false
        requires_runtime_validation = $false
        runtime_validation_mode  = "none"
        runtime_validation_completed = $false
        touches_persistence      = $false
        touches_navigation       = $false
        touches_import_flow      = $false
        touches_api_contract     = $false
        touches_external_api     = $false
        touches_database         = $false
        touches_saved_state      = $false
        touches_privacy_or_trust_copy = $false
        supervisor_state         = "healthy"
        retry_count              = 0
        last_retry_at            = ""
        next_retry_at            = ""
        last_error_type          = ""
        last_error_message       = ""
        last_successful_progress_at = ""
        worker_heartbeat_path    = ""
        has_design_reference     = $false
        design_reference_path    = ""
        notification_state       = "none"
        last_notification_at     = ""
        last_notified_reason     = ""
        ui_changed               = $false
        needs_repair_pass        = $false
        claude_adapter_mode      = "unknown"
        claude_execution_last_result = ""
        claude_execution_last_command = ""
        claude_execution_last_attempt_at = ""
        codex_adapter_mode       = "unknown"
        codex_execution_last_result = ""
        codex_execution_last_command = ""
        codex_execution_last_attempt_at = ""
        iteration                = 0
    })
}

function Normalize-RunStateAndContext {
    param([string]$StatePath, [string]$RunContextPath)

    Ensure-StateFile -Path $StatePath
    Ensure-RunContext -Path $RunContextPath

    $state = Read-JsonObject -Path $StatePath
    $runContext = Read-JsonObject -Path $RunContextPath

    foreach ($k in @("flow_type", "task_type", "execution_engine", "ui_changed", "needs_repair_pass", "phase", "status", "requires_visual_approval", "requires_runtime_validation", "runtime_validation_mode", "runtime_validation_completed", "touches_persistence", "touches_navigation", "touches_import_flow", "touches_api_contract", "touches_external_api", "touches_database", "touches_saved_state", "touches_privacy_or_trust_copy", "supervisor_state", "retry_count", "last_retry_at", "next_retry_at", "last_error_type", "last_error_message", "last_successful_progress_at", "worker_heartbeat_path", "has_design_reference", "design_reference_path", "notification_state", "last_notification_at", "last_notified_reason", "claude_adapter_mode", "claude_execution_last_result", "claude_execution_last_command", "claude_execution_last_attempt_at", "codex_adapter_mode", "codex_execution_last_result", "codex_execution_last_command", "codex_execution_last_attempt_at", "iteration")) {
        if (-not $state.ContainsKey($k)) {
            if ($k -eq "flow_type") { $state[$k] = "frontend" }
            elseif ($k -eq "task_type") { $state[$k] = "unknown" }
            elseif ($k -eq "execution_engine") { $state[$k] = "none" }
            elseif ($k -eq "runtime_validation_mode") { $state[$k] = "none" }
            elseif ($k -eq "supervisor_state") { $state[$k] = "healthy" }
            elseif ($k -eq "retry_count") { $state[$k] = 0 }
            elseif ($k -eq "notification_state") { $state[$k] = "none" }
            elseif ($k -eq "has_design_reference") { $state[$k] = $false }
            elseif ($k -eq "claude_adapter_mode") { $state[$k] = "unknown" }
            elseif ($k -eq "codex_adapter_mode") { $state[$k] = "unknown" }
            elseif ($k -in @("last_retry_at", "next_retry_at", "last_error_type", "last_error_message", "last_successful_progress_at", "worker_heartbeat_path", "design_reference_path", "last_notification_at", "last_notified_reason", "claude_execution_last_result", "claude_execution_last_command", "claude_execution_last_attempt_at", "codex_execution_last_result", "codex_execution_last_command", "codex_execution_last_attempt_at")) { $state[$k] = "" }
            elseif ($k -in @("phase", "status")) { $state[$k] = "" }
            elseif ($k -eq "iteration") { $state[$k] = 0 }
            else { $state[$k] = $false }
        }
    }

    foreach ($k in @("flow_type", "task_type", "execution_engine", "ui_changed", "needs_repair_pass", "phase", "status", "requires_visual_approval", "requires_runtime_validation", "runtime_validation_mode", "runtime_validation_completed", "touches_persistence", "touches_navigation", "touches_import_flow", "touches_api_contract", "touches_external_api", "touches_database", "touches_saved_state", "touches_privacy_or_trust_copy", "supervisor_state", "retry_count", "last_retry_at", "next_retry_at", "last_error_type", "last_error_message", "last_successful_progress_at", "worker_heartbeat_path", "has_design_reference", "design_reference_path", "notification_state", "last_notification_at", "last_notified_reason", "claude_adapter_mode", "claude_execution_last_result", "claude_execution_last_command", "claude_execution_last_attempt_at", "codex_adapter_mode", "codex_execution_last_result", "codex_execution_last_command", "codex_execution_last_attempt_at")) {
        if (-not $runContext.ContainsKey($k)) {
            if ($k -eq "flow_type") { $runContext[$k] = "frontend" }
            elseif ($k -eq "task_type") { $runContext[$k] = "unknown" }
            elseif ($k -eq "execution_engine") { $runContext[$k] = "none" }
            elseif ($k -eq "runtime_validation_mode") { $runContext[$k] = "none" }
            elseif ($k -eq "supervisor_state") { $runContext[$k] = "healthy" }
            elseif ($k -eq "retry_count") { $runContext[$k] = 0 }
            elseif ($k -eq "notification_state") { $runContext[$k] = "none" }
            elseif ($k -eq "has_design_reference") { $runContext[$k] = $false }
            elseif ($k -eq "claude_adapter_mode") { $runContext[$k] = "unknown" }
            elseif ($k -eq "codex_adapter_mode") { $runContext[$k] = "unknown" }
            elseif ($k -in @("last_retry_at", "next_retry_at", "last_error_type", "last_error_message", "last_successful_progress_at", "worker_heartbeat_path", "design_reference_path", "last_notification_at", "last_notified_reason", "claude_execution_last_result", "claude_execution_last_command", "claude_execution_last_attempt_at", "codex_execution_last_result", "codex_execution_last_command", "codex_execution_last_attempt_at")) { $runContext[$k] = "" }
            elseif ($k -in @("phase", "status")) { $runContext[$k] = "" }
            else { $runContext[$k] = $false }
        }
    }

    $repo = [string]$runContext.repo
    $phase = [string]$state.phase
    $status = [string]$state.status
    if ([string]::IsNullOrWhiteSpace($phase)) { $phase = [string]$runContext.phase }
    if ([string]::IsNullOrWhiteSpace($status)) { $status = [string]$runContext.status }

    $flowType = [string]$state.flow_type
    if ([string]::IsNullOrWhiteSpace($flowType)) { $flowType = [string]$runContext.flow_type }
    $flowType = Resolve-FlowType -ExplicitFlow $flowType -RepoKey $repo -TaskType ([string]$state.task_type)
    $flowDefaults = Get-FlowDefaults -FlowType $flowType

    $taskType = [string]$state.task_type
    if ([string]::IsNullOrWhiteSpace($taskType) -or $taskType -eq "unknown") {
        $taskType = [string]$runContext.task_type
    }
    if ([string]::IsNullOrWhiteSpace($taskType) -or $taskType -eq "unknown") {
        $taskType = [string]$flowDefaults.task_type
    }
    if ([string]::IsNullOrWhiteSpace($taskType) -or $taskType -eq "unknown") {
        $taskType = Get-TaskTypeForRepo -RepoKey $repo
    }
    if ([string]::IsNullOrWhiteSpace($taskType)) { $taskType = "unknown" }

    $requiresVisualApproval = [bool]$state.requires_visual_approval
    if ([bool]$runContext.requires_visual_approval) { $requiresVisualApproval = $true }
    if ($flowType -in @("frontend", "fullstack") -and -not $requiresVisualApproval) { $requiresVisualApproval = $true }
    $requiresRuntimeValidation = [bool]$state.requires_runtime_validation -or [bool]$runContext.requires_runtime_validation
    if ($flowType -in @("frontend", "backend", "fullstack") -and -not $requiresRuntimeValidation) { $requiresRuntimeValidation = $true }
    $runtimeValidationCompleted = [bool]$state.runtime_validation_completed -or [bool]$runContext.runtime_validation_completed
    $runtimeValidationMode = [string]$state.runtime_validation_mode
    if ([string]::IsNullOrWhiteSpace($runtimeValidationMode) -or $runtimeValidationMode -eq "none") {
        $runtimeValidationMode = [string]$runContext.runtime_validation_mode
    }
    if ([string]::IsNullOrWhiteSpace($runtimeValidationMode) -or $runtimeValidationMode -eq "none") {
        $runtimeValidationMode = [string]$flowDefaults.runtime_validation_mode
    }
    if ($flowType -in @("frontend", "fullstack") -and -not $requiresRuntimeValidation) {
        $requiresRuntimeValidation = $true
    }
    if ($status -in @("awaiting_runtime_validation", "runtime_validation_in_progress", "runtime_validation_failed", "runtime_validation_complete")) {
        $requiresRuntimeValidation = $true
    }

    $touchesPersistence = [bool]$state.touches_persistence -or [bool]$runContext.touches_persistence
    $touchesNavigation = [bool]$state.touches_navigation -or [bool]$runContext.touches_navigation
    $touchesImportFlow = [bool]$state.touches_import_flow -or [bool]$runContext.touches_import_flow
    $touchesApiContract = [bool]$state.touches_api_contract -or [bool]$runContext.touches_api_contract
    $touchesExternalApi = [bool]$state.touches_external_api -or [bool]$runContext.touches_external_api
    $touchesDatabase = [bool]$state.touches_database -or [bool]$runContext.touches_database
    $touchesSavedState = [bool]$state.touches_saved_state -or [bool]$runContext.touches_saved_state
    $touchesPrivacyTrust = [bool]$state.touches_privacy_or_trust_copy -or [bool]$runContext.touches_privacy_or_trust_copy
    $supervisorState = [string]$state.supervisor_state
    if ([string]::IsNullOrWhiteSpace($supervisorState)) { $supervisorState = [string]$runContext.supervisor_state }
    if ([string]::IsNullOrWhiteSpace($supervisorState)) { $supervisorState = "healthy" }
    if ($supervisorState -notin @("healthy", "worker_retrying", "worker_degraded", "worker_blocked", "awaiting_reconnect")) { $supervisorState = "healthy" }
    $retryCount = [int]$state.retry_count
    if ($retryCount -le 0 -and [int]$runContext.retry_count -gt 0) { $retryCount = [int]$runContext.retry_count }
    if ($retryCount -lt 0) { $retryCount = 0 }
    $lastRetryAt = [string]$state.last_retry_at
    if ([string]::IsNullOrWhiteSpace($lastRetryAt)) { $lastRetryAt = [string]$runContext.last_retry_at }
    $nextRetryAt = [string]$state.next_retry_at
    if ([string]::IsNullOrWhiteSpace($nextRetryAt)) { $nextRetryAt = [string]$runContext.next_retry_at }
    $lastErrorType = [string]$state.last_error_type
    if ([string]::IsNullOrWhiteSpace($lastErrorType)) { $lastErrorType = [string]$runContext.last_error_type }
    $lastErrorMessage = [string]$state.last_error_message
    if ([string]::IsNullOrWhiteSpace($lastErrorMessage)) { $lastErrorMessage = [string]$runContext.last_error_message }
    $lastSuccessfulProgressAt = [string]$state.last_successful_progress_at
    if ([string]::IsNullOrWhiteSpace($lastSuccessfulProgressAt)) { $lastSuccessfulProgressAt = [string]$runContext.last_successful_progress_at }
    $workerHeartbeatPath = [string]$state.worker_heartbeat_path
    if ([string]::IsNullOrWhiteSpace($workerHeartbeatPath)) { $workerHeartbeatPath = [string]$runContext.worker_heartbeat_path }
    if ([string]::IsNullOrWhiteSpace($workerHeartbeatPath)) {
        $stateDir = Split-Path -Parent $StatePath
        $runRoot = Split-Path -Parent $stateDir
        $workerHeartbeatPath = [string](Join-Path $runRoot "artifacts\worker-heartbeat.json")
    }
    $designReferencePath = [string]$state.design_reference_path
    if ([string]::IsNullOrWhiteSpace($designReferencePath)) { $designReferencePath = [string]$runContext.design_reference_path }
    if ([string]::IsNullOrWhiteSpace($designReferencePath)) {
        $stateDir = Split-Path -Parent $StatePath
        $runRoot = Split-Path -Parent $stateDir
        $designReferencePath = [string](Join-Path $runRoot "artifacts\design-reference")
    }
    if (-not [System.IO.Path]::IsPathRooted($designReferencePath)) {
        $stateDir = Split-Path -Parent $StatePath
        $runRoot = Split-Path -Parent $stateDir
        $designReferencePath = [string](Join-Path $runRoot $designReferencePath)
    }
    $safeRunRoot = Split-Path -Parent $StatePath
    try {
        if (-not [string]::IsNullOrWhiteSpace($safeRunRoot)) {
            $resolvedDesignPath = [System.IO.Path]::GetFullPath($designReferencePath)
            $resolvedRunRoot = [System.IO.Path]::GetFullPath($safeRunRoot)
            if (-not $resolvedDesignPath.StartsWith($resolvedRunRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
                $designReferencePath = [string](Join-Path $resolvedRunRoot "artifacts\design-reference")
            }
        }
    }
    catch {
        if (-not [string]::IsNullOrWhiteSpace($safeRunRoot)) {
            $designReferencePath = [string](Join-Path $safeRunRoot "artifacts\design-reference")
        }
    }
    if (-not (Test-Path -LiteralPath $designReferencePath)) {
        New-Item -ItemType Directory -Path $designReferencePath -Force | Out-Null
    }
    $designReferenceHasFiles = @(
        Get-ChildItem -LiteralPath $designReferencePath -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -ne "design-notes.md" }
    ).Count -gt 0
    $hasDesignReference = $designReferenceHasFiles -or [bool]$state.has_design_reference -or [bool]$runContext.has_design_reference
    $notificationState = [string]$state.notification_state
    if ([string]::IsNullOrWhiteSpace($notificationState)) { $notificationState = [string]$runContext.notification_state }
    if ([string]::IsNullOrWhiteSpace($notificationState)) { $notificationState = "none" }
    $lastNotificationAt = [string]$state.last_notification_at
    if ([string]::IsNullOrWhiteSpace($lastNotificationAt)) { $lastNotificationAt = [string]$runContext.last_notification_at }
    $lastNotifiedReason = [string]$state.last_notified_reason
    if ([string]::IsNullOrWhiteSpace($lastNotifiedReason)) { $lastNotifiedReason = [string]$runContext.last_notified_reason }
    $claudeAdapterMode = [string]$state.claude_adapter_mode
    if ([string]::IsNullOrWhiteSpace($claudeAdapterMode)) { $claudeAdapterMode = [string]$runContext.claude_adapter_mode }
    if ([string]::IsNullOrWhiteSpace($claudeAdapterMode)) { $claudeAdapterMode = "unknown" }
    $claudeExecutionLastResult = [string]$state.claude_execution_last_result
    if ([string]::IsNullOrWhiteSpace($claudeExecutionLastResult)) { $claudeExecutionLastResult = [string]$runContext.claude_execution_last_result }
    $claudeExecutionLastCommand = [string]$state.claude_execution_last_command
    if ([string]::IsNullOrWhiteSpace($claudeExecutionLastCommand)) { $claudeExecutionLastCommand = [string]$runContext.claude_execution_last_command }
    $claudeExecutionLastAttemptAt = [string]$state.claude_execution_last_attempt_at
    if ([string]::IsNullOrWhiteSpace($claudeExecutionLastAttemptAt)) { $claudeExecutionLastAttemptAt = [string]$runContext.claude_execution_last_attempt_at }
    $codexAdapterMode = [string]$state.codex_adapter_mode
    if ([string]::IsNullOrWhiteSpace($codexAdapterMode)) { $codexAdapterMode = [string]$runContext.codex_adapter_mode }
    if ([string]::IsNullOrWhiteSpace($codexAdapterMode)) { $codexAdapterMode = "unknown" }
    $codexExecutionLastResult = [string]$state.codex_execution_last_result
    if ([string]::IsNullOrWhiteSpace($codexExecutionLastResult)) { $codexExecutionLastResult = [string]$runContext.codex_execution_last_result }
    $codexExecutionLastCommand = [string]$state.codex_execution_last_command
    if ([string]::IsNullOrWhiteSpace($codexExecutionLastCommand)) { $codexExecutionLastCommand = [string]$runContext.codex_execution_last_command }
    $codexExecutionLastAttemptAt = [string]$state.codex_execution_last_attempt_at
    if ([string]::IsNullOrWhiteSpace($codexExecutionLastAttemptAt)) { $codexExecutionLastAttemptAt = [string]$runContext.codex_execution_last_attempt_at }
    $needsRepairPass = [bool]$state.needs_repair_pass -or [bool]$runContext.needs_repair_pass -or ($status -in @("needs_visual_revision", "needs_repair_pass"))
    $uiChanged = [bool]$state.ui_changed -or [bool]$runContext.ui_changed -or $requiresVisualApproval -or [bool]$flowDefaults.ui_changed
    if ($flowType -eq "fullstack") {
        $touchesPersistence = $true
        $touchesApiContract = $true
    }
    if ($flowType -eq "backend") {
        $touchesApiContract = $true
    }

    $engine = [string]$state.execution_engine
    if ([string]::IsNullOrWhiteSpace($engine) -or $engine -eq "none") {
        $engine = [string]$runContext.execution_engine
    }

    if (($phase -eq "D") -or ($status -in @("ready_for_codex", "hardening", "approved_for_hardening"))) {
        $engine = "codex"
    }
    elseif (($phase -eq "E") -or ($status -in @("ready_for_final_judgment", "final_review", "merge_ready"))) {
        $engine = "chatgpt"
    }
    elseif (($phase -eq "C") -or ($status -in @("ready_for_claude", "ready_for_cursor", "implementation_ready", "implementation_in_progress", "needs_visual_revision", "needs_repair_pass", "awaiting_visual_approval", "awaiting_runtime_validation", "runtime_validation_in_progress", "runtime_validation_failed"))) {
        if ($status -eq "ready_for_cursor") { $engine = "cursor" }
        elseif ($status -eq "ready_for_claude") { $engine = "claude" }
        elseif ($status -in @("awaiting_runtime_validation", "runtime_validation_in_progress")) { $engine = "none" }
        elseif ($engine -notin @("claude", "cursor")) {
            $engine = Get-DefaultImplementationEngine -TaskType $taskType -NeedsRepairPass $needsRepairPass
        }
    }
    elseif (($phase -eq "B") -and $engine -notin @("claude", "cursor", "chatgpt")) {
        $engine = Get-DefaultImplementationEngine -TaskType $taskType -NeedsRepairPass $needsRepairPass
    }

    if ([string]::IsNullOrWhiteSpace($engine)) { $engine = "none" }

    $state.phase = $phase
    $state.status = $status
    $state.flow_type = $flowType
    $state.task_type = $taskType
    $state.execution_engine = $engine
    $state.requires_visual_approval = $requiresVisualApproval
    $state.requires_runtime_validation = [bool]$requiresRuntimeValidation
    $state.runtime_validation_mode = $runtimeValidationMode
    $state.runtime_validation_completed = [bool]$runtimeValidationCompleted
    $state.touches_persistence = [bool]$touchesPersistence
    $state.touches_navigation = [bool]$touchesNavigation
    $state.touches_import_flow = [bool]$touchesImportFlow
    $state.touches_api_contract = [bool]$touchesApiContract
    $state.touches_external_api = [bool]$touchesExternalApi
    $state.touches_database = [bool]$touchesDatabase
    $state.touches_saved_state = [bool]$touchesSavedState
    $state.touches_privacy_or_trust_copy = [bool]$touchesPrivacyTrust
    $state.supervisor_state = $supervisorState
    $state.retry_count = [int]$retryCount
    $state.last_retry_at = $lastRetryAt
    $state.next_retry_at = $nextRetryAt
    $state.last_error_type = $lastErrorType
    $state.last_error_message = $lastErrorMessage
    $state.last_successful_progress_at = $lastSuccessfulProgressAt
    $state.worker_heartbeat_path = $workerHeartbeatPath
    $state.design_reference_path = $designReferencePath
    $state.has_design_reference = [bool]$hasDesignReference
    $state.notification_state = $notificationState
    $state.last_notification_at = $lastNotificationAt
    $state.last_notified_reason = $lastNotifiedReason
    $state.claude_adapter_mode = $claudeAdapterMode
    $state.claude_execution_last_result = $claudeExecutionLastResult
    $state.claude_execution_last_command = $claudeExecutionLastCommand
    $state.claude_execution_last_attempt_at = $claudeExecutionLastAttemptAt
    $state.codex_adapter_mode = $codexAdapterMode
    $state.codex_execution_last_result = $codexExecutionLastResult
    $state.codex_execution_last_command = $codexExecutionLastCommand
    $state.codex_execution_last_attempt_at = $codexExecutionLastAttemptAt
    $state.ui_changed = [bool]$uiChanged
    $state.needs_repair_pass = [bool]$needsRepairPass
    if ($null -eq $state.iteration) { $state.iteration = 0 }

    $runContext.flow_type = $flowType
    $runContext.task_type = $taskType
    $runContext.execution_engine = $engine
    $runContext.requires_visual_approval = $requiresVisualApproval
    $runContext.requires_runtime_validation = [bool]$requiresRuntimeValidation
    $runContext.runtime_validation_mode = $runtimeValidationMode
    $runContext.runtime_validation_completed = [bool]$runtimeValidationCompleted
    $runContext.touches_persistence = [bool]$touchesPersistence
    $runContext.touches_navigation = [bool]$touchesNavigation
    $runContext.touches_import_flow = [bool]$touchesImportFlow
    $runContext.touches_api_contract = [bool]$touchesApiContract
    $runContext.touches_external_api = [bool]$touchesExternalApi
    $runContext.touches_database = [bool]$touchesDatabase
    $runContext.touches_saved_state = [bool]$touchesSavedState
    $runContext.touches_privacy_or_trust_copy = [bool]$touchesPrivacyTrust
    $runContext.supervisor_state = $supervisorState
    $runContext.retry_count = [int]$retryCount
    $runContext.last_retry_at = $lastRetryAt
    $runContext.next_retry_at = $nextRetryAt
    $runContext.last_error_type = $lastErrorType
    $runContext.last_error_message = $lastErrorMessage
    $runContext.last_successful_progress_at = $lastSuccessfulProgressAt
    $runContext.worker_heartbeat_path = $workerHeartbeatPath
    $runContext.design_reference_path = $designReferencePath
    $runContext.has_design_reference = [bool]$hasDesignReference
    $runContext.notification_state = $notificationState
    $runContext.last_notification_at = $lastNotificationAt
    $runContext.last_notified_reason = $lastNotifiedReason
    $runContext.claude_adapter_mode = $claudeAdapterMode
    $runContext.claude_execution_last_result = $claudeExecutionLastResult
    $runContext.claude_execution_last_command = $claudeExecutionLastCommand
    $runContext.claude_execution_last_attempt_at = $claudeExecutionLastAttemptAt
    $runContext.codex_adapter_mode = $codexAdapterMode
    $runContext.codex_execution_last_result = $codexExecutionLastResult
    $runContext.codex_execution_last_command = $codexExecutionLastCommand
    $runContext.codex_execution_last_attempt_at = $codexExecutionLastAttemptAt
    $runContext.ui_changed = [bool]$uiChanged
    $runContext.needs_repair_pass = [bool]$needsRepairPass
    $runContext.phase = $phase
    $runContext.status = $status

    Write-JsonObject -Path $StatePath -Data $state
    Write-JsonObject -Path $RunContextPath -Data $runContext

    return [ordered]@{
        state       = $state
        run_context = $runContext
    }
}

function Update-RunContext {
    param([string]$Path, [hashtable]$Current, [hashtable]$Changes)
    foreach ($k in $Changes.Keys) { $Current[$k] = $Changes[$k] }
    $Current.updated_at = Get-NowIso
    Write-JsonObject -Path $Path -Data $Current
}

function Set-CurrentRunId {
    param([string]$WorkspaceRoot, [string]$RunId)
    Assert-ValidRunId -Value $RunId
    Set-Content -LiteralPath (Join-Path $WorkspaceRoot "runs\current-run.txt") -Value $RunId -Encoding utf8
}

function Clear-CurrentRunId {
    param([string]$WorkspaceRoot)
    $path = Join-Path $WorkspaceRoot "runs\current-run.txt"
    if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Force
    }
}

function Get-CurrentRunId {
    param([string]$WorkspaceRoot)
    $path = Join-Path $WorkspaceRoot "runs\current-run.txt"
    if (-not (Test-Path -LiteralPath $path)) {
        throw "No current run selected. Use '.\pp.ps1 start -TaskId <run-id> ...' or '.\pp.ps1 use <run-id>'."
    }
    $runId = (Get-Content -LiteralPath $path -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($runId)) { throw "Current run file is empty: $path" }
    Assert-ValidRunId -Value $runId
    return $runId
}

function Resolve-ActiveRun {
    param([string]$WorkspaceRoot)
    $runId = Get-CurrentRunId -WorkspaceRoot $WorkspaceRoot
    $paths = Get-RunPaths -WorkspaceRoot $WorkspaceRoot -RunId $runId
    foreach ($required in @($paths.run_root, $paths.state_path, $paths.run_context_path)) {
        if (-not (Test-Path -LiteralPath $required)) { throw "Current run '$runId' is missing required path: $required" }
    }
    $null = Normalize-RunStateAndContext -StatePath $paths.state_path -RunContextPath $paths.run_context_path
    return [ordered]@{ run_id = $runId; paths = $paths }
}

function Get-ArchivedRunsRoot {
    param([string]$WorkspaceRoot)
    return Join-Path $WorkspaceRoot "archived-runs"
}

function Get-ArchiveBatchPath {
    param([string]$WorkspaceRoot, [string]$BatchLabel)
    $safeLabel = if ([string]::IsNullOrWhiteSpace($BatchLabel)) { Get-Date -Format "yyyyMMdd-HHmmss" } else { $BatchLabel }
    return Join-Path (Get-ArchivedRunsRoot -WorkspaceRoot $WorkspaceRoot) $safeLabel
}

function Resolve-RunsToArchive {
    param(
        [string]$WorkspaceRoot,
        [string]$RunId,
        [switch]$AllRuns
    )

    if ($AllRuns.IsPresent -and -not [string]::IsNullOrWhiteSpace($RunId)) {
        throw "archive-runs cannot use both -AllRuns and -RunId."
    }

    $indexDoc = Read-RunIndex -WorkspaceRoot $WorkspaceRoot
    $rows = @($indexDoc.runs)

    if ($AllRuns.IsPresent) {
        return @($rows | Where-Object { -not [bool]$_.archived })
    }

    if (-not [string]::IsNullOrWhiteSpace($RunId)) {
        $rid = $RunId.Trim()
        Assert-ValidRunId -Value $rid
        $entry = Get-RunRecord -IndexDoc $indexDoc -RunId $rid
        if ($null -eq $entry) { throw "Run '$rid' was not found in runs/index.json." }
        if ([bool]$entry.archived) { throw "Run '$rid' is already archived." }
        return @($entry)
    }

    throw "archive-runs requires either -AllRuns or -RunId <run-id>."
}

function Invoke-ArchiveRuns {
    param(
        [string]$WorkspaceRoot,
        [string]$RunId,
        [switch]$AllRuns
    )

    $targets = @(Resolve-RunsToArchive -WorkspaceRoot $WorkspaceRoot -RunId $RunId -AllRuns:$AllRuns)
    if ($targets.Count -eq 0) {
        Write-Host "Archive Runs"
        Write-Host "No active runs matched the request."
        return
    }

    $batchLabel = Get-Date -Format "yyyyMMdd-HHmmss"
    $archiveRoot = Get-ArchivedRunsRoot -WorkspaceRoot $WorkspaceRoot
    $batchPath = Get-ArchiveBatchPath -WorkspaceRoot $WorkspaceRoot -BatchLabel $batchLabel
    if (-not (Test-Path -LiteralPath $archiveRoot)) { New-Item -ItemType Directory -Path $archiveRoot -Force | Out-Null }
    if (-not (Test-Path -LiteralPath $batchPath)) { New-Item -ItemType Directory -Path $batchPath -Force | Out-Null }

    $indexDoc = Read-RunIndex -WorkspaceRoot $WorkspaceRoot
    $currentRunId = $null
    try { $currentRunId = Get-CurrentRunId -WorkspaceRoot $WorkspaceRoot } catch { }
    $archivedCurrent = $false
    $moved = New-Object System.Collections.ArrayList

    foreach ($target in $targets) {
        $rid = [string]$target.run_id
        Assert-ValidRunId -Value $rid
        $paths = Get-RunPaths -WorkspaceRoot $WorkspaceRoot -RunId $rid
        $destination = Join-Path $batchPath $rid

        if (-not (Test-Path -LiteralPath $paths.run_root)) {
            throw "Run folder missing for '$rid': $($paths.run_root)"
        }
        if (Test-Path -LiteralPath $destination) {
            throw "Archive destination already exists for '$rid': $destination"
        }

        Move-Item -LiteralPath $paths.run_root -Destination $destination
        [void]$moved.Add([ordered]@{ run_id = $rid; destination = $destination })

        foreach ($row in @($indexDoc.runs)) {
            if ([string]$row.run_id -ne $rid) { continue }
            $row["archived"] = $true
            $row["archived_at"] = Get-NowIso
            $row["archive_path"] = $destination
        }

        if ([string]$currentRunId -eq $rid) { $archivedCurrent = $true }
    }

    Write-RunIndex -WorkspaceRoot $WorkspaceRoot -IndexDoc $indexDoc

    if ($archivedCurrent) {
        $replacement = @($indexDoc.runs | Where-Object { -not [bool]$_.archived } | Sort-Object -Property updated_at -Descending | Select-Object -First 1)
        if ($replacement.Count -gt 0) {
            Set-CurrentRunId -WorkspaceRoot $WorkspaceRoot -RunId ([string]$replacement[0].run_id)
            $newCurrent = [string]$replacement[0].run_id
        }
        else {
            Clear-CurrentRunId -WorkspaceRoot $WorkspaceRoot
            $newCurrent = ""
        }
    }
    else {
        $newCurrent = if (-not [string]::IsNullOrWhiteSpace($currentRunId)) { [string]$currentRunId } else { "" }
    }

    Write-Host "Archive Runs"
    Write-Host "Archive batch: $batchPath"
    Write-Host "Archived count: $($moved.Count)"
    foreach ($entry in @($moved)) {
        Write-Host "  - $([string]$entry.run_id) -> $([string]$entry.destination)"
    }
    if ($archivedCurrent) {
        if ([string]::IsNullOrWhiteSpace($newCurrent)) {
            Write-Host "Current run marker cleared."
        }
        else {
            Write-Host "Current run marker repaired to: $newCurrent"
        }
    }
    elseif (-not [string]::IsNullOrWhiteSpace($newCurrent)) {
        Write-Host "Current run marker unchanged: $newCurrent"
    }
    else {
        Write-Host "Current run marker remains unset."
    }
    Write-Host "Archived runs remain reversible inside: $archiveRoot"
}

function Get-RunRecord {
    param([hashtable]$IndexDoc, [string]$RunId)
    foreach ($entry in @($IndexDoc.runs)) { if ([string]$entry.run_id -eq $RunId) { return $entry } }
    return $null
}

function Sync-RunIndexRecord {
    param([string]$WorkspaceRoot, [string]$RunId, [hashtable]$State, [hashtable]$RunContext)
    $indexDoc = Read-RunIndex -WorkspaceRoot $WorkspaceRoot
    $existing = Get-RunRecord -IndexDoc $indexDoc -RunId $RunId
    $created = if ($null -ne $existing -and -not [string]::IsNullOrWhiteSpace([string]$existing.created_at)) { [string]$existing.created_at } elseif (-not [string]::IsNullOrWhiteSpace([string]$RunContext.started_at)) { [string]$RunContext.started_at } else { Get-NowIso }
    $record = [ordered]@{
        run_id     = $RunId
        repo       = [string]$RunContext.repo
        branch     = [string]$RunContext.branch
        flow_type  = [string]$State.flow_type
        task_type  = [string]$State.task_type
        execution_engine = [string]$State.execution_engine
        phase      = [string]$State.phase
        status     = [string]$State.status
        created_at = $created
        updated_at = if (-not [string]::IsNullOrWhiteSpace([string]$RunContext.updated_at)) { [string]$RunContext.updated_at } else { Get-NowIso }
        archived   = if ($null -ne $existing -and $existing.ContainsKey("archived")) { [bool]$existing.archived } else { $false }
    }
    $other = @($indexDoc.runs | Where-Object { [string]$_.run_id -ne $RunId })
    $indexDoc.runs = $other + @($record)
    Write-RunIndex -WorkspaceRoot $WorkspaceRoot -IndexDoc $indexDoc
}

function Ensure-RunScaffold {
    param([string]$WorkspaceRoot, [string]$RunId)
    $paths = Get-RunPaths -WorkspaceRoot $WorkspaceRoot -RunId $RunId
    New-Item -ItemType Directory -Path $paths.run_root -Force | Out-Null
    New-Item -ItemType Directory -Path $paths.artifacts_dir -Force | Out-Null
    New-Item -ItemType Directory -Path $paths.design_reference_dir -Force | Out-Null
    New-Item -ItemType Directory -Path $paths.prompts_dir -Force | Out-Null
    Ensure-StateFile -Path $paths.state_path
    Ensure-RunContext -Path $paths.run_context_path
    if (-not (Test-Path -LiteralPath $paths.events_path)) { Set-Content -LiteralPath $paths.events_path -Value "" -Encoding utf8 }

    $seedMap = @(
        @{ target = $paths.task_path; source = Join-Path $WorkspaceRoot "ai-pipeline\task.md"; placeholder = "# Task`n" },
        @{ target = $paths.current_artifact_path; source = Join-Path $WorkspaceRoot "ai-pipeline\artifacts\current.md"; placeholder = "# Current Build Artifact`n" },
        @{ target = $paths.runtime_validation_path; source = ""; placeholder = "# Runtime Validation`n" },
        @{ target = $paths.worker_heartbeat_path; source = ""; placeholder = "{}`n" },
        @{ target = $paths.claude_handoff_path; source = ""; placeholder = "# Claude Handoff`n" },
        @{ target = $paths.claude_completion_path; source = ""; placeholder = "{}`n" },
        @{ target = $paths.codex_completion_path; source = ""; placeholder = "{}`n" },
        @{ target = $paths.codex_review_path; source = Join-Path $WorkspaceRoot "ai-pipeline\artifacts\codexReview.md"; placeholder = "# Codex Review`n" },
        @{ target = $paths.codex_handoff_path; source = Join-Path $WorkspaceRoot "ai-pipeline\artifacts\codex-handoff.md"; placeholder = "# Codex Hardening Handoff`n" },
        @{ target = $paths.final_review_prompt_path; source = Join-Path $WorkspaceRoot "ai-pipeline\artifacts\finalReviewPrompt.md"; placeholder = "# Final Review Prompt`n" },
        @{ target = $paths.visual_review_path; source = Join-Path $WorkspaceRoot "ai-pipeline\visual-review.md"; placeholder = "# Visual Review`n" },
        @{ target = $paths.cursor_prompt_path; source = Join-Path $WorkspaceRoot "ai-pipeline\prompts\cursor-implement.md"; placeholder = "# Cursor Implement Prompt`n" },
        @{ target = $paths.codex_prompt_path; source = Join-Path $WorkspaceRoot "ai-pipeline\prompts\codex-review.md"; placeholder = "# Codex Review Prompt`n" },
        @{ target = $paths.builder_prompt_path; source = ""; placeholder = "# Builder Prompt`n" },
        @{ target = $paths.codex_hardening_prompt_path; source = ""; placeholder = "# Codex Hardening Prompt`n" },
        @{ target = $paths.final_review_generated_prompt_path; source = ""; placeholder = "# Final Review Prompt`n" },
        @{ target = $paths.design_notes_path; source = ""; placeholder = "# Design Reference Notes`n`nUse this file to clarify UI design references in artifacts/design-reference/.`n`n- Primary reference file(s):`n- Must-match details:`n- Flexible details:`n- Intent behind references:`n" }
    )
    foreach ($entry in $seedMap) {
        if (-not (Test-Path -LiteralPath $entry.target)) {
            if (Test-Path -LiteralPath $entry.source) { Copy-Item -LiteralPath $entry.source -Destination $entry.target -Force }
            else { Set-Content -LiteralPath $entry.target -Value $entry.placeholder -Encoding utf8 }
        }
    }
    return $paths
}

function Add-RunEvent {
    param(
        [string]$RunId,
        [hashtable]$RunPaths,
        [hashtable]$State,
        [hashtable]$RunContext,
        [string]$Message,
        [string]$CommandName = "",
        [string]$Level = "info"
    )
    if ([string]::IsNullOrWhiteSpace($Message)) { return }
    if (-not (Test-Path -LiteralPath $RunPaths.events_path)) {
        Set-Content -LiteralPath $RunPaths.events_path -Value "" -Encoding utf8
    }
    $event = [ordered]@{
        timestamp        = Get-NowIso
        run_id           = $RunId
        level            = $Level
        command          = $CommandName
        phase            = [string]$State.phase
        status           = [string]$State.status
        execution_engine = [string]$State.execution_engine
        message          = $Message
    }
    $line = $event | ConvertTo-Json -Compress -Depth 8
    Add-Content -LiteralPath $RunPaths.events_path -Value $line -Encoding utf8
}

function Read-RunEvents {
    param([hashtable]$RunPaths, [int]$Tail = 0)
    if (-not (Test-Path -LiteralPath $RunPaths.events_path)) { return @() }
    $lines = @(Get-Content -LiteralPath $RunPaths.events_path | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $events = @()
    foreach ($line in $lines) {
        try { $events += ,($line | ConvertFrom-Json -AsHashtable) } catch { }
    }
    if ($Tail -gt 0 -and $events.Count -gt $Tail) {
        return @($events[($events.Count - $Tail)..($events.Count - 1)])
    }
    return @($events)
}

function Print-RunEvents {
    param([string]$RunId, [hashtable]$RunPaths, [int]$Tail = 5, [switch]$RecentOnly)
    $events = Read-RunEvents -RunPaths $RunPaths -Tail $Tail
    if ($events.Count -eq 0) {
        if ($RecentOnly) { return }
        Write-Host "No events recorded for run '$RunId'."
        return
    }
    $title = if ($RecentOnly) { "Recent pipeline events:" } else { "Pipeline events:" }
    Write-Host $title
    foreach ($evt in $events) {
        $ts = [string]$evt.timestamp
        $tsLabel = $ts
        try { $tsLabel = (Get-Date $ts).ToString("HH:mm:ss") } catch { }
        $phaseStatus = ""
        if (-not [string]::IsNullOrWhiteSpace([string]$evt.phase) -or -not [string]::IsNullOrWhiteSpace([string]$evt.status)) {
            $phaseStatus = " [$([string]$evt.phase)/$([string]$evt.status)]"
        }
        $engine = if (-not [string]::IsNullOrWhiteSpace([string]$evt.execution_engine) -and [string]$evt.execution_engine -ne "none") { " {$([string]$evt.execution_engine)}" } else { "" }
        Write-Host "  - [$tsLabel] $([string]$evt.message)$phaseStatus$engine"
    }
}

function Get-NotificationConfig {
    param([string]$WorkspaceRoot)
    $cfg = [ordered]@{
        enabled              = $false
        mode                 = "none"
        target               = ""
        webhook_timeout_seconds = 10
        dedupe_window_seconds = 300
        source               = "default"
    }

    $configCandidates = @(
        (Join-Path $WorkspaceRoot "scripts\config\pipeline-config.json"),
        (Join-Path $WorkspaceRoot "pipeline-config.json")
    )
    foreach ($candidate in $configCandidates) {
        if (-not (Test-Path -LiteralPath $candidate)) { continue }
        try {
            $doc = Read-JsonObject -Path $candidate
            $notify = $null
            if ($doc.ContainsKey("notifications")) { $notify = $doc.notifications }
            elseif ($doc.ContainsKey("pipeline") -and $null -ne $doc.pipeline -and $doc.pipeline.ContainsKey("notifications")) { $notify = $doc.pipeline.notifications }
            if ($null -ne $notify) {
                if ($notify.ContainsKey("enabled")) { $cfg.enabled = [bool]$notify.enabled }
                if ($notify.ContainsKey("mode")) { $cfg.mode = [string]$notify.mode }
                if ($notify.ContainsKey("target")) { $cfg.target = [string]$notify.target }
                if ($notify.ContainsKey("webhook_timeout_seconds")) {
                    $timeoutSec = [int]$notify.webhook_timeout_seconds
                    if ($timeoutSec -gt 0 -and $timeoutSec -le 120) { $cfg.webhook_timeout_seconds = $timeoutSec }
                }
                if ($notify.ContainsKey("dedupe_window_seconds")) {
                    $sec = [int]$notify.dedupe_window_seconds
                    if ($sec -gt 0) { $cfg.dedupe_window_seconds = $sec }
                }
                $cfg.source = $candidate
                break
            }
        } catch { }
    }

    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_NOTIFY_ENABLED)) {
        try { $cfg.enabled = [System.Convert]::ToBoolean($env:PATHOS_NOTIFY_ENABLED) } catch { }
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_NOTIFY_MODE)) {
        $cfg.mode = [string]$env:PATHOS_NOTIFY_MODE
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_NOTIFY_TARGET)) {
        $cfg.target = [string]$env:PATHOS_NOTIFY_TARGET
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_NOTIFY_WEBHOOK_TIMEOUT_SECONDS)) {
        try {
            $timeoutSec = [int]$env:PATHOS_NOTIFY_WEBHOOK_TIMEOUT_SECONDS
            if ($timeoutSec -gt 0 -and $timeoutSec -le 120) { $cfg.webhook_timeout_seconds = $timeoutSec }
        }
        catch { }
        $cfg.source = "environment"
    }

    $mode = ([string]$cfg.mode).Trim().ToLowerInvariant()
    if ($mode -notin @("none", "console", "file", "webhook")) {
        $mode = "none"
        $cfg.enabled = $false
    }
    if (-not [bool]$cfg.enabled) { $mode = "none" }
    $cfg.mode = $mode
    return $cfg
}

function Test-ShouldEmitNotification {
    param(
        [hashtable]$State,
        [hashtable]$RunContext,
        [string]$Reason,
        [int]$DedupeWindowSeconds
    )
    if ([string]::IsNullOrWhiteSpace($Reason)) { return $true }
    $lastReason = [string]$State.last_notified_reason
    if ([string]::IsNullOrWhiteSpace($lastReason)) { $lastReason = [string]$RunContext.last_notified_reason }
    $lastAtRaw = [string]$State.last_notification_at
    if ([string]::IsNullOrWhiteSpace($lastAtRaw)) { $lastAtRaw = [string]$RunContext.last_notification_at }
    $lastTs = Get-DateSafe -Value $lastAtRaw
    if ($null -eq $lastTs) { return $true }
    if ($lastReason -ne $Reason) { return $true }
    $ageSeconds = ([DateTime]::UtcNow - $lastTs.ToUniversalTime()).TotalSeconds
    return ($ageSeconds -ge $DedupeWindowSeconds)
}

function Write-NotificationLogLine {
    param([string]$Path, [string]$JsonLine)
    $dir = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($dir) -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    if (-not (Test-Path -LiteralPath $Path)) {
        Set-Content -LiteralPath $Path -Value "" -Encoding utf8
    }
    Add-Content -LiteralPath $Path -Value $JsonLine -Encoding utf8
}

function Send-RunNotification {
    param(
        [string]$WorkspaceRoot,
        [string]$RunId,
        [hashtable]$RunPaths,
        [ref]$StateRef,
        [ref]$RunContextRef,
        [string]$Severity,
        [string]$Reason,
        [string]$Message,
        [string]$NextAction = "",
        [switch]$Force
    )
    if ([string]::IsNullOrWhiteSpace($Message)) { return $false }
    $state = $StateRef.Value
    $runContext = $RunContextRef.Value
    $cfg = Get-NotificationConfig -WorkspaceRoot $WorkspaceRoot
    if ($cfg.mode -eq "none") { return $false }
    if ((-not $Force.IsPresent) -and -not (Test-ShouldEmitNotification -State $state -RunContext $runContext -Reason $Reason -DedupeWindowSeconds ([int]$cfg.dedupe_window_seconds)) ) {
        return $false
    }

    $record = [ordered]@{
        timestamp        = Get-NowIso
        run_id           = $RunId
        flow_type        = [string]$state.flow_type
        phase            = [string]$state.phase
        status           = [string]$state.status
        supervisor_state = [string]$state.supervisor_state
        severity         = if ([string]::IsNullOrWhiteSpace($Severity)) { "info" } else { $Severity }
        reason           = if ([string]::IsNullOrWhiteSpace($Reason)) { "unspecified" } else { $Reason }
        message          = $Message
        next_action      = $NextAction
        mode             = [string]$cfg.mode
    }
    $line = $record | ConvertTo-Json -Compress -Depth 8
    Write-NotificationLogLine -Path $RunPaths.notifications_path -JsonLine $line

    if ([string]$cfg.mode -eq "file") {
        $centralPath = if ([string]::IsNullOrWhiteSpace([string]$cfg.target)) { Join-Path $WorkspaceRoot "notifications.log" } else { [string]$cfg.target }
        if (-not [System.IO.Path]::IsPathRooted($centralPath)) { $centralPath = Join-Path $WorkspaceRoot $centralPath }
        Write-NotificationLogLine -Path $centralPath -JsonLine $line
    }
    elseif ([string]$cfg.mode -eq "webhook") {
        $webhookTarget = [string]$cfg.target
        if ([string]::IsNullOrWhiteSpace($webhookTarget)) {
            Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $state -RunContext $runContext -CommandName "notify" -Level "warn" -Message "Webhook notification skipped: target URL missing."
            return $false
        }
        try {
            $uri = $null
            $uriOk = [System.Uri]::TryCreate($webhookTarget, [System.UriKind]::Absolute, [ref]$uri)
            if (-not $uriOk -or $uri.Scheme -notin @("http", "https")) {
                Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $state -RunContext $runContext -CommandName "notify" -Level "warn" -Message "Webhook notification skipped: target URL is invalid."
                return $false
            }
        }
        catch {
            Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $state -RunContext $runContext -CommandName "notify" -Level "warn" -Message "Webhook notification skipped: target URL parse failed."
            return $false
        }
        $payload = [ordered]@{
            timestamp        = [string]$record.timestamp
            run_id           = [string]$record.run_id
            flow_type        = [string]$record.flow_type
            phase            = [string]$record.phase
            status           = [string]$record.status
            supervisor_state = [string]$record.supervisor_state
            severity         = [string]$record.severity
            reason           = [string]$record.reason
            message          = [string]$record.message
            next_action      = [string]$record.next_action
            source           = "pathos-pipeline-v2"
        }
        try {
            $payloadJson = $payload | ConvertTo-Json -Depth 8
            Invoke-RestMethod -Method Post -Uri $webhookTarget -ContentType "application/json" -Body $payloadJson -TimeoutSec ([int]$cfg.webhook_timeout_seconds) | Out-Null
        }
        catch {
            $errMsg = $_.Exception.Message
            Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $state -RunContext $runContext -CommandName "notify" -Level "warn" -Message "Webhook notification failed: $errMsg"
            return $false
        }
    }
    elseif ([string]$cfg.mode -eq "console") {
        $sev = ([string]$record.severity).ToUpperInvariant()
        $next = if ([string]::IsNullOrWhiteSpace($NextAction)) { "" } else { " | next: $NextAction" }
        Write-Host "[notify][$sev][$RunId] $Message$next"
    }

    $state.notification_state = [string]$record.reason
    $state.last_notification_at = [string]$record.timestamp
    $state.last_notified_reason = [string]$record.reason
    $StateRef.Value = $state
    Write-JsonObject -Path $RunPaths.state_path -Data $state

    Update-RunContext -Path $RunPaths.run_context_path -Current $runContext -Changes @{
        notification_state  = [string]$record.reason
        last_notification_at = [string]$record.timestamp
        last_notified_reason = [string]$record.reason
    }
    $normalized = Normalize-RunStateAndContext -StatePath $RunPaths.state_path -RunContextPath $RunPaths.run_context_path
    $StateRef.Value = $normalized.state
    $RunContextRef.Value = $normalized.run_context
    return $true
}

function Get-NowUtc {
    return [DateTime]::UtcNow
}

function Get-IsoOrEmpty {
    param([DateTime]$Value)
    if ($null -eq $Value) { return "" }
    return $Value.ToString("o")
}

function Get-DateSafe {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    try { return [DateTime]::Parse($Value) } catch { return $null }
}

function Get-WorkerRetryDelaySeconds {
    param([int]$Attempt)
    if ($Attempt -le 1) { return 15 }
    if ($Attempt -eq 2) { return 30 }
    if ($Attempt -eq 3) { return 60 }
    if ($Attempt -eq 4) { return 120 }
    if ($Attempt -eq 5) { return 300 }
    if ($Attempt -eq 6) { return 600 }
    if ($Attempt -le 9) { return 1800 }
    return 7200
}

function Get-SupervisorStateForRetryCount {
    param([int]$RetryCount, [bool]$Retryable)
    if (-not $Retryable) { return "worker_blocked" }
    if ($RetryCount -ge 10) { return "worker_blocked" }
    if ($RetryCount -ge 7) { return "worker_degraded" }
    return "worker_retrying"
}

function Test-RetryableFailureType {
    param([string]$FailureType)
    return ([string]$FailureType -in @("network_timeout", "provider_unavailable", "process_crash", "file_lock", "unknown"))
}

function Ensure-WorkerHeartbeatFile {
    param([hashtable]$RunPaths, [hashtable]$State, [hashtable]$RunContext)
    $workerName = if (-not [string]::IsNullOrWhiteSpace([string]$State.execution_engine)) { [string]$State.execution_engine } else { [string]$RunContext.execution_engine }
    if ([string]::IsNullOrWhiteSpace($workerName)) { $workerName = "none" }
    if (-not (Test-Path -LiteralPath $RunPaths.worker_heartbeat_path)) {
        $now = Get-NowIso
        $seed = [ordered]@{
            worker_name         = $workerName
            started_at          = $now
            last_progress_at    = $now
            current_attempt     = [int]$State.retry_count
            last_completed_step = ""
            status              = "idle"
            note                = ""
            error               = ""
        }
        Write-JsonObject -Path $RunPaths.worker_heartbeat_path -Data $seed
    }
}

function Read-WorkerHeartbeat {
    param([hashtable]$RunPaths, [hashtable]$State, [hashtable]$RunContext)
    Ensure-WorkerHeartbeatFile -RunPaths $RunPaths -State $State -RunContext $RunContext
    $hb = Read-JsonObject -Path $RunPaths.worker_heartbeat_path
    foreach ($k in @("worker_name", "started_at", "last_progress_at", "current_attempt", "last_completed_step", "status", "note", "error")) {
        if (-not $hb.ContainsKey($k)) {
            if ($k -eq "current_attempt") { $hb[$k] = 0 } else { $hb[$k] = "" }
        }
    }
    if ([string]::IsNullOrWhiteSpace([string]$hb.worker_name)) {
        $hb.worker_name = if (-not [string]::IsNullOrWhiteSpace([string]$State.execution_engine)) { [string]$State.execution_engine } else { [string]$RunContext.execution_engine }
    }
    if ([string]::IsNullOrWhiteSpace([string]$hb.status)) { $hb.status = "idle" }
    Write-WorkerHeartbeat -RunPaths $RunPaths -Heartbeat $hb
    return $hb
}

function Write-WorkerHeartbeat {
    param([hashtable]$RunPaths, [hashtable]$Heartbeat)
    Write-JsonObject -Path $RunPaths.worker_heartbeat_path -Data $Heartbeat
}

function Format-ClockLabel {
    param([string]$IsoValue)
    if ([string]::IsNullOrWhiteSpace($IsoValue)) { return "[not set]" }
    try { return (Get-Date $IsoValue).ToString("yyyy-MM-dd HH:mm:ss") } catch { return $IsoValue }
}

function Print-WorkerStatus {
    param([string]$RunId, [hashtable]$RunPaths, [hashtable]$State, [hashtable]$RunContext)
    $hb = Read-WorkerHeartbeat -RunPaths $RunPaths -State $State -RunContext $RunContext
    $notifyCfg = Get-NotificationConfig -WorkspaceRoot $workspaceRoot
    Write-Host "Worker Supervisor Status"
    Write-Host "Run: $RunId"
    Write-Host "Execution engine: $([string]$State.execution_engine)"
    Write-Host "Supervisor state: $([string]$State.supervisor_state)"
    Write-Host "Retry count: $([int]$State.retry_count)"
    Write-Host "Last error: $([string]$State.last_error_type) | $([string]$State.last_error_message)"
    Write-Host "Last retry at: $(Format-ClockLabel -IsoValue ([string]$State.last_retry_at))"
    Write-Host "Next retry at: $(Format-ClockLabel -IsoValue ([string]$State.next_retry_at))"
    Write-Host "Last successful progress: $(Format-ClockLabel -IsoValue ([string]$State.last_successful_progress_at))"
    Write-Host "Heartbeat file: $($RunPaths.worker_heartbeat_path)"
    Write-Host "Heartbeat worker: $([string]$hb.worker_name)"
    Write-Host "Heartbeat status: $([string]$hb.status)"
    Write-Host "Heartbeat last progress: $(Format-ClockLabel -IsoValue ([string]$hb.last_progress_at))"
    Write-Host "Heartbeat step: $([string]$hb.last_completed_step)"
    Write-Host "Notifications enabled: $([bool]$notifyCfg.enabled) (mode=$([string]$notifyCfg.mode))"
    Write-Host "Notification state: $([string]$State.notification_state)"
    Write-Host "Last notification at: $(Format-ClockLabel -IsoValue ([string]$State.last_notification_at))"
    Write-Host "Last notified reason: $([string]$State.last_notified_reason)"
    if (-not [string]::IsNullOrWhiteSpace([string]$hb.note)) { Write-Host "Heartbeat note: $([string]$hb.note)" }
    if (-not [string]::IsNullOrWhiteSpace([string]$hb.error)) { Write-Host "Heartbeat error: $([string]$hb.error)" }
}

function New-DoctorReport {
    return [ordered]@{
        ok     = New-Object System.Collections.ArrayList
        warns  = New-Object System.Collections.ArrayList
        errors = New-Object System.Collections.ArrayList
    }
}

function Add-DoctorOk {
    param([hashtable]$Report, [string]$Message)
    [void]$Report.ok.Add($Message)
}

function Add-DoctorWarn {
    param([hashtable]$Report, [string]$Message)
    [void]$Report.warns.Add($Message)
}

function Add-DoctorError {
    param([hashtable]$Report, [string]$Message)
    [void]$Report.errors.Add($Message)
}

function Test-RequiredFileForDoctor {
    param([hashtable]$Report, [string]$Path, [string]$Label, [switch]$WarnOnly)
    if (Test-Path -LiteralPath $Path) {
        Add-DoctorOk -Report $Report -Message "$Label present."
        return $true
    }
    if ($WarnOnly) {
        Add-DoctorWarn -Report $Report -Message "$Label missing: $Path"
    }
    else {
        Add-DoctorError -Report $Report -Message "$Label missing: $Path"
    }
    return $false
}

function Print-DoctorReport {
    param(
        [string]$RunId,
        [hashtable]$RunPaths,
        [hashtable]$State,
        [hashtable]$RunContext,
        [hashtable]$Report,
        [string]$LikelyNextCommand,
        [hashtable]$LastEvent
    )
    $errorCount = @($Report.errors).Count
    $warnCount = @($Report.warns).Count
    $health = if ($errorCount -gt 0) { "UNHEALTHY" } elseif ($warnCount -gt 0) { "HEALTHY WITH WARNINGS" } else { "HEALTHY" }

    Write-Host "Pipeline Doctor"
    Write-Host "Doctor summary: $health (errors=$errorCount, warnings=$warnCount)"
    Write-Host "Active run: $RunId"
    Write-Host "Run path: $($RunPaths.run_root)"
    if ($null -ne $State) {
        Write-Host "Phase/Status: $([string]$State.phase) / $([string]$State.status)"
        Write-Host "Flow type: $([string]$State.flow_type)"
        Write-Host "Execution engine: $([string]$State.execution_engine)"
        Write-Host "Task type: $([string]$State.task_type)"
        Write-Host "Supervisor: $([string]$State.supervisor_state) | retry_count=$([int]$State.retry_count)"
        $notifyCfg = Get-NotificationConfig -WorkspaceRoot $workspaceRoot
        Write-Host "Notifications: enabled=$([bool]$notifyCfg.enabled), mode=$([string]$notifyCfg.mode), state=$([string]$State.notification_state)"
        Write-Host "Last notification: $(Format-ClockLabel -IsoValue ([string]$State.last_notification_at)) | reason=$([string]$State.last_notified_reason)"
    }
    if ($null -ne $LastEvent) {
        Write-Host "Last event: $([string]$LastEvent.timestamp) | $([string]$LastEvent.message)"
    }

    if ($errorCount -gt 0) {
        Write-Host "Errors:"
        foreach ($line in @($Report.errors)) { Write-Host "  - $line" }
    }
    if ($warnCount -gt 0) {
        Write-Host "Warnings:"
        foreach ($line in @($Report.warns)) { Write-Host "  - $line" }
    }
    if (@($Report.ok).Count -gt 0) {
        Write-Host "Checks OK:"
        foreach ($line in @($Report.ok)) { Write-Host "  - $line" }
    }
    if (-not [string]::IsNullOrWhiteSpace($LikelyNextCommand)) {
        Write-Host "Suggested next command: $LikelyNextCommand"
    }
}

function Get-RepoPath {
    param([hashtable]$ReposDoc, [string]$RepoKey)
    if (-not $ReposDoc.ContainsKey("repos")) { throw "Invalid repos.json format: missing 'repos' object." }
    if (-not $ReposDoc.repos.ContainsKey($RepoKey)) { throw "Unknown repo key '$RepoKey' in repos.json." }
    return [string]$ReposDoc.repos[$RepoKey]
}

function Get-ImplementationGoalSummary {
    param([hashtable]$State, [hashtable]$RunContext)
    if ([string]$State.status -eq "spec_revision_required") { return "Revise implementation plan according to latest spec feedback and re-run implementation." }
    if ([string]$State.status -in @("needs_visual_revision", "needs_repair_pass")) { return "Address review feedback and update implementation output (repair pass)." }
    return "Implement the scoped task from task.md and produce updated run-local current.md."
}

function Write-BuilderPrompt {
    param(
        [string]$RunId,
        [string]$RepoPath,
        [hashtable]$State,
        [hashtable]$RunContext,
        [hashtable]$RunPaths
    )
    $branch = if ([string]::IsNullOrWhiteSpace([string]$RunContext.branch)) { "[not set]" } else { [string]$RunContext.branch }
    $goal = Get-ImplementationGoalSummary -State $State -RunContext $RunContext
    $executionEngine = if ([string]::IsNullOrWhiteSpace([string]$State.execution_engine)) { "none" } else { [string]$State.execution_engine }
    $engineLabel = Get-EngineLabel -ExecutionEngine $executionEngine
    $flowType = if ([string]::IsNullOrWhiteSpace([string]$State.flow_type)) { "frontend" } else { [string]$State.flow_type }
    $designReferenceEnabled = $flowType -in @("frontend", "fullstack")
    $designReferenceSection = ""
    if ($designReferenceEnabled) {
        $designFolder = [string]$RunPaths.design_reference_dir
        $designNotes = [string]$RunPaths.design_notes_path
        $designPresence = if ([bool]$State.has_design_reference) { "present" } else { "not detected yet (folder ready for use)" }
        $designReferenceSection = @"
- Design reference folder (implementation input): $designFolder
- Design notes (optional): $designNotes
- Design reference status: $designPresence
"@
    }
    $content = @"
# Builder Prompt

Generated: $(Get-NowIso)
Run ID: $RunId
Task ID: $($RunContext.task_id)
Flow Type: $($State.flow_type)
Phase/Status: $($State.phase) / $($State.status)
Execution Engine: codex (Codex)
Execution Engine: $executionEngine ($engineLabel)

## Target
- Repo path: $RepoPath
- Branch: $branch

## Scope References
- Task scope: $($RunPaths.task_path)
- Current implementation artifact (update this): $($RunPaths.current_artifact_path)
$designReferenceSection

## Implementation Goal
$goal

## Constraints
- Do not commit.
- Do not push.
"@
    Set-Content -LiteralPath $RunPaths.builder_prompt_path -Value $content -Encoding utf8
}

function Write-ClaudeHandoff {
    param(
        [string]$RunId,
        [string]$RepoPath,
        [hashtable]$State,
        [hashtable]$RunContext,
        [hashtable]$RunPaths
    )
    $branch = if ([string]::IsNullOrWhiteSpace([string]$RunContext.branch)) { "[not set]" } else { [string]$RunContext.branch }
    $flowType = if ([string]::IsNullOrWhiteSpace([string]$State.flow_type)) { "frontend" } else { [string]$State.flow_type }
    $flowNotes = switch ($flowType) {
        "backend" { "Focus on API/service contract correctness and runtime contract proof readiness." }
        "fullstack" { "Focus on end-to-end behavior across UI + API and runtime validation readiness." }
        "tooling" { "Focus on tooling command behavior, deterministic outputs, and operator ergonomics." }
        default { "Focus on UI behavior, implementation quality, and visual/runtime gate readiness." }
    }
    $designReferenceEnabled = $flowType -in @("frontend", "fullstack")
    $designReferenceSection = ""
    if ($designReferenceEnabled) {
        $designFolder = [string]$RunPaths.design_reference_dir
        $designNotes = [string]$RunPaths.design_notes_path
        $designPresence = if ([bool]$State.has_design_reference) { "present" } else { "not detected yet (folder ready for use)" }
        $designReferenceSection = @"
- Design reference folder (implementation input): $designFolder
- Design notes (optional): $designNotes
- Design reference status: $designPresence
"@
    }

    $content = @"
# Claude Phase C Handoff

Generated: $(Get-NowIso)

## Run Context
- Run ID: $RunId
- Repo path: $RepoPath
- Branch: $branch
- Flow type: $flowType
- Task type: $([string]$State.task_type)
- Execution engine: $([string]$State.execution_engine)
- Phase/Status: $([string]$State.phase) / $([string]$State.status)

## Run-local Inputs
- Task scope (read): $($RunPaths.task_path)
- Builder prompt (read): $($RunPaths.builder_prompt_path)
$designReferenceSection

## Run-local Output Targets
- Implementation evidence (update): $($RunPaths.current_artifact_path)
- Worker heartbeat (update via pipeline command path): $($RunPaths.worker_heartbeat_path)
- Completion signal (optional): $($RunPaths.claude_completion_path)

## Allowed Commands
- .\pp.ps1 worker-heartbeat -Step <step> -Notes <note>
- .\pp.ps1 worker-status
- .\pp.ps1 claude-check
- .\pp.ps1 implementation-done
- Approved validation commands: repo-local non-destructive checks only (no commit/push).

## Allowed Artifact Updates
- $($RunPaths.current_artifact_path)
- $($RunPaths.worker_heartbeat_path) through pipeline command path
- Optional implementation notes in run-local artifacts only

## Forbidden Actions
- Do NOT edit spec-locked sections of task.md.
- Do NOT mutate pipeline phase/status directly.
- Do NOT mark runtime/final-review/commit decisions.
- Do NOT commit or push.
- Do NOT self-advance pipeline state.

## Script Authority Reminder
Scripts remain authoritative for transitions, gates, validation, recovery, and merge decision.
Claude provides bounded Phase C implementation work; scripts decide whether work counts.

## Flow-specific Note
$flowNotes

## Claude Command Template
1. Read task + builder prompt.
2. Implement scoped changes in target repo.
3. Update run-local current.md with concrete evidence.
4. Emit heartbeat updates during progress.
5. Hand back to script authority with: .\pp.ps1 implementation-done
"@
    Set-Content -LiteralPath $RunPaths.claude_handoff_path -Value $content -Encoding utf8
}

function Ensure-ClaudeCompletionSignal {
    param(
        [string]$RunId,
        [hashtable]$RunPaths,
        [hashtable]$State,
        [hashtable]$RunContext
    )
    if (Test-Path -LiteralPath $RunPaths.claude_completion_path) {
        $raw = Get-Content -LiteralPath $RunPaths.claude_completion_path -Raw
        if (-not [string]::IsNullOrWhiteSpace($raw)) {
            try {
                $obj = $raw | ConvertFrom-Json -AsHashtable
                if ($obj.ContainsKey("worker") -and $obj.ContainsKey("run_id")) {
                    foreach ($k in @("started_at", "completed_at", "current_md_updated", "validations_attempted", "blocked", "note", "status")) {
                        if (-not $obj.ContainsKey($k)) {
                            if ($k -eq "current_md_updated" -or $k -eq "blocked") { $obj[$k] = $false }
                            elseif ($k -eq "validations_attempted") { $obj[$k] = @() }
                            elseif ($k -eq "status") { $obj[$k] = "pending" }
                            else { $obj[$k] = "" }
                        }
                    }
                    Write-JsonObject -Path $RunPaths.claude_completion_path -Data $obj
                    return
                }
            } catch { }
        }
    }
    $now = Get-NowIso
    $seed = [ordered]@{
        worker               = "claude"
        run_id               = $RunId
        started_at           = $now
        completed_at         = ""
        validations_attempted = @()
        current_md_updated   = $false
        blocked              = $false
        status               = "pending"
        note                 = "Optional bounded completion signal for future automation. Scripts remain authoritative."
    }
    Write-JsonObject -Path $RunPaths.claude_completion_path -Data $seed
}

function Get-ClaudeAdapterConfig {
    param([string]$WorkspaceRoot)
    $cfg = [ordered]@{
        enabled          = $false
        command_template = ""
        working_dir      = ""
        invoke_mode      = "spawn"
        source           = "default"
    }

    $configCandidates = @(
        (Join-Path $WorkspaceRoot "scripts\config\pipeline-config.json"),
        (Join-Path $WorkspaceRoot "pipeline-config.json")
    )
    foreach ($candidate in $configCandidates) {
        if (-not (Test-Path -LiteralPath $candidate)) { continue }
        try {
            $doc = Read-JsonObject -Path $candidate
            $adapter = $null
            if ($doc.ContainsKey("claude_adapter")) { $adapter = $doc.claude_adapter }
            elseif ($doc.ContainsKey("pipeline") -and $null -ne $doc.pipeline -and $doc.pipeline.ContainsKey("claude_adapter")) { $adapter = $doc.pipeline.claude_adapter }
            if ($null -ne $adapter) {
                if ($adapter.ContainsKey("enabled")) { $cfg.enabled = [bool]$adapter.enabled }
                if ($adapter.ContainsKey("command_template")) { $cfg.command_template = [string]$adapter.command_template }
                if ($adapter.ContainsKey("working_dir")) { $cfg.working_dir = [string]$adapter.working_dir }
                if ($adapter.ContainsKey("invoke_mode")) {
                    $mode = [string]$adapter.invoke_mode
                    if ($mode -in @("spawn", "sync")) { $cfg.invoke_mode = $mode }
                }
                $cfg.source = $candidate
                break
            }
        } catch { }
    }

    $envEnabled = $env:PATHOS_CLAUDE_ADAPTER_ENABLED
    if (-not [string]::IsNullOrWhiteSpace($envEnabled)) {
        try { $cfg.enabled = [System.Convert]::ToBoolean($envEnabled) } catch { }
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_CLAUDE_ADAPTER_COMMAND)) {
        $cfg.command_template = [string]$env:PATHOS_CLAUDE_ADAPTER_COMMAND
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_CLAUDE_ADAPTER_WORKDIR)) {
        $cfg.working_dir = [string]$env:PATHOS_CLAUDE_ADAPTER_WORKDIR
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_CLAUDE_ADAPTER_INVOKE_MODE)) {
        $mode = [string]$env:PATHOS_CLAUDE_ADAPTER_INVOKE_MODE
        if ($mode -in @("spawn", "sync")) { $cfg.invoke_mode = $mode }
        $cfg.source = "environment"
    }
    return $cfg
}

function Resolve-ClaudeTemplate {
    param([string]$Template, [hashtable]$Tokens)
    $result = if ([string]::IsNullOrWhiteSpace($Template)) { "" } else { $Template }
    foreach ($k in $Tokens.Keys) {
        $result = $result.Replace("{$k}", [string]$Tokens[$k])
    }
    return $result
}

function Invoke-ClaudeAdapter {
    param(
        [string]$CommandText,
        [string]$WorkingDirectory,
        [string]$InvokeMode
    )
    if ([string]::IsNullOrWhiteSpace($CommandText)) {
        throw "Cannot invoke Claude adapter with empty command."
    }
    $wd = $WorkingDirectory
    if ([string]::IsNullOrWhiteSpace($wd)) { $wd = $PWD.Path }
    if (-not (Test-Path -LiteralPath $wd)) {
        throw "Claude adapter working directory does not exist: $wd"
    }

    if ($InvokeMode -eq "sync") {
        Push-Location $wd
        try {
            & cmd.exe /c $CommandText
            if ($LASTEXITCODE -ne 0) { throw "Claude adapter command exited with code $LASTEXITCODE." }
        }
        finally {
            Pop-Location
        }
        return
    }

    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c $CommandText" -WorkingDirectory $wd -PassThru -WindowStyle Hidden
    if ($null -eq $proc) { throw "Failed to start Claude adapter command." }
}

function Read-ClaudeCompletionSignal {
    param([hashtable]$RunPaths, [string]$RunId)
    $result = [ordered]@{
        exists       = $false
        valid        = $false
        data         = $null
        parse_error  = ""
    }
    if (-not (Test-Path -LiteralPath $RunPaths.claude_completion_path)) { return $result }
    $result.exists = $true
    try {
        $obj = Read-JsonObject -Path $RunPaths.claude_completion_path
        foreach ($k in @("worker", "run_id", "started_at", "completed_at", "current_md_updated", "validations_attempted", "blocked", "note", "status")) {
            if (-not $obj.ContainsKey($k)) {
                if ($k -eq "current_md_updated" -or $k -eq "blocked") { $obj[$k] = $false }
                elseif ($k -eq "validations_attempted") { $obj[$k] = @() }
                elseif ($k -eq "status") { $obj[$k] = "pending" }
                else { $obj[$k] = "" }
            }
        }
        if ([string]::IsNullOrWhiteSpace([string]$obj.run_id)) { $obj.run_id = $RunId }
        $result.data = $obj
        $result.valid = $true
    }
    catch {
        $result.parse_error = $_.Exception.Message
    }
    return $result
}

function Get-ClaudeCompletionAssessment {
    param([hashtable]$RunPaths, [string]$RunId)
    $completion = Read-ClaudeCompletionSignal -RunPaths $RunPaths -RunId $RunId
    $assessment = [ordered]@{
        completion     = $completion
        evidence_state = "no_evidence"
        summary        = "No completion evidence yet."
        current_ready  = $false
        current_reason = ""
    }

    $currentExists = Test-Path -LiteralPath $RunPaths.current_artifact_path
    $currentRaw = if ($currentExists) { Get-Content -LiteralPath $RunPaths.current_artifact_path -Raw } else { "" }
    $currentPlaceholder = $true
    if ($currentExists -and -not [string]::IsNullOrWhiteSpace($currentRaw)) {
        $currentPlaceholder = Test-PlaceholderOnlyCurrentArtifact -Content $currentRaw
    }
    $assessment.current_ready = $currentExists -and -not [string]::IsNullOrWhiteSpace($currentRaw) -and -not $currentPlaceholder
    if (-not $currentExists) { $assessment.current_reason = "current.md missing" }
    elseif ([string]::IsNullOrWhiteSpace($currentRaw)) { $assessment.current_reason = "current.md empty" }
    elseif ($currentPlaceholder) { $assessment.current_reason = "current.md placeholder-only" }
    else { $assessment.current_reason = "current.md contains implementation evidence" }

    if (-not $completion.exists) {
        $assessment.summary = "No completion signal file found."
        return $assessment
    }
    if (-not $completion.valid) {
        $assessment.evidence_state = "incomplete_evidence"
        $assessment.summary = "Completion signal exists but is invalid JSON."
        return $assessment
    }

    $data = $completion.data
    $status = ([string]$data.status).Trim().ToLowerInvariant()
    $meaningfulSignal = $false
    if (-not [string]::IsNullOrWhiteSpace([string]$data.completed_at)) { $meaningfulSignal = $true }
    if ([bool]$data.current_md_updated) { $meaningfulSignal = $true }
    if (@($data.validations_attempted).Count -gt 0) { $meaningfulSignal = $true }
    if ([string]$status -in @("completed", "success", "ready", "failed", "blocked")) { $meaningfulSignal = $true }
    $noteText = [string]$data.note
    $seedNote = "Optional bounded completion signal for future automation. Scripts remain authoritative."
    if (-not [string]::IsNullOrWhiteSpace($noteText.Trim()) -and $noteText.Trim() -ne $seedNote -and $noteText.Length -gt 20) { $meaningfulSignal = $true }

    if (-not $meaningfulSignal) {
        $assessment.evidence_state = "no_evidence"
        $assessment.summary = "Completion signal is present but still scaffold-level."
        return $assessment
    }
    if ($status -in @("completed", "ready", "success") -and -not [bool]$data.current_md_updated) {
        $assessment.evidence_state = "incomplete_evidence"
        $assessment.summary = "Completion status is set but current_md_updated is false in completion signal."
        return $assessment
    }
    if (-not $assessment.current_ready) {
        $assessment.evidence_state = "incomplete_evidence"
        $assessment.summary = "Completion signal present but implementation evidence is incomplete ($($assessment.current_reason))."
        return $assessment
    }

    $assessment.evidence_state = "ready_for_implementation_done"
    $assessment.summary = "Completion evidence is present and current.md appears ready for implementation-done."
    return $assessment
}

function Invoke-ReconcileClaudeCompletionSignal {
    param(
        [string]$RunId,
        [hashtable]$RunPaths
    )
    $assessment = Get-ClaudeCompletionAssessment -RunPaths $RunPaths -RunId $RunId
    if (-not $assessment.current_ready) {
        throw "Cannot reconcile Claude completion signal: $([string]$assessment.current_reason)."
    }

    $signal = Read-ClaudeCompletionSignal -RunPaths $RunPaths -RunId $RunId
    if ($signal.exists -and -not $signal.valid) {
        throw "Cannot reconcile Claude completion signal because the JSON is invalid: $([string]$signal.parse_error)"
    }

    $existing = if ($signal.valid -and $null -ne $signal.data) { $signal.data } else { [ordered]@{} }
    $now = Get-NowIso
    $note = [string]$existing.note
    if ([string]::IsNullOrWhiteSpace($note) -or $note -match "Optional bounded completion signal") {
        $note = "Reconciled from current.md evidence by bounded helper. Scripts remain authoritative for finish."
    }

    $reconciled = [ordered]@{
        worker                = "claude"
        run_id                = $RunId
        started_at            = if ([string]::IsNullOrWhiteSpace([string]$existing.started_at)) { $now } else { [string]$existing.started_at }
        completed_at          = if ([string]::IsNullOrWhiteSpace([string]$existing.completed_at)) { $now } else { [string]$existing.completed_at }
        current_md_updated    = $true
        validations_attempted = if ($null -ne $existing.validations_attempted) { @($existing.validations_attempted) } else { @() }
        blocked               = $false
        note                  = $note
        status                = "ready"
    }
    Write-JsonObject -Path $RunPaths.claude_completion_path -Data $reconciled
    return $reconciled
}

function Write-CodexHandoff {
    param(
        [string]$RunId,
        [string]$RepoPath,
        [hashtable]$State,
        [hashtable]$RunContext,
        [hashtable]$RunPaths
    )
    $branch = if ([string]::IsNullOrWhiteSpace([string]$RunContext.branch)) { "[not set]" } else { [string]$RunContext.branch }
    $flowType = if ([string]::IsNullOrWhiteSpace([string]$State.flow_type)) { "frontend" } else { [string]$State.flow_type }
    $runtimeLine = if (Test-Path -LiteralPath $RunPaths.runtime_validation_path) { $RunPaths.runtime_validation_path } else { "[not present]" }
    $visualLine = if (Test-Path -LiteralPath $RunPaths.visual_review_path) { $RunPaths.visual_review_path } else { "[not present]" }
    $flowNotes = switch ($flowType) {
        "backend" { "Emphasize API/service contract hardening, edge-case handling, and runtime-proof coherence." }
        "fullstack" { "Emphasize end-to-end user-flow hardening across UI/API/runtime evidence." }
        "tooling" { "Emphasize command behavior determinism, state integrity, and operator-facing reliability." }
        default { "Emphasize UI/runtime proof alignment, regressions, and safe hardening recommendations." }
    }

    $content = @"
# Codex Phase D Handoff

Generated: $(Get-NowIso)

## Run Context
- Run ID: $RunId
- Repo path: $RepoPath
- Branch: $branch
- Flow type: $flowType
- Task type: $([string]$State.task_type)
- Execution engine: $([string]$State.execution_engine)
- Phase/Status: $([string]$State.phase) / $([string]$State.status)

## Run-local Inputs
- Task scope (read): $($RunPaths.task_path)
- Current implementation (read): $($RunPaths.current_artifact_path)
- Runtime validation evidence (read when present/relevant): $runtimeLine
- Visual review evidence (read when present/relevant): $visualLine

## Run-local Output Targets
- Codex hardening review (update): $($RunPaths.codex_review_path)
- Worker heartbeat (update via pipeline command path): $($RunPaths.worker_heartbeat_path)
- Completion signal (optional): $($RunPaths.codex_completion_path)

## Allowed Commands
- .\pp.ps1 worker-heartbeat -Step <step> -Notes <note>
- .\pp.ps1 worker-status
- .\pp.ps1 codex-check
- .\pp.ps1 codex-finish
- Approved validation commands: repo-local non-destructive checks only (no commit/push).

## Allowed Artifact Updates
- $($RunPaths.codex_review_path)
- $($RunPaths.worker_heartbeat_path) through pipeline command path
- Optional bounded notes in run-local artifacts only

## Forbidden Actions
- Do NOT mutate spec-locked task scope.
- Do NOT mutate pipeline phase/status directly.
- Do NOT self-advance runtime/final-review/commit gates.
- Do NOT commit or push.
- Do NOT self-advance pipeline state.

## Script Authority Reminder
Scripts remain authoritative for transitions, gates, validation, and recovery.
Codex provides bounded hardening work and evidence; scripts decide whether evidence counts.

## Flow-specific Hardening Note
$flowNotes
"@
    Set-Content -LiteralPath $RunPaths.codex_handoff_path -Value $content -Encoding utf8
}

function Ensure-CodexCompletionSignal {
    param(
        [string]$RunId,
        [hashtable]$RunPaths
    )
    if (Test-Path -LiteralPath $RunPaths.codex_completion_path) {
        $raw = Get-Content -LiteralPath $RunPaths.codex_completion_path -Raw
        if (-not [string]::IsNullOrWhiteSpace($raw)) {
            try {
                $obj = $raw | ConvertFrom-Json -AsHashtable
                if ($obj.ContainsKey("worker") -and $obj.ContainsKey("run_id")) {
                    foreach ($k in @("started_at", "completed_at", "codex_review_updated", "validations_attempted", "blocked", "note", "status")) {
                        if (-not $obj.ContainsKey($k)) {
                            if ($k -eq "codex_review_updated" -or $k -eq "blocked") { $obj[$k] = $false }
                            elseif ($k -eq "validations_attempted") { $obj[$k] = @() }
                            elseif ($k -eq "status") { $obj[$k] = "pending" }
                            else { $obj[$k] = "" }
                        }
                    }
                    Write-JsonObject -Path $RunPaths.codex_completion_path -Data $obj
                    return
                }
            } catch { }
        }
    }
    $now = Get-NowIso
    $seed = [ordered]@{
        worker                = "codex"
        run_id                = $RunId
        started_at            = $now
        completed_at          = ""
        validations_attempted = @()
        codex_review_updated  = $false
        blocked               = $false
        status                = "pending"
        note                  = "Optional bounded completion signal for Codex hardening. Scripts remain authoritative."
    }
    Write-JsonObject -Path $RunPaths.codex_completion_path -Data $seed
}

function Get-CodexAdapterConfig {
    param([string]$WorkspaceRoot)
    $cfg = [ordered]@{
        enabled                 = $false
        driver                  = "builtin_retry"
        command_template        = ""
        working_dir             = ""
        invoke_mode             = "spawn"
        source                  = "default"
        executable              = "codex"
        approval_policy         = "never"
        sandbox_mode            = "workspace-write"
        max_attempts            = 3
        initial_backoff_seconds = 5
        max_backoff_seconds     = 60
    }

    $configCandidates = @(
        (Join-Path $WorkspaceRoot "scripts\config\pipeline-config.json"),
        (Join-Path $WorkspaceRoot "pipeline-config.json")
    )
    foreach ($candidate in $configCandidates) {
        if (-not (Test-Path -LiteralPath $candidate)) { continue }
        try {
            $doc = Read-JsonObject -Path $candidate
            $adapter = $null
            if ($doc.ContainsKey("codex_adapter")) { $adapter = $doc.codex_adapter }
            elseif ($doc.ContainsKey("pipeline") -and $null -ne $doc.pipeline -and $doc.pipeline.ContainsKey("codex_adapter")) { $adapter = $doc.pipeline.codex_adapter }
            if ($null -ne $adapter) {
                if ($adapter.ContainsKey("enabled")) { $cfg.enabled = [bool]$adapter.enabled }
                if ($adapter.ContainsKey("driver")) {
                    $driver = [string]$adapter.driver
                    if ($driver -in @("builtin_retry", "legacy_template")) { $cfg.driver = $driver }
                }
                if ($adapter.ContainsKey("command_template")) { $cfg.command_template = [string]$adapter.command_template }
                if ($adapter.ContainsKey("working_dir")) { $cfg.working_dir = [string]$adapter.working_dir }
                if ($adapter.ContainsKey("codex_executable")) { $cfg.executable = [string]$adapter.codex_executable }
                if ($adapter.ContainsKey("approval_policy")) { $cfg.approval_policy = [string]$adapter.approval_policy }
                if ($adapter.ContainsKey("sandbox_mode")) { $cfg.sandbox_mode = [string]$adapter.sandbox_mode }
                if ($adapter.ContainsKey("max_attempts")) { $cfg.max_attempts = [int]$adapter.max_attempts }
                if ($adapter.ContainsKey("initial_backoff_seconds")) { $cfg.initial_backoff_seconds = [int]$adapter.initial_backoff_seconds }
                if ($adapter.ContainsKey("max_backoff_seconds")) { $cfg.max_backoff_seconds = [int]$adapter.max_backoff_seconds }
                if ($adapter.ContainsKey("invoke_mode")) {
                    $mode = [string]$adapter.invoke_mode
                    if ($mode -in @("spawn", "sync")) { $cfg.invoke_mode = $mode }
                }
                if (-not [string]::IsNullOrWhiteSpace([string]$cfg.command_template) -and -not $adapter.ContainsKey("driver")) {
                    $cfg.driver = "legacy_template"
                }
                $cfg.source = $candidate
                break
            }
        } catch { }
    }

    $envEnabled = $env:PATHOS_CODEX_ADAPTER_ENABLED
    if (-not [string]::IsNullOrWhiteSpace($envEnabled)) {
        try { $cfg.enabled = [System.Convert]::ToBoolean($envEnabled) } catch { }
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_CODEX_ADAPTER_COMMAND)) {
        $cfg.command_template = [string]$env:PATHOS_CODEX_ADAPTER_COMMAND
        if ([string]::IsNullOrWhiteSpace($env:PATHOS_CODEX_ADAPTER_DRIVER)) {
            $cfg.driver = "legacy_template"
        }
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_CODEX_ADAPTER_WORKDIR)) {
        $cfg.working_dir = [string]$env:PATHOS_CODEX_ADAPTER_WORKDIR
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_CODEX_ADAPTER_INVOKE_MODE)) {
        $mode = [string]$env:PATHOS_CODEX_ADAPTER_INVOKE_MODE
        if ($mode -in @("spawn", "sync")) { $cfg.invoke_mode = $mode }
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_CODEX_ADAPTER_DRIVER)) {
        $driver = [string]$env:PATHOS_CODEX_ADAPTER_DRIVER
        if ($driver -in @("builtin_retry", "legacy_template")) { $cfg.driver = $driver }
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_CODEX_ADAPTER_EXECUTABLE)) {
        $cfg.executable = [string]$env:PATHOS_CODEX_ADAPTER_EXECUTABLE
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_CODEX_ADAPTER_APPROVAL_POLICY)) {
        $cfg.approval_policy = [string]$env:PATHOS_CODEX_ADAPTER_APPROVAL_POLICY
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_CODEX_ADAPTER_SANDBOX_MODE)) {
        $cfg.sandbox_mode = [string]$env:PATHOS_CODEX_ADAPTER_SANDBOX_MODE
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_CODEX_ADAPTER_MAX_ATTEMPTS)) {
        try { $cfg.max_attempts = [int]$env:PATHOS_CODEX_ADAPTER_MAX_ATTEMPTS } catch { }
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_CODEX_ADAPTER_INITIAL_BACKOFF_SECONDS)) {
        try { $cfg.initial_backoff_seconds = [int]$env:PATHOS_CODEX_ADAPTER_INITIAL_BACKOFF_SECONDS } catch { }
        $cfg.source = "environment"
    }
    if (-not [string]::IsNullOrWhiteSpace($env:PATHOS_CODEX_ADAPTER_MAX_BACKOFF_SECONDS)) {
        try { $cfg.max_backoff_seconds = [int]$env:PATHOS_CODEX_ADAPTER_MAX_BACKOFF_SECONDS } catch { }
        $cfg.source = "environment"
    }
    return $cfg
}

function Resolve-CodexTemplate {
    param([string]$Template, [hashtable]$Tokens)
    $result = if ([string]::IsNullOrWhiteSpace($Template)) { "" } else { $Template }
    foreach ($k in $Tokens.Keys) {
        $result = $result.Replace("{$k}", [string]$Tokens[$k])
    }
    return $result
}

function Invoke-CodexAdapter {
    param(
        [string]$CommandText,
        [string]$WorkingDirectory,
        [string]$InvokeMode
    )
    if ([string]::IsNullOrWhiteSpace($CommandText)) {
        throw "Cannot invoke Codex adapter with empty command."
    }
    $wd = $WorkingDirectory
    if ([string]::IsNullOrWhiteSpace($wd)) { $wd = $PWD.Path }
    if (-not (Test-Path -LiteralPath $wd)) {
        throw "Codex adapter working directory does not exist: $wd"
    }
    if ($InvokeMode -eq "sync") {
        Push-Location $wd
        try {
            & cmd.exe /c $CommandText
            if ($LASTEXITCODE -ne 0) { throw "Codex adapter command exited with code $LASTEXITCODE." }
        }
        finally {
            Pop-Location
        }
        return
    }
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c $CommandText" -WorkingDirectory $wd -PassThru -WindowStyle Hidden
    if ($null -eq $proc) { throw "Failed to start Codex adapter command." }
}

function Invoke-BuiltinCodexRetryAdapter {
    param(
        [string]$WorkspaceRoot,
        [string]$RunId,
        [string]$RepoPath,
        [hashtable]$RunPaths,
        [hashtable]$AdapterConfig
    )

    $runnerScript = Join-Path $WorkspaceRoot "scripts\run-codex-retry.ps1"
    if (-not (Test-Path -LiteralPath $runnerScript)) {
        throw "Missing built-in Codex retry runner: $runnerScript"
    }

    $continueInstruction = @"
Continue from the interruption.
Do not restart from scratch and do not redo already completed work.
Before taking any new action, inspect git diff, generated artifacts, current repository state, logs, and any partial work from the interrupted run.
Then continue from the last useful point and finish the task.
"@

    $powerShellExe = "pwsh"
    if ($null -eq (Get-Command $powerShellExe -ErrorAction SilentlyContinue)) {
        $powerShellExe = "powershell.exe"
    }

    $argList = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", $runnerScript,
        "-WorkspaceRoot", $WorkspaceRoot,
        "-RunId", $RunId,
        "-RepoPath", $RepoPath,
        "-PromptPath", $RunPaths.codex_hardening_prompt_path,
        "-Executable", ([string]$AdapterConfig.executable),
        "-SandboxMode", ([string]$AdapterConfig.sandbox_mode),
        "-ApprovalPolicy", ([string]$AdapterConfig.approval_policy),
        "-MaxAttempts", ([string]$AdapterConfig.max_attempts),
        "-InitialBackoffSeconds", ([string]$AdapterConfig.initial_backoff_seconds),
        "-MaxBackoffSeconds", ([string]$AdapterConfig.max_backoff_seconds),
        "-ContinueInstruction", $continueInstruction
    )

    $preview = "$powerShellExe -NoProfile -ExecutionPolicy Bypass -File `"$runnerScript`" -WorkspaceRoot `"$WorkspaceRoot`" -RunId `"$RunId`" -RepoPath `"$RepoPath`" -PromptPath `"$($RunPaths.codex_hardening_prompt_path)`" -Executable `"$([string]$AdapterConfig.executable)`" -SandboxMode `"$([string]$AdapterConfig.sandbox_mode)`" -ApprovalPolicy `"$([string]$AdapterConfig.approval_policy)`" -MaxAttempts $([int]$AdapterConfig.max_attempts) -InitialBackoffSeconds $([int]$AdapterConfig.initial_backoff_seconds) -MaxBackoffSeconds $([int]$AdapterConfig.max_backoff_seconds)"

    if ([string]$AdapterConfig.invoke_mode -eq "sync") {
        & $powerShellExe @argList
        if ($LASTEXITCODE -ne 0) {
            throw "Built-in Codex retry runner exited with code $LASTEXITCODE."
        }
        return $preview
    }

    $proc = Start-Process -FilePath $powerShellExe -ArgumentList $argList -WorkingDirectory $RepoPath -PassThru -WindowStyle Hidden
    if ($null -eq $proc) {
        throw "Failed to start built-in Codex retry runner."
    }
    return $preview
}

function Read-CodexCompletionSignal {
    param([hashtable]$RunPaths, [string]$RunId)
    $result = [ordered]@{
        exists      = $false
        valid       = $false
        data        = $null
        parse_error = ""
    }
    if (-not (Test-Path -LiteralPath $RunPaths.codex_completion_path)) { return $result }
    $result.exists = $true
    try {
        $obj = Read-JsonObject -Path $RunPaths.codex_completion_path
        foreach ($k in @("worker", "run_id", "started_at", "completed_at", "codex_review_updated", "validations_attempted", "blocked", "note", "status")) {
            if (-not $obj.ContainsKey($k)) {
                if ($k -eq "codex_review_updated" -or $k -eq "blocked") { $obj[$k] = $false }
                elseif ($k -eq "validations_attempted") { $obj[$k] = @() }
                elseif ($k -eq "status") { $obj[$k] = "pending" }
                else { $obj[$k] = "" }
            }
        }
        if ([string]::IsNullOrWhiteSpace([string]$obj.run_id)) { $obj.run_id = $RunId }
        $result.data = $obj
        $result.valid = $true
    }
    catch {
        $result.parse_error = $_.Exception.Message
    }
    return $result
}

function Test-PlaceholderOnlyCodexReviewArtifact {
    param([string]$Content)
    $lines = @($Content -split "(`r`n|`n|`r)" | ForEach-Object { $_.Trim() } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($lines.Count -eq 0) { return $true }
    $meaningful = @(
        $lines | Where-Object {
            ($_ -notmatch '^(#\s*Codex Review|#\s*Codex\b)$') -and
            ($_ -notmatch '^(TODO|TBD|WIP|placeholder)$') -and
            ($_ -notmatch '^<!--.*-->$')
        }
    )
    return ($meaningful.Count -eq 0)
}

function Get-CodexCompletionAssessment {
    param([hashtable]$RunPaths, [string]$RunId)
    $completion = Read-CodexCompletionSignal -RunPaths $RunPaths -RunId $RunId
    $assessment = [ordered]@{
        completion     = $completion
        evidence_state = "no_evidence"
        summary        = "No Codex completion evidence yet."
        review_ready   = $false
        review_reason  = ""
    }

    $reviewExists = Test-Path -LiteralPath $RunPaths.codex_review_path
    $reviewRaw = if ($reviewExists) { Get-Content -LiteralPath $RunPaths.codex_review_path -Raw } else { "" }
    $reviewPlaceholder = $true
    if ($reviewExists -and -not [string]::IsNullOrWhiteSpace($reviewRaw)) {
        $reviewPlaceholder = Test-PlaceholderOnlyCodexReviewArtifact -Content $reviewRaw
    }
    $assessment.review_ready = $reviewExists -and -not [string]::IsNullOrWhiteSpace($reviewRaw) -and -not $reviewPlaceholder
    if (-not $reviewExists) { $assessment.review_reason = "codexReview.md missing" }
    elseif ([string]::IsNullOrWhiteSpace($reviewRaw)) { $assessment.review_reason = "codexReview.md empty" }
    elseif ($reviewPlaceholder) { $assessment.review_reason = "codexReview.md placeholder-only" }
    else { $assessment.review_reason = "codexReview.md contains hardening evidence" }

    if (-not $completion.exists) {
        $assessment.summary = "No completion signal file found."
        return $assessment
    }
    if (-not $completion.valid) {
        $assessment.evidence_state = "incomplete_evidence"
        $assessment.summary = "Completion signal exists but is invalid JSON."
        return $assessment
    }

    $data = $completion.data
    $status = ([string]$data.status).Trim().ToLowerInvariant()
    $meaningfulSignal = $false
    if (-not [string]::IsNullOrWhiteSpace([string]$data.completed_at)) { $meaningfulSignal = $true }
    if ([bool]$data.codex_review_updated) { $meaningfulSignal = $true }
    if (@($data.validations_attempted).Count -gt 0) { $meaningfulSignal = $true }
    if ([string]$status -in @("completed", "success", "ready", "failed", "blocked")) { $meaningfulSignal = $true }
    $noteText = [string]$data.note
    $seedNote = "Optional bounded completion signal for Codex hardening. Scripts remain authoritative."
    if (-not [string]::IsNullOrWhiteSpace($noteText.Trim()) -and $noteText.Trim() -ne $seedNote -and $noteText.Length -gt 20) { $meaningfulSignal = $true }

    if (-not $meaningfulSignal) {
        $assessment.evidence_state = "no_evidence"
        $assessment.summary = "Completion signal is present but still scaffold-level."
        return $assessment
    }
    if ($status -in @("completed", "ready", "success") -and -not [bool]$data.codex_review_updated) {
        $assessment.evidence_state = "incomplete_evidence"
        $assessment.summary = "Completion status is set but codex_review_updated is false."
        return $assessment
    }
    if (-not $assessment.review_ready) {
        $assessment.evidence_state = "incomplete_evidence"
        $assessment.summary = "Completion signal present but hardening evidence is incomplete ($($assessment.review_reason))."
        return $assessment
    }
    $assessment.evidence_state = "ready_for_final_review"
    $assessment.summary = "Codex completion evidence is present and codexReview.md appears ready."
    return $assessment
}

function Invoke-ReconcileCodexCompletionSignal {
    param(
        [string]$RunId,
        [hashtable]$RunPaths
    )
    $assessment = Get-CodexCompletionAssessment -RunPaths $RunPaths -RunId $RunId
    if (-not $assessment.review_ready) {
        throw "Cannot reconcile Codex completion signal: $([string]$assessment.review_reason)."
    }

    $signal = Read-CodexCompletionSignal -RunPaths $RunPaths -RunId $RunId
    if ($signal.exists -and -not $signal.valid) {
        throw "Cannot reconcile Codex completion signal because the JSON is invalid: $([string]$signal.parse_error)"
    }

    $existing = if ($signal.valid -and $null -ne $signal.data) { $signal.data } else { [ordered]@{} }
    $now = Get-NowIso
    $note = [string]$existing.note
    if ([string]::IsNullOrWhiteSpace($note) -or $note -match "Optional bounded completion signal") {
        $note = "Reconciled from codexReview.md evidence by bounded helper. Scripts remain authoritative for finish."
    }

    $reconciled = [ordered]@{
        worker                = "codex"
        run_id                = $RunId
        started_at            = if ([string]::IsNullOrWhiteSpace([string]$existing.started_at)) { $now } else { [string]$existing.started_at }
        completed_at          = if ([string]::IsNullOrWhiteSpace([string]$existing.completed_at)) { $now } else { [string]$existing.completed_at }
        validations_attempted = if ($null -ne $existing.validations_attempted) { @($existing.validations_attempted) } else { @() }
        codex_review_updated  = $true
        blocked               = $false
        note                  = $note
        status                = "ready"
    }
    Write-JsonObject -Path $RunPaths.codex_completion_path -Data $reconciled
    return $reconciled
}

function Write-CodexHardeningPrompt {
    param(
        [string]$RunId,
        [string]$RepoPath,
        [hashtable]$State,
        [hashtable]$RunContext,
        [hashtable]$RunPaths
    )
    $branch = if ([string]::IsNullOrWhiteSpace([string]$RunContext.branch)) { "[not set]" } else { [string]$RunContext.branch }
    $content = @"
# Codex Hardening Prompt

Generated: $(Get-NowIso)
Run ID: $RunId
Task ID: $($RunContext.task_id)
Phase/Status: $($State.phase) / $($State.status)

## Target
- Repo path: $RepoPath
- Branch: $branch

## Run-local Inputs
- Task: $($RunPaths.task_path)
- Current implementation: $($RunPaths.current_artifact_path)

## Output Target
- Codex review output file: $($RunPaths.codex_review_path)

## Hardening Goals
- Identify correctness, regression, and edge-case risks.
- Propose concrete fixes and validation steps.
- Keep recommendations actionable and scoped to this task.

## Validation Expectations
- Include checks/tests to run for changed behavior.
- Flag anything requiring follow-up verification.

## Constraints
- Do not commit.
- Do not push.
"@
    Set-Content -LiteralPath $RunPaths.codex_hardening_prompt_path -Value $content -Encoding utf8
}

function Ensure-VisualReviewArtifact {
    param([hashtable]$RunPaths)
    if (Test-Path -LiteralPath $RunPaths.visual_review_path) { return }
    $content = @"
# Visual Review

Status: pending

## Notes
- Awaiting user visual approval decision.
"@
    Set-Content -LiteralPath $RunPaths.visual_review_path -Value $content -Encoding utf8
}

function Test-PlaceholderOnlyCurrentArtifact {
    param([string]$Content)
    $lines = @($Content -split "(`r`n|`n|`r)" | ForEach-Object { $_.Trim() } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($lines.Count -eq 0) { return $true }
    $meaningful = @(
        $lines | Where-Object {
            ($_ -notmatch '^(#\s*Current Build Artifact|#\s*Current\b)$') -and
            ($_ -notmatch '^(TODO|TBD|WIP|placeholder)$') -and
            ($_ -notmatch '^<!--.*-->$')
        }
    )
    return ($meaningful.Count -eq 0)
}

function Assert-ImplementationDonePreconditions {
    param([hashtable]$State, [hashtable]$RunPaths)
    $validStatuses = @("ready_for_claude", "ready_for_cursor", "implementation_in_progress", "implementation_ready", "needs_visual_revision", "needs_repair_pass")
    $status = [string]$State.status
    $phase = [string]$State.phase
    if (-not (($phase -eq "C") -and ($status -in $validStatuses))) {
        throw "implementation-done is only valid from implementation states. Current phase/status: $phase/$status. Expected Phase C with one of: $($validStatuses -join ', ')"
    }
    if (-not (Test-Path -LiteralPath $RunPaths.task_path)) {
        throw "Missing required task artifact: $($RunPaths.task_path)"
    }
    if (-not (Test-Path -LiteralPath $RunPaths.current_artifact_path)) {
        throw "Missing required implementation artifact: $($RunPaths.current_artifact_path)"
    }
    $currentRaw = Get-Content -LiteralPath $RunPaths.current_artifact_path -Raw
    if ([string]::IsNullOrWhiteSpace($currentRaw)) {
        throw "Implementation artifact is empty: $($RunPaths.current_artifact_path)"
    }
    if (Test-PlaceholderOnlyCurrentArtifact -Content $currentRaw) {
        throw "Implementation artifact appears placeholder-only. Update $($RunPaths.current_artifact_path) with actual implementation notes before running implementation-done."
    }
    $trimmed = $currentRaw.Trim()
    if ($trimmed.Length -lt 120) {
        Write-Host "Warning: implementation artifact looks brief (<120 chars). Continuing, but review content depth."
    }
}

function Invoke-ImplementationDoneTransition {
    param(
        [string]$WorkspaceRoot,
        [string]$RunId,
        [hashtable]$RunPaths,
        [hashtable]$State,
        [hashtable]$RunContext,
        [string]$CommandName = "implementation-done"
    )
    $lastImplementationEngine = [string]$State.execution_engine
    if ([string]::IsNullOrWhiteSpace($lastImplementationEngine) -or $lastImplementationEngine -eq "none") {
        $lastImplementationEngine = [string]$RunContext.execution_engine
    }
    if ([string]::IsNullOrWhiteSpace($lastImplementationEngine)) { $lastImplementationEngine = "none" }

    if ([bool]$State.requires_visual_approval) {
        Ensure-VisualReviewArtifact -RunPaths $RunPaths
        $State.phase = "C"
        $State.status = "awaiting_visual_approval"
        $State.execution_engine = $lastImplementationEngine
        $State.ui_changed = $true
        $State.needs_repair_pass = $false
        $State.runtime_validation_completed = $false
        Write-JsonObject -Path $RunPaths.state_path -Data $State
        Update-RunContext -Path $RunPaths.run_context_path -Current $RunContext -Changes @{
            phase                        = "C"
            status                       = "awaiting_visual_approval"
            execution_engine             = $lastImplementationEngine
            needs_repair_pass            = $false
            ui_changed                   = $true
            runtime_validation_completed = $false
            last_implementation_engine   = $lastImplementationEngine
            pending_action               = "visual_approval_decision"
        }
        $normalized = Normalize-RunStateAndContext -StatePath $RunPaths.state_path -RunContextPath $RunPaths.run_context_path
        $State = $normalized.state
        $RunContext = $normalized.run_context
        Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName $CommandName -Message "Implementation marked complete."
        Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName $CommandName -Message "Run is awaiting visual approval."
        $null = Send-RunNotification -WorkspaceRoot $WorkspaceRoot -RunId $RunId -RunPaths $RunPaths -StateRef ([ref]$State) -RunContextRef ([ref]$RunContext) -Severity "info" -Reason "awaiting_visual_approval" -Message "Run is awaiting visual approval." -NextAction ".\pp.ps1 approve"
        Sync-RunIndexRecord -WorkspaceRoot $WorkspaceRoot -RunId $RunId -State $State -RunContext $RunContext
        Write-Host "[pipeline-event] implementation complete -> awaiting visual approval"
        Write-Host "Implementation artifact validated: $($RunPaths.current_artifact_path)"
        Write-Host "Transitioned to: Phase C / awaiting_visual_approval"
        Write-Host "Next artifact: $($RunPaths.visual_review_path)"
        Print-Dashboard -RunId $RunId -State $State -RunContext $RunContext -RunPaths $RunPaths
        Print-RunEvents -RunId $RunId -RunPaths $RunPaths -Tail 4 -RecentOnly
    }
    else {
        $State.phase = "C"
        $State.status = "awaiting_runtime_validation"
        $State.execution_engine = "none"
        $State.requires_runtime_validation = $true
        $State.needs_repair_pass = $false
        $State.runtime_validation_completed = $false
        Write-JsonObject -Path $RunPaths.state_path -Data $State

        Update-RunContext -Path $RunPaths.run_context_path -Current $RunContext -Changes @{
            phase                        = "C"
            status                       = "awaiting_runtime_validation"
            execution_engine             = "none"
            requires_runtime_validation  = $true
            needs_repair_pass            = $false
            runtime_validation_completed = $false
            last_implementation_engine   = $lastImplementationEngine
            pending_action               = "start_runtime_validation"
        }
        $normalized = Normalize-RunStateAndContext -StatePath $RunPaths.state_path -RunContextPath $RunPaths.run_context_path
        $State = $normalized.state
        $RunContext = $normalized.run_context
        Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName $CommandName -Message "Implementation marked complete."
        Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName $CommandName -Message "Awaiting runtime validation."
        $null = Send-RunNotification -WorkspaceRoot $WorkspaceRoot -RunId $RunId -RunPaths $RunPaths -StateRef ([ref]$State) -RunContextRef ([ref]$RunContext) -Severity "info" -Reason "awaiting_runtime_validation" -Message "Run is awaiting runtime validation." -NextAction ".\pp.ps1 runtime-start"
        Sync-RunIndexRecord -WorkspaceRoot $WorkspaceRoot -RunId $RunId -State $State -RunContext $RunContext
        Write-Host "[pipeline-event] implementation complete -> awaiting runtime validation"
        Write-Host "Implementation artifact validated: $($RunPaths.current_artifact_path)"
        Write-Host "Transitioned to: Phase C / awaiting_runtime_validation"
        Write-Host "Next command: .\pp.ps1 runtime-start"
        Print-Dashboard -RunId $RunId -State $State -RunContext $RunContext -RunPaths $RunPaths
        Print-RunEvents -RunId $RunId -RunPaths $RunPaths -Tail 4 -RecentOnly
    }
}

function Assert-ClaudeFinishPreconditions {
    param([hashtable]$State, [hashtable]$RunContext, [hashtable]$RunPaths, [string]$RunId)

    Assert-ImplementationDonePreconditions -State $State -RunPaths $RunPaths

    $status = [string]$State.status
    $phase = [string]$State.phase
    $engine = [string]$State.execution_engine
    $pending = [string]$RunContext.pending_action
    if (-not (($phase -eq "C") -and ($status -in @("ready_for_claude", "implementation_ready", "implementation_in_progress", "needs_visual_revision", "needs_repair_pass")))) {
        throw "claude-finish is only valid in Claude implementation states. Current phase/status: $phase/$status"
    }
    if (-not ($engine -eq "claude" -or $pending -eq "claude_implementation_in_progress" -or $status -eq "ready_for_claude")) {
        throw "claude-finish requires a Claude completion path. execution_engine='$engine', pending_action='$pending', status='$status'."
    }

    $completion = Read-ClaudeCompletionSignal -RunPaths $RunPaths -RunId $RunId
    if (-not $completion.exists) {
        throw "Missing Claude completion signal: $($RunPaths.claude_completion_path)"
    }
    if (-not $completion.valid) {
        throw "Invalid Claude completion signal JSON: $($completion.parse_error)"
    }
    if ([string]$completion.data.run_id -ne $RunId) {
        throw "Claude completion signal run_id '$([string]$completion.data.run_id)' does not match active run '$RunId'."
    }

    $assessment = Get-ClaudeCompletionAssessment -RunPaths $RunPaths -RunId $RunId
    if ([string]$assessment.evidence_state -ne "ready_for_implementation_done") {
        throw "Claude evidence is not ready for consumption: $([string]$assessment.summary)"
    }

    if (-not (Test-Path -LiteralPath $RunPaths.worker_heartbeat_path)) {
        throw "Missing worker heartbeat for Claude finish: $($RunPaths.worker_heartbeat_path)"
    }
    $hb = Read-WorkerHeartbeat -RunPaths $RunPaths -State $State -RunContext $RunContext
    $hbTs = Get-DateSafe -Value ([string]$hb.last_progress_at)
    if ($null -eq $hbTs) {
        throw "Worker heartbeat last_progress_at is missing/invalid; cannot trust completion evidence."
    }
    $ageMinutes = ([DateTime]::UtcNow - $hbTs.ToUniversalTime()).TotalMinutes
    $supervisor = [string]$State.supervisor_state
    if ($supervisor -eq "worker_blocked") {
        throw "Supervisor is worker_blocked; resolve worker issues before consuming Claude completion."
    }
    if ($supervisor -eq "worker_retrying" -and $ageMinutes -gt 30) {
        throw ("Worker heartbeat is stale ({0:N1}m) while retrying; refresh evidence before claude-finish." -f $ageMinutes)
    }
    if ($supervisor -eq "worker_degraded" -and $ageMinutes -gt 60) {
        throw ("Worker heartbeat is stale ({0:N1}m) in degraded mode; refresh evidence before claude-finish." -f $ageMinutes)
    }
    if ($ageMinutes -gt 180) {
        throw ("Worker heartbeat is too old ({0:N1}m); completion evidence is untrustworthy." -f $ageMinutes)
    }

    $warnings = @()
    if ($supervisor -eq "worker_degraded") {
        $warnings += "Supervisor is worker_degraded; consuming evidence with caution."
    }
    return [ordered]@{
        assessment = $assessment
        completion = $completion
        heartbeat_minutes = $ageMinutes
        warnings = $warnings
    }
}

function Assert-CodexStartPreconditions {
    param([hashtable]$State, [hashtable]$RunContext, [hashtable]$RunPaths)
    $phase = [string]$State.phase
    $status = [string]$State.status
    $engine = [string]$State.execution_engine
    $validStatuses = @("ready_for_codex", "hardening", "approved_for_hardening")
    if (-not (($phase -eq "D") -and ($status -in $validStatuses))) {
        throw "codex-start is only valid in Codex hardening states. Current phase/status: $phase/$status"
    }
    if ($engine -ne "codex") {
        throw "codex-start requires execution_engine=codex. Current execution_engine: '$engine'."
    }
    if ([bool]$State.requires_runtime_validation -and -not [bool]$State.runtime_validation_completed) {
        throw "codex-start is blocked until runtime validation is complete."
    }
    foreach ($required in @($RunPaths.task_path, $RunPaths.current_artifact_path, $RunPaths.codex_hardening_prompt_path)) {
        if (-not (Test-Path -LiteralPath $required)) {
            throw "Missing required hardening input: $required"
        }
    }
}

function Assert-CodexFinishPreconditions {
    param([hashtable]$State, [hashtable]$RunContext, [hashtable]$RunPaths, [string]$RunId)
    $phase = [string]$State.phase
    $status = [string]$State.status
    $engine = [string]$State.execution_engine
    if (-not ($phase -eq "D" -and $status -in @("ready_for_codex", "hardening", "approved_for_hardening"))) {
        throw "codex-finish is only valid in Phase D hardening states. Current phase/status: $phase/$status"
    }
    if ($engine -ne "codex") {
        throw "codex-finish requires execution_engine=codex. Current execution_engine: '$engine'."
    }
    if ([bool]$State.requires_runtime_validation -and -not [bool]$State.runtime_validation_completed) {
        throw "codex-finish is blocked until runtime validation is complete."
    }

    $completion = Read-CodexCompletionSignal -RunPaths $RunPaths -RunId $RunId
    if (-not $completion.exists) {
        throw "Missing Codex completion signal: $($RunPaths.codex_completion_path)"
    }
    if (-not $completion.valid) {
        throw "Invalid Codex completion signal JSON: $($completion.parse_error)"
    }
    if ([string]$completion.data.run_id -ne $RunId) {
        throw "Codex completion signal run_id '$([string]$completion.data.run_id)' does not match active run '$RunId'."
    }

    $assessment = Get-CodexCompletionAssessment -RunPaths $RunPaths -RunId $RunId
    if ([string]$assessment.evidence_state -ne "ready_for_final_review") {
        throw "Codex evidence is not ready for consumption: $([string]$assessment.summary)"
    }

    if (-not (Test-Path -LiteralPath $RunPaths.worker_heartbeat_path)) {
        throw "Missing worker heartbeat for codex-finish: $($RunPaths.worker_heartbeat_path)"
    }
    $hb = Read-WorkerHeartbeat -RunPaths $RunPaths -State $State -RunContext $RunContext
    $hbTs = Get-DateSafe -Value ([string]$hb.last_progress_at)
    if ($null -eq $hbTs) {
        throw "Worker heartbeat last_progress_at is missing/invalid; cannot trust Codex completion evidence."
    }
    $ageMinutes = ([DateTime]::UtcNow - $hbTs.ToUniversalTime()).TotalMinutes
    $supervisor = [string]$State.supervisor_state
    if ($supervisor -eq "worker_blocked") {
        throw "Supervisor is worker_blocked; resolve worker issues before consuming Codex completion."
    }
    if ($supervisor -eq "worker_retrying" -and $ageMinutes -gt 30) {
        throw ("Worker heartbeat is stale ({0:N1}m) while retrying; refresh evidence before codex-finish." -f $ageMinutes)
    }
    if ($supervisor -eq "worker_degraded" -and $ageMinutes -gt 60) {
        throw ("Worker heartbeat is stale ({0:N1}m) in degraded mode; refresh evidence before codex-finish." -f $ageMinutes)
    }
    if ($ageMinutes -gt 180) {
        throw ("Worker heartbeat is too old ({0:N1}m); Codex completion evidence is untrustworthy." -f $ageMinutes)
    }

    $warnings = @()
    if ($supervisor -eq "worker_degraded") {
        $warnings += "Supervisor is worker_degraded; consuming Codex evidence with caution."
    }
    return [ordered]@{
        assessment       = $assessment
        completion       = $completion
        heartbeat_minutes = $ageMinutes
        warnings         = $warnings
    }
}

function Get-VisualReviewStatus {
    param([string]$VisualReviewPath)
    if (-not (Test-Path -LiteralPath $VisualReviewPath)) { return "" }
    $raw = Get-Content -LiteralPath $VisualReviewPath -Raw
    $match = [regex]::Match($raw, "(?m)^Status:\s*(.+?)\s*$")
    if (-not $match.Success) { return "" }
    return $match.Groups[1].Value.Trim().ToLowerInvariant()
}

function Ensure-RuntimeValidationTemplate {
    param([hashtable]$RunPaths, [hashtable]$State, [hashtable]$RunContext)
    if (Test-Path -LiteralPath $RunPaths.runtime_validation_path) {
        $raw = Get-Content -LiteralPath $RunPaths.runtime_validation_path -Raw
        $hasCoreTemplate = (-not [string]::IsNullOrWhiteSpace($raw)) -and
            ($raw -match "(?m)^#\s+Runtime Validation\s*$") -and
            ($raw -match "(?m)^##\s+Primary Flow Proof\s*$") -and
            ($raw -match "(?m)^##\s+Misuse / Failure / Interruption Proof\s*$") -and
            ($raw -match "(?m)^##\s+Regression Spot-Check\s*$") -and
            ($raw -match "(?m)^##\s+Final Runtime Validation Decision\s*$")
        if ($hasCoreTemplate) { return }
    }
    $branch = if ([string]::IsNullOrWhiteSpace([string]$RunContext.branch)) { "[not set]" } else { [string]$RunContext.branch }
    $content = @"
# Runtime Validation

## Feature
[feature/day/scope]

## Intended User Outcome
[What the user should be able to accomplish]

## Validation Context
- Environment: [browser/device/local runtime]
- Branch: $branch
- Build/version: [commit/build/version checked]
- Reviewer: [name]
- Date: $(Get-Date -Format "yyyy-MM-dd")

## Primary Flow Proof
### Flow 1
- Steps:
  1. [step one]
  2. [step two]
  3. [step three]
- Expected Result: [expected user-visible/system result]
- Observed Result: [what actually happened]
- Status: PASS

## Misuse / Failure / Interruption Proof
### Scenario 1
- Scenario: [misuse/failure/interruption scenario tested]
- Steps: [how the scenario was exercised]
- Expected Result: [expected safe handling]
- Observed Result: [what actually happened]
- Status: PASS

## State / Persistence Proof
- Persistence expected? Yes / No
- Reset behavior expected? Yes / No
- Storage keys touched: [keys or none]
- Refresh behavior: [what happened on refresh/reload]
- Observed Result: [what actually happened]
- Status: PASS / FAIL / N/A

## Trust / UX Proof
- Loading state checked: [yes/no + notes]
- Success feedback checked: [yes/no + notes]
- Error feedback checked: [yes/no + notes]
- Empty state checked: [yes/no + notes]
- Privacy/trust cues checked: [yes/no + notes]
- Observed Result: [what actually happened]
- Status: PASS

## Regression Spot-Check
### Surface 1
- Why checked: [adjacent surface/regression area]
- Result: [what happened]
- Status: PASS

## Open Risks / Known Non-Goals
- [risk or explicit non-goal]

## Final Runtime Validation Decision
- Decision: PASS
- Notes: [summary / follow-ups / known risks]
"@
    Set-Content -LiteralPath $RunPaths.runtime_validation_path -Value $content -Encoding utf8
}

function Assert-RuntimeStartPreconditions {
    param([hashtable]$State, [hashtable]$RunPaths)
    $valid = @("awaiting_runtime_validation", "runtime_validation_failed", "awaiting_visual_approval", "ready_for_claude", "ready_for_cursor", "implementation_ready", "implementation_in_progress", "needs_visual_revision", "needs_repair_pass")
    if ([string]$State.status -notin $valid) {
        throw "runtime-start is only valid from post-implementation states. Current phase/status: $($State.phase)/$($State.status)"
    }
    if (-not [bool]$State.requires_runtime_validation) {
        throw "runtime-start is not required for this run (requires_runtime_validation=false)."
    }
    if ([bool]$State.requires_visual_approval) {
        $visualStatus = Get-VisualReviewStatus -VisualReviewPath $RunPaths.visual_review_path
        if ($visualStatus -ne "approved") {
            throw "runtime-start requires visual approval first. Current visual status: '$visualStatus'."
        }
    }
    if (-not (Test-Path -LiteralPath $RunPaths.task_path)) {
        throw "Missing required task artifact: $($RunPaths.task_path)"
    }
    if (-not (Test-Path -LiteralPath $RunPaths.current_artifact_path)) {
        throw "Missing required implementation artifact: $($RunPaths.current_artifact_path)"
    }
    $currentRaw = Get-Content -LiteralPath $RunPaths.current_artifact_path -Raw
    if ([string]::IsNullOrWhiteSpace($currentRaw)) {
        throw "Implementation artifact is empty: $($RunPaths.current_artifact_path)"
    }
    if (Test-PlaceholderOnlyCurrentArtifact -Content $currentRaw) {
        throw "Implementation artifact appears placeholder-only. Update $($RunPaths.current_artifact_path) with actual implementation notes before runtime-start."
    }
}

function Assert-RuntimeValidationArtifact {
    param([hashtable]$State, [hashtable]$RunPaths)
    if (-not (Test-Path -LiteralPath $RunPaths.runtime_validation_path)) {
        throw "Missing runtime validation artifact: $($RunPaths.runtime_validation_path)"
    }
    $raw = Get-Content -LiteralPath $RunPaths.runtime_validation_path -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw "runtime-validation.md is empty: $($RunPaths.runtime_validation_path)"
    }
    if ($raw -match [regex]::Escape("[feature/day/scope]") -or $raw -match [regex]::Escape("[What the user should be able to accomplish]")) {
        throw "runtime-validation.md still contains template placeholders. Complete the document before runtime-done."
    }
    $blankTemplateLines = @(
        "(?m)^\s*-\s*Environment:\s*$",
        "(?m)^\s*-\s*Branch:\s*$",
        "(?m)^\s*-\s*Build/version:\s*$",
        "(?m)^\s*-\s*Reviewer:\s*$",
        "(?m)^\s*-\s*Date:\s*$"
    )
    foreach ($linePattern in $blankTemplateLines) {
        if ($raw -match $linePattern) {
            throw "runtime-validation.md still has incomplete validation context fields. Complete the document before runtime-done."
        }
    }
    foreach ($section in @(
        "## Intended User Outcome",
        "## Primary Flow Proof",
        "## Misuse / Failure / Interruption Proof",
        "## Regression Spot-Check",
        "## Final Runtime Validation Decision"
    )) {
        if ($raw -notmatch [regex]::Escape($section)) {
            throw "runtime-validation.md missing required section: $section"
        }
    }
    if ($raw -notmatch "(?ms)## Primary Flow Proof.*?###\s+Flow\s+1") { throw "runtime-validation.md requires at least one primary flow entry (Flow 1)." }
    if ($raw -notmatch "(?ms)## Misuse / Failure / Interruption Proof.*?###\s+Scenario\s+1") { throw "runtime-validation.md requires at least one misuse/failure scenario entry." }
    if ($raw -notmatch "(?ms)## Regression Spot-Check.*?###\s+Surface\s+1") { throw "runtime-validation.md requires at least one regression surface entry." }
    if ($raw -notmatch "(?ms)## Final Runtime Validation Decision.*?Decision:\s*(PASS|FAIL|PASS WITH KNOWN RISKS)") {
        throw "runtime-validation.md requires a final runtime decision: PASS, FAIL, or PASS WITH KNOWN RISKS."
    }
    if ($raw -notmatch "(?ms)## Primary Flow Proof.*?Status:\s*(PASS|FAIL)") {
        throw "Primary flow proof must include a PASS/FAIL status."
    }
    if ($raw -notmatch "(?ms)## Misuse / Failure / Interruption Proof.*?Status:\s*(PASS|FAIL)") {
        throw "Misuse/failure proof must include a PASS/FAIL status."
    }
    if ($raw -notmatch "(?ms)## Regression Spot-Check.*?Status:\s*(PASS|FAIL|N/A)") {
        throw "Regression spot-check must include status values."
    }
    if (([bool]$State.touches_persistence -or [bool]$State.touches_saved_state) -and ($raw -match "(?ms)## State / Persistence Proof.*?Status:\s*N/A")) {
        throw "Persistence-sensitive run cannot mark State / Persistence Proof as N/A-only."
    }
    if ([bool]$State.touches_privacy_or_trust_copy) {
        $trustBlock = [regex]::Match($raw, "(?ms)## Trust / UX Proof(.*?)(## Regression Spot-Check)").Groups[1].Value
        if ([string]::IsNullOrWhiteSpace($trustBlock) -or $trustBlock -match "Loading state checked:\s*$") {
            throw "Trust/privacy-sensitive run requires meaningful Trust / UX Proof content."
        }
    }
}

function Invoke-AutomatedFrontendRuntimeValidation {
    param(
        [string]$WorkspaceRoot,
        [string]$RunId,
        [string]$RepoPath,
        [hashtable]$RunPaths,
        [hashtable]$State,
        [hashtable]$RunContext
    )

    $resultPath = [string]$RunPaths.runtime_validation_playwright_result_path
    $runnerPath = Join-Path $RepoPath "scripts\run-route-shell-validation.mjs"
    if (-not (Test-Path -LiteralPath $runnerPath)) {
        return [ordered]@{
            supported = $false
            status = "unavailable"
            message = "Playwright route/shell validation runner is missing."
            result_path = $resultPath
        }
    }

    $args = @(
        "scripts/run-route-shell-validation.mjs",
        "--run-id", [string]$RunId,
        "--task", [string]$RunPaths.task_path,
        "--current", [string]$RunPaths.current_artifact_path,
        "--runtime-validation", [string]$RunPaths.runtime_validation_path,
        "--result-json", $resultPath,
        "--branch", [string]$RunContext.branch
    )

    $stdout = ""
    $stderr = ""
    $exitCode = 1
    Push-Location $RepoPath
    try {
        $output = & node @args 2>&1
        $exitCode = $LASTEXITCODE
        if ($null -ne $output) {
            $joined = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
            if ($exitCode -eq 0) { $stdout = $joined } else { $stderr = $joined }
        }
    }
    finally {
        Pop-Location
    }

    $resultDoc = if (Test-Path -LiteralPath $resultPath) {
        Read-JsonObject -Path $resultPath
    } else {
        [ordered]@{
            supported = $false
            status = "failed"
            message = "Automated runtime validation did not produce a result artifact."
        }
    }

    $resultDoc["exit_code"] = $exitCode
    $resultDoc["stdout"] = if ([string]::IsNullOrWhiteSpace([string]$stdout)) { [string]$resultDoc.stdout } else { $stdout }
    $resultDoc["stderr"] = if ([string]::IsNullOrWhiteSpace([string]$stderr)) { [string]$resultDoc.stderr } else { $stderr }
    $resultDoc["result_path"] = $resultPath
    return $resultDoc
}

function Start-RuntimeValidationFlow {
    param(
        [string]$WorkspaceRoot,
        [string]$RunId,
        [hashtable]$RunPaths,
        [hashtable]$State,
        [hashtable]$RunContext
    )

    $playwrightResult = $null
    $runtimeMode = [string]$State.runtime_validation_mode

    Assert-RuntimeStartPreconditions -State $State -RunPaths $RunPaths
    Ensure-RuntimeValidationTemplate -RunPaths $RunPaths -State $State -RunContext $RunContext

    if ([string]$RunContext.repo -eq "frontend") {
        $repoPathForRuntime = Get-RepoPath -ReposDoc $reposDoc -RepoKey ([string]$RunContext.repo)
        $playwrightResult = Invoke-AutomatedFrontendRuntimeValidation -WorkspaceRoot $WorkspaceRoot -RunId $RunId -RepoPath $repoPathForRuntime -RunPaths $RunPaths -State $State -RunContext $RunContext
        $playwrightStatus = [string]$playwrightResult.status
        if ($playwrightStatus -eq "passed") {
            $runtimeMode = "playwright_route_shell_auto"
        }
        elseif ($playwrightStatus -eq "failed") {
            $runtimeMode = "playwright_route_shell_failed"
        }
        elseif ($playwrightStatus -eq "not_supported") {
            $runtimeMode = "ui_workflow_manual"
        }
        elseif ($playwrightStatus -eq "unavailable") {
            $runtimeMode = "ui_workflow_manual"
        }
    }

    $State.phase = "C"
    $State.status = "runtime_validation_in_progress"
    $State.execution_engine = "none"
    $State.runtime_validation_completed = $false
    if (-not [string]::IsNullOrWhiteSpace($runtimeMode)) {
        $State.runtime_validation_mode = $runtimeMode
    }
    Write-JsonObject -Path $RunPaths.state_path -Data $State
    Update-RunContext -Path $RunPaths.run_context_path -Current $RunContext -Changes @{
        phase                        = "C"
        status                       = "runtime_validation_in_progress"
        execution_engine             = "none"
        runtime_validation_completed = $false
        runtime_validation_mode      = $runtimeMode
        pending_action               = "complete_runtime_validation"
    }
    $normalized = Normalize-RunStateAndContext -StatePath $RunPaths.state_path -RunContextPath $RunPaths.run_context_path
    $State = $normalized.state
    $RunContext = $normalized.run_context
    Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName "runtime-start" -Message "Runtime validation started."
    if ($null -ne $playwrightResult) {
        $playwrightStatus = [string]$playwrightResult.status
        $playwrightMessage = [string]$playwrightResult.message
        if ($playwrightStatus -eq "passed") {
            Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName "runtime-start" -Message "Automated Playwright route/shell validation passed and runtime-validation.md was generated."
        }
        elseif ($playwrightStatus -eq "failed") {
            Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName "runtime-start" -Level "warn" -Message "Automated Playwright route/shell validation failed: $playwrightMessage"
        }
        elseif ($playwrightStatus -eq "not_supported") {
            Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName "runtime-start" -Message "Automated Playwright route/shell validation was not eligible for this run; manual runtime review remains active."
        }
        elseif ($playwrightStatus -eq "unavailable") {
            Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName "runtime-start" -Level "warn" -Message "Automated Playwright route/shell validation is unavailable: $playwrightMessage"
        }
    }
    Sync-RunIndexRecord -WorkspaceRoot $WorkspaceRoot -RunId $RunId -State $State -RunContext $RunContext

    return [ordered]@{
        state = $State
        run_context = $RunContext
        playwright_result = $playwrightResult
    }
}

function Assert-FinalReviewPreconditions {
    param([hashtable]$State, [hashtable]$RunPaths, [switch]$AllowFromHardening)
    $phase = [string]$State.phase
    $status = [string]$State.status
    $validStatuses = if ($AllowFromHardening.IsPresent) {
        @("ready_for_codex", "hardening", "approved_for_hardening", "ready_for_final_judgment", "final_review")
    } else {
        @("ready_for_final_judgment", "final_review")
    }
    $validPhases = if ($AllowFromHardening.IsPresent) { @("D", "E") } else { @("E") }
    if (-not ($phase -in $validPhases) -or -not ($status -in $validStatuses)) {
        if (-not $AllowFromHardening.IsPresent -and ($phase -eq "D" -or $status -in @("ready_for_codex", "hardening", "approved_for_hardening"))) {
            throw "final-review is blocked until Codex evidence is consumed authoritatively. Run: .\pp.ps1 codex-start -> .\pp.ps1 codex-check -> .\pp.ps1 codex-finish"
        }
        throw "final-review is only valid from authoritative late-stage states. Current phase/status: $phase/$status. Expected phase $($validPhases -join ' or ') with one of: $($validStatuses -join ', ')"
    }
    if ([bool]$State.requires_runtime_validation -and -not [bool]$State.runtime_validation_completed) {
        throw "final-review is blocked until runtime validation is complete. Run: .\pp.ps1 runtime-start then .\pp.ps1 runtime-done"
    }
    foreach ($required in @($RunPaths.task_path, $RunPaths.current_artifact_path, $RunPaths.codex_review_path)) {
        if (-not (Test-Path -LiteralPath $required)) {
            throw "Missing required final-review artifact: $required"
        }
    }
    $codexRaw = Get-Content -LiteralPath $RunPaths.codex_review_path -Raw
    if ([string]::IsNullOrWhiteSpace($codexRaw) -or ($codexRaw.Trim().Length -lt 60)) {
        Write-Host "Warning: codexReview.md appears minimal. Final judgment may be under-informed."
    }
}

function Invoke-PostHardeningTransition {
    param(
        [string]$WorkspaceRoot,
        [string]$RunId,
        [hashtable]$RunPaths,
        [hashtable]$State,
        [hashtable]$RunContext,
        [string]$FinalReviewScriptPath,
        [string]$CommandName
)
    $preserve = [ordered]@{
        flow_type                     = [string]$State.flow_type
        task_type                     = [string]$State.task_type
        requires_visual_approval      = [bool]$State.requires_visual_approval
        requires_runtime_validation   = [bool]$State.requires_runtime_validation
        runtime_validation_mode       = [string]$State.runtime_validation_mode
        runtime_validation_completed  = [bool]$State.runtime_validation_completed
        touches_persistence           = [bool]$State.touches_persistence
        touches_navigation            = [bool]$State.touches_navigation
        touches_import_flow           = [bool]$State.touches_import_flow
        touches_api_contract          = [bool]$State.touches_api_contract
        touches_external_api          = [bool]$State.touches_external_api
        touches_database              = [bool]$State.touches_database
        touches_saved_state           = [bool]$State.touches_saved_state
        touches_privacy_or_trust_copy = [bool]$State.touches_privacy_or_trust_copy
        ui_changed                    = [bool]$State.ui_changed
    }
    Assert-FinalReviewPreconditions -State $State -RunPaths $RunPaths -AllowFromHardening
    & $FinalReviewScriptPath -RunRoot $RunPaths.run_root

    $State = Read-JsonObject -Path $RunPaths.state_path
    $RunContext = Read-JsonObject -Path $RunPaths.run_context_path
    foreach ($k in $preserve.Keys) {
        $State[$k] = $preserve[$k]
    }
    Write-JsonObject -Path $RunPaths.state_path -Data $State
    Update-RunContext -Path $RunPaths.run_context_path -Current $RunContext -Changes @{
        flow_type          = [string]$preserve.flow_type
        task_type          = [string]$preserve.task_type
        phase             = "E"
        status            = "ready_for_final_judgment"
        execution_engine  = "chatgpt"
        needs_repair_pass = $false
        requires_visual_approval    = [bool]$preserve.requires_visual_approval
        requires_runtime_validation  = [bool]$preserve.requires_runtime_validation
        runtime_validation_mode      = [string]$preserve.runtime_validation_mode
        runtime_validation_completed = [bool]$preserve.runtime_validation_completed
        touches_persistence          = [bool]$preserve.touches_persistence
        touches_navigation           = [bool]$preserve.touches_navigation
        touches_import_flow          = [bool]$preserve.touches_import_flow
        touches_api_contract         = [bool]$preserve.touches_api_contract
        touches_external_api         = [bool]$preserve.touches_external_api
        touches_database             = [bool]$preserve.touches_database
        touches_saved_state          = [bool]$preserve.touches_saved_state
        touches_privacy_or_trust_copy = [bool]$preserve.touches_privacy_or_trust_copy
        ui_changed         = [bool]$preserve.ui_changed
        pending_action    = "ready_for_final_judgment"
    }
    $normalized = Normalize-RunStateAndContext -StatePath $RunPaths.state_path -RunContextPath $RunPaths.run_context_path
    $State = $normalized.state
    $RunContext = $normalized.run_context
    Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName $CommandName -Message "Final-review packet generated."
    Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName $CommandName -Message "Ready for ChatGPT final judgment."
    $null = Send-RunNotification -WorkspaceRoot $WorkspaceRoot -RunId $RunId -RunPaths $RunPaths -StateRef ([ref]$State) -RunContextRef ([ref]$RunContext) -Severity "info" -Reason "ready_for_final_judgment" -Message "Run is ready for final judgment." -NextAction ".\pp.ps1 final-review"
    Sync-RunIndexRecord -WorkspaceRoot $WorkspaceRoot -RunId $RunId -State $State -RunContext $RunContext

    Write-Host "[pipeline-event] final-review packet refreshed"
    Write-Host "Transitioned to: Phase E / ready_for_final_judgment"
    Write-Host "Next prompt: $($RunPaths.final_review_generated_prompt_path)"
    Write-Host "System is waiting on: ChatGPT final judgment"
    Write-Host "After judgment, run one of:"
    Write-Host "  - .\pp.ps1 commit -Message <msg>"
    Write-Host "  - .\pp.ps1 no-commit"
    Print-Dashboard -RunId $RunId -State $State -RunContext $RunContext -RunPaths $RunPaths
    Print-RunEvents -RunId $RunId -RunPaths $RunPaths -Tail 5 -RecentOnly
}

function Get-NextPromptPath {
    param([hashtable]$State, [hashtable]$RunPaths)
    $phase = [string]$State.phase
    $status = [string]$State.status
    if ($phase -eq "C" -and $status -in @("awaiting_visual_approval", "awaiting_runtime_validation", "runtime_validation_in_progress", "runtime_validation_failed")) { return "[none]" }
    if ($phase -eq "C" -or $status -in @("implementation_ready", "ready_for_claude", "ready_for_cursor", "implementation_in_progress", "needs_visual_revision", "needs_repair_pass")) { return $RunPaths.builder_prompt_path }
    if ($phase -eq "D" -or $status -in @("ready_for_codex", "hardening", "approved_for_hardening")) { return $RunPaths.codex_hardening_prompt_path }
    if ($phase -eq "E" -or $status -in @("ready_for_final_judgment", "final_review", "merge_ready")) { return $RunPaths.final_review_generated_prompt_path }
    return "[none]"
}

function Print-Dashboard {
    param([string]$RunId, [hashtable]$State, [hashtable]$RunContext, [hashtable]$RunPaths)
    $notifyCfg = Get-NotificationConfig -WorkspaceRoot $workspaceRoot
    Write-Host "Pipeline Dashboard"
    Write-Host "Current run: $RunId"
    Write-Host "Run path: $($RunPaths.run_root)"
    Write-Host "Task ID: $($RunContext.task_id)"
    Write-Host "Repo: $($RunContext.repo)"
    Write-Host "Branch: $($RunContext.branch)"
    Write-Host "Flow type: $($State.flow_type)"
    Write-Host "Task type: $($State.task_type)"
    Write-Host "Execution engine: $($State.execution_engine)"
    Write-Host "Phase: $($State.phase)"
    Write-Host "Status: $($State.status)"
    Write-Host "Pending action: $($RunContext.pending_action)"
    Write-Host "Requires visual approval: $([bool]$State.requires_visual_approval)"
    Write-Host "Requires runtime validation: $([bool]$State.requires_runtime_validation)"
    Write-Host "Runtime validation completed: $([bool]$State.runtime_validation_completed)"
    Write-Host "Supervisor state: $([string]$State.supervisor_state)"
    Write-Host "Retry count: $([int]$State.retry_count)"
    Write-Host "Next retry at: $(Format-ClockLabel -IsoValue ([string]$State.next_retry_at))"
    Write-Host "Last progress at: $(Format-ClockLabel -IsoValue ([string]$State.last_successful_progress_at))"
    Write-Host "Has design reference: $([bool]$State.has_design_reference)"
    Write-Host "Design reference path: $([string]$State.design_reference_path)"
    Write-Host "Notifications enabled: $([bool]$notifyCfg.enabled) (mode=$([string]$notifyCfg.mode))"
    Write-Host "Notification state: $([string]$State.notification_state)"
    Write-Host "Last notification at: $(Format-ClockLabel -IsoValue ([string]$State.last_notification_at))"
    Write-Host "Last notified reason: $([string]$State.last_notified_reason)"
    Write-Host "Claude adapter mode: $([string]$State.claude_adapter_mode)"
    if (-not [string]::IsNullOrWhiteSpace([string]$State.claude_execution_last_result)) {
        Write-Host "Claude execution last result: $([string]$State.claude_execution_last_result)"
    }
    Write-Host "Codex adapter mode: $([string]$State.codex_adapter_mode)"
    if (-not [string]::IsNullOrWhiteSpace([string]$State.codex_execution_last_result)) {
        Write-Host "Codex execution last result: $([string]$State.codex_execution_last_result)"
    }
    Write-Host "UI changed: $([bool]$State.ui_changed)"
    Write-Host "Needs repair pass: $([bool]$State.needs_repair_pass)"
    Write-Host "Commit decision: $($RunContext.commit_decision)"
    Write-Host "Next prompt: $(Get-NextPromptPath -State $State -RunPaths $RunPaths)"
    Write-Host "Artifacts and prompts:"
    foreach ($p in @($RunPaths.task_path,$RunPaths.current_artifact_path,$RunPaths.design_reference_dir,$RunPaths.design_notes_path,$RunPaths.runtime_validation_path,$RunPaths.worker_heartbeat_path,$RunPaths.claude_handoff_path,$RunPaths.claude_completion_path,$RunPaths.codex_handoff_path,$RunPaths.codex_completion_path,$RunPaths.codex_review_path,$RunPaths.final_review_prompt_path,$RunPaths.visual_review_path,$RunPaths.cursor_prompt_path,$RunPaths.codex_prompt_path,$RunPaths.builder_prompt_path,$RunPaths.codex_hardening_prompt_path,$RunPaths.final_review_generated_prompt_path)) {
        Write-Host "  - $p"
    }
}
function Test-GeneratedPromptFile {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $false }
    $raw = Get-Content -LiteralPath $Path -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) { return $false }
    return ($raw -match "(?m)^Generated:\s+")
}

function Get-ResumeGuidance {
    param(
        [hashtable]$State,
        [hashtable]$RunContext,
        [hashtable]$RunPaths,
        [hashtable]$ClaudeAdapterConfig = $null,
        [hashtable]$CodexAdapterConfig = $null
    )

    $phase = [string]$State.phase
    $status = [string]$State.status
    $requiresVisualApproval = [bool]$State.requires_visual_approval
    $needsRepairPass = [bool]$State.needs_repair_pass
    $pendingAction = [string]$RunContext.pending_action
    $flowType = [string]$State.flow_type
    if ([string]::IsNullOrWhiteSpace($flowType)) { $flowType = "frontend" }
    $repo = [string]$RunContext.repo
    $repoToken = if ([string]::IsNullOrWhiteSpace($repo)) { "<repo>" } else { $repo }
    $executionEngine = [string]$State.execution_engine
    if ([string]::IsNullOrWhiteSpace($executionEngine) -or $executionEngine -eq "none") {
        $executionEngine = [string]$RunContext.execution_engine
    }
    if ([string]::IsNullOrWhiteSpace($executionEngine)) { $executionEngine = "none" }
    $engineLabel = Get-EngineLabel -ExecutionEngine $executionEngine
    $phaseCWaitLabel = if ($executionEngine -eq "cursor") {
        "Cursor repair/refinement pass"
    }
    elseif ($executionEngine -eq "claude") {
        switch ($flowType) {
            "backend" { "Claude backend implementation pass" }
            "fullstack" { "Claude fullstack implementation pass" }
            "tooling" { "Claude tooling implementation pass" }
            default { "Claude Phase C implementation pass" }
        }
    }
    else { "builder implementation pass" }
    $supervisorState = [string]$State.supervisor_state
    if ([string]::IsNullOrWhiteSpace($supervisorState)) { $supervisorState = "healthy" }

    if ($null -eq $ClaudeAdapterConfig) {
        $ClaudeAdapterConfig = [ordered]@{ enabled = $false; command_template = ""; source = "unknown" }
    }
    if ($null -eq $CodexAdapterConfig) {
        $CodexAdapterConfig = [ordered]@{ enabled = $false; command_template = ""; source = "unknown" }
    }

    $guidance = [ordered]@{
        waiting_on               = "unknown"
        summary                  = "Unable to determine next action from current state."
        next_prompt              = "[none]"
        next_artifact            = "[none]"
        artifact_lines           = @()
        commands                 = @()
        expected_pending_actions = @()
        warning                  = ""
    }

    if ($supervisorState -eq "worker_retrying") {
        $guidance.waiting_on = "worker retry backoff"
        $guidance.summary = "Worker failure recorded. Supervisor scheduled a retry."
        $guidance.next_artifact = $RunPaths.worker_heartbeat_path
        $guidance.artifact_lines = @(
            "Supervisor state: $supervisorState",
            "Next retry at: $([string]$State.next_retry_at)",
            "Last error: $([string]$State.last_error_type) | $([string]$State.last_error_message)",
            "Worker heartbeat: $($RunPaths.worker_heartbeat_path)"
        )
        $guidance.commands = @(
            ".\\pp.ps1 scheduler-run",
            ".\\pp.ps1 scheduler-run -ConsumeCompletions",
            ".\\pp.ps1 worker-status",
            ".\\pp.ps1 worker-retry",
            ".\\pp.ps1 worker-heartbeat -Step <step> -Notes <note>"
        )
        return $guidance
    }
    if ($supervisorState -eq "worker_degraded") {
        $guidance.waiting_on = "worker recovery in degraded mode"
        $guidance.summary = "Worker has repeated failures. Retry remains possible but escalation is recommended."
        $guidance.next_artifact = $RunPaths.worker_heartbeat_path
        $guidance.artifact_lines = @(
            "Supervisor state: $supervisorState",
            "Retry count: $([int]$State.retry_count)",
            "Next retry at: $([string]$State.next_retry_at)",
            "Last error: $([string]$State.last_error_type) | $([string]$State.last_error_message)"
        )
        $guidance.commands = @(
            ".\\pp.ps1 scheduler-run",
            ".\\pp.ps1 scheduler-run -ConsumeCompletions",
            ".\\pp.ps1 worker-status",
            ".\\pp.ps1 worker-retry",
            ".\\pp.ps1 worker-heartbeat -Step <step> -Notes <note>"
        )
        return $guidance
    }
    if ($supervisorState -eq "worker_blocked") {
        $guidance.waiting_on = "manual intervention (worker blocked)"
        $guidance.summary = "Worker is blocked due to repeated or non-retryable failures."
        $guidance.next_artifact = $RunPaths.worker_heartbeat_path
        $guidance.artifact_lines = @(
            "Supervisor state: $supervisorState",
            "Retry count: $([int]$State.retry_count)",
            "Last error: $([string]$State.last_error_type) | $([string]$State.last_error_message)",
            "Notification state: $([string]$State.notification_state)"
        )
        $guidance.commands = @(
            ".\\pp.ps1 worker-status",
            ".\\pp.ps1 worker-start",
            ".\\pp.ps1 worker-heartbeat -Step <step> -Notes <note>"
        )
        return $guidance
    }
    if ($supervisorState -eq "awaiting_reconnect") {
        $guidance.waiting_on = "worker reconnect"
        $guidance.summary = "Supervisor is awaiting reconnect from worker."
        $guidance.next_artifact = $RunPaths.worker_heartbeat_path
        $guidance.commands = @(
            ".\\pp.ps1 worker-status",
            '.\pp.ps1 worker-heartbeat -Step reconnect -Notes "worker reachable"'
        )
        return $guidance
    }

    if ($phase -eq "B" -and $status -eq "spec_locked") {
        $builderPromptGenerated = Test-GeneratedPromptFile -Path $RunPaths.builder_prompt_path
        $builderPromptLabel = if ($builderPromptGenerated) {
            "Builder prompt (generated): $($RunPaths.builder_prompt_path)"
        }
        else {
            "Builder prompt (will be generated/refreshed by build): $($RunPaths.builder_prompt_path)"
        }

        $guidance.waiting_on = $phaseCWaitLabel
        $guidance.summary = "Run is ready to enter implementation."
        $guidance.next_prompt = $RunPaths.builder_prompt_path
        $guidance.next_artifact = $RunPaths.current_artifact_path
        $guidance.artifact_lines = @(
            "Task scope: $($RunPaths.task_path)",
            $builderPromptLabel,
            "Implementation output target: $($RunPaths.current_artifact_path)"
        )
        if ($flowType -in @("frontend", "fullstack")) {
            $guidance.artifact_lines += "Design reference folder (implementation input): $($RunPaths.design_reference_dir)"
            $guidance.artifact_lines += "Design notes (optional): $($RunPaths.design_notes_path)"
        }
        $guidance.commands = @(".\pp.ps1 build")
        $guidance.expected_pending_actions = @("implement_then_visual_review", "implement_then_codex_review", "builder_execution", "implementation_routed")
    }
    elseif ($phase -eq "B" -and $status -eq "spec_revision_required") {
        $guidance.waiting_on = "user spec update"
        $guidance.summary = "Spec revision is required before implementation continues."
        $guidance.next_artifact = $RunPaths.task_path
        $guidance.artifact_lines = @(
            "Update task scope: $($RunPaths.task_path)",
            "Review notes (if present): $($RunPaths.visual_review_path)"
        )
        $guidance.commands = @(
            "Update the spec/task content for this run",
            ".\pp.ps1 build"
        )
        $guidance.expected_pending_actions = @("builder_revision_required", "spec_revision_required")
    }
    elseif ($phase -eq "C" -and $status -eq "awaiting_visual_approval") {
        $guidance.waiting_on = "user visual approval decision"
        $guidance.summary = "Implementation is paused pending visual approval."
        $guidance.next_artifact = $RunPaths.visual_review_path
        $guidance.artifact_lines = @(
            "Visual review artifact: $($RunPaths.visual_review_path)",
            "Current implementation: $($RunPaths.current_artifact_path)"
        )
        $guidance.commands = @(
            ".\pp.ps1 approve",
            ".\pp.ps1 revise -Type implementation -Notes <note>"
        )
        $guidance.expected_pending_actions = @("waiting_visual_approval", "visual_approval_decision")
    }
    elseif ($phase -eq "C" -and $status -eq "awaiting_runtime_validation") {
        $runtimeMode = [string]$State.runtime_validation_mode
        $guidance.waiting_on = "runtime validation start"
        $guidance.summary = if ($flowType -eq "fullstack") {
            "Implementation is complete. Start fullstack end-to-end runtime proof before hardening."
        }
        elseif ($flowType -eq "backend") {
            "Implementation is complete. Start contract/service runtime validation before hardening."
        }
        elseif ($flowType -eq "tooling") {
            "Implementation is complete. Start tooling behavior validation if required before hardening."
        }
        else {
            "Implementation is complete. Runtime behavior proof must begin before hardening."
        }
        $guidance.next_artifact = $RunPaths.runtime_validation_path
        $guidance.artifact_lines = @(
            "Runtime validation mode: $runtimeMode",
            "Runtime validation artifact: $($RunPaths.runtime_validation_path)",
            "Implementation artifact: $($RunPaths.current_artifact_path)"
        )
        $guidance.commands = @(
            ".\pp.ps1 runtime-start"
        )
        $guidance.expected_pending_actions = @("start_runtime_validation", "complete_runtime_validation")
    }
    elseif ($phase -eq "C" -and $status -eq "runtime_validation_in_progress") {
        $runtimeMode = [string]$State.runtime_validation_mode
        $guidance.waiting_on = "runtime validation completion"
        $guidance.summary = if ($flowType -eq "fullstack") {
            "Complete fullstack user-flow runtime evidence and mark pass/fail."
        }
        elseif ($flowType -eq "backend") {
            "Complete backend contract/service runtime evidence and mark pass/fail."
        }
        elseif ($flowType -eq "tooling") {
            "Complete tooling behavior runtime evidence and mark pass/fail."
        }
        else {
            "Complete runtime evidence and mark pass/fail."
        }
        $guidance.next_artifact = $RunPaths.runtime_validation_path
        $guidance.artifact_lines = @(
            "Runtime validation mode: $runtimeMode",
            "Runtime validation artifact: $($RunPaths.runtime_validation_path)"
        )
        $guidance.commands = @(
            ".\pp.ps1 runtime-done",
            ".\pp.ps1 runtime-fail"
        )
        $guidance.expected_pending_actions = @("complete_runtime_validation")
    }
    elseif ($phase -eq "C" -and $status -eq "runtime_validation_failed") {
        $guidance.waiting_on = "implementation repair pass"
        $guidance.summary = "Runtime validation failed. Apply repairs before retrying runtime validation."
        $guidance.next_prompt = $RunPaths.builder_prompt_path
        $guidance.next_artifact = $RunPaths.current_artifact_path
        $guidance.commands = @(
            ".\pp.ps1 build",
            ".\pp.ps1 launch -Repo $repoToken"
        )
        $guidance.expected_pending_actions = @("implementation_revision", "implementation_repair_pass")
    }
    elseif ($phase -eq "C" -and ($status -in @("implementation_ready", "ready_for_claude", "ready_for_cursor", "implementation_in_progress", "needs_visual_revision", "needs_repair_pass"))) {
        $isCursor = ($executionEngine -eq "cursor" -or $status -eq "ready_for_cursor")
        $isClaude = ($executionEngine -eq "claude" -or $status -eq "ready_for_claude")
        $toolRouteSummary = if ($isCursor) { "Cursor repair/refinement pass" } elseif ($isClaude) { $phaseCWaitLabel } else { "builder implementation pass" }
        $summary = if ($status -in @("needs_visual_revision", "needs_repair_pass") -or $needsRepairPass) {
            "Implementation repair pass is required before continuing."
        }
        else {
            "Run is ready for implementation."
        }
        $guidance.waiting_on = $toolRouteSummary
        $guidance.summary = $summary
        $guidance.next_prompt = $RunPaths.builder_prompt_path
        $guidance.next_artifact = $RunPaths.current_artifact_path
        $guidance.artifact_lines = @(
            "Execution engine: $executionEngine ($engineLabel)",
            "Builder prompt: $($RunPaths.builder_prompt_path)",
            "Run task file: $($RunPaths.task_path)",
            "Implementation output target: $($RunPaths.current_artifact_path)"
        )
        if ($flowType -in @("frontend", "fullstack")) {
            $guidance.artifact_lines += "Design reference folder (implementation input): $($RunPaths.design_reference_dir)"
            $guidance.artifact_lines += "Design notes (optional): $($RunPaths.design_notes_path)"
        }
        if ($isClaude) {
            $guidance.artifact_lines += "Claude handoff: $($RunPaths.claude_handoff_path)"
            $guidance.artifact_lines += "Claude completion signal (optional): $($RunPaths.claude_completion_path)"
            if ([bool]$ClaudeAdapterConfig.enabled -and -not [string]::IsNullOrWhiteSpace([string]$ClaudeAdapterConfig.command_template)) {
                $guidance.artifact_lines += "Claude adapter: configured (source: $([string]$ClaudeAdapterConfig.source))"
            }
            else {
                $guidance.artifact_lines += "Claude adapter: not configured (manual invocation mode)"
            }
            try {
                $claudeAssessment = Get-ClaudeCompletionAssessment -RunPaths $RunPaths -RunId ([string]$RunContext.task_id)
                if ([string]$claudeAssessment.evidence_state -eq "ready_for_implementation_done") {
                    $guidance.artifact_lines += "Auto-consume: Claude evidence appears ready."
                    $guidance.warning = "Claude completion evidence looks ready. Run '.\pp.ps1 auto-consume' (or '.\pp.ps1 claude-finish')."
                }
            }
            catch { }
        }
        if ($requiresVisualApproval) {
            $guidance.artifact_lines += "Visual approval will be required after implementation."
        }
        if ($isClaude) {
            $guidance.commands = @(
                ".\pp.ps1 auto-consume",
                ".\pp.ps1 claude-start",
                ".\pp.ps1 claude-start -PrepareOnly",
                ".\pp.ps1 claude-check",
                ".\pp.ps1 claude-finish",
                ".\pp.ps1 launch -Repo $repoToken",
                ".\pp.ps1 worker-heartbeat -Step <step> -Notes <note>",
                "After implementation evidence is ready: .\pp.ps1 implementation-done"
            )
        }
        else {
            $guidance.commands = @(
                ".\pp.ps1 launch -Repo $repoToken",
                ".\pp.ps1 launch -Repo $repoToken -AutoLaunch",
                "Perform implementation pass using builder prompt",
                "After implementation evidence is ready: .\pp.ps1 implementation-done"
            )
        }
        $guidance.expected_pending_actions = @("builder_execution", "builder_revision_required", "implement_then_visual_review", "implement_then_codex_review", "implementation_routed", "implementation_repair_pass", "claude_implementation_in_progress")
    }
    elseif ($phase -eq "D" -and ($status -in @("ready_for_codex", "hardening", "approved_for_hardening"))) {
        $guidance.waiting_on = "Codex hardening pass"
        $guidance.summary = "Run is in hardening and should proceed through Codex evidence consumption, then final judgment readiness."
        $guidance.next_prompt = $RunPaths.codex_hardening_prompt_path
        $guidance.next_artifact = $RunPaths.codex_review_path
        $guidance.artifact_lines = @(
            "Execution engine: codex (Codex)",
            "Codex hardening prompt: $($RunPaths.codex_hardening_prompt_path)",
            "Codex handoff: $($RunPaths.codex_handoff_path)",
            "Codex completion signal: $($RunPaths.codex_completion_path)",
            "Codex review output target: $($RunPaths.codex_review_path)"
        )
        if ([bool]$CodexAdapterConfig.enabled -and -not [string]::IsNullOrWhiteSpace([string]$CodexAdapterConfig.command_template)) {
            $guidance.artifact_lines += "Codex adapter: configured (source: $([string]$CodexAdapterConfig.source))"
        }
        else {
            $guidance.artifact_lines += "Codex adapter: not configured (manual invocation mode)"
        }
        try {
            $codexAssessment = Get-CodexCompletionAssessment -RunPaths $RunPaths -RunId ([string]$RunContext.task_id)
            if ([string]$codexAssessment.evidence_state -eq "ready_for_final_review") {
                $guidance.artifact_lines += "Auto-consume: Codex evidence appears ready."
                $guidance.warning = "Codex completion evidence looks ready. Run '.\pp.ps1 auto-consume' (or '.\pp.ps1 codex-finish')."
            }
        }
        catch { }
        $guidance.commands = @(
            ".\pp.ps1 auto-consume",
            ".\pp.ps1 codex-start",
            ".\pp.ps1 codex-start -PrepareOnly",
            ".\pp.ps1 codex-check",
            ".\pp.ps1 codex-finish"
        )
        $guidance.expected_pending_actions = @("run_codex_or_continue_to_final", "ready_for_codex", "codex_hardening_in_progress", "ready_for_final_judgment")
    }
    elseif ($phase -eq "E" -and $status -in @("ready_for_final_judgment", "final_review", "merge_ready")) {
        $waitingLine = if ($status -eq "merge_ready") { "ready for commit / no-commit decision" } else { "ChatGPT final judgment" }
        $guidance.waiting_on = $waitingLine
        $guidance.summary = if ($status -eq "merge_ready") {
            "Final judgment is complete. Choose commit or no-commit."
        } else {
            "Run is ready for ChatGPT final judgment and then commit/no-commit decision."
        }
        $guidance.next_prompt = $RunPaths.final_review_generated_prompt_path
        $guidance.artifact_lines = @(
            "Execution engine: chatgpt (ChatGPT)",
            "Final review prompt: $($RunPaths.final_review_generated_prompt_path)",
            "Task: $($RunPaths.task_path)",
            "Implementation: $($RunPaths.current_artifact_path)",
            "Codex review: $($RunPaths.codex_review_path)"
        )
        $guidance.commands = @(
            "Bring final-review prompt and artifacts to ChatGPT for final judgment",
            ".\pp.ps1 commit -Message <msg>",
            ".\pp.ps1 no-commit"
        )
        $guidance.expected_pending_actions = @("run_codex_or_continue_to_final", "ready_for_final_judgment", "pipeline_complete", "pipeline_complete_no_commit")
    }
    else {
        $guidance.waiting_on = "unknown (state diagnostic required)"
        $guidance.summary = "State is unknown or inconsistent for automated resume guidance."
        $guidance.commands = @(
            ".\pp.ps1 status",
            ".\pp.ps1 current",
            ".\pp.ps1 runs"
        )
    }

    if (-not [string]::IsNullOrWhiteSpace($pendingAction) -and @($guidance.expected_pending_actions).Count -gt 0 -and -not ($guidance.expected_pending_actions -contains $pendingAction)) {
        $expected = ($guidance.expected_pending_actions -join ", ")
        $guidance.warning = "pending_action '$pendingAction' does not match inferred next step for phase/status ($phase/$status). Expected one of: $expected. Guidance is using phase/status as source of truth."
    }

    $engineMismatch = $null
    if (($phase -eq "D" -or $status -in @("ready_for_codex", "hardening")) -and $executionEngine -ne "codex") {
        $engineMismatch = "phase/status indicates Codex hardening but execution_engine is '$executionEngine'."
    }
    elseif (($phase -eq "E" -or $status -in @("ready_for_final_judgment", "final_review")) -and $executionEngine -ne "chatgpt") {
        $engineMismatch = "phase/status indicates ChatGPT final judgment but execution_engine is '$executionEngine'."
    }
    elseif ($status -eq "ready_for_cursor" -and $executionEngine -ne "cursor") {
        $engineMismatch = "status ready_for_cursor expects execution_engine=cursor."
    }
    elseif ($status -eq "ready_for_claude" -and $executionEngine -ne "claude") {
        $engineMismatch = "status ready_for_claude expects execution_engine=claude."
    }
    if (-not [string]::IsNullOrWhiteSpace($engineMismatch)) {
        if ([string]::IsNullOrWhiteSpace([string]$guidance.warning)) {
            $guidance.warning = $engineMismatch
        }
        else {
            $guidance.warning = "$($guidance.warning) Also: $engineMismatch"
        }
    }

    return $guidance
}

function Print-ResumeGuidance {
    param([string]$RunId, [hashtable]$State, [hashtable]$RunContext, [hashtable]$RunPaths, [hashtable]$Guidance)
    $notifyCfg = Get-NotificationConfig -WorkspaceRoot $workspaceRoot

    Write-Host "Pipeline Resume"
    Write-Host "Current run: $RunId"
    Write-Host "Run path: $($RunPaths.run_root)"
    Write-Host "Repo: $($RunContext.repo)"
    Write-Host "Branch: $($RunContext.branch)"
    Write-Host "Flow type: $($State.flow_type)"
    Write-Host "Task type: $($State.task_type)"
    Write-Host "Execution engine: $($State.execution_engine)"
    Write-Host "Phase/Status: $($State.phase) / $($State.status)"
    Write-Host "Supervisor state: $([string]$State.supervisor_state)"
    Write-Host "Retry count: $([int]$State.retry_count)"
    Write-Host "Next retry at: $(Format-ClockLabel -IsoValue ([string]$State.next_retry_at))"
    Write-Host "Notifications enabled: $([bool]$notifyCfg.enabled) (mode=$([string]$notifyCfg.mode))"
    Write-Host "Notification state: $([string]$State.notification_state)"
    Write-Host "Last notification at: $(Format-ClockLabel -IsoValue ([string]$State.last_notification_at))"
    Write-Host "Last notified reason: $([string]$State.last_notified_reason)"
    Write-Host "Pending action: $($RunContext.pending_action)"
    Write-Host "Requires visual approval: $([bool]$State.requires_visual_approval)"
    Write-Host "Needs repair pass: $([bool]$State.needs_repair_pass)"
    Write-Host "System is waiting on: $($Guidance.waiting_on)"
    Write-Host "Next step: $($Guidance.summary)"
    if (-not [string]::IsNullOrWhiteSpace([string]$Guidance.warning)) {
        Write-Host "Warning: $($Guidance.warning)"
    }
    if (-not [string]::IsNullOrWhiteSpace([string]$Guidance.next_prompt) -and [string]$Guidance.next_prompt -ne "[none]") {
        Write-Host "Next prompt: $($Guidance.next_prompt)"
    }
    if (-not [string]::IsNullOrWhiteSpace([string]$Guidance.next_artifact) -and [string]$Guidance.next_artifact -ne "[none]") {
        Write-Host "Next artifact target: $($Guidance.next_artifact)"
    }
    if (@($Guidance.artifact_lines).Count -gt 0) {
        Write-Host "Artifacts:"
        foreach ($line in @($Guidance.artifact_lines)) {
            Write-Host "  - $line"
        }
    }
    if (@($Guidance.commands).Count -gt 0) {
        Write-Host "Recommended command(s):"
        foreach ($cmd in @($Guidance.commands)) {
            Write-Host "  - $cmd"
        }
    }
}

function Show-RunsList {
    param([string]$WorkspaceRoot)
    $indexDoc = Read-RunIndex -WorkspaceRoot $WorkspaceRoot
    $currentId = $null
    try { $currentId = Get-CurrentRunId -WorkspaceRoot $WorkspaceRoot } catch { }
    $rows = @($indexDoc.runs | Sort-Object -Property run_id)
    if ($rows.Count -eq 0) { Write-Host "No runs found in runs/index.json"; return }
    Write-Host "Known runs:"
    foreach ($row in $rows) {
        $marker = if ([string]$row.run_id -eq [string]$currentId) { "*" } else { " " }
        $archivedLabel = if ([bool]$row.archived) { " | archived=true" } else { "" }
        Write-Host "$marker $($row.run_id) | repo=$($row.repo) | flow=$($row.flow_type) | task_type=$($row.task_type) | engine=$($row.execution_engine) | branch=$($row.branch) | phase=$($row.phase) | status=$($row.status) | updated=$($row.updated_at)$archivedLabel"
    }
}

function Get-SchedulerTargets {
    param(
        [string]$WorkspaceRoot,
        [string]$RunId,
        [switch]$AllRuns
    )
    $targets = New-Object System.Collections.ArrayList
    if (-not [string]::IsNullOrWhiteSpace($RunId)) {
        $targetRunId = $RunId.Trim()
        Assert-ValidRunId -Value $targetRunId
        $paths = Get-RunPaths -WorkspaceRoot $WorkspaceRoot -RunId $targetRunId
        if (-not (Test-Path -LiteralPath $paths.run_root)) {
            throw "Run '$targetRunId' was not found at $($paths.run_root)"
        }
        [void]$targets.Add([ordered]@{ run_id = $targetRunId; paths = $paths })
        return @($targets)
    }

    if ($AllRuns.IsPresent) {
        $indexDoc = Read-RunIndex -WorkspaceRoot $WorkspaceRoot
        foreach ($row in @($indexDoc.runs)) {
            $rid = [string]$row.run_id
            if ([string]::IsNullOrWhiteSpace($rid)) { continue }
            if (-not (Test-ValidRunId -Value $rid)) { continue }
            $paths = Get-RunPaths -WorkspaceRoot $WorkspaceRoot -RunId $rid
            if (-not (Test-Path -LiteralPath $paths.run_root)) { continue }
            [void]$targets.Add([ordered]@{ run_id = $rid; paths = $paths })
        }
        if (@($targets).Count -eq 0) {
            throw "No valid runs found for scheduler cycle."
        }
        return @($targets)
    }

    $active = Resolve-ActiveRun -WorkspaceRoot $WorkspaceRoot
    [void]$targets.Add([ordered]@{ run_id = [string]$active.run_id; paths = $active.paths })
    return @($targets)
}

function Get-SchedulerEligibilityDecision {
    param(
        [hashtable]$State,
        [hashtable]$RunContext,
        [DateTime]$NowUtc
    )
    $phase = [string]$State.phase
    $status = [string]$State.status
    $engine = [string]$State.execution_engine
    $supervisor = [string]$State.supervisor_state
    $nextRetryRaw = [string]$State.next_retry_at
    $nextRetry = Get-DateSafe -Value $nextRetryRaw
    $humanGateStates = @(
        "awaiting_visual_approval",
        "awaiting_runtime_validation",
        "runtime_validation_in_progress",
        "runtime_validation_failed",
        "ready_for_final_judgment",
        "final_review",
        "merge_ready"
    )
    if ($status -in $humanGateStates) {
        return [ordered]@{ eligible = $false; reason = "human_gate"; detail = "run is at human gate state '$status'"; action = ""; overdue_seconds = 0 }
    }
    if ($supervisor -eq "worker_blocked") {
        return [ordered]@{ eligible = $false; reason = "blocked"; detail = "worker is blocked and requires intervention"; action = ""; overdue_seconds = 0 }
    }
    if ($supervisor -notin @("worker_retrying", "worker_degraded", "awaiting_reconnect")) {
        return [ordered]@{ eligible = $false; reason = "not_retry_state"; detail = "supervisor state '$supervisor' is not scheduler-retry eligible"; action = ""; overdue_seconds = 0 }
    }
    if ($null -eq $nextRetry) {
        return [ordered]@{ eligible = $false; reason = "missing_retry_time"; detail = "next_retry_at is missing/invalid"; action = ""; overdue_seconds = 0 }
    }
    $secondsUntil = [int][Math]::Floor(($nextRetry.ToUniversalTime() - $NowUtc).TotalSeconds)
    if ($secondsUntil -gt 0) {
        return [ordered]@{ eligible = $false; reason = "not_due"; detail = "retry is not due yet (${secondsUntil}s remaining)"; action = ""; overdue_seconds = 0 }
    }

    $action = ""
    if ($engine -eq "claude" -and $phase -eq "C" -and $status -in @("ready_for_claude", "implementation_ready", "implementation_in_progress", "needs_visual_revision", "needs_repair_pass")) {
        $action = "claude-start"
    }
    elseif ($engine -eq "codex" -and ($phase -eq "D" -or $status -in @("ready_for_codex", "hardening", "approved_for_hardening"))) {
        $action = "codex-start"
    }
    else {
        return [ordered]@{ eligible = $false; reason = "engine_state_ineligible"; detail = "state $phase/$status with engine '$engine' is not scheduler-start eligible"; action = ""; overdue_seconds = 0 }
    }

    return [ordered]@{
        eligible        = $true
        reason          = "due"
        detail          = "retry due for $action"
        action          = $action
        overdue_seconds = [int][Math]::Abs($secondsUntil)
    }
}

function Invoke-SchedulerDelegatedCommand {
    param(
        [string]$WorkspaceRoot,
        [string]$PipelineScriptPath,
        [string]$RunId,
        [string]$DelegatedCommand
    )
    $originalRun = $null
    $hasOriginal = $false
    try {
        try {
            $originalRun = Get-CurrentRunId -WorkspaceRoot $WorkspaceRoot
            if (-not [string]::IsNullOrWhiteSpace($originalRun)) { $hasOriginal = $true }
        }
        catch { }
        Set-CurrentRunId -WorkspaceRoot $WorkspaceRoot -RunId $RunId
        & $PipelineScriptPath $DelegatedCommand
        if ($LASTEXITCODE -ne 0) {
            throw "Delegated command '$DelegatedCommand' returned exit code $LASTEXITCODE"
        }
    }
    finally {
        if ($hasOriginal -and ($originalRun -ne $RunId)) {
            Set-CurrentRunId -WorkspaceRoot $WorkspaceRoot -RunId $originalRun
        }
    }
}

function Get-SchedulerLoopLockPath {
    param([string]$WorkspaceRoot)
    return (Join-Path $WorkspaceRoot "runs\scheduler-loop.lock.json")
}

function Get-SchedulerLockStaleThresholdSeconds {
    $defaultSeconds = 300
    $raw = [string]$env:PATHOS_SCHEDULER_LOCK_STALE_SECONDS
    if ([string]::IsNullOrWhiteSpace($raw)) { return $defaultSeconds }
    $parsed = 0
    if ([int]::TryParse($raw, [ref]$parsed) -and $parsed -ge 30 -and $parsed -le 86400) {
        return $parsed
    }
    return $defaultSeconds
}

function Get-SchedulerLoopLockStatus {
    param([string]$WorkspaceRoot)
    $lockPath = Get-SchedulerLoopLockPath -WorkspaceRoot $WorkspaceRoot
    $threshold = Get-SchedulerLockStaleThresholdSeconds
    $result = [ordered]@{
        exists                  = $false
        lock_path               = $lockPath
        status                  = "not_present"
        detail                  = "Scheduler loop lock file not present."
        stale_threshold_seconds = $threshold
        stale                   = $false
        valid                   = $false
        metadata                = $null
        parse_error             = ""
        started_at              = ""
        created_at              = ""
        pid                     = ""
        pid_alive               = $null
        scope                   = ""
        run_id                  = ""
        all_runs                = $false
        interval_seconds        = 0
        max_cycles              = 0
        max_minutes             = 0
        consume_completions     = $false
        dry_run                 = $false
        last_heartbeat_at       = ""
        last_cycle_started_at   = ""
        last_cycle_completed_at = ""
        heartbeat_age_seconds   = $null
        age_seconds             = $null
    }
    if (-not (Test-Path -LiteralPath $lockPath)) { return $result }

    $result.exists = $true
    $doc = $null
    try {
        $doc = Read-JsonObject -Path $lockPath
    }
    catch {
        $result.status = "invalid"
        $result.detail = "Lock file exists but is invalid/corrupt JSON."
        $result.parse_error = $_.Exception.Message
        return $result
    }
    $result.valid = $true
    $result.metadata = $doc
    $result.status = "active"
    $result.detail = "Lock file exists and appears active."

    $result.created_at = [string]$doc.created_at
    $result.started_at = [string]$doc.started_at
    $result.pid = [string]$doc.pid
    $result.scope = [string]$doc.scope
    $result.run_id = [string]$doc.run_id
    $result.all_runs = [bool]$doc.all_runs
    $result.interval_seconds = [int]$doc.interval_seconds
    $result.max_cycles = [int]$doc.max_cycles
    $result.max_minutes = [int]$doc.max_minutes
    $result.consume_completions = [bool]$doc.consume_completions
    $result.dry_run = [bool]$doc.dry_run
    $result.last_heartbeat_at = [string]$doc.last_heartbeat_at
    $result.last_cycle_started_at = [string]$doc.last_cycle_started_at
    $result.last_cycle_completed_at = [string]$doc.last_cycle_completed_at

    $startTs = Get-DateSafe -Value ([string]$doc.started_at)
    if ($null -eq $startTs) { $startTs = Get-DateSafe -Value ([string]$doc.created_at) }
    if ($null -ne $startTs) {
        $result.age_seconds = [int][Math]::Floor(([DateTime]::UtcNow - $startTs.ToUniversalTime()).TotalSeconds)
    }
    $hbTs = Get-DateSafe -Value ([string]$doc.last_heartbeat_at)
    if ($null -ne $hbTs) {
        $result.heartbeat_age_seconds = [int][Math]::Floor(([DateTime]::UtcNow - $hbTs.ToUniversalTime()).TotalSeconds)
    }
    elseif ($null -ne $result.age_seconds) {
        $result.heartbeat_age_seconds = [int]$result.age_seconds
    }

    if (-not [string]::IsNullOrWhiteSpace([string]$result.pid)) {
        try {
            $pidNum = [int]$result.pid
            $proc = Get-Process -Id $pidNum -ErrorAction SilentlyContinue
            $result.pid_alive = ($null -ne $proc)
        }
        catch {
            $result.pid_alive = $null
        }
    }

    if ($null -ne $result.heartbeat_age_seconds -and [int]$result.heartbeat_age_seconds -gt $threshold) {
        $result.status = "stale"
        $result.stale = $true
        $result.detail = "Lock heartbeat appears stale."
    }
    return $result
}

function Update-SchedulerLoopLockHeartbeat {
    param(
        [string]$WorkspaceRoot,
        [int]$CycleNumber = 0,
        [switch]$CycleStarted,
        [switch]$CycleCompleted
    )
    $status = Get-SchedulerLoopLockStatus -WorkspaceRoot $WorkspaceRoot
    if (-not [bool]$status.exists -or -not [bool]$status.valid) { return }
    $doc = $status.metadata
    $now = Get-NowIso
    $doc["last_heartbeat_at"] = $now
    $doc["last_cycle"] = $CycleNumber
    if ($CycleStarted.IsPresent) { $doc["last_cycle_started_at"] = $now }
    if ($CycleCompleted.IsPresent) { $doc["last_cycle_completed_at"] = $now }
    Write-JsonObject -Path $status.lock_path -Data $doc
}

function Test-HumanGateStatus {
    param([string]$Status)
    return $Status -in @(
        "awaiting_visual_approval",
        "awaiting_runtime_validation",
        "runtime_validation_in_progress",
        "runtime_validation_failed",
        "ready_for_final_judgment",
        "final_review",
        "merge_ready"
    )
}

function Acquire-SchedulerLoopLock {
    param(
        [string]$WorkspaceRoot,
        [string]$Scope,
        [string]$RunId,
        [bool]$AllRuns,
        [int]$IntervalSeconds,
        [int]$MaxCycles,
        [int]$MaxMinutes,
        [bool]$ConsumeCompletions,
        [bool]$DryRun
    )
    $status = Get-SchedulerLoopLockStatus -WorkspaceRoot $WorkspaceRoot
    $lockPath = [string]$status.lock_path
    if ([bool]$status.exists) {
        if ([string]$status.status -eq "active") {
            throw "Scheduler loop lock is active: $lockPath (scope='$([string]$status.scope)', pid='$([string]$status.pid)', started_at='$([string]$status.started_at)'). Run '.\pp.ps1 scheduler-status'."
        }
        if ([string]$status.status -eq "stale") {
            throw "Scheduler loop lock appears stale: $lockPath (heartbeat_age_seconds=$([string]$status.heartbeat_age_seconds)). Run '.\pp.ps1 scheduler-status' then '.\pp.ps1 scheduler-unlock -IfStale'."
        }
        if ([string]$status.status -eq "invalid") {
            throw "Scheduler loop lock is invalid/corrupt: $lockPath. Run '.\pp.ps1 scheduler-status' then '.\pp.ps1 scheduler-unlock -IfStale'."
        }
        throw "Scheduler loop lock exists: $lockPath"
    }
    $now = Get-NowIso
    $lock = [ordered]@{
        schema_version       = "v1"
        created_at           = $now
        started_at          = Get-NowIso
        pid                 = $PID
        host                = $env:COMPUTERNAME
        user                = $env:USERNAME
        scope               = $Scope
        run_id              = if ([string]::IsNullOrWhiteSpace($RunId)) { "" } else { $RunId }
        all_runs            = $AllRuns
        interval_seconds    = $IntervalSeconds
        max_cycles          = $MaxCycles
        max_minutes         = $MaxMinutes
        consume_completions = $ConsumeCompletions
        dry_run             = $DryRun
        last_heartbeat_at   = $now
        last_cycle          = 0
        last_cycle_started_at = ""
        last_cycle_completed_at = ""
        command             = "scheduler-loop"
    }
    Write-JsonObject -Path $lockPath -Data $lock
    return $lockPath
}

function Release-SchedulerLoopLock {
    param([string]$WorkspaceRoot)
    $lockPath = Get-SchedulerLoopLockPath -WorkspaceRoot $WorkspaceRoot
    if (Test-Path -LiteralPath $lockPath) {
        Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
    }
}

function Get-AutoConsumeReasonFromError {
    param([string]$Message)
    $text = if ([string]::IsNullOrWhiteSpace($Message)) { "" } else { $Message.Trim().ToLowerInvariant() }
    if ($text -match "worker_blocked|blocked") { return "blocked_supervisor" }
    if ($text -match "stale") { return "stale_heartbeat" }
    if ($text -match "runtime validation|awaiting_runtime_validation|awaiting_visual_approval|ready_for_final_judgment") { return "human_gate_pending" }
    if ($text -match "missing .*completion|completion signal missing|no completion") { return "no_completion_evidence" }
    if ($text -match "placeholder|contradict|incomplete|invalid json|does not match") { return "contradictory_evidence" }
    return "evidence_invalid"
}

function Get-AutoConsumeDecision {
    param(
        [hashtable]$State,
        [hashtable]$RunContext,
        [hashtable]$RunPaths,
        [string]$RunId
    )
    $phase = [string]$State.phase
    $status = [string]$State.status
    $engine = [string]$State.execution_engine
    $pending = [string]$RunContext.pending_action
    $supervisor = [string]$State.supervisor_state
    $humanGateStates = @(
        "awaiting_visual_approval",
        "awaiting_runtime_validation",
        "runtime_validation_in_progress",
        "runtime_validation_failed",
        "ready_for_final_judgment",
        "final_review",
        "merge_ready"
    )
    if ($status -in $humanGateStates) {
        return [ordered]@{ eligible = $false; action = ""; reason = "human_gate_pending"; detail = "run is at human gate state '$status'"; path = "none"; evidence_state = "" }
    }
    if ($supervisor -eq "worker_blocked") {
        return [ordered]@{ eligible = $false; action = ""; reason = "blocked_supervisor"; detail = "worker is blocked and requires intervention"; path = "none"; evidence_state = "" }
    }

    $claudeStates = @("ready_for_claude", "implementation_ready", "implementation_in_progress", "needs_visual_revision", "needs_repair_pass")
    $codexStates = @("ready_for_codex", "hardening", "approved_for_hardening")
    $isClaudePath = ($phase -eq "C" -and $status -in $claudeStates -and ($engine -eq "claude" -or $pending -eq "claude_implementation_in_progress" -or $status -eq "ready_for_claude"))
    $isCodexPath = ($phase -eq "D" -and $status -in $codexStates -and $engine -eq "codex")

    if (-not $isClaudePath -and -not $isCodexPath) {
        $noActionStates = @("ready_for_final_judgment", "final_review", "merge_ready")
        if ($phase -eq "E" -or $status -in $noActionStates) {
            return [ordered]@{ eligible = $false; action = ""; reason = "no_action_needed"; detail = "run is already in final judgment/merge stage"; path = "none"; evidence_state = "" }
        }
        return [ordered]@{ eligible = $false; action = ""; reason = "not_eligible_worker_state"; detail = "run is not in a Claude/Codex completion-consumable state ($phase/$status, engine=$engine)"; path = "none"; evidence_state = "" }
    }

    if ($isClaudePath) {
        $assessment = Get-ClaudeCompletionAssessment -RunPaths $RunPaths -RunId $RunId
        $evidenceState = [string]$assessment.evidence_state
        if ($evidenceState -eq "no_evidence") {
            return [ordered]@{ eligible = $false; action = ""; reason = "no_completion_evidence"; detail = [string]$assessment.summary; path = "claude"; evidence_state = $evidenceState }
        }
        if ($evidenceState -ne "ready_for_implementation_done") {
            return [ordered]@{ eligible = $false; action = ""; reason = "evidence_incomplete"; detail = [string]$assessment.summary; path = "claude"; evidence_state = $evidenceState }
        }
        try {
            $validation = Assert-ClaudeFinishPreconditions -State $State -RunContext $RunContext -RunPaths $RunPaths -RunId $RunId
            return [ordered]@{ eligible = $true; action = "claude-finish"; reason = "ready"; detail = "Claude completion evidence is valid and ready for authoritative consumption."; path = "claude"; evidence_state = $evidenceState; validation = $validation }
        }
        catch {
            $message = $_.Exception.Message
            $reason = Get-AutoConsumeReasonFromError -Message $message
            return [ordered]@{ eligible = $false; action = ""; reason = $reason; detail = $message; path = "claude"; evidence_state = $evidenceState }
        }
    }

    $codexAssessment = Get-CodexCompletionAssessment -RunPaths $RunPaths -RunId $RunId
    $codexEvidenceState = [string]$codexAssessment.evidence_state
    if ($codexEvidenceState -eq "no_evidence") {
        return [ordered]@{ eligible = $false; action = ""; reason = "no_completion_evidence"; detail = [string]$codexAssessment.summary; path = "codex"; evidence_state = $codexEvidenceState }
    }
    if ($codexEvidenceState -ne "ready_for_final_review") {
        return [ordered]@{ eligible = $false; action = ""; reason = "evidence_incomplete"; detail = [string]$codexAssessment.summary; path = "codex"; evidence_state = $codexEvidenceState }
    }
    try {
        $codexValidation = Assert-CodexFinishPreconditions -State $State -RunContext $RunContext -RunPaths $RunPaths -RunId $RunId
        return [ordered]@{ eligible = $true; action = "codex-finish"; reason = "ready"; detail = "Codex completion evidence is valid and ready for authoritative consumption."; path = "codex"; evidence_state = $codexEvidenceState; validation = $codexValidation }
    }
    catch {
        $message = $_.Exception.Message
        $reason = Get-AutoConsumeReasonFromError -Message $message
        return [ordered]@{ eligible = $false; action = ""; reason = $reason; detail = $message; path = "codex"; evidence_state = $codexEvidenceState }
    }
}

function Get-ContinueAutomationDecision {
    param(
        [string]$WorkspaceRoot,
        [hashtable]$State,
        [hashtable]$RunContext,
        [hashtable]$RunPaths,
        [string]$RunId
    )

    $phase = [string]$State.phase
    $status = [string]$State.status
    $engine = [string]$State.execution_engine
    $supervisor = [string]$State.supervisor_state
    $claudeAdapterMode = [string]$State.claude_adapter_mode
    $codexAdapterMode = [string]$State.codex_adapter_mode

    if ($supervisor -eq "worker_blocked") {
        return [ordered]@{
            eligible = $false
            action = ""
            reason = "blocked_supervisor"
            detail = "Automation is blocked because the worker supervisor is in worker_blocked."
        }
    }

    if ($status -eq "awaiting_runtime_validation") {
        return [ordered]@{
            eligible = $true
            action = "runtime-start"
            reason = "runtime_start_due"
            detail = "Runtime validation has not started yet."
        }
    }

    if ($status -eq "runtime_validation_in_progress") {
        if ([string]$State.runtime_validation_mode -eq "playwright_route_shell_auto") {
            try {
                Assert-RuntimeValidationArtifact -State $State -RunPaths $RunPaths
                return [ordered]@{
                    eligible = $true
                    action = "runtime-done"
                    reason = "runtime_auto_pass_ready"
                    detail = "Automated runtime validation produced a valid runtime-validation artifact."
                }
            }
            catch {
                return [ordered]@{
                    eligible = $false
                    action = ""
                    reason = "runtime_auto_incomplete"
                    detail = "Automated runtime validation has not produced a validator-complete artifact yet: $($_.Exception.Message)"
                }
            }
        }

        return [ordered]@{
            eligible = $false
            action = ""
            reason = "human_gate_pending"
            detail = "Runtime validation still requires explicit human review."
        }
    }

    if ($phase -eq "C" -and $status -in @("ready_for_claude", "implementation_ready", "implementation_in_progress", "needs_visual_revision", "needs_repair_pass")) {
        $assessment = Get-ClaudeCompletionAssessment -RunPaths $RunPaths -RunId $RunId
        $completion = Read-ClaudeCompletionSignal -RunPaths $RunPaths -RunId $RunId
        $adapterConfig = Get-ClaudeAdapterConfig -WorkspaceRoot $WorkspaceRoot
        $adapterConfigured = [bool]$adapterConfig.enabled -and -not [string]::IsNullOrWhiteSpace([string]$adapterConfig.command_template)
        $handoffExists = Test-Path -LiteralPath $RunPaths.claude_handoff_path
        $attempted = -not [string]::IsNullOrWhiteSpace([string]$State.claude_execution_last_attempt_at)

        if ([string]$assessment.evidence_state -eq "ready_for_implementation_done") {
            $completionReady = [bool]$completion.exists -and [bool]$completion.valid -and [bool]$completion.data.current_md_updated
            if (-not $completionReady) {
                return [ordered]@{
                    eligible = $true
                    action = "reconcile-claude-completion"
                    reason = "claude_signal_incomplete"
                    detail = "Claude evidence is ready, but the completion signal still needs bounded reconciliation."
                }
            }

            try {
                $null = Assert-ClaudeFinishPreconditions -State $State -RunContext $RunContext -RunPaths $RunPaths -RunId $RunId
                return [ordered]@{
                    eligible = $true
                    action = "claude-finish"
                    reason = "claude_finish_ready"
                    detail = "Claude evidence is valid and ready for authoritative consumption."
                }
            }
            catch {
                return [ordered]@{
                    eligible = $false
                    action = ""
                    reason = Get-AutoConsumeReasonFromError -Message $_.Exception.Message
                    detail = $_.Exception.Message
                }
            }
        }

        if (-not $handoffExists -or -not $attempted) {
            return [ordered]@{
                eligible = $true
                action = "claude-start"
                reason = "claude_start_due"
                detail = "Claude is the next machine-owned stage and has not been launched yet."
            }
        }

        if ($claudeAdapterMode -eq "blocked_missing_config") {
            return [ordered]@{
                eligible = $false
                action = ""
                reason = "adapter_missing_manual"
                detail = "Claude adapter is not configured. Manual Claude execution is required."
            }
        }

        if ($claudeAdapterMode -eq "invoke_failed") {
            return [ordered]@{
                eligible = $false
                action = ""
                reason = "adapter_launch_failed"
                detail = "Claude adapter launch failed. Fix the adapter problem before retrying automation."
            }
        }

        if (-not $adapterConfigured) {
            return [ordered]@{
                eligible = $false
                action = ""
                reason = "adapter_missing_manual"
                detail = "Claude adapter is not configured. Manual Claude execution is required."
            }
        }

        return [ordered]@{
            eligible = $false
            action = ""
            reason = "waiting_on_worker"
            detail = "Claude has been launched. Waiting for worker evidence."
        }
    }

    if ($phase -eq "D" -and $status -in @("ready_for_codex", "hardening", "approved_for_hardening")) {
        $assessment = Get-CodexCompletionAssessment -RunPaths $RunPaths -RunId $RunId
        $completion = Read-CodexCompletionSignal -RunPaths $RunPaths -RunId $RunId
        $adapterConfig = Get-CodexAdapterConfig -WorkspaceRoot $WorkspaceRoot
        $adapterConfigured = [bool]$adapterConfig.enabled -and (
            [string]$adapterConfig.driver -eq "builtin_retry" -or
            -not [string]::IsNullOrWhiteSpace([string]$adapterConfig.command_template)
        )
        $handoffExists = Test-Path -LiteralPath $RunPaths.codex_handoff_path
        $attempted = -not [string]::IsNullOrWhiteSpace([string]$State.codex_execution_last_attempt_at)

        if ([string]$assessment.evidence_state -eq "ready_for_final_review") {
            $completionReady = [bool]$completion.exists -and [bool]$completion.valid -and [bool]$completion.data.codex_review_updated
            if (-not $completionReady) {
                return [ordered]@{
                    eligible = $true
                    action = "reconcile-codex-completion"
                    reason = "codex_signal_incomplete"
                    detail = "Codex evidence is ready, but the completion signal still needs bounded reconciliation."
                }
            }

            try {
                $null = Assert-CodexFinishPreconditions -State $State -RunContext $RunContext -RunPaths $RunPaths -RunId $RunId
                return [ordered]@{
                    eligible = $true
                    action = "codex-finish"
                    reason = "codex_finish_ready"
                    detail = "Codex evidence is valid and ready for authoritative consumption."
                }
            }
            catch {
                return [ordered]@{
                    eligible = $false
                    action = ""
                    reason = Get-AutoConsumeReasonFromError -Message $_.Exception.Message
                    detail = $_.Exception.Message
                }
            }
        }

        if (-not $handoffExists -or -not $attempted) {
            return [ordered]@{
                eligible = $true
                action = "codex-start"
                reason = "codex_start_due"
                detail = "Codex is the next machine-owned stage and has not been launched yet."
            }
        }

        if ($codexAdapterMode -eq "blocked_missing_config") {
            return [ordered]@{
                eligible = $false
                action = ""
                reason = "adapter_missing_manual"
                detail = "Codex adapter is not configured. Manual Codex execution is required."
            }
        }

        if ($codexAdapterMode -eq "invoke_failed") {
            return [ordered]@{
                eligible = $false
                action = ""
                reason = "adapter_launch_failed"
                detail = "Codex adapter launch failed. Fix the adapter problem before retrying automation."
            }
        }

        if (-not $adapterConfigured) {
            return [ordered]@{
                eligible = $false
                action = ""
                reason = "adapter_missing_manual"
                detail = "Codex adapter is not configured. Manual Codex execution is required."
            }
        }

        return [ordered]@{
            eligible = $false
            action = ""
            reason = "waiting_on_worker"
            detail = "Codex has been launched. Waiting for worker evidence."
        }
    }

    return [ordered]@{
        eligible = $false
        action = ""
        reason = "human_gate_pending"
        detail = "No machine-owned continuation step is currently eligible."
    }
}

function Invoke-ContinueAutomationForRun {
    param(
        [string]$WorkspaceRoot,
        [string]$PipelineScriptPath,
        [string]$RunId,
        [hashtable]$RunPaths,
        [switch]$DryRun,
        [int]$MaxSteps = 8,
        [string]$CommandName = "scheduler-run"
    )

    $acted = New-Object System.Collections.ArrayList
    $lastDecision = $null

    for ($stepIndex = 0; $stepIndex -lt $MaxSteps; $stepIndex++) {
        $normalized = Normalize-RunStateAndContext -StatePath $RunPaths.state_path -RunContextPath $RunPaths.run_context_path
        $state = $normalized.state
        $runContext = $normalized.run_context
        $decision = Get-ContinueAutomationDecision -WorkspaceRoot $WorkspaceRoot -State $state -RunContext $runContext -RunPaths $RunPaths -RunId $RunId
        $lastDecision = $decision

        if (-not [bool]$decision.eligible) {
            $outcome = if ($acted.Count -gt 0) { "acted" } else { "skipped" }
            Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $state -RunContext $runContext -CommandName $CommandName -Message "Automation continuation stopped ($([string]$decision.reason)): $([string]$decision.detail)"
            return [ordered]@{
                run_id = $RunId
                outcome = $outcome
                action = ""
                reason = [string]$decision.reason
                detail = [string]$decision.detail
                actions = @($acted)
            }
        }

        $action = [string]$decision.action
        if ($DryRun.IsPresent) {
            Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $state -RunContext $runContext -CommandName $CommandName -Message "Automation continuation dry-run: would run '$action'."
            return [ordered]@{
                run_id = $RunId
                outcome = "dry_run"
                action = $action
                reason = [string]$decision.reason
                detail = [string]$decision.detail
                actions = @($acted)
            }
        }

        Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $state -RunContext $runContext -CommandName $CommandName -Message "Automation continuation running '$action': $([string]$decision.detail)"
        try {
            Invoke-SchedulerDelegatedCommand -WorkspaceRoot $WorkspaceRoot -PipelineScriptPath $PipelineScriptPath -RunId $RunId -DelegatedCommand $action
            [void]$acted.Add($action)
        }
        catch {
            $postState = Read-JsonObject -Path $RunPaths.state_path
            $postCtx = Read-JsonObject -Path $RunPaths.run_context_path
            Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $postState -RunContext $postCtx -CommandName $CommandName -Level "warn" -Message "Automation continuation failed while running '$action': $($_.Exception.Message)"
            return [ordered]@{
                run_id = $RunId
                outcome = "failed"
                action = $action
                reason = "continuation_failed"
                detail = $_.Exception.Message
                actions = @($acted)
            }
        }
    }

    $finalState = Read-JsonObject -Path $RunPaths.state_path
    $finalContext = Read-JsonObject -Path $RunPaths.run_context_path
    Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $finalState -RunContext $finalContext -CommandName $CommandName -Level "warn" -Message "Automation continuation stopped after reaching the bounded step limit ($MaxSteps)."
    return [ordered]@{
        run_id = $RunId
        outcome = if ($acted.Count -gt 0) { "acted" } else { "skipped" }
        action = ""
        reason = "step_limit_reached"
        detail = "Automation continuation reached the bounded step limit ($MaxSteps)."
        actions = @($acted)
    }
}

function Invoke-AutoConsumeForRun {
    param(
        [string]$WorkspaceRoot,
        [string]$PipelineScriptPath,
        [string]$RunId,
        [hashtable]$RunPaths,
        [hashtable]$State,
        [hashtable]$RunContext,
        [switch]$DryRun,
        [string]$CommandName = "auto-consume"
    )
    Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName $CommandName -Message "Auto-consume inspected run."
    $decision = Get-AutoConsumeDecision -State $State -RunContext $RunContext -RunPaths $RunPaths -RunId $RunId
    if (-not [bool]$decision.eligible) {
        $level = if ([string]$decision.reason -in @("blocked_supervisor", "stale_heartbeat", "contradictory_evidence", "evidence_invalid")) { "warn" } else { "info" }
        Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName $CommandName -Level $level -Message "Auto-consume skipped ($([string]$decision.reason)): $([string]$decision.detail)"
        return [ordered]@{
            run_id  = $RunId
            outcome = "skipped"
            action  = ""
            reason  = [string]$decision.reason
            detail  = [string]$decision.detail
            path    = [string]$decision.path
        }
    }

    $action = [string]$decision.action
    if ($DryRun.IsPresent) {
        Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName $CommandName -Message "Auto-consume dry-run: would run '$action'."
        return [ordered]@{
            run_id  = $RunId
            outcome = "dry_run"
            action  = $action
            reason  = "ready"
            detail  = [string]$decision.detail
            path    = [string]$decision.path
        }
    }

    try {
        Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $State -RunContext $RunContext -CommandName $CommandName -Message "Auto-consume attempting '$action'."
        Invoke-SchedulerDelegatedCommand -WorkspaceRoot $WorkspaceRoot -PipelineScriptPath $PipelineScriptPath -RunId $RunId -DelegatedCommand $action
        $post = Normalize-RunStateAndContext -StatePath $RunPaths.state_path -RunContextPath $RunPaths.run_context_path
        $successMessage = if ($action -eq "claude-finish") { "Claude evidence auto-consumed." } else { "Codex evidence auto-consumed." }
        Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $post.state -RunContext $post.run_context -CommandName $CommandName -Message $successMessage
        return [ordered]@{
            run_id  = $RunId
            outcome = "acted"
            action  = $action
            reason  = "auto_consume_succeeded"
            detail  = $successMessage
            path    = [string]$decision.path
        }
    }
    catch {
        $postState = Read-JsonObject -Path $RunPaths.state_path
        $postCtx = Read-JsonObject -Path $RunPaths.run_context_path
        Add-RunEvent -RunId $RunId -RunPaths $RunPaths -State $postState -RunContext $postCtx -CommandName $CommandName -Level "warn" -Message "Auto-consume failed: $($_.Exception.Message)"
        return [ordered]@{
            run_id  = $RunId
            outcome = "failed"
            action  = $action
            reason  = "consume_failed"
            detail  = $_.Exception.Message
            path    = [string]$decision.path
        }
    }
}

try {
    $workspaceRoot = Get-WorkspaceRoot -ScriptPath $PSScriptRoot
    $scriptsDir = Join-Path $workspaceRoot "scripts"
    $reposPath = Join-Path $workspaceRoot "repos.json"

    $startTaskScript = Join-Path $scriptsDir "start-task.ps1"
    $approveVisualScript = Join-Path $scriptsDir "approve-visual.ps1"
    $requestRevisionScript = Join-Path $scriptsDir "request-revision.ps1"
    $runCodexScript = Join-Path $scriptsDir "run-codex-review.ps1"
    $finalReviewScript = Join-Path $scriptsDir "final-review.ps1"
    $launchTargetScript = Join-Path $scriptsDir "launch-target.ps1"
    $serviceHostScript = Join-Path $scriptsDir "run-pipeline-service.ps1"

    Ensure-RunsStore -WorkspaceRoot $workspaceRoot
    $reposDoc = Read-JsonObject -Path $reposPath

    switch ($Command) {
        "start" {
            if ([string]::IsNullOrWhiteSpace($TaskId)) { throw "start requires -TaskId." }
            if ($CreateBranch -and [string]::IsNullOrWhiteSpace($Repo)) { throw "start with -CreateBranch requires -Repo." }

            $runIdToCreate = $TaskId.Trim()
            Assert-ValidRunId -Value $runIdToCreate

            $indexDoc = Read-RunIndex -WorkspaceRoot $workspaceRoot
            if ($null -ne (Get-RunRecord -IndexDoc $indexDoc -RunId $runIdToCreate)) {
                throw "Run id '$runIdToCreate' already exists in runs/index.json. Use '.\pp.ps1 use $runIdToCreate'."
            }
            $runPaths = Get-RunPaths -WorkspaceRoot $workspaceRoot -RunId $runIdToCreate
            if (Test-Path -LiteralPath $runPaths.run_root) {
                throw "Run folder already exists: $($runPaths.run_root). Refusing to overwrite existing run."
            }

            $runPaths = Ensure-RunScaffold -WorkspaceRoot $workspaceRoot -RunId $runIdToCreate

            $startParams = @{ TaskId = $TaskId; StatePath = $runPaths.state_path }
            if ($PSBoundParameters.ContainsKey("Repo")) { $startParams["Repo"] = $Repo }
            if ($RequiresVisualApproval.IsPresent) { $startParams["RequiresVisualApproval"] = $true }
            & $startTaskScript @startParams

            $state = Read-JsonObject -Path $runPaths.state_path
            $runContext = Read-JsonObject -Path $runPaths.run_context_path

            $selectedBranch = ""
            if ($CreateBranch) {
                $repoPath = Get-RepoPath -ReposDoc $reposDoc -RepoKey $Repo
                if (-not (Test-Path -LiteralPath $repoPath)) { throw "Target repo path does not exist: $repoPath" }
                $safeTaskId = ($TaskId -replace "[^a-zA-Z0-9._/-]", "-")
                $selectedBranch = if ([string]::IsNullOrWhiteSpace($BranchName)) { "feature/$safeTaskId" } else { $BranchName }
                $null = git -C $repoPath rev-parse --is-inside-work-tree 2>$null
                if ($LASTEXITCODE -ne 0) { throw "Target path is not a git repository: $repoPath" }
                $null = git -C $repoPath checkout -b $selectedBranch
                if ($LASTEXITCODE -ne 0) { throw "Failed to create branch '$selectedBranch' in $repoPath" }
            }
            elseif (-not [string]::IsNullOrWhiteSpace($BranchName)) {
                $selectedBranch = $BranchName.Trim()
            }

            $repoValue = if ($PSBoundParameters.ContainsKey("Repo")) { [string]$Repo } else { $null }
            $branchValue = if (-not [string]::IsNullOrWhiteSpace($selectedBranch)) { $selectedBranch } else { $null }
            $flowType = Resolve-FlowType -ExplicitFlow $Flow -RepoKey $repoValue -TaskType ([string]$state.task_type)
            $flowDefaults = Get-FlowDefaults -FlowType $flowType
            $taskType = [string]$flowDefaults.task_type
            $defaultEngine = [string]$flowDefaults.execution_engine
            if ([string]::IsNullOrWhiteSpace($defaultEngine) -or $defaultEngine -eq "none") {
                $defaultEngine = Get-DefaultImplementationEngine -TaskType $taskType -NeedsRepairPass $false
            }
            $requiresVisualApproval = if ($RequiresVisualApproval.IsPresent) { $true } else { [bool]$flowDefaults.requires_visual_approval }
            $uiChanged = [bool]$flowDefaults.ui_changed -or [bool]$requiresVisualApproval
            $requiresRuntimeValidation = [bool]$flowDefaults.requires_runtime_validation
            $runtimeValidationMode = [string]$flowDefaults.runtime_validation_mode
            $state.task_type = $taskType
            $state.flow_type = $flowType
            $state.execution_engine = $defaultEngine
            $state.requires_visual_approval = [bool]$requiresVisualApproval
            $state.ui_changed = [bool]$uiChanged
            $state.requires_runtime_validation = [bool]$requiresRuntimeValidation
            $state.runtime_validation_mode = $runtimeValidationMode
            $state.runtime_validation_completed = $false
            $state.touches_persistence = [bool]$flowDefaults.touches_persistence
            $state.touches_navigation = [bool]$flowDefaults.touches_navigation
            $state.touches_api_contract = [bool]$flowDefaults.touches_api_contract
            $state.touches_saved_state = [bool]$flowDefaults.touches_saved_state
            $state.touches_privacy_or_trust_copy = [bool]$flowDefaults.touches_privacy_or_trust_copy
            $state.touches_external_api = [bool]$flowDefaults.touches_external_api
            $state.touches_database = [bool]$flowDefaults.touches_database
            $state.supervisor_state = "healthy"
            $state.retry_count = 0
            $state.last_retry_at = ""
            $state.next_retry_at = ""
            $state.last_error_type = ""
            $state.last_error_message = ""
            $state.last_successful_progress_at = ""
            $state.worker_heartbeat_path = [string]$runPaths.worker_heartbeat_path
            $state.design_reference_path = [string]$runPaths.design_reference_dir
            $state.has_design_reference = $false
            $state.notification_state = "none"
            $state.last_notification_at = ""
            $state.last_notified_reason = ""
            $state.needs_repair_pass = $false
            Write-JsonObject -Path $runPaths.state_path -Data $state
            Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{
                task_id                  = [string]$state.task_id
                repo                     = $repoValue
                branch                   = $branchValue
                flow_type                = $flowType
                task_type                = $taskType
                execution_engine         = $defaultEngine
                requires_visual_approval = [bool]$requiresVisualApproval
                requires_runtime_validation = [bool]$requiresRuntimeValidation
                runtime_validation_mode  = $runtimeValidationMode
                runtime_validation_completed = $false
                touches_persistence      = [bool]$flowDefaults.touches_persistence
                touches_navigation       = [bool]$flowDefaults.touches_navigation
                touches_api_contract     = [bool]$flowDefaults.touches_api_contract
                touches_saved_state      = [bool]$flowDefaults.touches_saved_state
                touches_privacy_or_trust_copy = [bool]$flowDefaults.touches_privacy_or_trust_copy
                touches_external_api     = [bool]$flowDefaults.touches_external_api
                touches_database         = [bool]$flowDefaults.touches_database
                supervisor_state         = "healthy"
                retry_count              = 0
                last_retry_at            = ""
                next_retry_at            = ""
                last_error_type          = ""
                last_error_message       = ""
                last_successful_progress_at = ""
                worker_heartbeat_path    = [string]$runPaths.worker_heartbeat_path
                design_reference_path    = [string]$runPaths.design_reference_dir
                has_design_reference     = $false
                notification_state       = "none"
                last_notification_at     = ""
                last_notified_reason     = ""
                ui_changed               = [bool]$uiChanged
                needs_repair_pass        = $false
                phase                    = [string]$state.phase
                status                   = [string]$state.status
                started_at               = Get-NowIso
                pending_action           = "implementation_routed"
                commit_decision          = "undecided"
            }
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            Ensure-WorkerHeartbeatFile -RunPaths $runPaths -State $state -RunContext $runContext

            Set-CurrentRunId -WorkspaceRoot $workspaceRoot -RunId $runIdToCreate
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdToCreate -State $state -RunContext $runContext
            Add-RunEvent -RunId $runIdToCreate -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "start" -Message "Run created."
            Add-RunEvent -RunId $runIdToCreate -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "start" -Message "Spec locked and run initialized."
            Add-RunEvent -RunId $runIdToCreate -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "start" -Message "Flow profile selected: $([string]$state.flow_type)."

            if ($PSBoundParameters.ContainsKey("Repo") -and ($Repo -in @("frontend", "backend"))) {
                & $launchTargetScript -Repo $Repo
            }

            Print-Dashboard -RunId $runIdToCreate -State $state -RunContext $runContext -RunPaths $runPaths
            Print-RunEvents -RunId $runIdToCreate -RunPaths $runPaths -Tail 4 -RecentOnly
            Write-Host "Next: begin implementation from $($runPaths.task_path)"
        }

        "use" {
            $selectedRunId = if (-not [string]::IsNullOrWhiteSpace($RunId)) { $RunId } else { $TaskId }
            if ([string]::IsNullOrWhiteSpace($selectedRunId)) { throw "use requires a run id. Example: .\pp.ps1 use my-task-id" }
            $selectedRunId = $selectedRunId.Trim()
            Assert-ValidRunId -Value $selectedRunId
            $indexDoc = Read-RunIndex -WorkspaceRoot $workspaceRoot
            $record = Get-RunRecord -IndexDoc $indexDoc -RunId $selectedRunId
            if ($null -ne $record -and [bool]$record.archived) {
                throw "Run '$selectedRunId' is archived. Restore it manually from archived-runs before using it again."
            }
            $runPaths = Get-RunPaths -WorkspaceRoot $workspaceRoot -RunId $selectedRunId
            foreach ($required in @($runPaths.run_root, $runPaths.state_path, $runPaths.run_context_path)) {
                if (-not (Test-Path -LiteralPath $required)) { throw "Run '$selectedRunId' is missing required path: $required" }
            }
            Set-CurrentRunId -WorkspaceRoot $workspaceRoot -RunId $selectedRunId
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $selectedRunId -State $state -RunContext $runContext
            Add-RunEvent -RunId $selectedRunId -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "use" -Message "Run selected as active."
            Print-Dashboard -RunId $selectedRunId -State $state -RunContext $runContext -RunPaths $runPaths
            Print-RunEvents -RunId $selectedRunId -RunPaths $runPaths -Tail 3 -RecentOnly
        }

        "runs" { Show-RunsList -WorkspaceRoot $workspaceRoot }

        "archive-runs" {
            Invoke-ArchiveRuns -WorkspaceRoot $workspaceRoot -RunId $RunId -AllRuns:$AllRuns
        }

        "status" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $normalized = Normalize-RunStateAndContext -StatePath $active.paths.state_path -RunContextPath $active.paths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            Print-Dashboard -RunId $active.run_id -State $state -RunContext $runContext -RunPaths $active.paths
            Print-RunEvents -RunId $active.run_id -RunPaths $active.paths -Tail 5 -RecentOnly
        }

        "current" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $normalized = Normalize-RunStateAndContext -StatePath $active.paths.state_path -RunContextPath $active.paths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            Print-Dashboard -RunId $active.run_id -State $state -RunContext $runContext -RunPaths $active.paths
            Print-RunEvents -RunId $active.run_id -RunPaths $active.paths -Tail 5 -RecentOnly
        }
        "build" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            if (-not (Test-Path -LiteralPath $runPaths.task_path)) { throw "Missing required file: $($runPaths.task_path)" }

            $state = Read-JsonObject -Path $runPaths.state_path
            $runContext = Read-JsonObject -Path $runPaths.run_context_path
            if ($null -eq $runContext.repo -or [string]::IsNullOrWhiteSpace([string]$runContext.repo)) {
                throw "run-context.repo is not set for run '$runIdCurrent'. Start with -Repo first."
            }

            $repoPath = Get-RepoPath -ReposDoc $reposDoc -RepoKey ([string]$runContext.repo)
            if (-not (Test-Path -LiteralPath $repoPath)) { throw "Target repo path does not exist: $repoPath" }

            $taskType = if ([string]::IsNullOrWhiteSpace([string]$state.task_type)) { Get-TaskTypeForRepo -RepoKey ([string]$runContext.repo) } else { [string]$state.task_type }
            $needsRepairPass = [bool]$state.needs_repair_pass
            $engineForBuild = if ([string]$state.execution_engine -in @("claude", "cursor")) { [string]$state.execution_engine } else { Get-DefaultImplementationEngine -TaskType $taskType -NeedsRepairPass $needsRepairPass }
            if ($engineForBuild -eq "none") { $engineForBuild = "claude" }
            if ($needsRepairPass -and $taskType -eq "frontend") { $engineForBuild = "cursor" }
            $routedStatus = if ($engineForBuild -eq "cursor") { "ready_for_cursor" } else { "ready_for_claude" }

            $isLaterState = ($state.phase -in @("D", "E")) -or ($state.status -in @("ready_for_codex", "hardening", "approved_for_hardening", "ready_for_final_judgment", "final_review", "merge_ready"))
            if (-not $isLaterState) {
                $state = [ordered]@{
                    task_id                  = [string]$state.task_id
                    phase                    = "C"
                    status                   = $routedStatus
                    flow_type                = [string]$state.flow_type
                    task_type                = $taskType
                    execution_engine         = $engineForBuild
                    requires_visual_approval = [bool]$state.requires_visual_approval
                    requires_runtime_validation = [bool]$state.requires_runtime_validation
                    runtime_validation_mode  = [string]$state.runtime_validation_mode
                    runtime_validation_completed = $false
                    touches_persistence      = [bool]$state.touches_persistence
                    touches_navigation       = [bool]$state.touches_navigation
                    touches_import_flow      = [bool]$state.touches_import_flow
                    touches_api_contract     = [bool]$state.touches_api_contract
                    touches_saved_state      = [bool]$state.touches_saved_state
                    touches_privacy_or_trust_copy = [bool]$state.touches_privacy_or_trust_copy
                    touches_external_api     = [bool]$state.touches_external_api
                    touches_database         = [bool]$state.touches_database
                    supervisor_state         = [string]$state.supervisor_state
                    retry_count              = [int]$state.retry_count
                    last_retry_at            = [string]$state.last_retry_at
                    next_retry_at            = [string]$state.next_retry_at
                    last_error_type          = [string]$state.last_error_type
                    last_error_message       = [string]$state.last_error_message
                    last_successful_progress_at = [string]$state.last_successful_progress_at
                    worker_heartbeat_path    = [string]$state.worker_heartbeat_path
                    notification_state       = [string]$state.notification_state
                    last_notification_at     = [string]$state.last_notification_at
                    last_notified_reason     = [string]$state.last_notified_reason
                    ui_changed               = [bool]$state.ui_changed
                    needs_repair_pass        = [bool]$needsRepairPass
                    iteration                = [int]$state.iteration
                }
                Write-JsonObject -Path $runPaths.state_path -Data $state
            }

            Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{
                flow_type         = [string]$state.flow_type
                task_type         = $taskType
                execution_engine  = $engineForBuild
                runtime_validation_mode = [string]$state.runtime_validation_mode
                runtime_validation_completed = $false
                touches_persistence = [bool]$state.touches_persistence
                touches_navigation = [bool]$state.touches_navigation
                touches_api_contract = [bool]$state.touches_api_contract
                touches_saved_state = [bool]$state.touches_saved_state
                touches_external_api = [bool]$state.touches_external_api
                touches_database = [bool]$state.touches_database
                ui_changed        = [bool]$state.ui_changed
                needs_repair_pass = [bool]$needsRepairPass
                phase             = [string]$state.phase
                status            = [string]$state.status
                pending_action    = if ($needsRepairPass) { "implementation_repair_pass" } else { "implementation_routed" }
            }
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            Write-BuilderPrompt -RunId $runIdCurrent -RepoPath $repoPath -State $state -RunContext $runContext -RunPaths $runPaths
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "build" -Message "Builder prompt generated for implementation."
            $routeMsg = if ([string]$state.execution_engine -eq "cursor") { "Routed to Cursor for implementation." } else { "Routed to Claude for implementation." }
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "build" -Message $routeMsg
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext

            Print-Dashboard -RunId $runIdCurrent -State $state -RunContext $runContext -RunPaths $runPaths
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 4 -RecentOnly
            Write-Host "Build Handoff"
            Write-Host "Target repo path: $repoPath"
            Write-Host "Task artifact: $($runPaths.task_path)"
            Write-Host "Builder prompt: $($runPaths.builder_prompt_path)"
            Write-Host "Required build artifact output: $($runPaths.current_artifact_path)"
        }

        "claude-start" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            $validStatuses = @("ready_for_claude", "implementation_ready", "implementation_in_progress")
            if ([string]$state.status -notin $validStatuses) {
                throw "claude-start is only valid from Claude-ready implementation states. Current phase/status: $($state.phase)/$($state.status). Expected one of: $($validStatuses -join ', ')"
            }
            if ([string]$state.phase -ne "C") {
                throw "claude-start is only valid during Phase C implementation. Current phase/status: $($state.phase)/$($state.status)"
            }
            if ([string]$state.execution_engine -ne "claude") {
                throw "claude-start requires execution_engine=claude. Current execution_engine: '$([string]$state.execution_engine)'."
            }
            if (-not (Test-Path -LiteralPath $runPaths.task_path)) {
                throw "Missing required task artifact: $($runPaths.task_path)"
            }
            if ([string]::IsNullOrWhiteSpace([string]$runContext.repo)) {
                throw "run-context.repo is not set. Use start/build with -Repo before claude-start."
            }

            $repoPath = Get-RepoPath -ReposDoc $reposDoc -RepoKey ([string]$runContext.repo)
            if (-not (Test-Path -LiteralPath $repoPath)) {
                throw "Target repo path does not exist: $repoPath"
            }

            if (-not (Test-GeneratedPromptFile -Path $runPaths.builder_prompt_path)) {
                Write-BuilderPrompt -RunId $runIdCurrent -RepoPath $repoPath -State $state -RunContext $runContext -RunPaths $runPaths
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "claude-start" -Message "Builder prompt was missing/stale and refreshed before Claude handoff."
            }

            $adapterConfig = Get-ClaudeAdapterConfig -WorkspaceRoot $workspaceRoot
            $adapterEnabled = [bool]$adapterConfig.enabled -and -not [string]::IsNullOrWhiteSpace([string]$adapterConfig.command_template)
            $adapterMode = "blocked_missing_config"
            $adapterResult = "execution adapter not configured"
            $adapterCommandResolved = ""
            $adapterAttemptAt = Get-NowIso

            Ensure-WorkerHeartbeatFile -RunPaths $runPaths -State $state -RunContext $runContext
            Write-ClaudeHandoff -RunId $runIdCurrent -RepoPath $repoPath -State $state -RunContext $runContext -RunPaths $runPaths
            Ensure-ClaudeCompletionSignal -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext

            $now = Get-NowIso
            $hb = Read-WorkerHeartbeat -RunPaths $runPaths -State $state -RunContext $runContext
            $hb.worker_name = if (-not [string]::IsNullOrWhiteSpace($Worker)) { $Worker.Trim() } else { "claude" }
            $hb.started_at = $now
            $hb.last_progress_at = $now
            $hb.current_attempt = 0
            $hb.status = "running"
            $hb.last_completed_step = "claude-start"
            $hb.note = "Claude Phase C worker initialized by pipeline."
            $hb.error = ""
            Write-WorkerHeartbeat -RunPaths $runPaths -Heartbeat $hb

            $state.supervisor_state = "healthy"
            $state.retry_count = 0
            $state.last_retry_at = ""
            $state.next_retry_at = ""
            $state.last_error_type = ""
            $state.last_error_message = ""
            $state.last_successful_progress_at = $now
            $state.worker_heartbeat_path = [string]$runPaths.worker_heartbeat_path
            $state.claude_adapter_mode = "prepared_only"
            $state.claude_execution_last_result = "Claude execution prepared; invocation not attempted yet."
            $state.claude_execution_last_command = ""
            $state.claude_execution_last_attempt_at = $adapterAttemptAt
            Write-JsonObject -Path $runPaths.state_path -Data $state
            $contextChanges = @{
                supervisor_state            = "healthy"
                retry_count                 = 0
                last_retry_at               = ""
                next_retry_at               = ""
                last_error_type             = ""
                last_error_message          = ""
                last_successful_progress_at = $now
                worker_heartbeat_path       = [string]$runPaths.worker_heartbeat_path
                pending_action              = "claude_implementation_in_progress"
                claude_adapter_mode         = "prepared_only"
                claude_execution_last_result = "Claude execution prepared; invocation not attempted yet."
                claude_execution_last_command = ""
                claude_execution_last_attempt_at = $adapterAttemptAt
            }

            $tokenMap = [ordered]@{
                run_id = $runIdCurrent
                repo_path = $repoPath
                run_root = $runPaths.run_root
                handoff_path = $runPaths.claude_handoff_path
                task_path = $runPaths.task_path
                builder_prompt_path = $runPaths.builder_prompt_path
                current_path = $runPaths.current_artifact_path
                completion_path = $runPaths.claude_completion_path
                worker_heartbeat_path = $runPaths.worker_heartbeat_path
                flow_type = [string]$state.flow_type
                task_type = [string]$state.task_type
                branch = [string]$runContext.branch
            }
            if ($adapterEnabled) {
                $adapterCommandResolved = Resolve-ClaudeTemplate -Template ([string]$adapterConfig.command_template) -Tokens $tokenMap
            }
            $adapterWorkingDir = Resolve-ClaudeTemplate -Template ([string]$adapterConfig.working_dir) -Tokens $tokenMap
            if ([string]::IsNullOrWhiteSpace($adapterWorkingDir)) { $adapterWorkingDir = $repoPath }

            if ($PrepareOnly.IsPresent) {
                $adapterMode = "prepared_only"
                $adapterResult = "prepare-only mode requested; adapter invocation skipped."
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "claude-start" -Message "Claude execution prepared (prepare-only)."
            }
            elseif (-not $adapterEnabled) {
                $adapterMode = "blocked_missing_config"
                $adapterResult = "execution adapter not configured"
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "claude-start" -Level "warn" -Message "Claude execution adapter not configured; manual invocation required."
            }
            else {
                try {
                    Invoke-ClaudeAdapter -CommandText $adapterCommandResolved -WorkingDirectory $adapterWorkingDir -InvokeMode ([string]$adapterConfig.invoke_mode)
                    $adapterMode = "invoked"
                    $adapterResult = "adapter invocation started ($([string]$adapterConfig.invoke_mode))"
                    Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "claude-start" -Message "Claude execution invoked by adapter."
                }
                catch {
                    $adapterMode = "invoke_failed"
                    $adapterResult = "adapter invoke failed: $($_.Exception.Message)"
                    Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "claude-start" -Level "warn" -Message "Claude execution invoke failed: $($_.Exception.Message)"
                }
            }

            $contextChanges["claude_adapter_mode"] = $adapterMode
            $contextChanges["claude_execution_last_result"] = $adapterResult
            $contextChanges["claude_execution_last_command"] = $adapterCommandResolved
            $contextChanges["claude_execution_last_attempt_at"] = $adapterAttemptAt
            Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes $contextChanges
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            $state.claude_adapter_mode = $adapterMode
            $state.claude_execution_last_result = $adapterResult
            $state.claude_execution_last_command = $adapterCommandResolved
            $state.claude_execution_last_attempt_at = $adapterAttemptAt
            Write-JsonObject -Path $runPaths.state_path -Data $state
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            if ($adapterMode -eq "invoke_failed") {
                $state.supervisor_state = "worker_blocked"
                $state.last_error_type = "process_crash"
                $state.last_error_message = [string]$adapterResult
                $state.notification_state = "intervention_required"
                $state.last_notification_at = Get-NowIso
                Write-JsonObject -Path $runPaths.state_path -Data $state
                Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{
                    supervisor_state    = "worker_blocked"
                    last_error_type     = "process_crash"
                    last_error_message  = [string]$adapterResult
                    notification_state  = "intervention_required"
                    last_notification_at = [string]$state.last_notification_at
                }
                $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
                $state = $normalized.state
                $runContext = $normalized.run_context
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "claude-start" -Level "warn" -Message "Claude adapter invocation failed; supervisor moved to worker_blocked."
                $null = Send-RunNotification -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -StateRef ([ref]$state) -RunContextRef ([ref]$runContext) -Severity "error" -Reason "adapter_invocation_blocked" -Message "Claude adapter invocation failed and worker is blocked." -NextAction ".\pp.ps1 worker-status"
            }

            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "claude-start" -Message "Claude handoff generated."
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "claude-start" -Message "Claude worker initialized under supervisor."
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "claude-start" -Message "Claude completion signal artifact prepared."
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext

            Write-Host "[pipeline-event] Claude Phase C handoff prepared"
            Write-Host "Claude handoff: $($runPaths.claude_handoff_path)"
            Write-Host "Implementation evidence target: $($runPaths.current_artifact_path)"
            Write-Host "Worker supervision initialized: $($runPaths.worker_heartbeat_path)"
            Write-Host "Claude completion signal: $($runPaths.claude_completion_path)"
            if (-not [string]::IsNullOrWhiteSpace($adapterCommandResolved)) {
                Write-Host "Claude adapter command preview: $adapterCommandResolved"
            }
            Write-Host "Claude adapter mode: $adapterMode"
            Write-Host "Claude adapter result: $adapterResult"
            if ($adapterMode -eq "blocked_missing_config") {
                Write-Host "Manual Claude invocation required."
            }
            Write-Host "Authoritative completion transition remains: .\pp.ps1 implementation-done"
            Print-WorkerStatus -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 6 -RecentOnly
        }

        "claude-check" {
            $selectedRunId = if (-not [string]::IsNullOrWhiteSpace($RunId)) { $RunId.Trim() } else { $null }
            $targetPaths = $null
            if (-not [string]::IsNullOrWhiteSpace($selectedRunId)) {
                Assert-ValidRunId -Value $selectedRunId
                $targetPaths = Get-RunPaths -WorkspaceRoot $workspaceRoot -RunId $selectedRunId
                if (-not (Test-Path -LiteralPath $targetPaths.run_root)) { throw "Run '$selectedRunId' was not found at $($targetPaths.run_root)" }
            }
            else {
                $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
                $selectedRunId = [string]$active.run_id
                $targetPaths = $active.paths
            }

            $normalized = Normalize-RunStateAndContext -StatePath $targetPaths.state_path -RunContextPath $targetPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            $assessment = Get-ClaudeCompletionAssessment -RunPaths $targetPaths -RunId $selectedRunId
            $hb = Read-WorkerHeartbeat -RunPaths $targetPaths -State $state -RunContext $runContext
            $hbTs = Get-DateSafe -Value ([string]$hb.last_progress_at)
            $hbAge = $null
            $hbStale = $false
            if ($null -ne $hbTs) {
                $hbAge = ([DateTime]::UtcNow - $hbTs.ToUniversalTime()).TotalMinutes
                if (([string]$state.supervisor_state -eq "healthy" -and $hbAge -gt 45) -or ([string]$state.supervisor_state -in @("worker_retrying", "worker_degraded", "worker_blocked") -and $hbAge -gt 20)) {
                    $hbStale = $true
                }
            }

            $adapterConfig = Get-ClaudeAdapterConfig -WorkspaceRoot $workspaceRoot
            $adapterConfigured = [bool]$adapterConfig.enabled -and -not [string]::IsNullOrWhiteSpace([string]$adapterConfig.command_template)
            Write-Host "Claude Check"
            Write-Host "Run: $selectedRunId"
            Write-Host "Phase/Status: $([string]$state.phase) / $([string]$state.status)"
            Write-Host "Flow type: $([string]$state.flow_type)"
            Write-Host "Execution engine: $([string]$state.execution_engine)"
            Write-Host "Supervisor state: $([string]$state.supervisor_state)"
            Write-Host "Adapter configured: $adapterConfigured"
            Write-Host "Adapter source: $([string]$adapterConfig.source)"
            Write-Host "Adapter mode (last): $([string]$state.claude_adapter_mode)"
            if (-not [string]::IsNullOrWhiteSpace([string]$state.claude_execution_last_result)) {
                Write-Host "Adapter last result: $([string]$state.claude_execution_last_result)"
            }
            if (-not [string]::IsNullOrWhiteSpace([string]$state.claude_execution_last_attempt_at)) {
                Write-Host "Adapter last attempt: $(Format-ClockLabel -IsoValue ([string]$state.claude_execution_last_attempt_at))"
            }
            Write-Host "Handoff: $($targetPaths.claude_handoff_path)"
            Write-Host "Completion signal: $($targetPaths.claude_completion_path)"
            Write-Host "Current artifact: $($targetPaths.current_artifact_path)"
            Write-Host "Heartbeat last progress: $(Format-ClockLabel -IsoValue ([string]$hb.last_progress_at))"
            if ($null -ne $hbAge) {
                Write-Host ("Heartbeat age (minutes): {0:N1}" -f $hbAge)
            }
            if ($hbStale) {
                Write-Host "Heartbeat health: STALE"
            } else {
                Write-Host "Heartbeat health: OK"
            }

            $evidenceLabel = switch ([string]$assessment.evidence_state) {
                "no_evidence" { "NO EVIDENCE" }
                "incomplete_evidence" { "INCOMPLETE EVIDENCE" }
                "ready_for_implementation_done" { "READY FOR IMPLEMENTATION-DONE" }
                default { "UNKNOWN" }
            }
            Write-Host "Completion evidence state: $evidenceLabel"
            Write-Host "Summary: $([string]$assessment.summary)"
            Write-Host "Current.md check: $([string]$assessment.current_reason)"
            if ($assessment.completion.valid) {
                $signal = $assessment.completion.data
                Write-Host "Signal status: $([string]$signal.status)"
                if (-not [string]::IsNullOrWhiteSpace([string]$signal.completed_at)) {
                    Write-Host "Signal completed_at: $(Format-ClockLabel -IsoValue ([string]$signal.completed_at))"
                }
                Write-Host "Signal current_md_updated: $([bool]$signal.current_md_updated)"
                if (@($signal.validations_attempted).Count -gt 0) {
                    Write-Host "Signal validations attempted: $(@($signal.validations_attempted) -join ', ')"
                }
            }
            elseif ($assessment.completion.exists) {
                Write-Host "Signal parse error: $([string]$assessment.completion.parse_error)"
            }

            if ([string]$assessment.evidence_state -eq "ready_for_implementation_done") {
                Write-Host "Next command: .\pp.ps1 claude-finish (or .\pp.ps1 implementation-done)"
                Add-RunEvent -RunId $selectedRunId -RunPaths $targetPaths -State $state -RunContext $runContext -CommandName "claude-check" -Message "Claude completion evidence appears ready for claude-finish."
            }
            elseif ([string]$assessment.evidence_state -eq "incomplete_evidence") {
                Write-Host "Next command: update current.md or completion signal, then rerun .\pp.ps1 claude-check"
                Add-RunEvent -RunId $selectedRunId -RunPaths $targetPaths -State $state -RunContext $runContext -CommandName "claude-check" -Level "warn" -Message "Claude completion evidence is incomplete."
            }
            else {
                Write-Host "Next command: continue Claude work, update evidence, then rerun .\pp.ps1 claude-check"
                Add-RunEvent -RunId $selectedRunId -RunPaths $targetPaths -State $state -RunContext $runContext -CommandName "claude-check" -Message "No meaningful Claude completion evidence yet."
            }

            if ($hbStale) {
                Write-Host "Recommendation: .\pp.ps1 worker-heartbeat -Step <step> -Notes <note>"
            }
            Print-RunEvents -RunId $selectedRunId -RunPaths $targetPaths -Tail 6 -RecentOnly
        }

        "claude-finish" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            $validation = $null
            try {
                $validation = Assert-ClaudeFinishPreconditions -State $state -RunContext $runContext -RunPaths $runPaths -RunId $runIdCurrent
            }
            catch {
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "claude-finish" -Level "warn" -Message "Claude completion consumption failed: $($_.Exception.Message)"
                throw
            }

            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "claude-finish" -Message "Claude completion evidence consumed."
            if (@($validation.warnings).Count -gt 0) {
                foreach ($w in @($validation.warnings)) {
                    Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "claude-finish" -Level "warn" -Message $w
                }
            }

            Write-Host "[pipeline-event] Claude completion evidence validated"
            Write-Host "Completion signal accepted: $($runPaths.claude_completion_path)"
            if ($validation.completion.valid) {
                $signal = $validation.completion.data
                if (-not [string]::IsNullOrWhiteSpace([string]$signal.completed_at)) {
                    Write-Host "Completion timestamp: $(Format-ClockLabel -IsoValue ([string]$signal.completed_at))"
                }
            }
            Write-Host "Current artifact accepted: $($runPaths.current_artifact_path)"
            Write-Host "Transition source of truth: implementation-done state transition logic"
            if (@($validation.warnings).Count -gt 0) {
                foreach ($w in @($validation.warnings)) { Write-Host "Warning: $w" }
            }

            Invoke-ImplementationDoneTransition -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "claude-finish"
        }

        "reconcile-claude-completion" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            $reconciled = Invoke-ReconcileClaudeCompletionSignal -RunId $runIdCurrent -RunPaths $runPaths
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "reconcile-claude-completion" -Message "Claude completion signal reconciled from current.md evidence."
            Write-Host "[pipeline-event] Claude completion signal reconciled"
            Write-Host "Completion signal updated: $($runPaths.claude_completion_path)"
            Write-Host "Run ID: $([string]$reconciled.run_id)"
            Write-Host "Status: $([string]$reconciled.status)"
            Write-Host "Next command: .\pp.ps1 claude-finish"
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 5 -RecentOnly
        }

        "implementation-done" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            Assert-ImplementationDonePreconditions -State $state -RunPaths $runPaths
            Invoke-ImplementationDoneTransition -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "implementation-done"
        }

        "codex-start" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            Assert-CodexStartPreconditions -State $state -RunContext $runContext -RunPaths $runPaths
            if ([string]::IsNullOrWhiteSpace([string]$runContext.repo)) {
                throw "run-context.repo is not set. Use start/build with -Repo before codex-start."
            }
            $repoPath = Get-RepoPath -ReposDoc $reposDoc -RepoKey ([string]$runContext.repo)
            if (-not (Test-Path -LiteralPath $repoPath)) {
                throw "Target repo path does not exist: $repoPath"
            }

            if (-not (Test-GeneratedPromptFile -Path $runPaths.codex_hardening_prompt_path)) {
                Write-CodexHardeningPrompt -RunId $runIdCurrent -RepoPath $repoPath -State $state -RunContext $runContext -RunPaths $runPaths
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "codex-start" -Message "Codex hardening prompt was missing/stale and refreshed before Codex handoff."
            }

            $adapterConfig = Get-CodexAdapterConfig -WorkspaceRoot $workspaceRoot
            $adapterEnabled = [bool]$adapterConfig.enabled -and (
                [string]$adapterConfig.driver -eq "builtin_retry" -or
                -not [string]::IsNullOrWhiteSpace([string]$adapterConfig.command_template)
            )
            $adapterMode = "blocked_missing_config"
            $adapterResult = "execution adapter not configured"
            $adapterCommandResolved = ""
            $adapterAttemptAt = Get-NowIso

            Ensure-WorkerHeartbeatFile -RunPaths $runPaths -State $state -RunContext $runContext
            Write-CodexHandoff -RunId $runIdCurrent -RepoPath $repoPath -State $state -RunContext $runContext -RunPaths $runPaths
            Ensure-CodexCompletionSignal -RunId $runIdCurrent -RunPaths $runPaths

            $now = Get-NowIso
            $hb = Read-WorkerHeartbeat -RunPaths $runPaths -State $state -RunContext $runContext
            $hb.worker_name = if (-not [string]::IsNullOrWhiteSpace($Worker)) { $Worker.Trim() } else { "codex" }
            $hb.started_at = $now
            $hb.last_progress_at = $now
            $hb.current_attempt = 0
            $hb.status = "running"
            $hb.last_completed_step = "codex-start"
            $hb.note = "Codex Phase D worker initialized by pipeline."
            $hb.error = ""
            Write-WorkerHeartbeat -RunPaths $runPaths -Heartbeat $hb

            $state.supervisor_state = "healthy"
            $state.retry_count = 0
            $state.last_retry_at = ""
            $state.next_retry_at = ""
            $state.last_error_type = ""
            $state.last_error_message = ""
            $state.last_successful_progress_at = $now
            $state.worker_heartbeat_path = [string]$runPaths.worker_heartbeat_path
            $state.codex_adapter_mode = "prepared_only"
            $state.codex_execution_last_result = "Codex execution prepared; invocation not attempted yet."
            $state.codex_execution_last_command = ""
            $state.codex_execution_last_attempt_at = $adapterAttemptAt
            $state.status = "hardening"
            Write-JsonObject -Path $runPaths.state_path -Data $state

            $contextChanges = @{
                phase                        = "D"
                status                       = "hardening"
                execution_engine             = "codex"
                supervisor_state             = "healthy"
                retry_count                  = 0
                last_retry_at                = ""
                next_retry_at                = ""
                last_error_type              = ""
                last_error_message           = ""
                last_successful_progress_at  = $now
                worker_heartbeat_path        = [string]$runPaths.worker_heartbeat_path
                pending_action               = "codex_hardening_in_progress"
                codex_adapter_mode           = "prepared_only"
                codex_execution_last_result  = "Codex execution prepared; invocation not attempted yet."
                codex_execution_last_command = ""
                codex_execution_last_attempt_at = $adapterAttemptAt
            }

            $tokenMap = [ordered]@{
                run_id = $runIdCurrent
                repo_path = $repoPath
                run_root = $runPaths.run_root
                handoff_path = $runPaths.codex_handoff_path
                task_path = $runPaths.task_path
                current_path = $runPaths.current_artifact_path
                runtime_validation_path = $runPaths.runtime_validation_path
                codex_review_path = $runPaths.codex_review_path
                completion_path = $runPaths.codex_completion_path
                worker_heartbeat_path = $runPaths.worker_heartbeat_path
                flow_type = [string]$state.flow_type
                task_type = [string]$state.task_type
                branch = [string]$runContext.branch
            }
            if ($adapterEnabled -and [string]$adapterConfig.driver -eq "legacy_template") {
                $adapterCommandResolved = Resolve-CodexTemplate -Template ([string]$adapterConfig.command_template) -Tokens $tokenMap
            }
            $adapterWorkingDir = Resolve-CodexTemplate -Template ([string]$adapterConfig.working_dir) -Tokens $tokenMap
            if ([string]::IsNullOrWhiteSpace($adapterWorkingDir)) { $adapterWorkingDir = $repoPath }

            if ($PrepareOnly.IsPresent) {
                $adapterMode = "prepared_only"
                $adapterResult = "prepare-only mode requested; adapter invocation skipped."
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "codex-start" -Message "Codex execution prepared (prepare-only)."
            }
            elseif (-not $adapterEnabled) {
                $adapterMode = "blocked_missing_config"
                $adapterResult = "execution adapter not configured"
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "codex-start" -Level "warn" -Message "Codex execution adapter not configured; manual invocation required."
            }
            else {
                try {
                    if ([string]$adapterConfig.driver -eq "builtin_retry") {
                        $adapterCommandResolved = Invoke-BuiltinCodexRetryAdapter -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RepoPath $repoPath -RunPaths $runPaths -AdapterConfig $adapterConfig
                        $adapterMode = "invoked_retry_wrapper"
                        $adapterResult = "built-in retry wrapper started ($([string]$adapterConfig.invoke_mode))"
                        Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "codex-start" -Message "Codex execution invoked by built-in retry wrapper."
                    }
                    else {
                        Invoke-CodexAdapter -CommandText $adapterCommandResolved -WorkingDirectory $adapterWorkingDir -InvokeMode ([string]$adapterConfig.invoke_mode)
                        $adapterMode = "invoked"
                        $adapterResult = "adapter invocation started ($([string]$adapterConfig.invoke_mode))"
                        Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "codex-start" -Message "Codex execution invoked by adapter."
                    }
                }
                catch {
                    $adapterMode = "invoke_failed"
                    $adapterResult = "adapter invoke failed: $($_.Exception.Message)"
                    Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "codex-start" -Level "warn" -Message "Codex execution invoke failed: $($_.Exception.Message)"
                }
            }

            $contextChanges["codex_adapter_mode"] = $adapterMode
            $contextChanges["codex_execution_last_result"] = $adapterResult
            $contextChanges["codex_execution_last_command"] = $adapterCommandResolved
            $contextChanges["codex_execution_last_attempt_at"] = $adapterAttemptAt
            Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes $contextChanges
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            $state.codex_adapter_mode = $adapterMode
            $state.codex_execution_last_result = $adapterResult
            $state.codex_execution_last_command = $adapterCommandResolved
            $state.codex_execution_last_attempt_at = $adapterAttemptAt
            Write-JsonObject -Path $runPaths.state_path -Data $state
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            if ($adapterMode -eq "invoke_failed") {
                $state.supervisor_state = "worker_blocked"
                $state.last_error_type = "process_crash"
                $state.last_error_message = [string]$adapterResult
                $state.notification_state = "intervention_required"
                $state.last_notification_at = Get-NowIso
                Write-JsonObject -Path $runPaths.state_path -Data $state
                Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{
                    supervisor_state    = "worker_blocked"
                    last_error_type     = "process_crash"
                    last_error_message  = [string]$adapterResult
                    notification_state  = "intervention_required"
                    last_notification_at = [string]$state.last_notification_at
                }
                $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
                $state = $normalized.state
                $runContext = $normalized.run_context
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "codex-start" -Level "warn" -Message "Codex adapter invocation failed; supervisor moved to worker_blocked."
                $null = Send-RunNotification -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -StateRef ([ref]$state) -RunContextRef ([ref]$runContext) -Severity "error" -Reason "adapter_invocation_blocked" -Message "Codex adapter invocation failed and worker is blocked." -NextAction ".\pp.ps1 worker-status"
            }

            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "codex-start" -Message "Codex handoff generated."
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "codex-start" -Message "Codex worker initialized under supervisor."
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "codex-start" -Message "Codex completion signal artifact prepared."
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext

            Write-Host "[pipeline-event] Codex Phase D handoff prepared"
            Write-Host "Codex handoff: $($runPaths.codex_handoff_path)"
            Write-Host "Codex review target: $($runPaths.codex_review_path)"
            Write-Host "Worker supervision initialized: $($runPaths.worker_heartbeat_path)"
            Write-Host "Codex completion signal: $($runPaths.codex_completion_path)"
            if (-not [string]::IsNullOrWhiteSpace($adapterCommandResolved)) {
                Write-Host "Codex adapter command preview: $adapterCommandResolved"
            }
            Write-Host "Codex adapter mode: $adapterMode"
            Write-Host "Codex adapter result: $adapterResult"
            if ($adapterMode -eq "blocked_missing_config") {
                Write-Host "Manual Codex invocation required."
            }
            Write-Host "Authoritative completion transition remains: .\pp.ps1 codex-finish"
            Print-WorkerStatus -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 6 -RecentOnly
        }

        "codex-check" {
            $selectedRunId = if (-not [string]::IsNullOrWhiteSpace($RunId)) { $RunId.Trim() } else { $null }
            $targetPaths = $null
            if (-not [string]::IsNullOrWhiteSpace($selectedRunId)) {
                Assert-ValidRunId -Value $selectedRunId
                $targetPaths = Get-RunPaths -WorkspaceRoot $workspaceRoot -RunId $selectedRunId
                if (-not (Test-Path -LiteralPath $targetPaths.run_root)) { throw "Run '$selectedRunId' was not found at $($targetPaths.run_root)" }
            }
            else {
                $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
                $selectedRunId = [string]$active.run_id
                $targetPaths = $active.paths
            }

            $normalized = Normalize-RunStateAndContext -StatePath $targetPaths.state_path -RunContextPath $targetPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            $phase = [string]$state.phase
            $status = [string]$state.status
            $codexCheckValidStates = @("ready_for_codex", "hardening", "approved_for_hardening", "ready_for_final_judgment", "final_review", "merge_ready")
            if (-not (($phase -in @("D", "E")) -or ($status -in $codexCheckValidStates))) {
                throw "codex-check is only valid from Codex hardening/final-review states. Current phase/status: $phase/$status"
            }

            $assessment = Get-CodexCompletionAssessment -RunPaths $targetPaths -RunId $selectedRunId
            $hb = Read-WorkerHeartbeat -RunPaths $targetPaths -State $state -RunContext $runContext
            $hbTs = Get-DateSafe -Value ([string]$hb.last_progress_at)
            $hbAge = $null
            $hbStale = $false
            if ($null -ne $hbTs) {
                $hbAge = ([DateTime]::UtcNow - $hbTs.ToUniversalTime()).TotalMinutes
                if (([string]$state.supervisor_state -eq "healthy" -and $hbAge -gt 45) -or ([string]$state.supervisor_state -in @("worker_retrying", "worker_degraded", "worker_blocked") -and $hbAge -gt 20)) {
                    $hbStale = $true
                }
            }

            $adapterConfig = Get-CodexAdapterConfig -WorkspaceRoot $workspaceRoot
            $adapterConfigured = [bool]$adapterConfig.enabled -and (
                [string]$adapterConfig.driver -eq "builtin_retry" -or
                -not [string]::IsNullOrWhiteSpace([string]$adapterConfig.command_template)
            )
            Write-Host "Codex Check"
            Write-Host "Run: $selectedRunId"
            Write-Host "Phase/Status: $([string]$state.phase) / $([string]$state.status)"
            Write-Host "Flow type: $([string]$state.flow_type)"
            Write-Host "Execution engine: $([string]$state.execution_engine)"
            Write-Host "Supervisor state: $([string]$state.supervisor_state)"
            Write-Host "Adapter configured: $adapterConfigured"
            Write-Host "Adapter source: $([string]$adapterConfig.source)"
            Write-Host "Adapter mode (last): $([string]$state.codex_adapter_mode)"
            if (-not [string]::IsNullOrWhiteSpace([string]$state.codex_execution_last_result)) {
                Write-Host "Adapter last result: $([string]$state.codex_execution_last_result)"
            }
            if (-not [string]::IsNullOrWhiteSpace([string]$state.codex_execution_last_attempt_at)) {
                Write-Host "Adapter last attempt: $(Format-ClockLabel -IsoValue ([string]$state.codex_execution_last_attempt_at))"
            }
            Write-Host "Handoff: $($targetPaths.codex_handoff_path)"
            Write-Host "Completion signal: $($targetPaths.codex_completion_path)"
            Write-Host "Codex review artifact: $($targetPaths.codex_review_path)"
            Write-Host "Heartbeat last progress: $(Format-ClockLabel -IsoValue ([string]$hb.last_progress_at))"
            if ($null -ne $hbAge) {
                Write-Host ("Heartbeat age (minutes): {0:N1}" -f $hbAge)
            }
            if ($hbStale) { Write-Host "Heartbeat health: STALE" } else { Write-Host "Heartbeat health: OK" }

            $evidenceLabel = switch ([string]$assessment.evidence_state) {
                "no_evidence" { "NO EVIDENCE" }
                "incomplete_evidence" { "INCOMPLETE EVIDENCE" }
                "ready_for_final_review" { "READY FOR FINAL-REVIEW" }
                default { "UNKNOWN" }
            }
            Write-Host "Completion evidence state: $evidenceLabel"
            Write-Host "Summary: $([string]$assessment.summary)"
            Write-Host "codexReview.md check: $([string]$assessment.review_reason)"
            if ($assessment.completion.valid) {
                $signal = $assessment.completion.data
                Write-Host "Signal status: $([string]$signal.status)"
                if (-not [string]::IsNullOrWhiteSpace([string]$signal.completed_at)) {
                    Write-Host "Signal completed_at: $(Format-ClockLabel -IsoValue ([string]$signal.completed_at))"
                }
                Write-Host "Signal codex_review_updated: $([bool]$signal.codex_review_updated)"
                if (@($signal.validations_attempted).Count -gt 0) {
                    Write-Host "Signal validations attempted: $(@($signal.validations_attempted) -join ', ')"
                }
            }
            elseif ($assessment.completion.exists) {
                Write-Host "Signal parse error: $([string]$assessment.completion.parse_error)"
            }

            if ([string]$assessment.evidence_state -eq "ready_for_final_review") {
                Write-Host "Next command: .\pp.ps1 codex-finish"
                Add-RunEvent -RunId $selectedRunId -RunPaths $targetPaths -State $state -RunContext $runContext -CommandName "codex-check" -Message "Codex completion evidence appears ready for codex-finish."
            }
            elseif ([string]$assessment.evidence_state -eq "incomplete_evidence") {
                Write-Host "Next command: update codexReview.md or completion signal, then rerun .\pp.ps1 codex-check"
                Add-RunEvent -RunId $selectedRunId -RunPaths $targetPaths -State $state -RunContext $runContext -CommandName "codex-check" -Level "warn" -Message "Codex completion evidence is incomplete."
            }
            else {
                Write-Host "Next command: continue Codex work, update evidence, then rerun .\pp.ps1 codex-check"
                Add-RunEvent -RunId $selectedRunId -RunPaths $targetPaths -State $state -RunContext $runContext -CommandName "codex-check" -Message "No meaningful Codex completion evidence yet."
            }
            if ($hbStale) {
                Write-Host "Recommendation: .\pp.ps1 worker-heartbeat -Step <step> -Notes <note>"
            }
            Print-RunEvents -RunId $selectedRunId -RunPaths $targetPaths -Tail 6 -RecentOnly
        }

        "codex-finish" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            $validation = $null
            try {
                $validation = Assert-CodexFinishPreconditions -State $state -RunContext $runContext -RunPaths $runPaths -RunId $runIdCurrent
            }
            catch {
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "codex-finish" -Level "warn" -Message "Codex completion consumption failed: $($_.Exception.Message)"
                throw
            }

            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "codex-finish" -Message "Codex completion evidence consumed."
            if (@($validation.warnings).Count -gt 0) {
                foreach ($w in @($validation.warnings)) {
                    Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "codex-finish" -Level "warn" -Message $w
                }
            }

            Write-Host "[pipeline-event] Codex completion evidence validated"
            Write-Host "Completion signal accepted: $($runPaths.codex_completion_path)"
            if ($validation.completion.valid) {
                $signal = $validation.completion.data
                if (-not [string]::IsNullOrWhiteSpace([string]$signal.completed_at)) {
                    Write-Host "Completion timestamp: $(Format-ClockLabel -IsoValue ([string]$signal.completed_at))"
                }
            }
            Write-Host "Codex review accepted: $($runPaths.codex_review_path)"
            if (@($validation.warnings).Count -gt 0) {
                foreach ($w in @($validation.warnings)) { Write-Host "Warning: $w" }
            }

            Invoke-PostHardeningTransition -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -FinalReviewScriptPath $finalReviewScript -CommandName "codex-finish"
        }

        "reconcile-codex-completion" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            $reconciled = Invoke-ReconcileCodexCompletionSignal -RunId $runIdCurrent -RunPaths $runPaths
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "reconcile-codex-completion" -Message "Codex completion signal reconciled from codexReview.md evidence."
            Write-Host "[pipeline-event] Codex completion signal reconciled"
            Write-Host "Completion signal updated: $($runPaths.codex_completion_path)"
            Write-Host "Run ID: $([string]$reconciled.run_id)"
            Write-Host "Status: $([string]$reconciled.status)"
            Write-Host "Next command: .\pp.ps1 codex-finish"
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 5 -RecentOnly
        }

        "runtime-start" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            $runtimeStart = Start-RuntimeValidationFlow -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext
            $state = $runtimeStart.state
            $runContext = $runtimeStart.run_context
            $playwrightResult = $runtimeStart.playwright_result

            Write-Host "[pipeline-event] runtime validation started"
            Write-Host "Runtime validation artifact: $($runPaths.runtime_validation_path)"
            if ($null -ne $playwrightResult) {
                Write-Host "Automated runtime validation status: $([string]$playwrightResult.status)"
                Write-Host "Playwright result artifact: $([string]$runPaths.runtime_validation_playwright_result_path)"
                if (-not [string]::IsNullOrWhiteSpace([string]$playwrightResult.message)) {
                    Write-Host "Automation detail: $([string]$playwrightResult.message)"
                }
                if ([string]$playwrightResult.status -eq "passed") {
                    Write-Host "Review the generated runtime-validation.md, then confirm with .\pp.ps1 runtime-done."
                }
                elseif ([string]$playwrightResult.status -eq "failed") {
                    Write-Host "Automation failed clearly. Review runtime-validation.md and runtime-validation.playwright.json, then run .\pp.ps1 runtime-fail or retry after fixing the issue."
                }
            }
            Write-Host "Next commands:"
            Write-Host "  - .\pp.ps1 runtime-done"
            Write-Host "  - .\pp.ps1 runtime-fail"
            Print-Dashboard -RunId $runIdCurrent -State $state -RunContext $runContext -RunPaths $runPaths
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 5 -RecentOnly
        }

        "runtime-done" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            if ([string]$state.status -notin @("runtime_validation_in_progress", "awaiting_runtime_validation")) {
                throw "runtime-done is only valid when runtime validation is active. Current phase/status: $($state.phase)/$($state.status)"
            }
            Assert-RuntimeValidationArtifact -State $state -RunPaths $runPaths

            $state.phase = "D"
            $state.status = "ready_for_codex"
            $state.execution_engine = "codex"
            $state.needs_repair_pass = $false
            $state.runtime_validation_completed = $true
            Write-JsonObject -Path $runPaths.state_path -Data $state
            Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{
                phase                      = "D"
                status                     = "ready_for_codex"
                execution_engine           = "codex"
                needs_repair_pass          = $false
                runtime_validation_completed = $true
                pending_action             = "ready_for_codex"
            }
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            $repoPathForHardening = "[missing]"
            if (-not [string]::IsNullOrWhiteSpace([string]$runContext.repo)) {
                $repoPathForHardening = Get-RepoPath -ReposDoc $reposDoc -RepoKey ([string]$runContext.repo)
            }
            Write-CodexHardeningPrompt -RunId $runIdCurrent -RepoPath $repoPathForHardening -State $state -RunContext $runContext -RunPaths $runPaths
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "runtime-done" -Message "Runtime validation passed."
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "runtime-done" -Message "Routed to Codex hardening."
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext

            Write-Host "[pipeline-event] runtime validation complete -> ready for codex hardening"
            Write-Host "Runtime validation artifact validated: $($runPaths.runtime_validation_path)"
            Write-Host "Next prompt: $($runPaths.codex_hardening_prompt_path)"
            Print-Dashboard -RunId $runIdCurrent -State $state -RunContext $runContext -RunPaths $runPaths
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 5 -RecentOnly
        }

        "runtime-fail" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            if ([string]$state.status -notin @("runtime_validation_in_progress", "awaiting_runtime_validation")) {
                throw "runtime-fail is only valid when runtime validation is active. Current phase/status: $($state.phase)/$($state.status)"
            }

            $repairEngine = Get-DefaultImplementationEngine -TaskType ([string]$state.task_type) -NeedsRepairPass $true
            if ([string]::IsNullOrWhiteSpace($repairEngine) -or $repairEngine -eq "none") { $repairEngine = "claude" }
            $state.phase = "C"
            $state.status = "runtime_validation_failed"
            $state.execution_engine = $repairEngine
            $state.needs_repair_pass = $true
            $state.runtime_validation_completed = $false
            Write-JsonObject -Path $runPaths.state_path -Data $state
            Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{
                phase                      = "C"
                status                     = "runtime_validation_failed"
                execution_engine           = $repairEngine
                needs_repair_pass          = $true
                runtime_validation_completed = $false
                pending_action             = "implementation_revision"
            }
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "runtime-fail" -Level "warn" -Message "Runtime validation failed."
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "runtime-fail" -Level "warn" -Message "Implementation revision required before retry."
            $null = Send-RunNotification -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -StateRef ([ref]$state) -RunContextRef ([ref]$runContext) -Severity "warn" -Reason "runtime_validation_failed" -Message "Runtime validation failed; implementation revision is required." -NextAction ".\pp.ps1 build"
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext

            Write-Host "[pipeline-event] runtime validation failed -> repair required"
            Write-Host "Update runtime-validation notes: $($runPaths.runtime_validation_path)"
            Write-Host "Next: .\pp.ps1 build"
            Print-Dashboard -RunId $runIdCurrent -State $state -RunContext $runContext -RunPaths $runPaths
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 5 -RecentOnly
        }

        "worker-start" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            $workerName = if (-not [string]::IsNullOrWhiteSpace($Worker)) { $Worker.Trim() } elseif (-not [string]::IsNullOrWhiteSpace([string]$state.execution_engine)) { [string]$state.execution_engine } else { "none" }
            $now = Get-NowIso
            $hb = [ordered]@{
                worker_name         = $workerName
                started_at          = $now
                last_progress_at    = $now
                current_attempt     = 0
                last_completed_step = if (-not [string]::IsNullOrWhiteSpace($Step)) { $Step } else { "worker-start" }
                status              = "running"
                note                = if (-not [string]::IsNullOrWhiteSpace($Notes)) { $Notes } else { "worker session started" }
                error               = ""
            }
            Write-WorkerHeartbeat -RunPaths $runPaths -Heartbeat $hb

            $state.supervisor_state = "healthy"
            $state.retry_count = 0
            $state.last_retry_at = ""
            $state.next_retry_at = ""
            $state.last_error_type = ""
            $state.last_error_message = ""
            $state.last_successful_progress_at = $now
            $state.worker_heartbeat_path = [string]$runPaths.worker_heartbeat_path
            $state.notification_state = "none"
            $state.last_notification_at = ""
            $state.last_notified_reason = ""
            Write-JsonObject -Path $runPaths.state_path -Data $state

            Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{
                supervisor_state         = "healthy"
                retry_count              = 0
                last_retry_at            = ""
                next_retry_at            = ""
                last_error_type          = ""
                last_error_message       = ""
                last_successful_progress_at = $now
                worker_heartbeat_path    = [string]$runPaths.worker_heartbeat_path
                notification_state       = "none"
                last_notification_at     = ""
                last_notified_reason     = ""
            }
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "worker-start" -Message "Worker started ($workerName)."
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "worker-start" -Message "Supervisor returned to healthy."
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext

            Write-Host "[pipeline-event] worker supervision started"
            Print-WorkerStatus -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 5 -RecentOnly
        }

        "worker-heartbeat" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            $hb = Read-WorkerHeartbeat -RunPaths $runPaths -State $state -RunContext $runContext
            $now = Get-NowIso
            if (-not [string]::IsNullOrWhiteSpace($Worker)) { $hb.worker_name = $Worker.Trim() }
            $hb.last_progress_at = $now
            if (-not [string]::IsNullOrWhiteSpace($Step)) { $hb.last_completed_step = $Step }
            $hb.status = if (-not [string]::IsNullOrWhiteSpace($WorkerStatus)) { $WorkerStatus } else { "running" }
            if (-not [string]::IsNullOrWhiteSpace($Notes)) { $hb.note = $Notes }
            $hb.error = ""
            Write-WorkerHeartbeat -RunPaths $runPaths -Heartbeat $hb

            $wasUnhealthy = ([string]$state.supervisor_state -in @("worker_retrying", "worker_degraded", "worker_blocked", "awaiting_reconnect"))
            $state.last_successful_progress_at = $now
            if ($wasUnhealthy) {
                $state.supervisor_state = "healthy"
                $state.next_retry_at = ""
                $state.last_error_type = ""
                $state.last_error_message = ""
                $state.notification_state = "none"
                $state.last_notification_at = ""
                $state.last_notified_reason = ""
            }
            $state.worker_heartbeat_path = [string]$runPaths.worker_heartbeat_path
            Write-JsonObject -Path $runPaths.state_path -Data $state
            Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{
                supervisor_state            = [string]$state.supervisor_state
                next_retry_at               = [string]$state.next_retry_at
                last_error_type             = [string]$state.last_error_type
                last_error_message          = [string]$state.last_error_message
                last_successful_progress_at = $now
                worker_heartbeat_path       = [string]$runPaths.worker_heartbeat_path
                notification_state          = [string]$state.notification_state
                last_notification_at        = [string]$state.last_notification_at
                last_notified_reason        = [string]$state.last_notified_reason
            }
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "worker-heartbeat" -Message "Worker heartbeat updated."
            if ($wasUnhealthy) {
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "worker-heartbeat" -Message "Recovery detected; supervisor returned healthy."
                $null = Send-RunNotification -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -StateRef ([ref]$state) -RunContextRef ([ref]$runContext) -Severity "info" -Reason "worker_recovered_healthy" -Message "Worker recovered and supervisor returned to healthy." -NextAction ".\pp.ps1 resume"
            }
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext

            Write-Host "[pipeline-event] worker heartbeat recorded"
            Print-WorkerStatus -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 5 -RecentOnly
        }

        "worker-retry" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            $retryCount = [int]$state.retry_count + 1
            $delay = Get-WorkerRetryDelaySeconds -Attempt $retryCount
            $nowUtc = Get-NowUtc
            $nextUtc = $nowUtc.AddSeconds($delay)
            $supervisorState = Get-SupervisorStateForRetryCount -RetryCount $retryCount -Retryable $true
            $notificationState = if ($supervisorState -eq "worker_blocked") { "intervention_required" } elseif ($supervisorState -eq "worker_degraded") { "notify_recommended" } else { "none" }

            $state.retry_count = $retryCount
            $state.last_retry_at = Get-IsoOrEmpty -Value $nowUtc
            $state.next_retry_at = Get-IsoOrEmpty -Value $nextUtc
            $state.supervisor_state = $supervisorState
            $state.notification_state = $notificationState
            if ($notificationState -eq "none") { $state.last_notified_reason = "" }
            $state.worker_heartbeat_path = [string]$runPaths.worker_heartbeat_path
            Write-JsonObject -Path $runPaths.state_path -Data $state

            Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{
                supervisor_state      = $supervisorState
                retry_count           = [int]$retryCount
                last_retry_at         = [string]$state.last_retry_at
                next_retry_at         = [string]$state.next_retry_at
                notification_state    = $notificationState
                last_notification_at  = [string]$state.last_notification_at
                last_notified_reason  = [string]$state.last_notified_reason
                worker_heartbeat_path = [string]$runPaths.worker_heartbeat_path
            }
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            $level = if ($supervisorState -eq "worker_blocked") { "warn" } elseif ($supervisorState -eq "worker_degraded") { "warn" } else { "info" }
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "worker-retry" -Level $level -Message "Worker retry scheduled (attempt $retryCount, delay ${delay}s)."
            if ($supervisorState -eq "worker_degraded") {
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "worker-retry" -Level "warn" -Message "Supervisor entered worker_degraded."
                $null = Send-RunNotification -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -StateRef ([ref]$state) -RunContextRef ([ref]$runContext) -Severity "warn" -Reason "worker_degraded_entered" -Message "Worker entered degraded mode after repeated retries." -NextAction ".\pp.ps1 worker-status"
            }
            if ($supervisorState -eq "worker_blocked") {
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "worker-retry" -Level "warn" -Message "Supervisor entered worker_blocked."
                $null = Send-RunNotification -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -StateRef ([ref]$state) -RunContextRef ([ref]$runContext) -Severity "error" -Reason "worker_blocked_entered" -Message "Worker entered blocked state. Human intervention is required." -NextAction ".\pp.ps1 worker-start"
            }
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext

            Write-Host "[pipeline-event] worker retry scheduled"
            Print-WorkerStatus -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 5 -RecentOnly
        }

        "worker-fail" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            $failureType = if ([string]::IsNullOrWhiteSpace($ErrorType)) { "unknown" } else { $ErrorType }
            $failureMessage = if ([string]::IsNullOrWhiteSpace($ErrorMessage)) { "worker failure recorded" } else { $ErrorMessage.Trim() }
            $retryable = Test-RetryableFailureType -FailureType $failureType
            $retryCount = [int]$state.retry_count + 1
            $delay = Get-WorkerRetryDelaySeconds -Attempt $retryCount
            $nowUtc = Get-NowUtc
            $nextUtc = $nowUtc.AddSeconds($delay)
            $supervisorState = Get-SupervisorStateForRetryCount -RetryCount $retryCount -Retryable $retryable
            $notificationState = if ($supervisorState -eq "worker_blocked") { "intervention_required" } elseif ($supervisorState -eq "worker_degraded") { "notify_recommended" } else { "none" }

            $hb = Read-WorkerHeartbeat -RunPaths $runPaths -State $state -RunContext $runContext
            $hb.current_attempt = $retryCount
            $hb.status = "failed"
            if (-not [string]::IsNullOrWhiteSpace($Step)) { $hb.last_completed_step = $Step }
            if (-not [string]::IsNullOrWhiteSpace($Notes)) { $hb.note = $Notes }
            $hb.error = "${failureType}: $failureMessage"
            Write-WorkerHeartbeat -RunPaths $runPaths -Heartbeat $hb

            $state.supervisor_state = $supervisorState
            $state.retry_count = $retryCount
            $state.last_retry_at = Get-IsoOrEmpty -Value $nowUtc
            $state.next_retry_at = if ($supervisorState -eq "worker_blocked" -and -not $retryable) { "" } else { Get-IsoOrEmpty -Value $nextUtc }
            $state.last_error_type = $failureType
            $state.last_error_message = $failureMessage
            $state.worker_heartbeat_path = [string]$runPaths.worker_heartbeat_path
            $state.notification_state = $notificationState
            if ($notificationState -eq "none") { $state.last_notified_reason = "" }
            Write-JsonObject -Path $runPaths.state_path -Data $state

            Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{
                supervisor_state      = $supervisorState
                retry_count           = [int]$retryCount
                last_retry_at         = [string]$state.last_retry_at
                next_retry_at         = [string]$state.next_retry_at
                last_error_type       = $failureType
                last_error_message    = $failureMessage
                worker_heartbeat_path = [string]$runPaths.worker_heartbeat_path
                notification_state    = $notificationState
                last_notification_at  = [string]$state.last_notification_at
                last_notified_reason  = [string]$state.last_notified_reason
            }
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "worker-fail" -Level "warn" -Message "Worker failure recorded: $failureType - $failureMessage"
            if ($supervisorState -eq "worker_retrying") {
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "worker-fail" -Level "warn" -Message "Retry scheduled (attempt $retryCount, delay ${delay}s)."
            }
            elseif ($supervisorState -eq "worker_degraded") {
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "worker-fail" -Level "warn" -Message "Supervisor entered worker_degraded."
                $null = Send-RunNotification -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -StateRef ([ref]$state) -RunContextRef ([ref]$runContext) -Severity "warn" -Reason "worker_degraded_entered" -Message "Worker entered degraded mode after failure escalation." -NextAction ".\pp.ps1 worker-status"
            }
            else {
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "worker-fail" -Level "warn" -Message "Supervisor entered worker_blocked."
                $null = Send-RunNotification -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -StateRef ([ref]$state) -RunContextRef ([ref]$runContext) -Severity "error" -Reason "worker_blocked_entered" -Message "Worker entered blocked state after failure escalation." -NextAction ".\pp.ps1 worker-start"
            }
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext

            Write-Host "[pipeline-event] worker failure captured"
            Print-WorkerStatus -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 5 -RecentOnly
        }

        "worker-status" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            Print-WorkerStatus -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 5 -RecentOnly
        }

        "scheduler-status" {
            $status = Get-SchedulerLoopLockStatus -WorkspaceRoot $workspaceRoot
            if ($Json.IsPresent) {
                $status | ConvertTo-Json -Depth 10
                break
            }
            Write-Host "Scheduler Status"
            Write-Host "Lock path: $([string]$status.lock_path)"
            Write-Host "Lock exists: $([bool]$status.exists)"
            Write-Host "Status: $([string]$status.status)"
            Write-Host "Detail: $([string]$status.detail)"
            Write-Host "Stale threshold (seconds): $([int]$status.stale_threshold_seconds)"
            if ([bool]$status.exists -and [bool]$status.valid) {
                Write-Host "Created at: $(Format-ClockLabel -IsoValue ([string]$status.created_at))"
                Write-Host "Started at: $(Format-ClockLabel -IsoValue ([string]$status.started_at))"
                Write-Host "PID: $([string]$status.pid)"
                if ($null -ne $status.pid_alive) {
                    Write-Host "PID alive: $([bool]$status.pid_alive)"
                }
                Write-Host "Scope: $([string]$status.scope)"
                if (-not [string]::IsNullOrWhiteSpace([string]$status.run_id)) {
                    Write-Host "RunId: $([string]$status.run_id)"
                }
                Write-Host "AllRuns: $([bool]$status.all_runs)"
                Write-Host "IntervalSeconds: $([int]$status.interval_seconds)"
                Write-Host "MaxCycles: $([int]$status.max_cycles)"
                Write-Host "MaxMinutes: $([int]$status.max_minutes)"
                Write-Host "Consume completions: $([bool]$status.consume_completions)"
                Write-Host "Dry run: $([bool]$status.dry_run)"
                Write-Host "Last heartbeat: $(Format-ClockLabel -IsoValue ([string]$status.last_heartbeat_at))"
                Write-Host "Last cycle started: $(Format-ClockLabel -IsoValue ([string]$status.last_cycle_started_at))"
                Write-Host "Last cycle completed: $(Format-ClockLabel -IsoValue ([string]$status.last_cycle_completed_at))"
                if ($null -ne $status.age_seconds) {
                    Write-Host "Lock age (seconds): $([int]$status.age_seconds)"
                }
                if ($null -ne $status.heartbeat_age_seconds) {
                    Write-Host "Heartbeat age (seconds): $([int]$status.heartbeat_age_seconds)"
                }
            }
            elseif ([bool]$status.exists -and -not [bool]$status.valid) {
                Write-Host "Parse error: $([string]$status.parse_error)"
            }
        }

        "scheduler-unlock" {
            $status = Get-SchedulerLoopLockStatus -WorkspaceRoot $workspaceRoot
            if (-not [bool]$status.exists) {
                Write-Host "No scheduler lock present."
                break
            }
            $isSafeRemovable = ([string]$status.status -in @("stale", "invalid"))
            if ($Force.IsPresent) {
                Move-Item -LiteralPath ([string]$status.lock_path) -Destination ("{0}.removed.{1}.json" -f [string]$status.lock_path, (Get-Date).ToString("yyyyMMddHHmmss")) -Force
                Write-Host "Scheduler lock removed with -Force."
                break
            }
            if (-not $isSafeRemovable) {
                throw "Refusing to unlock healthy active scheduler lock. Run '.\pp.ps1 scheduler-status' or use '.\pp.ps1 scheduler-unlock -Force'."
            }
            if ($IfStale.IsPresent -or $isSafeRemovable) {
                Move-Item -LiteralPath ([string]$status.lock_path) -Destination ("{0}.removed.{1}.json" -f [string]$status.lock_path, (Get-Date).ToString("yyyyMMddHHmmss")) -Force
                Write-Host "Scheduler lock removed ($([string]$status.status))."
            }
        }

        "service-start" {
            if (-not (Test-Path -LiteralPath $serviceHostScript)) {
                throw "Missing service host script: $serviceHostScript"
            }
            $serviceArgs = @{}
            $serviceArgs["WorkspaceRoot"] = $workspaceRoot
            if (-not [string]::IsNullOrWhiteSpace($RunId)) { $serviceArgs["RunId"] = $RunId }
            if ($AllRuns.IsPresent) { $serviceArgs["AllRuns"] = $true }
            if ($ConsumeCompletions.IsPresent) { $serviceArgs["ConsumeCompletions"] = $true }
            if ($DryRun.IsPresent) { $serviceArgs["DryRun"] = $true }
            if ($PSBoundParameters.ContainsKey("IntervalSeconds")) { $serviceArgs["IntervalSeconds"] = $IntervalSeconds }
            if ($PSBoundParameters.ContainsKey("MaxCycles")) { $serviceArgs["MaxCycles"] = $MaxCycles }
            if ($PSBoundParameters.ContainsKey("MaxMinutes")) { $serviceArgs["MaxMinutes"] = $MaxMinutes }
            & $serviceHostScript @serviceArgs
            if ($LASTEXITCODE -ne 0) {
                throw "service-start host returned exit code $LASTEXITCODE"
            }
        }

        "service-status" {
            $status = Get-SchedulerLoopLockStatus -WorkspaceRoot $workspaceRoot
            $logsRoot = Join-Path $workspaceRoot "logs"
            $hostLogPath = Join-Path $logsRoot "pipeline-service.log"
            $hostStatePath = Join-Path $logsRoot "pipeline-service.state.json"
            $effectiveHostLogPath = $hostLogPath
            Write-Host "Service Host Status"
            Write-Host "Default host log path: $hostLogPath"
            Write-Host "Default host log exists: $([bool](Test-Path -LiteralPath $hostLogPath))"
            if (Test-Path -LiteralPath $hostStatePath) {
                Write-Host "Host state file: $hostStatePath"
                try {
                    $stateDoc = Read-JsonObject -Path $hostStatePath
                    Write-Host "Host state started_at: $(Format-ClockLabel -IsoValue ([string]$stateDoc.started_at))"
                    Write-Host "Host state last_update_at: $(Format-ClockLabel -IsoValue ([string]$stateDoc.last_update_at))"
                    Write-Host "Host state status: $([string]$stateDoc.status)"
                    Write-Host "Host state scope: $([string]$stateDoc.scope)"
                    if (-not [string]::IsNullOrWhiteSpace([string]$stateDoc.log_path)) {
                        $effectiveHostLogPath = [string]$stateDoc.log_path
                    }
                }
                catch {
                    Write-Host "Host state parse error: $($_.Exception.Message)"
                }
            }
            else {
                Write-Host "Host state file: [not present]"
            }
            Write-Host "Effective host log path: $effectiveHostLogPath"
            Write-Host "Effective host log exists: $([bool](Test-Path -LiteralPath $effectiveHostLogPath))"
            Write-Host ""
            Write-Host "Scheduler lock health:"
            Write-Host "  - lock exists: $([bool]$status.exists)"
            Write-Host "  - status: $([string]$status.status)"
            Write-Host "  - detail: $([string]$status.detail)"
            if ([bool]$status.exists -and [bool]$status.valid) {
                Write-Host "  - scope: $([string]$status.scope)"
                Write-Host "  - run_id: $([string]$status.run_id)"
                Write-Host "  - all_runs: $([bool]$status.all_runs)"
                Write-Host "  - heartbeat age seconds: $([string]$status.heartbeat_age_seconds)"
            }
            if (Test-Path -LiteralPath $effectiveHostLogPath) {
                Write-Host ""
                Write-Host "Recent host log lines:"
                Get-Content -LiteralPath $effectiveHostLogPath -Tail 10 | ForEach-Object { Write-Host "  $_" }
            }
        }

        "scheduler-run" {
            $targets = Get-SchedulerTargets -WorkspaceRoot $workspaceRoot -RunId $RunId -AllRuns:$AllRuns
            $nowUtc = [DateTime]::UtcNow
            $inspected = 0
            $acted = 0
            $consumeActed = 0
            $skipped = 0
            $consumeSkipped = 0
            $failures = 0
            $consumeFailures = 0
            $dryRunActions = 0
            $consumeDryRun = 0
            $skipReasonCounts = @{}
            $consumeSkipReasonCounts = @{}

            Write-Host "Scheduler Cycle"
            Write-Host "Mode: $(if ($DryRun.IsPresent) { 'DRY-RUN' } else { 'EXECUTE' })"
            Write-Host "Scope: $(if (-not [string]::IsNullOrWhiteSpace($RunId)) { "run:$RunId" } elseif ($AllRuns.IsPresent) { "all-runs" } else { "active-run" })"
            Write-Host "Consume completions: $([bool]$ConsumeCompletions.IsPresent)"
            Write-Host "Cycle timestamp (UTC): $($nowUtc.ToString('o'))"

            foreach ($target in @($targets)) {
                $rid = [string]$target.run_id
                $paths = $target.paths
                $inspected++
                $normalized = Normalize-RunStateAndContext -StatePath $paths.state_path -RunContextPath $paths.run_context_path
                $state = $normalized.state
                $runContext = $normalized.run_context

                Add-RunEvent -RunId $rid -RunPaths $paths -State $state -RunContext $runContext -CommandName "scheduler-run" -Message "Scheduler cycle inspected run."
                if ($ConsumeCompletions.IsPresent) {
                    $continueFlow = Invoke-ContinueAutomationForRun -WorkspaceRoot $workspaceRoot -PipelineScriptPath $PSCommandPath -RunId $rid -RunPaths $paths -DryRun:$DryRun -CommandName "scheduler-run"
                    if ([string]$continueFlow.outcome -eq "acted") {
                        $consumeActed++
                        $acted++
                        $actionsLabel = if (@($continueFlow.actions).Count -gt 0) { @($continueFlow.actions) -join " -> " } else { "continuation actions" }
                        Write-Host "[$rid] ACT: continued automation via '$actionsLabel'"
                        continue
                    }
                    if ([string]$continueFlow.outcome -eq "dry_run") {
                        $consumeDryRun++
                        $dryRunActions++
                        Write-Host "[$rid] DRY-RUN: would continue automation via '$([string]$continueFlow.action)'"
                        continue
                    }
                    if ([string]$continueFlow.outcome -eq "failed") {
                        $consumeFailures++
                        $failures++
                        Write-Host "[$rid] FAIL: automation continuation -> $([string]$continueFlow.detail)"
                        continue
                    }
                    $consumeSkipped++
                    $consumeReason = [string]$continueFlow.reason
                    if (-not $consumeSkipReasonCounts.ContainsKey($consumeReason)) { $consumeSkipReasonCounts[$consumeReason] = 0 }
                    $consumeSkipReasonCounts[$consumeReason] = [int]$consumeSkipReasonCounts[$consumeReason] + 1
                    Write-Host "[$rid] AUTO-CONTINUE SKIP: $([string]$continueFlow.detail)"
                    $normalized = Normalize-RunStateAndContext -StatePath $paths.state_path -RunContextPath $paths.run_context_path
                    $state = $normalized.state
                    $runContext = $normalized.run_context
                }

                $decision = Get-SchedulerEligibilityDecision -State $state -RunContext $runContext -NowUtc $nowUtc
                if (-not [bool]$decision.eligible) {
                    $skipped++
                    $reasonKey = [string]$decision.reason
                    if (-not $skipReasonCounts.ContainsKey($reasonKey)) { $skipReasonCounts[$reasonKey] = 0 }
                    $skipReasonCounts[$reasonKey] = [int]$skipReasonCounts[$reasonKey] + 1
                    Add-RunEvent -RunId $rid -RunPaths $paths -State $state -RunContext $runContext -CommandName "scheduler-run" -Message "Scheduler skipped run: $([string]$decision.detail)"
                    Write-Host "[$rid] SKIP: $([string]$decision.detail)"
                    continue
                }

                $action = [string]$decision.action
                if ($DryRun.IsPresent) {
                    $dryRunActions++
                    Add-RunEvent -RunId $rid -RunPaths $paths -State $state -RunContext $runContext -CommandName "scheduler-run" -Message "Scheduler dry-run: would run '$action' (retry overdue by $([int]$decision.overdue_seconds)s)."
                    Write-Host "[$rid] DRY-RUN: would execute '$action' (overdue $([int]$decision.overdue_seconds)s)"
                    continue
                }

                try {
                    Add-RunEvent -RunId $rid -RunPaths $paths -State $state -RunContext $runContext -CommandName "scheduler-run" -Message "Retry due; scheduler attempting '$action'."
                    Invoke-SchedulerDelegatedCommand -WorkspaceRoot $workspaceRoot -PipelineScriptPath $PSCommandPath -RunId $rid -DelegatedCommand $action
                    $acted++
                    $post = Normalize-RunStateAndContext -StatePath $paths.state_path -RunContextPath $paths.run_context_path
                    Add-RunEvent -RunId $rid -RunPaths $paths -State $post.state -RunContext $post.run_context -CommandName "scheduler-run" -Message "Scheduler action '$action' completed."
                    Write-Host "[$rid] ACT: executed '$action'"
                }
                catch {
                    $failures++
                    $postState = Read-JsonObject -Path $paths.state_path
                    $postCtx = Read-JsonObject -Path $paths.run_context_path
                    Add-RunEvent -RunId $rid -RunPaths $paths -State $postState -RunContext $postCtx -CommandName "scheduler-run" -Level "warn" -Message "Scheduler action '$action' failed: $($_.Exception.Message)"
                    Write-Host "[$rid] FAIL: '$action' -> $($_.Exception.Message)"
                }
            }

            Write-Host "Scheduler Summary"
            Write-Host "Runs inspected: $inspected"
            Write-Host "Runs acted on: $acted"
            if ($ConsumeCompletions.IsPresent) {
                Write-Host "Completion auto-consume actions: $consumeActed"
            }
            Write-Host "Runs skipped: $skipped"
            if ($ConsumeCompletions.IsPresent) {
                Write-Host "Completion auto-consume skips: $consumeSkipped"
            }
            Write-Host "Scheduler action failures: $failures"
            if ($ConsumeCompletions.IsPresent) {
                Write-Host "Completion auto-consume failures: $consumeFailures"
            }
            if ($DryRun.IsPresent) { Write-Host "Dry-run actions: $dryRunActions" }
            if ($skipReasonCounts.Keys.Count -gt 0) {
                Write-Host "Skip reasons:"
                foreach ($k in @($skipReasonCounts.Keys | Sort-Object)) {
                    Write-Host "  - ${k}: $([int]$skipReasonCounts[$k])"
                }
            }
            if ($ConsumeCompletions.IsPresent -and $consumeSkipReasonCounts.Keys.Count -gt 0) {
                Write-Host "Auto-consume skip reasons:"
                foreach ($k in @($consumeSkipReasonCounts.Keys | Sort-Object)) {
                    Write-Host "  - ${k}: $([int]$consumeSkipReasonCounts[$k])"
                }
            }
        }

        "scheduler-loop" {
            if ($AllRuns.IsPresent -and -not [string]::IsNullOrWhiteSpace($RunId)) {
                throw "scheduler-loop cannot combine -AllRuns and -RunId."
            }

            $scopeLabel = if (-not [string]::IsNullOrWhiteSpace($RunId)) {
                "run:$RunId"
            }
            elseif ($AllRuns.IsPresent) {
                "all-runs"
            }
            else {
                "active-run"
            }
            $singleRunMode = -not $AllRuns.IsPresent
            $monitorRunId = $null
            $monitorPaths = $null
            $monitorState = $null
            $monitorContext = $null
            if ($singleRunMode) {
                $targets = Get-SchedulerTargets -WorkspaceRoot $workspaceRoot -RunId $RunId -AllRuns:$false
                $targetList = @($targets)
                if ($targetList.Count -lt 1) { throw "No run resolved for scheduler-loop scope '$scopeLabel'." }
                $monitorRunId = [string]$targetList[0].run_id
                $monitorPaths = $targetList[0].paths
                $normalized = Normalize-RunStateAndContext -StatePath $monitorPaths.state_path -RunContextPath $monitorPaths.run_context_path
                $monitorState = $normalized.state
                $monitorContext = $normalized.run_context
            }

            $lockPath = $null
            $hadError = $false
            $stopReason = ""
            $cyclesExecuted = 0
            $startedUtc = [DateTime]::UtcNow
            $lastCycleAt = ""
            $lastCycleResult = "none"

            try {
                $lockPath = Acquire-SchedulerLoopLock -WorkspaceRoot $workspaceRoot -Scope $scopeLabel -RunId $RunId -AllRuns:$AllRuns.IsPresent -IntervalSeconds $IntervalSeconds -MaxCycles $MaxCycles -MaxMinutes $MaxMinutes -ConsumeCompletions:$ConsumeCompletions.IsPresent -DryRun:$DryRun.IsPresent
                Write-Host "Scheduler Loop"
                Write-Host "Scope: $scopeLabel"
                Write-Host "IntervalSeconds: $IntervalSeconds"
                Write-Host "MaxCycles: $(if ($MaxCycles -gt 0) { $MaxCycles } else { 'unbounded' })"
                Write-Host "MaxMinutes: $(if ($MaxMinutes -gt 0) { $MaxMinutes } else { 'unbounded' })"
                Write-Host "Consume completions: $([bool]$ConsumeCompletions.IsPresent)"
                Write-Host "Dry run: $([bool]$DryRun.IsPresent)"
                Write-Host "Loop lock: $lockPath"

                if ($singleRunMode) {
                    Add-RunEvent -RunId $monitorRunId -RunPaths $monitorPaths -State $monitorState -RunContext $monitorContext -CommandName "scheduler-loop" -Message "Scheduler loop started (scope=$scopeLabel, interval=${IntervalSeconds}s, consume=$([bool]$ConsumeCompletions.IsPresent), dry_run=$([bool]$DryRun.IsPresent))."
                }

                while ($true) {
                    $elapsedMinutes = ([DateTime]::UtcNow - $startedUtc).TotalMinutes
                    if ($MaxCycles -gt 0 -and $cyclesExecuted -ge $MaxCycles) {
                        $stopReason = "max_cycles_reached"
                        break
                    }
                    if ($MaxMinutes -gt 0 -and $elapsedMinutes -ge $MaxMinutes) {
                        $stopReason = "max_minutes_reached"
                        break
                    }

                    $nextCycle = $cyclesExecuted + 1
                    if ($singleRunMode) {
                        $normalized = Normalize-RunStateAndContext -StatePath $monitorPaths.state_path -RunContextPath $monitorPaths.run_context_path
                        $monitorState = $normalized.state
                        $monitorContext = $normalized.run_context
                        Add-RunEvent -RunId $monitorRunId -RunPaths $monitorPaths -State $monitorState -RunContext $monitorContext -CommandName "scheduler-loop" -Message "Scheduler loop cycle $nextCycle started."
                    }
                    Write-Host "[loop] cycle $nextCycle start ($(Get-NowIso))"
                    Update-SchedulerLoopLockHeartbeat -WorkspaceRoot $workspaceRoot -CycleNumber $nextCycle -CycleStarted

                    $cycleInvoke = @{
                        Command = "scheduler-run"
                    }
                    if (-not [string]::IsNullOrWhiteSpace($RunId)) {
                        $cycleInvoke["RunId"] = $RunId
                    }
                    elseif ($AllRuns.IsPresent) {
                        $cycleInvoke["AllRuns"] = $true
                    }
                    if ($DryRun.IsPresent) { $cycleInvoke["DryRun"] = $true }
                    if ($ConsumeCompletions.IsPresent) { $cycleInvoke["ConsumeCompletions"] = $true }

                    & $PSCommandPath @cycleInvoke
                    if ($LASTEXITCODE -ne 0) {
                        $hadError = $true
                        $stopReason = "scheduler_cycle_failed"
                        $lastCycleResult = "failed"
                        break
                    }

                    $cyclesExecuted = $nextCycle
                    $lastCycleAt = Get-NowIso
                    $lastCycleResult = "completed"
                    Update-SchedulerLoopLockHeartbeat -WorkspaceRoot $workspaceRoot -CycleNumber $cyclesExecuted -CycleCompleted
                    Write-Host "[loop] cycle $cyclesExecuted complete"

                    if ($singleRunMode) {
                        $normalized = Normalize-RunStateAndContext -StatePath $monitorPaths.state_path -RunContextPath $monitorPaths.run_context_path
                        $monitorState = $normalized.state
                        $monitorContext = $normalized.run_context
                        Add-RunEvent -RunId $monitorRunId -RunPaths $monitorPaths -State $monitorState -RunContext $monitorContext -CommandName "scheduler-loop" -Message "Scheduler loop cycle $cyclesExecuted completed."

                        $statusNow = [string]$monitorState.status
                        $supervisorNow = [string]$monitorState.supervisor_state
                        if (Test-HumanGateStatus -Status $statusNow) {
                            $stopReason = "human_gate_reached:$statusNow"
                            break
                        }
                        if ($supervisorNow -eq "worker_blocked") {
                            $stopReason = "worker_blocked"
                            break
                        }
                    }

                    $elapsedMinutes = ([DateTime]::UtcNow - $startedUtc).TotalMinutes
                    if (($MaxCycles -gt 0 -and $cyclesExecuted -ge $MaxCycles) -or ($MaxMinutes -gt 0 -and $elapsedMinutes -ge $MaxMinutes)) {
                        continue
                    }
                    Start-Sleep -Seconds $IntervalSeconds
                }
            }
            catch [System.Management.Automation.PipelineStoppedException] {
                $stopReason = "interrupted"
                $lastCycleResult = "interrupted"
            }
            catch {
                $hadError = $true
                if ([string]::IsNullOrWhiteSpace($stopReason)) { $stopReason = "error:$($_.Exception.Message)" }
                $lastCycleResult = "failed"
            }
            finally {
                if ($singleRunMode -and $null -ne $monitorPaths -and (Test-Path -LiteralPath $monitorPaths.state_path) -and (Test-Path -LiteralPath $monitorPaths.run_context_path)) {
                    $normalized = Normalize-RunStateAndContext -StatePath $monitorPaths.state_path -RunContextPath $monitorPaths.run_context_path
                    $monitorState = $normalized.state
                    $monitorContext = $normalized.run_context
                    $level = if ($hadError) { "warn" } else { "info" }
                    Add-RunEvent -RunId $monitorRunId -RunPaths $monitorPaths -State $monitorState -RunContext $monitorContext -CommandName "scheduler-loop" -Level $level -Message "Scheduler loop ended (cycles=$cyclesExecuted, stop_reason='$stopReason')."
                    Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $monitorRunId -State $monitorState -RunContext $monitorContext
                }
                if (-not [string]::IsNullOrWhiteSpace($lockPath)) {
                    Release-SchedulerLoopLock -WorkspaceRoot $workspaceRoot
                }
                $elapsedSeconds = [int][Math]::Floor((([DateTime]::UtcNow - $startedUtc).TotalSeconds))
                Write-Host "Scheduler Loop Summary"
                Write-Host "Scope: $scopeLabel"
                Write-Host "Cycles executed: $cyclesExecuted"
                Write-Host "Elapsed seconds: $elapsedSeconds"
                Write-Host "Last cycle at: $(if ([string]::IsNullOrWhiteSpace($lastCycleAt)) { '[none]' } else { $lastCycleAt })"
                Write-Host "Last cycle result: $lastCycleResult"
                Write-Host "Stop reason: $stopReason"
                Write-Host "Lock released: $(if ([string]::IsNullOrWhiteSpace($lockPath)) { '[none]' } else { $lockPath })"
            }

            if ($hadError) {
                throw "scheduler-loop ended with errors (reason: $stopReason)"
            }
        }

        "auto-consume" {
            $targets = Get-SchedulerTargets -WorkspaceRoot $workspaceRoot -RunId $RunId -AllRuns:$false
            $targetList = @($targets)
            if ($targetList.Count -lt 1) { throw "No run resolved for auto-consume." }
            $target = $targetList[0]
            $rid = [string]$target.run_id
            $paths = $target.paths
            $normalized = Normalize-RunStateAndContext -StatePath $paths.state_path -RunContextPath $paths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            $result = Invoke-AutoConsumeForRun -WorkspaceRoot $workspaceRoot -PipelineScriptPath $PSCommandPath -RunId $rid -RunPaths $paths -State $state -RunContext $runContext -DryRun:$DryRun -CommandName "auto-consume"
            $post = Normalize-RunStateAndContext -StatePath $paths.state_path -RunContextPath $paths.run_context_path
            $postState = $post.state
            $postContext = $post.run_context
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $rid -State $postState -RunContext $postContext

            Write-Host "Auto-Consume"
            Write-Host "Run: $rid"
            Write-Host "Mode: $(if ($DryRun.IsPresent) { 'DRY-RUN' } else { 'EXECUTE' })"
            Write-Host "Outcome: $([string]$result.outcome)"
            if (-not [string]::IsNullOrWhiteSpace([string]$result.action)) {
                Write-Host "Action: $([string]$result.action)"
            }
            Write-Host "Reason: $([string]$result.reason)"
            Write-Host "Detail: $([string]$result.detail)"

            if ([string]$result.outcome -eq "acted") {
                Write-Host "Transition applied via authoritative finish command."
                Print-Dashboard -RunId $rid -State $postState -RunContext $postContext -RunPaths $paths
            }
            elseif ([string]$result.outcome -eq "failed") {
                Print-RunEvents -RunId $rid -RunPaths $paths -Tail 8 -RecentOnly
                throw "auto-consume failed: $([string]$result.detail)"
            }
            else {
                Write-Host "No state transition applied."
            }
            Print-RunEvents -RunId $rid -RunPaths $paths -Tail 8 -RecentOnly
        }

        "notify-test" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            $cfg = Get-NotificationConfig -WorkspaceRoot $workspaceRoot
            Write-Host "Notification Test"
            Write-Host "Config source: $([string]$cfg.source)"
            Write-Host "Enabled: $([bool]$cfg.enabled)"
            Write-Host "Mode: $([string]$cfg.mode)"
            if (-not [string]::IsNullOrWhiteSpace([string]$cfg.target)) {
                Write-Host "Target: $([string]$cfg.target)"
            }
            if ($null -ne $cfg["webhook_timeout_seconds"]) {
                Write-Host "Webhook timeout (seconds): $([int]$cfg.webhook_timeout_seconds)"
            }
            $sent = Send-RunNotification -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -StateRef ([ref]$state) -RunContextRef ([ref]$runContext) -Severity "info" -Reason "notify_test" -Message "Pipeline notification test for run $runIdCurrent." -NextAction ".\pp.ps1 resume" -Force
            if ($sent) {
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "notify-test" -Message "Notification test emitted."
                Write-Host "Notification emitted successfully."
            }
            else {
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "notify-test" -Level "warn" -Message "Notification test suppressed (notifications disabled or invalid mode)."
                Write-Host "Notification suppressed (notifications disabled or mode none)."
            }
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 5 -RecentOnly
        }

        "approve" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            if (-not [bool]$state.requires_visual_approval) { throw "approve is only valid when requires_visual_approval=true." }
            $requiresRuntimeValidation = [bool]$state.requires_runtime_validation -or [bool]$runContext.requires_runtime_validation

            & $approveVisualScript -RunRoot $runPaths.run_root

            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            $playwrightResult = $null

            if (-not $requiresRuntimeValidation) {
                $nextStatus = "ready_for_codex"
                $nextPhase = "D"
                $nextEngine = "codex"
                Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{
                    execution_engine             = $nextEngine
                    needs_repair_pass           = $false
                    requires_runtime_validation = [bool]$requiresRuntimeValidation
                    runtime_validation_completed = $true
                    phase                       = $nextPhase
                    status                      = $nextStatus
                    pending_action              = "ready_for_codex"
                }
                $state.phase = $nextPhase
                $state.status = $nextStatus
                $state.execution_engine = $nextEngine
                $state.runtime_validation_completed = $true
                Write-JsonObject -Path $runPaths.state_path -Data $state
                $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
                $state = $normalized.state
                $runContext = $normalized.run_context
                $repoPathForHardening = "[missing]"
                if (-not [string]::IsNullOrWhiteSpace([string]$runContext.repo)) {
                    $repoPathForHardening = Get-RepoPath -ReposDoc $reposDoc -RepoKey ([string]$runContext.repo)
                }
                Write-CodexHardeningPrompt -RunId $runIdCurrent -RepoPath $repoPathForHardening -State $state -RunContext $runContext -RunPaths $runPaths
            }
            else {
                $runtimeStart = Start-RuntimeValidationFlow -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext
                $state = $runtimeStart.state
                $runContext = $runtimeStart.run_context
                $playwrightResult = $runtimeStart.playwright_result
            }

            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "approve" -Message "Visual approval granted."
            if (-not $requiresRuntimeValidation) {
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "approve" -Message "Runtime validation not required; routed to Codex hardening."
            }
            else {
                if ($null -ne $playwrightResult) {
                    Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "approve" -Message "Runtime validation started automatically after visual approval."
                }
                else {
                    Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "approve" -Message "Runtime validation started after visual approval."
                }
                $null = Send-RunNotification -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -StateRef ([ref]$state) -RunContextRef ([ref]$runContext) -Severity "info" -Reason "runtime_validation_started" -Message "Visual approval completed. Runtime validation started." -NextAction ".\pp.ps1 runtime-done"
            }
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext
            Print-Dashboard -RunId $runIdCurrent -State $state -RunContext $runContext -RunPaths $runPaths
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 4 -RecentOnly
        }

        "revise" {
            if ([string]::IsNullOrWhiteSpace($Type)) { throw "revise requires -Type implementation|spec." }
            if ([string]::IsNullOrWhiteSpace($Notes)) { throw "revise requires -Notes." }
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths

            & $requestRevisionScript -Type $Type -Notes $Notes -RunRoot $runPaths.run_root

            $state = Read-JsonObject -Path $runPaths.state_path
            $runContext = Read-JsonObject -Path $runPaths.run_context_path
            $pending = if ($Type -eq "implementation") { "implementation_repair_pass" } else { "spec_revision_required" }
            Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{
                task_type         = [string]$state.task_type
                execution_engine  = [string]$state.execution_engine
                needs_repair_pass = [bool]$state.needs_repair_pass
                ui_changed        = [bool]$state.ui_changed
                phase             = [string]$state.phase
                status            = [string]$state.status
                pending_action    = $pending
            }
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            if ($Type -eq "implementation") {
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "revise" -Message "Revised for repair pass."
                $repairRoute = if ([string]$state.execution_engine -eq "cursor") { "Routed to Cursor repair pass." } else { "Routed to Claude repair pass." }
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "revise" -Message $repairRoute
            }
            else {
                Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "revise" -Message "Spec revision required."
            }
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext
            Print-Dashboard -RunId $runIdCurrent -State $state -RunContext $runContext -RunPaths $runPaths
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 4 -RecentOnly
        }

        "final-review" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context

            Assert-FinalReviewPreconditions -State $state -RunPaths $runPaths
            Invoke-PostHardeningTransition -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -FinalReviewScriptPath $finalReviewScript -CommandName "final-review"
        }

        "commit" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $state = Read-JsonObject -Path $runPaths.state_path
            $runContext = Read-JsonObject -Path $runPaths.run_context_path

            if ([string]::IsNullOrWhiteSpace([string]$runContext.repo)) { throw "No target repo in run-context. Start the task with -Repo before committing." }
            if (-not ($state.phase -eq "E" -or $state.status -in @("ready_for_final_judgment", "final_review", "merge_ready"))) { throw "Final review phase not reached. Current phase/status: $($state.phase)/$($state.status)" }

            $repoPath = Get-RepoPath -ReposDoc $reposDoc -RepoKey ([string]$runContext.repo)
            if (-not (Test-Path -LiteralPath $repoPath)) { throw "Target repo path does not exist: $repoPath" }

            Write-Host "Git status for $repoPath"
            git -C $repoPath status --short --branch
            if ($LASTEXITCODE -ne 0) { throw "Unable to read git status from repo: $repoPath" }

            $commitMessage = $Message
            if ([string]::IsNullOrWhiteSpace($commitMessage)) { $commitMessage = Read-Host "Enter commit message" }
            if ([string]::IsNullOrWhiteSpace($commitMessage)) { throw "Commit message is required." }

            git -C $repoPath add -A
            if ($LASTEXITCODE -ne 0) { throw "git add failed in $repoPath" }
            git -C $repoPath commit -m $commitMessage
            if ($LASTEXITCODE -ne 0) { throw "git commit failed in $repoPath" }

            $state.status = "merge_ready"
            $state.execution_engine = "chatgpt"
            Write-JsonObject -Path $runPaths.state_path -Data $state
            Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{ execution_engine = "chatgpt"; status = "merge_ready"; commit_decision = "committed"; pending_action = "pipeline_complete" }
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "commit" -Message "Commit recorded."
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext
            Write-Host "Commit complete."
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 5 -RecentOnly
        }

        "no-commit" {
            $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            $runIdCurrent = [string]$active.run_id
            $runPaths = $active.paths
            $state = Read-JsonObject -Path $runPaths.state_path
            $runContext = Read-JsonObject -Path $runPaths.run_context_path
            $state.status = "merge_ready"
            $state.execution_engine = "chatgpt"
            Write-JsonObject -Path $runPaths.state_path -Data $state
            Update-RunContext -Path $runPaths.run_context_path -Current $runContext -Changes @{ execution_engine = "chatgpt"; status = "merge_ready"; commit_decision = "not_committed"; pending_action = "pipeline_complete_no_commit" }
            $normalized = Normalize-RunStateAndContext -StatePath $runPaths.state_path -RunContextPath $runPaths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            Add-RunEvent -RunId $runIdCurrent -RunPaths $runPaths -State $state -RunContext $runContext -CommandName "no-commit" -Message "No-commit decision recorded."
            Sync-RunIndexRecord -WorkspaceRoot $workspaceRoot -RunId $runIdCurrent -State $state -RunContext $runContext
            Write-Host "Pipeline marked complete without commit."
            Print-RunEvents -RunId $runIdCurrent -RunPaths $runPaths -Tail 5 -RecentOnly
        }

        "resume" {
            $active = $null
            try {
                $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
            }
            catch {
                Write-Host "No active run selected."
                Write-Host "Use: .\pp.ps1 runs"
                Write-Host "Then: .\pp.ps1 use <run-id> (or start one with .\pp.ps1 start -TaskId <run-id> -Repo <repo>)"
                break
            }
            $normalized = Normalize-RunStateAndContext -StatePath $active.paths.state_path -RunContextPath $active.paths.run_context_path
            $state = $normalized.state
            $runContext = $normalized.run_context
            $adapterConfig = Get-ClaudeAdapterConfig -WorkspaceRoot $workspaceRoot
            $codexAdapterConfig = Get-CodexAdapterConfig -WorkspaceRoot $workspaceRoot
            $guidance = Get-ResumeGuidance -State $state -RunContext $runContext -RunPaths $active.paths -ClaudeAdapterConfig $adapterConfig -CodexAdapterConfig $codexAdapterConfig
            Print-ResumeGuidance -RunId $active.run_id -State $state -RunContext $runContext -RunPaths $active.paths -Guidance $guidance
            Print-RunEvents -RunId $active.run_id -RunPaths $active.paths -Tail 5 -RecentOnly
        }

        "doctor" {
            $report = New-DoctorReport
            $targetRunId = $null
            $targetPaths = $null
            $currentRunPath = Join-Path $workspaceRoot "runs\current-run.txt"

            if (-not [string]::IsNullOrWhiteSpace($RunId)) {
                $targetRunId = $RunId.Trim()
                Assert-ValidRunId -Value $targetRunId
                $targetPaths = Get-RunPaths -WorkspaceRoot $workspaceRoot -RunId $targetRunId
            }
            else {
                if (-not (Test-Path -LiteralPath $currentRunPath)) {
                    throw "No current run selected. Use '.\pp.ps1 start -TaskId <run-id> ...' or '.\pp.ps1 use <run-id>'."
                }
                Add-DoctorOk -Report $report -Message "current-run.txt present."
                $targetRunId = Get-CurrentRunId -WorkspaceRoot $workspaceRoot
                Add-DoctorOk -Report $report -Message "current-run.txt points to '$targetRunId'."
                $targetPaths = Get-RunPaths -WorkspaceRoot $workspaceRoot -RunId $targetRunId
            }

            if (Test-Path -LiteralPath $targetPaths.run_root) { Add-DoctorOk -Report $report -Message "Run folder present." } else { Add-DoctorError -Report $report -Message "Run folder missing: $($targetPaths.run_root)" }
            $indexDoc = Read-RunIndex -WorkspaceRoot $workspaceRoot
            $indexEntry = Get-RunRecord -IndexDoc $indexDoc -RunId $targetRunId
            if ($null -eq $indexEntry) { Add-DoctorError -Report $report -Message "Run '$targetRunId' missing from runs/index.json." } else { Add-DoctorOk -Report $report -Message "Run found in runs/index.json." }

            $hasState = Test-RequiredFileForDoctor -Report $report -Path $targetPaths.state_path -Label "state.json"
            $hasContext = Test-RequiredFileForDoctor -Report $report -Path $targetPaths.run_context_path -Label "run-context.json"
            if (Test-Path -LiteralPath $targetPaths.artifacts_dir) { Add-DoctorOk -Report $report -Message "artifacts directory present." } else { Add-DoctorError -Report $report -Message "artifacts directory missing: $($targetPaths.artifacts_dir)" }
            if (Test-Path -LiteralPath $targetPaths.prompts_dir) { Add-DoctorOk -Report $report -Message "prompts directory present." } else { Add-DoctorError -Report $report -Message "prompts directory missing: $($targetPaths.prompts_dir)" }
            Test-RequiredFileForDoctor -Report $report -Path $targetPaths.events_path -Label "events.log" | Out-Null

            $state = $null
            $runContext = $null
            if ($hasState -and $hasContext) {
                $state = Read-JsonObject -Path $targetPaths.state_path
                $runContext = Read-JsonObject -Path $targetPaths.run_context_path

                foreach ($field in @("phase", "status", "flow_type", "execution_engine", "task_type")) {
                    if ([string]::IsNullOrWhiteSpace([string]$state[$field])) { Add-DoctorError -Report $report -Message "state.$field is empty." } else { Add-DoctorOk -Report $report -Message "state.$field populated." }
                }
                foreach ($field in @("requires_visual_approval", "requires_runtime_validation", "runtime_validation_completed", "needs_repair_pass", "supervisor_state", "retry_count", "last_retry_at", "next_retry_at", "last_error_type", "last_error_message", "last_successful_progress_at", "has_design_reference", "design_reference_path", "notification_state", "last_notification_at", "last_notified_reason", "claude_adapter_mode", "claude_execution_last_result", "claude_execution_last_attempt_at", "codex_adapter_mode", "codex_execution_last_result", "codex_execution_last_attempt_at")) {
                    if ($state.ContainsKey($field)) { Add-DoctorOk -Report $report -Message "state.$field present." } else { Add-DoctorWarn -Report $report -Message "state.$field missing." }
                }

                $phase = [string]$state.phase
                $status = [string]$state.status
                $flowType = [string]$state.flow_type
                $engine = [string]$state.execution_engine
                $taskType = [string]$state.task_type
                $requiresVisual = [bool]$state.requires_visual_approval
                $requiresRuntimeValidation = [bool]$state.requires_runtime_validation
                $runtimeValidationMode = [string]$state.runtime_validation_mode
                $runtimeValidationCompleted = [bool]$state.runtime_validation_completed
                $needsRepair = [bool]$state.needs_repair_pass
                $supervisorState = [string]$state.supervisor_state
                $retryCount = [int]$state.retry_count
                $lastProgressAt = [string]$state.last_successful_progress_at
                $hasDesignReference = [bool]$state.has_design_reference
                $designReferencePath = [string]$state.design_reference_path
                $notificationState = [string]$state.notification_state
                $lastNotificationAt = [string]$state.last_notification_at
                $lastNotifiedReason = [string]$state.last_notified_reason
                $notifyCfg = Get-NotificationConfig -WorkspaceRoot $workspaceRoot
                Add-DoctorOk -Report $report -Message "Notification config mode='$([string]$notifyCfg.mode)' enabled=$([bool]$notifyCfg.enabled)."
                $schedulerLock = Get-SchedulerLoopLockStatus -WorkspaceRoot $workspaceRoot
                if ([string]$schedulerLock.status -eq "stale") {
                    Add-DoctorWarn -Report $report -Message "Scheduler loop lock appears stale; run '.\\pp.ps1 scheduler-status' then '.\\pp.ps1 scheduler-unlock -IfStale'."
                }
                elseif ([string]$schedulerLock.status -eq "invalid") {
                    Add-DoctorWarn -Report $report -Message "Scheduler loop lock is invalid/corrupt; run '.\\pp.ps1 scheduler-status' then '.\\pp.ps1 scheduler-unlock -IfStale'."
                }
                if ([string]::IsNullOrWhiteSpace($lastNotificationAt) -and -not [string]::IsNullOrWhiteSpace($notificationState) -and $notificationState -ne "none") {
                    Add-DoctorWarn -Report $report -Message "notification_state is '$notificationState' but last_notification_at is empty."
                }
                if (-not [string]::IsNullOrWhiteSpace($lastNotificationAt) -and [string]::IsNullOrWhiteSpace($lastNotifiedReason)) {
                    Add-DoctorWarn -Report $report -Message "last_notification_at is populated but last_notified_reason is empty."
                }
                if ($status -in @("awaiting_visual_approval", "awaiting_runtime_validation", "runtime_validation_failed", "ready_for_final_judgment") -and -not [bool]$notifyCfg.enabled) {
                    Add-DoctorWarn -Report $report -Message "Run is in a human-attention state but notifications are disabled."
                }
                if ($flowType -in @("frontend", "fullstack")) {
                    if ([string]::IsNullOrWhiteSpace($designReferencePath)) {
                        Add-DoctorWarn -Report $report -Message "design_reference_path is empty for UI-oriented flow."
                    }
                    elseif (-not (Test-Path -LiteralPath $designReferencePath)) {
                        Add-DoctorWarn -Report $report -Message "design_reference_path does not exist: $designReferencePath"
                    }
                    elseif ($hasDesignReference -and (@(Get-ChildItem -LiteralPath $designReferencePath -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne 'design-notes.md' }).Count -lt 1)) {
                        Add-DoctorWarn -Report $report -Message "has_design_reference=true but no concrete reference files were found under design_reference_path."
                    }
                }

                if ($status -eq "ready_for_claude" -and $engine -ne "claude") { Add-DoctorWarn -Report $report -Message "ready_for_claude usually expects execution_engine=claude (found '$engine')." }
                if ($status -eq "ready_for_cursor" -and $engine -ne "cursor") { Add-DoctorWarn -Report $report -Message "ready_for_cursor usually expects execution_engine=cursor (found '$engine')." }
                if (($phase -eq "D" -or $status -in @("ready_for_codex", "hardening", "approved_for_hardening")) -and $engine -ne "codex") { Add-DoctorWarn -Report $report -Message "Phase D/hardening usually expects execution_engine=codex (found '$engine')." }
                if (($phase -eq "E" -or $status -in @("ready_for_final_judgment", "final_review")) -and $engine -ne "chatgpt") { Add-DoctorWarn -Report $report -Message "Final-judgment states usually expect execution_engine=chatgpt (found '$engine')." }
                if ($status -eq "awaiting_visual_approval" -and $engine -in @("codex", "chatgpt")) { Add-DoctorWarn -Report $report -Message "awaiting_visual_approval should not be actively routed to codex/chatgpt." }
                if ($status -eq "merge_ready" -and $phase -ne "E") { Add-DoctorWarn -Report $report -Message "merge_ready is usually a late-phase (E) state." }
                if ($taskType -eq "unknown") { Add-DoctorWarn -Report $report -Message "task_type is unknown; routing inference may be weak." }
                if ($flowType -eq "backend" -and $runtimeValidationMode -eq "ui_workflow") { Add-DoctorWarn -Report $report -Message "backend flow usually expects runtime_validation_mode=contract_service." }
                if ($flowType -eq "fullstack" -and $runtimeValidationMode -ne "fullstack_user_flow") { Add-DoctorWarn -Report $report -Message "fullstack flow usually expects runtime_validation_mode=fullstack_user_flow." }
                if ($flowType -eq "tooling" -and $runtimeValidationMode -eq "ui_workflow") { Add-DoctorWarn -Report $report -Message "tooling flow should not default to ui_workflow runtime mode." }
                if ($flowType -in @("frontend", "fullstack") -and -not $requiresVisual) { Add-DoctorWarn -Report $report -Message "$flowType flow usually expects requires_visual_approval=true." }
                if ($flowType -in @("backend", "tooling") -and $requiresVisual) { Add-DoctorWarn -Report $report -Message "$flowType flow has requires_visual_approval=true; confirm this is intentional." }
                if ($flowType -eq "fullstack" -and ($phase -in @("D", "E") -or $status -in @("ready_for_codex", "hardening", "ready_for_final_judgment", "final_review", "merge_ready"))) {
                    if (-not [bool]$state.touches_persistence -or -not [bool]$state.touches_api_contract) {
                        Add-DoctorWarn -Report $report -Message "fullstack flow in late stage usually expects touches_persistence=true and touches_api_contract=true."
                    }
                }
                if ($needsRepair -and $phase -ne "C") { Add-DoctorWarn -Report $report -Message "needs_repair_pass=true but phase is '$phase' (usually C)." }
                if (-not $requiresVisual -and $status -eq "awaiting_visual_approval") { Add-DoctorError -Report $report -Message "awaiting_visual_approval is inconsistent with requires_visual_approval=false." }
                if ($status -in @("awaiting_runtime_validation", "runtime_validation_in_progress", "runtime_validation_failed") -and -not $requiresRuntimeValidation) { Add-DoctorWarn -Report $report -Message "Runtime status present while requires_runtime_validation=false." }
                if ($requiresRuntimeValidation -and ($phase -in @("D", "E")) -and -not $runtimeValidationCompleted) { Add-DoctorError -Report $report -Message "Runtime validation is required but not marked complete before hardening/final stage." }
                if ($supervisorState -eq "worker_degraded") { Add-DoctorWarn -Report $report -Message "Supervisor is in worker_degraded state." }
                if ($supervisorState -eq "worker_blocked") { Add-DoctorError -Report $report -Message "Supervisor is in worker_blocked state." }
                if ($retryCount -ge 7 -and $retryCount -lt 10) { Add-DoctorWarn -Report $report -Message "High retry_count ($retryCount) suggests a likely stuck worker." }
                if ($retryCount -ge 10) {
                    if ($supervisorState -eq "worker_blocked") {
                        Add-DoctorError -Report $report -Message "retry_count ($retryCount) reached blocked threshold."
                    }
                    else {
                        Add-DoctorWarn -Report $report -Message "retry_count ($retryCount) is high from recent failures; consider worker-start to reset baseline."
                    }
                }
                if ($supervisorState -in @("worker_retrying", "worker_degraded", "awaiting_reconnect")) {
                    $nextRetryTs = Get-DateSafe -Value ([string]$state.next_retry_at)
                    if ($null -eq $nextRetryTs) {
                        Add-DoctorWarn -Report $report -Message "Supervisor is '$supervisorState' but next_retry_at is missing/invalid."
                    }
                    else {
                        $overdueSeconds = ([DateTime]::UtcNow - $nextRetryTs.ToUniversalTime()).TotalSeconds
                        if ($overdueSeconds -gt 0) {
                            Add-DoctorWarn -Report $report -Message "Retry is overdue by $([int][Math]::Floor($overdueSeconds))s; run '.\\pp.ps1 scheduler-run'."
                        }
                    }
                }
                if ($supervisorState -in @("worker_retrying", "worker_degraded", "worker_blocked", "awaiting_reconnect") -and $engine -in @("none", "")) {
                    Add-DoctorWarn -Report $report -Message "Supervisor indicates worker issues but execution_engine is '$engine'."
                }

                Test-RequiredFileForDoctor -Report $report -Path $targetPaths.task_path -Label "artifacts/task.md" | Out-Null
                $implementationStates = @("ready_for_claude", "ready_for_cursor", "implementation_ready", "implementation_in_progress", "needs_visual_revision", "needs_repair_pass")
                $hardeningStates = @("ready_for_codex", "hardening", "approved_for_hardening")
                $finalStates = @("ready_for_final_judgment", "final_review", "merge_ready")
                $runtimeStates = @("awaiting_runtime_validation", "runtime_validation_in_progress", "runtime_validation_failed")
                $postImplementationStates = @("awaiting_visual_approval") + $hardeningStates + $finalStates

                if ($status -in $implementationStates) {
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.builder_prompt_path -Label "prompts/builder-prompt.md" | Out-Null
                    if ($status -eq "ready_for_claude" -or $engine -eq "claude") {
                        Test-RequiredFileForDoctor -Report $report -Path $targetPaths.claude_handoff_path -Label "artifacts/claude-handoff.md" -WarnOnly | Out-Null
                    }
                }
                if ($status -eq "awaiting_visual_approval") {
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.current_artifact_path -Label "artifacts/current.md" | Out-Null
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.visual_review_path -Label "artifacts/visual-review.md" | Out-Null
                }
                if ($status -in $runtimeStates) {
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.current_artifact_path -Label "artifacts/current.md" | Out-Null
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.runtime_validation_path -Label "artifacts/runtime-validation.md" | Out-Null
                }
                if ($status -in $hardeningStates -or $phase -eq "D") {
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.codex_hardening_prompt_path -Label "prompts/codex-hardening-prompt.md" | Out-Null
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.current_artifact_path -Label "artifacts/current.md" | Out-Null
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.codex_review_path -Label "artifacts/codexReview.md" -WarnOnly | Out-Null
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.codex_handoff_path -Label "artifacts/codex-handoff.md" -WarnOnly | Out-Null
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.codex_completion_path -Label "artifacts/codex-completion.json" -WarnOnly | Out-Null
                    if (Test-Path -LiteralPath $targetPaths.codex_review_path) {
                        $codexReviewRaw = Get-Content -LiteralPath $targetPaths.codex_review_path -Raw
                        if (Test-PlaceholderOnlyCodexReviewArtifact -Content $codexReviewRaw) {
                            Add-DoctorWarn -Report $report -Message "artifacts/codexReview.md is placeholder-only in hardening state."
                        }
                    }
                }
                if ($status -in $finalStates -or $phase -eq "E") {
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.final_review_generated_prompt_path -Label "prompts/final-review-prompt.md" | Out-Null
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.codex_review_path -Label "artifacts/codexReview.md" | Out-Null
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.current_artifact_path -Label "artifacts/current.md" | Out-Null
                    Test-RequiredFileForDoctor -Report $report -Path $targetPaths.task_path -Label "artifacts/task.md" | Out-Null
                    if (Test-Path -LiteralPath $targetPaths.codex_review_path) {
                        $codexReviewRaw = Get-Content -LiteralPath $targetPaths.codex_review_path -Raw
                        if (Test-PlaceholderOnlyCodexReviewArtifact -Content $codexReviewRaw) {
                            Add-DoctorError -Report $report -Message "artifacts/codexReview.md is placeholder-only for final-review/final-judgment state."
                        }
                    }
                }

                if ($status -in $postImplementationStates) {
                    if (-not (Test-Path -LiteralPath $targetPaths.current_artifact_path)) {
                        Add-DoctorError -Report $report -Message "artifacts/current.md missing for post-implementation state."
                    }
                    else {
                        $currentRaw = Get-Content -LiteralPath $targetPaths.current_artifact_path -Raw
                        if (Test-PlaceholderOnlyCurrentArtifact -Content $currentRaw) {
                            Add-DoctorError -Report $report -Message "artifacts/current.md is placeholder-only for post-implementation state."
                        }
                    }
                }
                if ($requiresRuntimeValidation -and ($status -in @($hardeningStates + $finalStates + @("merge_ready")) -or $phase -in @("D", "E"))) {
                    if (-not (Test-Path -LiteralPath $targetPaths.runtime_validation_path)) {
                        Add-DoctorError -Report $report -Message "runtime-validation.md missing for runtime-gated run."
                    }
                }
                if ($requiresRuntimeValidation -and ($runtimeValidationCompleted -or $status -in @($hardeningStates + $finalStates) -or $phase -in @("D", "E"))) {
                    try {
                        Assert-RuntimeValidationArtifact -State $state -RunPaths $targetPaths
                        Add-DoctorOk -Report $report -Message "runtime-validation.md content structure looks complete."
                    }
                    catch {
                        Add-DoctorError -Report $report -Message "runtime-validation.md is incomplete: $($_.Exception.Message)"
                    }
                }

                if ($supervisorState -in @("worker_retrying", "worker_degraded", "worker_blocked", "awaiting_reconnect")) {
                    if (-not (Test-Path -LiteralPath $targetPaths.worker_heartbeat_path)) {
                        Add-DoctorError -Report $report -Message "worker-heartbeat.json missing while supervisor state is '$supervisorState'."
                    }
                    else {
                        Add-DoctorOk -Report $report -Message "worker-heartbeat.json present."
                        $hbRaw = Get-Content -LiteralPath $targetPaths.worker_heartbeat_path -Raw
                        $hb = $null
                        try { $hb = $hbRaw | ConvertFrom-Json -AsHashtable } catch { $hb = $null }
                        if ($null -eq $hb) {
                            Add-DoctorError -Report $report -Message "worker-heartbeat.json is not valid JSON."
                        }
                        else {
                            $hbProgress = if ($hb.ContainsKey("last_progress_at")) { [string]$hb.last_progress_at } else { "" }
                            $hbWorker = if ($hb.ContainsKey("worker_name")) { [string]$hb.worker_name } else { "" }
                            if (-not [string]::IsNullOrWhiteSpace($hbWorker) -and -not [string]::IsNullOrWhiteSpace($engine) -and $engine -ne "none" -and $hbWorker -ne $engine) {
                                Add-DoctorWarn -Report $report -Message "Heartbeat worker '$hbWorker' differs from execution_engine '$engine'."
                            }
                            $progressTs = Get-DateSafe -Value $hbProgress
                            if ($null -eq $progressTs) {
                                Add-DoctorWarn -Report $report -Message "Heartbeat last_progress_at is missing or invalid."
                            }
                            else {
                                $ageMinutes = ([DateTime]::UtcNow - $progressTs.ToUniversalTime()).TotalMinutes
                                if ($supervisorState -eq "worker_retrying" -and $ageMinutes -gt 20) { Add-DoctorWarn -Report $report -Message "Worker heartbeat is stale (${ageMinutes}m) while retrying." }
                                if ($supervisorState -eq "worker_degraded" -and $ageMinutes -gt 60) { Add-DoctorWarn -Report $report -Message "Worker heartbeat is stale (${ageMinutes}m) in degraded mode." }
                                if ($supervisorState -eq "worker_blocked" -and $ageMinutes -gt 60) { Add-DoctorError -Report $report -Message "Worker heartbeat is stale (${ageMinutes}m) in blocked mode." }
                            }
                        }
                    }
                }
                elseif (Test-Path -LiteralPath $targetPaths.worker_heartbeat_path) {
                    Add-DoctorOk -Report $report -Message "worker-heartbeat.json present."
                }
                if ([string]$runContext.pending_action -eq "claude_implementation_in_progress" -or $status -eq "ready_for_claude" -or $engine -eq "claude") {
                    if (-not (Test-Path -LiteralPath $targetPaths.claude_handoff_path)) {
                        Add-DoctorError -Report $report -Message "claude-handoff.md missing while pending_action=claude_implementation_in_progress."
                    }
                    else {
                        Add-DoctorOk -Report $report -Message "claude-handoff.md present for active Claude implementation."
                    }
                    if (-not (Test-Path -LiteralPath $targetPaths.claude_completion_path)) {
                        Add-DoctorWarn -Report $report -Message "claude-completion.json missing; optional completion signal channel unavailable."
                    }
                    else {
                        $completion = Read-ClaudeCompletionSignal -RunPaths $targetPaths -RunId $targetRunId
                        if (-not $completion.valid) {
                            Add-DoctorError -Report $report -Message "claude-completion.json is invalid JSON."
                        }
                        else {
                            Add-DoctorOk -Report $report -Message "claude-completion.json present."
                            $signal = $completion.data
                            if (-not [string]::IsNullOrWhiteSpace([string]$signal.run_id) -and [string]$signal.run_id -ne $targetRunId) {
                                Add-DoctorWarn -Report $report -Message "claude-completion.json run_id '$([string]$signal.run_id)' does not match current run '$targetRunId'."
                            }
                            $completionStatus = ([string]$signal.status).Trim().ToLowerInvariant()
                            if ($completionStatus -eq "completed" -and [string]::IsNullOrWhiteSpace([string]$signal.completed_at)) {
                                Add-DoctorWarn -Report $report -Message "claude-completion.json status=completed but completed_at is empty."
                            }
                            if ($completionStatus -in @("completed", "ready", "success")) {
                                if (-not (Test-Path -LiteralPath $targetPaths.current_artifact_path)) {
                                    Add-DoctorWarn -Report $report -Message "Completion signal indicates readiness but current.md is missing."
                                }
                                else {
                                    $currentRaw = Get-Content -LiteralPath $targetPaths.current_artifact_path -Raw
                                    if (Test-PlaceholderOnlyCurrentArtifact -Content $currentRaw) {
                                        Add-DoctorWarn -Report $report -Message "Completion signal indicates readiness but current.md is placeholder-only."
                                    }
                                    else {
                                        try {
                                            $null = Assert-ClaudeFinishPreconditions -State $state -RunContext $runContext -RunPaths $targetPaths -RunId $targetRunId
                                            if ($status -in $implementationStates) {
                                                Add-DoctorWarn -Report $report -Message "Claude completion evidence appears ready for consumption; run '.\\pp.ps1 auto-consume' or '.\\pp.ps1 claude-finish'."
                                            }
                                        }
                                        catch { }
                                    }
                                }
                            }
                        }
                    }
                }
                if ([string]$runContext.pending_action -eq "codex_hardening_in_progress" -or $phase -eq "D" -or $status -in @("ready_for_codex", "hardening", "approved_for_hardening")) {
                    if (-not (Test-Path -LiteralPath $targetPaths.codex_handoff_path)) {
                        Add-DoctorError -Report $report -Message "codex-handoff.md missing while run is in Codex hardening path."
                    }
                    else {
                        Add-DoctorOk -Report $report -Message "codex-handoff.md present for active Codex hardening."
                    }
                    if (-not (Test-Path -LiteralPath $targetPaths.codex_completion_path)) {
                        Add-DoctorWarn -Report $report -Message "codex-completion.json missing; optional completion signal channel unavailable."
                    }
                    else {
                        $completion = Read-CodexCompletionSignal -RunPaths $targetPaths -RunId $targetRunId
                        if (-not $completion.valid) {
                            Add-DoctorError -Report $report -Message "codex-completion.json is invalid JSON."
                        }
                        else {
                            Add-DoctorOk -Report $report -Message "codex-completion.json present."
                            $signal = $completion.data
                            if (-not [string]::IsNullOrWhiteSpace([string]$signal.run_id) -and [string]$signal.run_id -ne $targetRunId) {
                                Add-DoctorWarn -Report $report -Message "codex-completion.json run_id '$([string]$signal.run_id)' does not match current run '$targetRunId'."
                            }
                            $completionStatus = ([string]$signal.status).Trim().ToLowerInvariant()
                            if ($completionStatus -eq "completed" -and [string]::IsNullOrWhiteSpace([string]$signal.completed_at)) {
                                Add-DoctorWarn -Report $report -Message "codex-completion.json status=completed but completed_at is empty."
                            }
                            if ($completionStatus -in @("completed", "ready", "success")) {
                                if (-not (Test-Path -LiteralPath $targetPaths.codex_review_path)) {
                                    Add-DoctorWarn -Report $report -Message "Completion signal indicates readiness but codexReview.md is missing."
                                }
                                else {
                                    $reviewRaw = Get-Content -LiteralPath $targetPaths.codex_review_path -Raw
                                    if (Test-PlaceholderOnlyCodexReviewArtifact -Content $reviewRaw) {
                                        Add-DoctorWarn -Report $report -Message "Completion signal indicates readiness but codexReview.md is placeholder-only."
                                    }
                                    else {
                                        try {
                                            $null = Assert-CodexFinishPreconditions -State $state -RunContext $runContext -RunPaths $targetPaths -RunId $targetRunId
                                            if ($phase -eq "D" -or $status -in @("ready_for_codex", "hardening", "approved_for_hardening")) {
                                                Add-DoctorWarn -Report $report -Message "Codex completion evidence appears ready for consumption; run '.\\pp.ps1 auto-consume' or '.\\pp.ps1 codex-finish'."
                                            }
                                        }
                                        catch { }
                                    }
                                }
                            }
                        }
                    }
                }

                if ($null -ne $indexEntry) {
                    if ([string]$indexEntry.phase -ne $phase) { Add-DoctorWarn -Report $report -Message "index phase '$([string]$indexEntry.phase)' differs from state phase '$phase'." }
                    if ([string]$indexEntry.status -ne $status) { Add-DoctorWarn -Report $report -Message "index status '$([string]$indexEntry.status)' differs from state status '$status'." }
                    if ([string]$indexEntry.flow_type -ne $flowType) { Add-DoctorWarn -Report $report -Message "index flow_type '$([string]$indexEntry.flow_type)' differs from state flow_type '$flowType'." }
                    if (-not [string]::IsNullOrWhiteSpace([string]$runContext.repo) -and [string]$indexEntry.repo -ne [string]$runContext.repo) { Add-DoctorWarn -Report $report -Message "index repo '$([string]$indexEntry.repo)' differs from run-context repo '$([string]$runContext.repo)'." }
                    if (-not [string]::IsNullOrWhiteSpace([string]$runContext.branch) -and [string]$indexEntry.branch -ne [string]$runContext.branch) { Add-DoctorWarn -Report $report -Message "index branch '$([string]$indexEntry.branch)' differs from run-context branch '$([string]$runContext.branch)'." }
                }
            }

            $lastEvent = $null
            $events = Read-RunEvents -RunPaths $targetPaths -Tail 1
            if (@($events).Count -gt 0) {
                $lastEvent = $events[0]
                Add-DoctorOk -Report $report -Message "events.log has recent entries."
            }
            else {
                Add-DoctorWarn -Report $report -Message "events.log is empty."
            }

            $likelyNext = ""
            if ($null -ne $state -and $null -ne $runContext) {
                $adapterConfig = Get-ClaudeAdapterConfig -WorkspaceRoot $workspaceRoot
                $codexAdapterConfig = Get-CodexAdapterConfig -WorkspaceRoot $workspaceRoot
                $guidance = Get-ResumeGuidance -State $state -RunContext $runContext -RunPaths $targetPaths -ClaudeAdapterConfig $adapterConfig -CodexAdapterConfig $codexAdapterConfig
                if (@($guidance.commands).Count -gt 0) { $likelyNext = [string]$guidance.commands[0] }
            }
            Print-DoctorReport -RunId $targetRunId -RunPaths $targetPaths -State $state -RunContext $runContext -Report $report -LikelyNextCommand $likelyNext -LastEvent $lastEvent
        }

        "events" {
            $selectedRunId = if (-not [string]::IsNullOrWhiteSpace($RunId)) { $RunId.Trim() } else { $null }
            $selectedPaths = $null
            if (-not [string]::IsNullOrWhiteSpace($selectedRunId)) {
                Assert-ValidRunId -Value $selectedRunId
                $selectedPaths = Get-RunPaths -WorkspaceRoot $workspaceRoot -RunId $selectedRunId
                if (-not (Test-Path -LiteralPath $selectedPaths.run_root)) { throw "Run '$selectedRunId' was not found at $($selectedPaths.run_root)" }
            }
            else {
                $active = Resolve-ActiveRun -WorkspaceRoot $workspaceRoot
                $selectedRunId = [string]$active.run_id
                $selectedPaths = $active.paths
            }
            Print-RunEvents -RunId $selectedRunId -RunPaths $selectedPaths -Tail $Tail
        }
    }
}
catch {
    Write-Error "pipeline command failed: $($_.Exception.Message)"
    exit 1
}
