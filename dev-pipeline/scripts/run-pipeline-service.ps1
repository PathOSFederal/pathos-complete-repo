[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$WorkspaceRoot,

    [Parameter(Mandatory = $false)]
    [string]$RunId,

    [Parameter(Mandatory = $false)]
    [switch]$AllRuns,

    [Parameter(Mandatory = $false)]
    [switch]$ConsumeCompletions,

    [Parameter(Mandatory = $false)]
    [switch]$DryRun,

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
    [string]$LogPath
)

$ErrorActionPreference = "Stop"

function Get-NowIso {
    return (Get-Date).ToString("o")
}

function Read-JsonObjectSafe {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    try {
        return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -AsHashtable)
    }
    catch {
        return $null
    }
}

function Write-JsonObject {
    param([string]$Path, [hashtable]$Data)
    $Data | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $Path -Encoding utf8
}

function Write-ServiceLog {
    param(
        [string]$Path,
        [string]$Level,
        [string]$Message,
        [hashtable]$Context = $null
    )
    $record = [ordered]@{
        ts      = Get-NowIso
        level   = if ([string]::IsNullOrWhiteSpace($Level)) { "info" } else { $Level }
        message = $Message
    }
    if ($null -ne $Context) { $record["context"] = $Context }
    $line = $record | ConvertTo-Json -Compress -Depth 8
    Add-Content -LiteralPath $Path -Value $line -Encoding utf8
}

function Resolve-WorkspaceRoot {
    param([string]$Explicit)
    if (-not [string]::IsNullOrWhiteSpace($Explicit)) {
        return (Resolve-Path -LiteralPath $Explicit).Path
    }
    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-ServiceHostConfig {
    param([string]$WorkspaceRoot)
    $cfg = [ordered]@{
        interval_seconds    = 45
        max_cycles          = 20
        max_minutes         = 0
        all_runs            = $false
        run_id              = ""
        consume_completions = $false
        dry_run             = $false
        log_path            = "logs/pipeline-service.log"
        source              = "defaults"
    }

    $configPaths = @(
        (Join-Path $WorkspaceRoot "scripts\config\pipeline-config.json"),
        (Join-Path $WorkspaceRoot "pipeline-config.json")
    )
    foreach ($p in $configPaths) {
        $doc = Read-JsonObjectSafe -Path $p
        if ($null -eq $doc) { continue }
        $service = $null
        if ($doc.ContainsKey("service_host")) { $service = $doc.service_host }
        elseif ($doc.ContainsKey("serviceHost")) { $service = $doc.serviceHost }
        if ($null -eq $service) { continue }
        if ($service.ContainsKey("interval_seconds")) { $cfg.interval_seconds = [int]$service.interval_seconds }
        if ($service.ContainsKey("max_cycles")) { $cfg.max_cycles = [int]$service.max_cycles }
        if ($service.ContainsKey("max_minutes")) { $cfg.max_minutes = [int]$service.max_minutes }
        if ($service.ContainsKey("all_runs")) { $cfg.all_runs = [bool]$service.all_runs }
        if ($service.ContainsKey("run_id")) { $cfg.run_id = [string]$service.run_id }
        if ($service.ContainsKey("consume_completions")) { $cfg.consume_completions = [bool]$service.consume_completions }
        if ($service.ContainsKey("dry_run")) { $cfg.dry_run = [bool]$service.dry_run }
        if ($service.ContainsKey("log_path")) { $cfg.log_path = [string]$service.log_path }
        $cfg.source = "config:$p"
        break
    }

    if (-not [string]::IsNullOrWhiteSpace([string]$env:PATHOS_SERVICE_INTERVAL_SECONDS)) { $cfg.interval_seconds = [int]$env:PATHOS_SERVICE_INTERVAL_SECONDS; $cfg.source = "env" }
    if (-not [string]::IsNullOrWhiteSpace([string]$env:PATHOS_SERVICE_MAX_CYCLES)) { $cfg.max_cycles = [int]$env:PATHOS_SERVICE_MAX_CYCLES; $cfg.source = "env" }
    if (-not [string]::IsNullOrWhiteSpace([string]$env:PATHOS_SERVICE_MAX_MINUTES)) { $cfg.max_minutes = [int]$env:PATHOS_SERVICE_MAX_MINUTES; $cfg.source = "env" }
    if (-not [string]::IsNullOrWhiteSpace([string]$env:PATHOS_SERVICE_ALL_RUNS)) { $cfg.all_runs = [System.Convert]::ToBoolean($env:PATHOS_SERVICE_ALL_RUNS); $cfg.source = "env" }
    if (-not [string]::IsNullOrWhiteSpace([string]$env:PATHOS_SERVICE_RUN_ID)) { $cfg.run_id = [string]$env:PATHOS_SERVICE_RUN_ID; $cfg.source = "env" }
    if (-not [string]::IsNullOrWhiteSpace([string]$env:PATHOS_SERVICE_CONSUME_COMPLETIONS)) { $cfg.consume_completions = [System.Convert]::ToBoolean($env:PATHOS_SERVICE_CONSUME_COMPLETIONS); $cfg.source = "env" }
    if (-not [string]::IsNullOrWhiteSpace([string]$env:PATHOS_SERVICE_DRY_RUN)) { $cfg.dry_run = [System.Convert]::ToBoolean($env:PATHOS_SERVICE_DRY_RUN); $cfg.source = "env" }
    if (-not [string]::IsNullOrWhiteSpace([string]$env:PATHOS_SERVICE_LOG_PATH)) { $cfg.log_path = [string]$env:PATHOS_SERVICE_LOG_PATH; $cfg.source = "env" }

    return $cfg
}

try {
    $root = Resolve-WorkspaceRoot -Explicit $WorkspaceRoot
    $pipelineScript = Join-Path $root "scripts\pipeline.ps1"
    if (-not (Test-Path -LiteralPath $pipelineScript)) {
        throw "Missing pipeline script: $pipelineScript"
    }
    Set-Location -LiteralPath $root

    $cfg = Get-ServiceHostConfig -WorkspaceRoot $root
    if ($PSBoundParameters.ContainsKey("IntervalSeconds")) { $cfg.interval_seconds = $IntervalSeconds; $cfg.source = "params" }
    if ($PSBoundParameters.ContainsKey("MaxCycles")) { $cfg.max_cycles = $MaxCycles; $cfg.source = "params" }
    if ($PSBoundParameters.ContainsKey("MaxMinutes")) { $cfg.max_minutes = $MaxMinutes; $cfg.source = "params" }
    if ($PSBoundParameters.ContainsKey("RunId")) { $cfg.run_id = $RunId; $cfg.source = "params" }
    if ($PSBoundParameters.ContainsKey("LogPath")) { $cfg.log_path = $LogPath; $cfg.source = "params" }
    if ($AllRuns.IsPresent) { $cfg.all_runs = $true; $cfg.source = "params" }
    if ($ConsumeCompletions.IsPresent) { $cfg.consume_completions = $true; $cfg.source = "params" }
    if ($DryRun.IsPresent) { $cfg.dry_run = $true; $cfg.source = "params" }

    if ($cfg.all_runs -and -not [string]::IsNullOrWhiteSpace([string]$cfg.run_id)) {
        throw "service host cannot run with both all_runs=true and run_id set."
    }

    $logsRoot = Join-Path $root "logs"
    if (-not (Test-Path -LiteralPath $logsRoot)) { New-Item -ItemType Directory -Path $logsRoot -Force | Out-Null }
    $effectiveLogPath = [string]$cfg.log_path
    if ([string]::IsNullOrWhiteSpace($effectiveLogPath)) { $effectiveLogPath = "logs/pipeline-service.log" }
    if (-not [System.IO.Path]::IsPathRooted($effectiveLogPath)) { $effectiveLogPath = Join-Path $root $effectiveLogPath }
    $logDir = Split-Path -Parent $effectiveLogPath
    if (-not (Test-Path -LiteralPath $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
    if (-not (Test-Path -LiteralPath $effectiveLogPath)) { Set-Content -LiteralPath $effectiveLogPath -Value "" -Encoding utf8 }

    $hostStatePath = Join-Path $logsRoot "pipeline-service.state.json"
    $hostState = [ordered]@{
        started_at      = Get-NowIso
        last_update_at  = Get-NowIso
        status          = "starting"
        pid             = $PID
        scope           = if ($cfg.all_runs) { "all-runs" } elseif (-not [string]::IsNullOrWhiteSpace([string]$cfg.run_id)) { "run:$([string]$cfg.run_id)" } else { "active-run" }
        interval_seconds = [int]$cfg.interval_seconds
        max_cycles      = [int]$cfg.max_cycles
        max_minutes     = [int]$cfg.max_minutes
        consume_completions = [bool]$cfg.consume_completions
        dry_run         = [bool]$cfg.dry_run
        run_id          = [string]$cfg.run_id
        all_runs        = [bool]$cfg.all_runs
        log_path        = $effectiveLogPath
        config_source   = [string]$cfg.source
    }
    Write-JsonObject -Path $hostStatePath -Data $hostState
    Write-ServiceLog -Path $effectiveLogPath -Level "info" -Message "Pipeline service host started." -Context $hostState

    $invoke = @{
        Command         = "scheduler-loop"
        IntervalSeconds = [int]$cfg.interval_seconds
        MaxCycles       = [int]$cfg.max_cycles
        MaxMinutes      = [int]$cfg.max_minutes
    }
    if ($cfg.all_runs) { $invoke["AllRuns"] = $true }
    elseif (-not [string]::IsNullOrWhiteSpace([string]$cfg.run_id)) { $invoke["RunId"] = [string]$cfg.run_id }
    if ([bool]$cfg.consume_completions) { $invoke["ConsumeCompletions"] = $true }
    if ([bool]$cfg.dry_run) { $invoke["DryRun"] = $true }

    $hostState.status = "running"
    $hostState.last_update_at = Get-NowIso
    Write-JsonObject -Path $hostStatePath -Data $hostState
    Write-ServiceLog -Path $effectiveLogPath -Level "info" -Message "Launching scheduler-loop from service host." -Context $invoke

    & $pipelineScript @invoke
    $exitCode = $LASTEXITCODE
    $hostState.status = if ($exitCode -eq 0) { "stopped_clean" } else { "stopped_error" }
    $hostState.last_update_at = Get-NowIso
    $hostState.last_exit_code = $exitCode
    Write-JsonObject -Path $hostStatePath -Data $hostState
    Write-ServiceLog -Path $effectiveLogPath -Level "info" -Message "Scheduler-loop exited." -Context @{ exit_code = $exitCode; status = $hostState.status }
    exit $exitCode
}
catch [System.Management.Automation.PipelineStoppedException] {
    $errText = $_.Exception.Message
    if (-not [string]::IsNullOrWhiteSpace($effectiveLogPath)) {
        Write-ServiceLog -Path $effectiveLogPath -Level "warn" -Message "Service host interrupted." -Context @{ error = $errText }
    }
    if (-not [string]::IsNullOrWhiteSpace($hostStatePath) -and (Test-Path -LiteralPath $hostStatePath)) {
        $state = Read-JsonObjectSafe -Path $hostStatePath
        if ($null -ne $state) {
            $state["status"] = "interrupted"
            $state["last_update_at"] = Get-NowIso
            $state["last_error"] = $errText
            Write-JsonObject -Path $hostStatePath -Data $state
        }
    }
    exit 130
}
catch {
    $errText = $_.Exception.Message
    if (-not [string]::IsNullOrWhiteSpace($effectiveLogPath)) {
        Write-ServiceLog -Path $effectiveLogPath -Level "error" -Message "Service host failed." -Context @{ error = $errText }
    }
    if (-not [string]::IsNullOrWhiteSpace($hostStatePath) -and (Test-Path -LiteralPath $hostStatePath)) {
        $state = Read-JsonObjectSafe -Path $hostStatePath
        if ($null -ne $state) {
            $state["status"] = "failed"
            $state["last_update_at"] = Get-NowIso
            $state["last_error"] = $errText
            Write-JsonObject -Path $hostStatePath -Data $state
        }
    }
    Write-Error "pipeline service host failed: $errText"
    exit 1
}
