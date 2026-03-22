[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$RunId,

    [Parameter(Mandatory = $true)]
    [string]$RunPath,

    [Parameter(Mandatory = $true)]
    [string]$RepoPath
)

$ErrorActionPreference = "Stop"

function Test-RequiredValue {
    param(
        [string]$Name,
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "$Name is empty."
    }
}

function Assert-PathExists {
    param(
        [string]$Label,
        [string]$PathValue
    )

    if (-not (Test-Path -Path $PathValue)) {
        throw "$Label does not exist: $PathValue"
    }
}

function Assert-FileExists {
    param(
        [string]$Label,
        [string]$FilePath
    )

    if (-not (Test-Path -Path $FilePath -PathType Leaf)) {
        throw "$Label not found: $FilePath"
    }
}

function Write-JsonArtifact {
    param(
        [string]$Path,
        [object]$Data
    )

    $Data | ConvertTo-Json -Depth 20 | Out-File -FilePath $Path -Encoding utf8
}

function Add-CodexLogLine {
    param(
        [string]$Message
    )

    $line = "[" + (Get-Date).ToString("o") + "] " + $Message
    Add-Content -Path $codexLiveLogPath -Value $line -Encoding utf8
}

function Add-CodexEvent {
    param(
        [string]$Type,
        [hashtable]$Data = @{}
    )

    $event = [ordered]@{
        timestamp = (Get-Date).ToString("o")
        runId = $RunId
        type = $Type
    }

    foreach ($key in $Data.Keys) {
        $event[$key] = $Data[$key]
    }

    Add-Content -Path $codexEventsPath -Value (($event | ConvertTo-Json -Compress -Depth 20)) -Encoding utf8
}

function Update-CodexStatus {
    param(
        [hashtable]$Fields
    )

    if ($null -eq $script:codexStatus) {
        $script:codexStatus = @{}
    }

    foreach ($key in $Fields.Keys) {
        $script:codexStatus[$key] = $Fields[$key]
    }

    $script:codexStatus["runId"] = $RunId
    $script:codexStatus["runPath"] = $RunPath
    $script:codexStatus["repoPath"] = $RepoPath
    $script:codexStatus["worker"] = "codex"
    $script:codexStatus["executionMode"] = "codex_exec_cli"
    $script:codexStatus["codexLiveLogPath"] = $codexLiveLogPath
    $script:codexStatus["codexEventsPath"] = $codexEventsPath
    $script:codexStatus["codexBaselinePath"] = $codexBaselinePath
    $script:codexStatus["codexDeltaPath"] = $codexDeltaPath
    $script:codexStatus["lastHeartbeatAt"] = (Get-Date).ToString("o")

    Write-JsonArtifact -Path $codexStatusPath -Data $script:codexStatus
}

function Get-CommandOutputText {
    param(
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return ""
    }

    $fileStream = $null
    $reader = $null

    try {
        $fileStream = New-Object System.IO.FileStream($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        $reader = New-Object System.IO.StreamReader($fileStream, [System.Text.Encoding]::UTF8, $true)
        return $reader.ReadToEnd()
    }
    finally {
        if ($null -ne $reader) {
            $reader.Dispose()
        }

        if ($null -ne $fileStream) {
            $fileStream.Dispose()
        }
    }
}

function Get-RepoStatusSnapshot {
    param(
        [string]$RepositoryPath
    )

    $trackedDiff = & git -C $RepositoryPath diff --name-only -- 2>$null
    $cachedDiff = & git -C $RepositoryPath diff --cached --name-only -- 2>$null
    $untracked = & git -C $RepositoryPath ls-files --others --exclude-standard 2>$null

    $files = @()
    foreach ($entry in @($trackedDiff) + @($cachedDiff) + @($untracked)) {
        if (-not [string]::IsNullOrWhiteSpace($entry)) {
            $files += [string]$entry
        }
    }

    return ,($files | Sort-Object -Unique)
}

function Get-FileHashSafe {
    param(
        [string]$Path
    )

    try {
        if (Test-Path -Path $Path -PathType Leaf) {
            return (Get-FileHash -Path $Path -Algorithm SHA256).Hash
        }
    }
    catch {
        return ""
    }

    return ""
}

function Get-FileFingerprintMap {
    param(
        [string]$RepositoryPath,
        [string[]]$RelativePaths
    )

    $map = @{}
    foreach ($relativePath in $RelativePaths) {
        if ([string]::IsNullOrWhiteSpace($relativePath)) {
            continue
        }

        $absolutePath = Join-Path $RepositoryPath $relativePath
        $entry = [ordered]@{
            path = $relativePath
            exists = $false
            length = 0
            lastWriteTimeUtc = ""
            sha256 = ""
        }

        if (Test-Path -Path $absolutePath -PathType Leaf) {
            $item = Get-Item -Path $absolutePath
            $entry["exists"] = $true
            $entry["length"] = [int64]$item.Length
            $entry["lastWriteTimeUtc"] = $item.LastWriteTimeUtc.ToString("o")
            $entry["sha256"] = Get-FileHashSafe -Path $absolutePath
        }

        $map[$relativePath] = $entry
    }

    return $map
}

function Get-RepoBaselineSnapshot {
    param(
        [string]$RepositoryPath
    )

    $dirtyFiles = Get-RepoStatusSnapshot -RepositoryPath $RepositoryPath
    $fingerprints = Get-FileFingerprintMap -RepositoryPath $RepositoryPath -RelativePaths $dirtyFiles

    return [ordered]@{
        capturedAt = (Get-Date).ToString("o")
        repoPath = $RepositoryPath
        dirtyFiles = @($dirtyFiles)
        fingerprints = $fingerprints
    }
}

function Get-ChangedFilesSinceBaseline {
    param(
        [hashtable]$BaselineSnapshot,
        [string]$RepositoryPath
    )

    $currentDirtyFiles = Get-RepoStatusSnapshot -RepositoryPath $RepositoryPath
    $currentFingerprints = Get-FileFingerprintMap -RepositoryPath $RepositoryPath -RelativePaths $currentDirtyFiles
    $changedFiles = @()

    foreach ($path in $currentDirtyFiles) {
        $baselineEntry = $null
        $currentEntry = $currentFingerprints[$path]

        if ($BaselineSnapshot["fingerprints"].ContainsKey($path)) {
            $baselineEntry = $BaselineSnapshot["fingerprints"][$path]
        }

        if ($null -eq $baselineEntry) {
            $changedFiles += $path
            continue
        }

        if (($baselineEntry["sha256"] -ne $currentEntry["sha256"]) -or
            ($baselineEntry["length"] -ne $currentEntry["length"]) -or
            ($baselineEntry["lastWriteTimeUtc"] -ne $currentEntry["lastWriteTimeUtc"])) {
            $changedFiles += $path
        }
    }

    return [ordered]@{
        capturedAt = (Get-Date).ToString("o")
        repoPath = $RepositoryPath
        currentDirtyFiles = $currentDirtyFiles
        currentFingerprints = $currentFingerprints
        changedFilesSinceBaseline = @(($changedFiles | Sort-Object -Unique))
    }
}

function Read-AppendedText {
    param(
        [string]$Path,
        [int]$StartOffset
    )

    if (-not (Test-Path $Path)) {
        return [ordered]@{
            newOffset = $StartOffset
            text = ""
        }
    }

    $fileStream = $null
    $reader = $null

    try {
        $fileStream = New-Object System.IO.FileStream($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        $reader = New-Object System.IO.StreamReader($fileStream, [System.Text.Encoding]::UTF8, $true)
        $text = $reader.ReadToEnd()

        if ($StartOffset -ge $text.Length) {
            return [ordered]@{
                newOffset = $text.Length
                text = ""
            }
        }

        return [ordered]@{
            newOffset = $text.Length
            text = $text.Substring($StartOffset)
        }
    }
    finally {
        if ($null -ne $reader) {
            $reader.Dispose()
        }

        if ($null -ne $fileStream) {
            $fileStream.Dispose()
        }
    }
}

function Parse-CodexJsonLines {
    param(
        [string]$Text
    )

    $events = @()
    foreach ($line in ($Text -split "`r?`n")) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        try {
            $events += ,($line | ConvertFrom-Json)
        }
        catch {
            continue
        }
    }

    return ,$events
}

function Get-CodexSummaryFromEvents {
    param(
        [object[]]$Events
    )

    $summary = ""
    foreach ($event in $Events) {
        if ($event.type -eq "item.completed" -and $null -ne $event.item -and $event.item.type -eq "agent_message" -and -not [string]::IsNullOrWhiteSpace([string]$event.item.text)) {
            $summary = [string]$event.item.text
        }
    }

    return $summary
}

function Get-CodexChangedFilesFromEvents {
    param(
        [object[]]$Events,
        [string]$RepositoryPath
    )

    $changed = @()
    foreach ($event in $Events) {
        if ($event.type -ne "item.completed" -or $null -eq $event.item -or $event.item.type -ne "file_change") {
            continue
        }

        foreach ($change in @($event.item.changes)) {
            $changePath = [string]$change.path
            if ([string]::IsNullOrWhiteSpace($changePath)) {
                continue
            }

            if ($changePath.StartsWith($RepositoryPath, [System.StringComparison]::OrdinalIgnoreCase)) {
                $relativePath = $changePath.Substring($RepositoryPath.Length).TrimStart('\', '/')
                if (-not [string]::IsNullOrWhiteSpace($relativePath)) {
                    $changed += $relativePath.Replace('/', '\').Replace('\', '/')
                }
            }
        }
    }

    return ,($changed | Sort-Object -Unique)
}

function New-CodexExecutionArtifact {
    param(
        [string]$StageStatus,
        [bool]$Succeeded,
        [string]$Message,
        [string]$StatusPath,
        [string]$HandoffPath,
        [string]$ReviewPath,
        [string]$StartedAt,
        [string]$EndedAt,
        [string]$ExecutionMode,
        [string[]]$ChangedFiles,
        [string]$WorkerCommand,
        [string]$WorkerSummary
    )

    return [ordered]@{
        runId = $RunId
        runPath = $RunPath
        repoPath = $RepoPath
        stage = "codex_execution"
        stageStatus = $StageStatus
        succeeded = $Succeeded
        message = $Message
        executionMode = $ExecutionMode
        implementationAttempted = $true
        worker = "codex"
        workerExitCode = ""
        workerCommand = $WorkerCommand
        workerSummary = $WorkerSummary
        changedFiles = $ChangedFiles
        statusPath = $StatusPath
        handoffPath = $HandoffPath
        reviewPath = $ReviewPath
        codexLiveLogPath = $codexLiveLogPath
        codexEventsPath = $codexEventsPath
        codexStatusPath = $codexStatusPath
        codexBaselinePath = $codexBaselinePath
        codexDeltaPath = $codexDeltaPath
        startedAt = $StartedAt
        endedAt = $EndedAt
        stdoutMarker = if ($Succeeded) { "CODEX_COMPLETED::$RunId" } else { "CODEX_FAILED::$RunId" }
    }
}

function Invoke-CodexWorker {
    param(
        [string]$RepositoryPath,
        [string]$RunDirectory,
        [string]$CodexPromptPath,
        [string]$HandoffPath,
        [string]$TaskPath,
        [string]$ReviewPath,
        [hashtable]$BaselineSnapshot
    )

    $codexCommand = Get-Command codex.cmd -ErrorAction SilentlyContinue
    if ($null -eq $codexCommand) {
        $codexCommand = Get-Command codex -ErrorAction SilentlyContinue
    }

    if ($null -eq $codexCommand) {
        throw "Codex CLI is not installed or not on PATH."
    }

    $tempRoot = "C:\dev\PathOS\n8n-lab\tmp"
    New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

    $stdoutPath = Join-Path $tempRoot ("codex-stdout-" + $RunId + "-" + [guid]::NewGuid().ToString() + ".log")
    $stderrPath = Join-Path $tempRoot ("codex-stderr-" + $RunId + "-" + [guid]::NewGuid().ToString() + ".log")
    $promptPath = Join-Path $tempRoot ("codex-prompt-" + $RunId + "-" + [guid]::NewGuid().ToString() + ".txt")

    $codexPrompt = @"
You are the Codex hardening worker for a PathOS pipeline run.

Work inside this repository:
$RepositoryPath

Before making edits, read these run artifacts:
- $CodexPromptPath
- $HandoffPath
- $TaskPath

Use those files as the source of truth for the requested hardening or follow-up implementation.
Make real code changes in the repository when changes are needed.
Run validation where practical.
Do not commit or push.
End with a concise summary of files changed, tests run, and any residual issues.
"@

    $workerCommand = 'codex exec --json -C "' + $RepositoryPath + '" --sandbox danger-full-access --add-dir "' + $RunDirectory + '" -o "' + $ReviewPath + '" "<prompt omitted>"'

    try {
        $codexPrompt | Out-File -FilePath $promptPath -Encoding utf8

        Add-CodexLogLine -Message ("Launching Codex worker: " + $workerCommand)
        Add-CodexEvent -Type "worker_started" -Data @{
            workerCommand = $workerCommand
            baselineDirtyFiles = $BaselineSnapshot["dirtyFiles"]
        }

        Push-Location $RepositoryPath
        try {
            $process = Start-Process -FilePath $codexCommand.Source `
                -ArgumentList @(
                    "exec",
                    "--json",
                    "-C", $RepositoryPath,
                    "--sandbox", "danger-full-access",
                    "--add-dir", $RunDirectory,
                    "-o", $ReviewPath
                ) `
                -WorkingDirectory $RepositoryPath `
                -PassThru `
                -RedirectStandardInput $promptPath `
                -RedirectStandardOutput $stdoutPath `
                -RedirectStandardError $stderrPath

            $stdoutOffset = 0
            $stderrOffset = 0
            $lastChangedFilesKey = ""

            Update-CodexStatus -Fields @{
                state = "running"
                startedAt = (Get-Date).ToString("o")
                phase = "invoking_codex"
                pid = $process.Id
                workerCommand = $workerCommand
                baselineDirtyFiles = @($BaselineSnapshot["dirtyFiles"])
                changedFilesSoFar = @()
                changedFilesDetectedCount = 0
                message = "Codex is running."
                stdoutBytes = 0
                stderrBytes = 0
            }

            while (-not $process.HasExited) {
                Start-Sleep -Seconds 2

                $stdoutAppend = Read-AppendedText -Path $stdoutPath -StartOffset $stdoutOffset
                $stdoutOffset = $stdoutAppend["newOffset"]
                if (-not [string]::IsNullOrWhiteSpace($stdoutAppend["text"])) {
                    foreach ($line in ($stdoutAppend["text"] -split "`r?`n")) {
                        if (-not [string]::IsNullOrWhiteSpace($line)) {
                            Add-CodexLogLine -Message ("STDOUT " + $line)
                        }
                    }
                }

                $stderrAppend = Read-AppendedText -Path $stderrPath -StartOffset $stderrOffset
                $stderrOffset = $stderrAppend["newOffset"]
                if (-not [string]::IsNullOrWhiteSpace($stderrAppend["text"])) {
                    foreach ($line in ($stderrAppend["text"] -split "`r?`n")) {
                        if (-not [string]::IsNullOrWhiteSpace($line)) {
                            Add-CodexLogLine -Message ("STDERR " + $line)
                        }
                    }
                }

                $deltaSnapshot = Get-ChangedFilesSinceBaseline -BaselineSnapshot $BaselineSnapshot -RepositoryPath $RepositoryPath
                Write-JsonArtifact -Path $codexDeltaPath -Data $deltaSnapshot

                $changedFiles = @($deltaSnapshot["changedFilesSinceBaseline"])
                $changedFilesKey = ($changedFiles -join "|")
                if ($changedFilesKey -ne $lastChangedFilesKey) {
                    $lastChangedFilesKey = $changedFilesKey
                    Add-CodexEvent -Type "changed_files_updated" -Data @{
                        changedFilesSoFar = $changedFiles
                    }
                }

                Update-CodexStatus -Fields @{
                    state = "running"
                    phase = "invoking_codex"
                    changedFilesSoFar = $changedFiles
                    changedFilesDetectedCount = $changedFiles.Count
                    stdoutBytes = $stdoutOffset
                    stderrBytes = $stderrOffset
                    message = "Codex is running."
                    lastEvent = if ($changedFiles.Count -gt 0) { "changed_files_updated" } else { "heartbeat" }
                }
            }

            $process.WaitForExit()
            $process.Refresh()
            $exitCode = $process.ExitCode
        }
        finally {
            Pop-Location
        }

        $stdout = Get-CommandOutputText -Path $stdoutPath
        $stderr = Get-CommandOutputText -Path $stderrPath
        $events = Parse-CodexJsonLines -Text $stdout
        $summary = Get-CodexSummaryFromEvents -Events $events
        $eventChangedFiles = Get-CodexChangedFilesFromEvents -Events $events -RepositoryPath $RepositoryPath

        $finalDeltaSnapshot = Get-ChangedFilesSinceBaseline -BaselineSnapshot $BaselineSnapshot -RepositoryPath $RepositoryPath
        Write-JsonArtifact -Path $codexDeltaPath -Data $finalDeltaSnapshot

        Update-CodexStatus -Fields @{
            state = if ($exitCode -eq 0) { "completed" } else { "failed" }
            phase = "worker_exited"
            endedAt = (Get-Date).ToString("o")
            changedFilesSoFar = @($finalDeltaSnapshot["changedFilesSinceBaseline"])
            changedFilesDetectedCount = @($finalDeltaSnapshot["changedFilesSinceBaseline"]).Count
            stdoutBytes = $stdout.Length
            stderrBytes = $stderr.Length
            message = if ($exitCode -eq 0) { "Codex process exited." } else { "Codex process exited with a non-zero status." }
            lastEvent = "worker_exited"
        }

        Add-CodexEvent -Type "worker_exited" -Data @{
            exitCode = $exitCode
            changedFilesSoFar = @($finalDeltaSnapshot["changedFilesSinceBaseline"])
            eventChangedFiles = @($eventChangedFiles)
        }

        return [ordered]@{
            exitCode = $exitCode
            stdout = $stdout
            stderr = $stderr
            events = $events
            workerCommand = $workerCommand
            deltaSnapshot = $finalDeltaSnapshot
            workerSummary = $summary
            eventChangedFiles = @($eventChangedFiles)
        }
    }
    finally {
        if (Test-Path $stdoutPath) {
            Remove-Item $stdoutPath -Force -ErrorAction SilentlyContinue
        }

        if (Test-Path $stderrPath) {
            Remove-Item $stderrPath -Force -ErrorAction SilentlyContinue
        }

        if (Test-Path $promptPath) {
            Remove-Item $promptPath -Force -ErrorAction SilentlyContinue
        }
    }
}

$statusPath = Join-Path $RunPath "status.json"
$handoffPath = Join-Path $RunPath "codexHandoff.md"
$codexPromptPath = Join-Path $RunPath "codexPrompt.md"
$taskPath = Join-Path $RunPath "task.md"
$executionArtifactPath = Join-Path $RunPath "codex-execution.json"
$reviewPath = Join-Path $RunPath "codexReview.md"
$codexLiveLogPath = Join-Path $RunPath "codex-live.log"
$codexEventsPath = Join-Path $RunPath "codex-events.jsonl"
$codexStatusPath = Join-Path $RunPath "codex-status.json"
$codexBaselinePath = Join-Path $RunPath "codex-baseline.json"
$codexDeltaPath = Join-Path $RunPath "codex-delta.json"
$startedAt = (Get-Date).ToString("o")
$script:codexStatus = @{}

"" | Out-File -FilePath $codexLiveLogPath -Encoding utf8
"" | Out-File -FilePath $codexEventsPath -Encoding utf8

try {
    Test-RequiredValue -Name "RunId" -Value $RunId
    Test-RequiredValue -Name "RunPath" -Value $RunPath
    Test-RequiredValue -Name "RepoPath" -Value $RepoPath

    Assert-PathExists -Label "RunPath" -PathValue $RunPath
    Assert-PathExists -Label "RepoPath" -PathValue $RepoPath
    Assert-PathExists -Label "Git metadata path" -PathValue (Join-Path $RepoPath ".git")

    Assert-FileExists -Label "status.json" -FilePath $statusPath
    Assert-FileExists -Label "codexHandoff.md" -FilePath $handoffPath
    Assert-FileExists -Label "codexPrompt.md" -FilePath $codexPromptPath
    Assert-FileExists -Label "task.md" -FilePath $taskPath

    Add-CodexLogLine -Message "Starting Codex execution stage."

    $baselineSnapshot = Get-RepoBaselineSnapshot -RepositoryPath $RepoPath
    Write-JsonArtifact -Path $codexBaselinePath -Data $baselineSnapshot
    Write-JsonArtifact -Path $codexDeltaPath -Data ([ordered]@{
        capturedAt = (Get-Date).ToString("o")
        repoPath = $RepoPath
        currentDirtyFiles = @($baselineSnapshot["dirtyFiles"])
        currentFingerprints = $baselineSnapshot["fingerprints"]
        changedFilesSinceBaseline = @()
    })

    Update-CodexStatus -Fields @{
        state = "starting"
        phase = "collecting_baseline"
        startedAt = $startedAt
        baselineDirtyFiles = @($baselineSnapshot["dirtyFiles"])
        changedFilesSoFar = @()
        changedFilesDetectedCount = 0
        message = "Preparing Codex execution."
        lastEvent = "starting"
        stdoutBytes = 0
        stderrBytes = 0
    }

    Add-CodexEvent -Type "baseline_captured" -Data @{
        baselineDirtyFiles = @($baselineSnapshot["dirtyFiles"])
    }

    $workerResult = Invoke-CodexWorker -RepositoryPath $RepoPath -RunDirectory $RunPath -CodexPromptPath $codexPromptPath -HandoffPath $handoffPath -TaskPath $taskPath -ReviewPath $reviewPath -BaselineSnapshot $baselineSnapshot
    $changedFiles = @($workerResult.deltaSnapshot["changedFilesSinceBaseline"])
    $workerSummary = [string]$workerResult.workerSummary
    $completedTurn = @($workerResult.events | Where-Object { $_.type -eq "turn.completed" }).Count -gt 0

    if (($workerResult.exitCode -ne 0) -and (-not $completedTurn)) {
        $failureMessage = if (-not [string]::IsNullOrWhiteSpace($workerSummary)) {
            $workerSummary
        }
        elseif (-not [string]::IsNullOrWhiteSpace($workerResult.stderr)) {
            $workerResult.stderr.Trim()
        }
        else {
            "Codex exited with a non-zero status."
        }

        throw $failureMessage
    }

    if ($changedFiles.Count -eq 0) {
        throw "Codex completed without producing detectable repository changes."
    }

    if (-not (Test-Path $reviewPath) -or [string]::IsNullOrWhiteSpace((Get-Content $reviewPath -Raw))) {
        @"
# Codex Review

$workerSummary
"@ | Out-File -FilePath $reviewPath -Encoding utf8
    }

    $endedAt = (Get-Date).ToString("o")
    $artifact = New-CodexExecutionArtifact `
        -StageStatus "completed" `
        -Succeeded $true `
        -Message "Codex execution completed and repository changes were detected." `
        -StatusPath $statusPath `
        -HandoffPath $handoffPath `
        -ReviewPath $reviewPath `
        -StartedAt $startedAt `
        -EndedAt $endedAt `
        -ExecutionMode "codex_exec_cli" `
        -ChangedFiles $changedFiles `
        -WorkerCommand $workerResult.workerCommand `
        -WorkerSummary $workerSummary

    $artifact["workerExitCode"] = [string]$workerResult.exitCode
    $artifact["workerStdout"] = $workerResult.stdout
    $artifact["workerStderr"] = $workerResult.stderr
    $artifact["eventChangedFiles"] = @($workerResult.eventChangedFiles)
    $artifact["completedTurn"] = $completedTurn

    Update-CodexStatus -Fields @{
        state = "completed"
        phase = "completed"
        endedAt = $endedAt
        changedFilesSoFar = $changedFiles
        changedFilesDetectedCount = $changedFiles.Count
        message = "Codex completed and repo changes were detected."
        lastEvent = "completed"
    }

    Add-CodexEvent -Type "completed" -Data @{
        changedFilesSoFar = $changedFiles
        eventChangedFiles = @($workerResult.eventChangedFiles)
    }

    Add-CodexLogLine -Message "Codex stage completed successfully."

    Write-JsonArtifact -Path $executionArtifactPath -Data $artifact

    Write-Output ($artifact | ConvertTo-Json -Compress -Depth 20)
    Write-Output "CODEX_COMPLETED::$RunId"
    exit 0
}
catch {
    $endedAt = (Get-Date).ToString("o")
    $failureMessage = $_.Exception.Message

    $artifact = New-CodexExecutionArtifact `
        -StageStatus "failed" `
        -Succeeded $false `
        -Message $failureMessage `
        -StatusPath $statusPath `
        -HandoffPath $handoffPath `
        -ReviewPath $reviewPath `
        -StartedAt $startedAt `
        -EndedAt $endedAt `
        -ExecutionMode "codex_exec_cli" `
        -ChangedFiles @() `
        -WorkerCommand "codex exec" `
        -WorkerSummary ""

    $artifact["workerExitCode"] = ""
    Update-CodexStatus -Fields @{
        state = "failed"
        phase = "failed"
        endedAt = $endedAt
        message = $failureMessage
        lastEvent = "failed"
    }

    Add-CodexEvent -Type "failed" -Data @{
        message = $failureMessage
    }

    Add-CodexLogLine -Message ("Codex stage failed: " + $failureMessage)

    Write-JsonArtifact -Path $executionArtifactPath -Data $artifact

    Write-Output ($artifact | ConvertTo-Json -Compress -Depth 20)
    Write-Output "CODEX_FAILED::$RunId"
    exit 1
}
