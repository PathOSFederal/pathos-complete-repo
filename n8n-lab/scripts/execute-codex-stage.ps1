[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$RunId,

    [string]$RunsRoot = "C:\dev\PathOS\n8n-lab\runs"
)

$ErrorActionPreference = "Stop"

function Out-Result {
    param(
        [object]$Data,
        [int]$ExitCode = 0
    )

    $Data | ConvertTo-Json -Depth 20 -Compress
    exit $ExitCode
}

function Read-JsonFile {
    param([string]$Path)
    return Get-Content -Path $Path -Raw | ConvertFrom-Json
}

function Invoke-StageCommand {
    param(
        [string]$FilePath,
        [string[]]$Arguments
    )

    $stdoutPath = [System.IO.Path]::GetTempFileName()
    $stderrPath = [System.IO.Path]::GetTempFileName()

    try {
        $processArguments = @("-ExecutionPolicy", "Bypass", "-File", $FilePath) + $Arguments

        $process = Start-Process -FilePath "powershell.exe" `
            -ArgumentList $processArguments `
            -PassThru `
            -Wait `
            -NoNewWindow `
            -RedirectStandardOutput $stdoutPath `
            -RedirectStandardError $stderrPath

        return [ordered]@{
            exitCode = $process.ExitCode
            stdout = if (Test-Path $stdoutPath) { Get-Content $stdoutPath -Raw } else { "" }
            stderr = if (Test-Path $stderrPath) { Get-Content $stderrPath -Raw } else { "" }
        }
    }
    finally {
        Remove-Item $stdoutPath -Force -ErrorAction SilentlyContinue
        Remove-Item $stderrPath -Force -ErrorAction SilentlyContinue
    }
}

function Get-FirstJsonObject {
    param([string]$Text)

    foreach ($line in ($Text -split "`r?`n")) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        try {
            return ($line | ConvertFrom-Json)
        }
        catch {
            continue
        }
    }

    return $null
}

if ([string]::IsNullOrWhiteSpace($RunId)) {
    Out-Result -Data @{
        status = "failure"
        message = "Codex execution failed"
        reason = "runId is required"
    }
}

$runPath = Join-Path $RunsRoot $RunId
$statusPath = Join-Path $runPath "status.json"

if (-not (Test-Path $runPath)) {
    Out-Result -Data @{
        status = "failure"
        message = "Codex execution failed"
        runId = $RunId
        reason = "Run path does not exist: $runPath"
    }
}

if (-not (Test-Path $statusPath)) {
    Out-Result -Data @{
        status = "failure"
        message = "Codex execution failed"
        runId = $RunId
        reason = "status.json not found: $statusPath"
    }
}

$status = Read-JsonFile -Path $statusPath
$currentStatus = [string]$status.runStatus
$repoPath = [string]$status.repoPath

if ([string]::IsNullOrWhiteSpace($repoPath)) {
    Out-Result -Data @{
        status = "failure"
        message = "Codex execution failed"
        runId = $RunId
        reason = "repoPath is missing from status.json"
    }
}

if ($currentStatus -eq "codex_review_complete") {
    Out-Result -Data @{
        status = "success"
        message = "Codex execution already completed"
        runId = $RunId
        nextStatus = "codex_review_complete"
    }
}

if ($currentStatus -notin @("ready_for_codex", "codex_handoff_built", "codex_failed")) {
    Out-Result -Data @{
        status = "failure"
        message = "Codex execution failed"
        runId = $RunId
        reason = "Illegal runStatus for Codex execution: $currentStatus"
        nextStatus = $currentStatus
    }
}

if ($currentStatus -eq "ready_for_codex") {
    $handoffResult = Invoke-StageCommand `
        -FilePath "C:\dev\PathOS\n8n-lab\scripts\build-codex-handoff.ps1" `
        -Arguments @("-RunId", $RunId, "-RunsRoot", $RunsRoot)

    if ($handoffResult.exitCode -ne 0) {
        Out-Result -Data @{
            status = "failure"
            message = "Codex handoff build failed"
            runId = $RunId
            nextStatus = "ready_for_codex"
            stdout = $handoffResult.stdout
            stderr = $handoffResult.stderr
            exitCode = [string]$handoffResult.exitCode
        }
    }

    $handoffStatusResult = Invoke-StageCommand `
        -FilePath "C:\dev\PathOS\n8n-lab\scripts\update-run-status.ps1" `
        -Arguments @(
            "-RunId", $RunId,
            "-RunsRoot", $RunsRoot,
            "-NewStatus", "codex_handoff_built",
            "-ReviewStatus", "approved",
            "-StatusNote", "Codex handoff built and ready for hardening."
        )

    if ($handoffStatusResult.exitCode -ne 0) {
        Out-Result -Data @{
            status = "failure"
            message = "Codex handoff status update failed"
            runId = $RunId
            stdout = $handoffStatusResult.stdout
            stderr = $handoffStatusResult.stderr
            exitCode = [string]$handoffStatusResult.exitCode
        }
    }
}

$inProgressResult = Invoke-StageCommand `
    -FilePath "C:\dev\PathOS\n8n-lab\scripts\update-run-status.ps1" `
    -Arguments @(
        "-RunId", $RunId,
        "-RunsRoot", $RunsRoot,
        "-NewStatus", "codex_in_progress",
        "-ReviewStatus", "approved",
        "-StatusNote", "Codex execution started by PathOS."
    )

if ($inProgressResult.exitCode -ne 0) {
    Out-Result -Data @{
        status = "failure"
        message = "Codex in-progress status update failed"
        runId = $RunId
        stdout = $inProgressResult.stdout
        stderr = $inProgressResult.stderr
        exitCode = [string]$inProgressResult.exitCode
    }
}

$codexResult = Invoke-StageCommand `
    -FilePath "C:\dev\PathOS\n8n-lab\scripts\invoke-codex.ps1" `
    -Arguments @(
        "-RunId", $RunId,
        "-RunPath", $runPath,
        "-RepoPath", $repoPath
    )

$parsedExecution = Get-FirstJsonObject -Text $codexResult.stdout
$codexCompleted = $codexResult.stdout -like "*CODEX_COMPLETED::$RunId*"
$nextStatus = if ($codexCompleted) { "codex_review_complete" } else { "codex_failed" }
$statusNote = if ($codexCompleted) { "Codex execution completed and ready for follow-up review." } else { "Codex execution failed." }

$finalStatusResult = Invoke-StageCommand `
    -FilePath "C:\dev\PathOS\n8n-lab\scripts\update-run-status.ps1" `
    -Arguments @(
        "-RunId", $RunId,
        "-RunsRoot", $RunsRoot,
        "-NewStatus", $nextStatus,
        "-ReviewStatus", "approved",
        "-StatusNote", $statusNote
    )

if ($finalStatusResult.exitCode -ne 0) {
    Out-Result -Data @{
        status = "failure"
        message = "Final Codex status update failed"
        runId = $RunId
        nextStatus = $nextStatus
        stdout = $finalStatusResult.stdout
        stderr = $finalStatusResult.stderr
        exitCode = [string]$finalStatusResult.exitCode
        execution = $parsedExecution
    }
}

Out-Result -Data @{
    status = if ($codexCompleted) { "success" } else { "failure" }
    message = if ($codexCompleted) { "Codex execution succeeded" } else { "Codex execution failed" }
    runId = $RunId
    nextStatus = $nextStatus
    stdout = $codexResult.stdout
    stderr = $codexResult.stderr
    exitCode = [string]$codexResult.exitCode
    execution = $parsedExecution
} -ExitCode $(if ($codexCompleted) { 0 } else { 1 })
