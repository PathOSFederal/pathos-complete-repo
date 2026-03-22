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

function Test-NonEmptyValue {
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

function Add-LiveLogLine {
    param(
        [string]$Message
    )

    $line = "[" + (Get-Date).ToString("o") + "] " + $Message
    Add-Content -Path $workerLiveLogPath -Value $line -Encoding utf8
}

function Add-WorkerEvent {
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

    Add-Content -Path $workerEventsPath -Value (($event | ConvertTo-Json -Compress -Depth 20)) -Encoding utf8
}

function Update-WorkerStatus {
    param(
        [hashtable]$Fields
    )

    if ($null -eq $script:workerStatus) {
        $script:workerStatus = @{}
    }

    foreach ($key in $Fields.Keys) {
        $script:workerStatus[$key] = $Fields[$key]
    }

    $script:workerStatus["runId"] = $RunId
    $script:workerStatus["runPath"] = $RunPath
    $script:workerStatus["repoPath"] = $RepoPath
    $script:workerStatus["worker"] = "claude_code"
    $script:workerStatus["executionMode"] = "claude_code_cli"
    $script:workerStatus["workerLiveLogPath"] = $workerLiveLogPath
    $script:workerStatus["workerEventsPath"] = $workerEventsPath
    $script:workerStatus["repoBaselinePath"] = $repoBaselinePath
    $script:workerStatus["repoDeltaPath"] = $repoDeltaPath
    $script:workerStatus["lastHeartbeatAt"] = (Get-Date).ToString("o")

    Write-JsonArtifact -Path $workerStatusPath -Data $script:workerStatus
}

function Get-CommandOutputText {
    param(
        [string]$Path
    )

    if (Test-Path $Path) {
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

    return ""
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

    $baselineLookup = @{}
    foreach ($path in $BaselineSnapshot["dirtyFiles"]) {
        $baselineLookup[$path] = $true
    }

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

        if (($baselineEntry["sha256"] -ne $currentEntry["sha256"]) -or ($baselineEntry["length"] -ne $currentEntry["length"]) -or ($baselineEntry["lastWriteTimeUtc"] -ne $currentEntry["lastWriteTimeUtc"])) {
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

function New-ExecutionArtifact {
    param(
        [string]$StageStatus,
        [bool]$Succeeded,
        [string]$Message,
        [string]$CursorPromptPath,
        [string]$TaskPath,
        [string]$StatusPath,
        [string]$ResultPath,
        [string]$StartedAt,
        [string]$EndedAt,
        [string]$ExecutionMode,
        [string[]]$ChangedFiles,
        [string]$WorkerCommand,
        [string]$WorkerSummary,
        [bool]$ImplementationAttempted
    )

    return [ordered]@{
        runId                   = $RunId
        runPath                 = $RunPath
        repoPath                = $RepoPath
        stage                   = "cursor_execution"
        stageStatus             = $StageStatus
        succeeded               = $Succeeded
        message                 = $Message
        executionMode           = $ExecutionMode
        implementationAttempted = $ImplementationAttempted
        worker                  = "claude_code"
        workerCommand           = $WorkerCommand
        workerSummary           = $WorkerSummary
        changedFiles            = $ChangedFiles
        cursorPromptPath        = $CursorPromptPath
        taskPath                = $TaskPath
        statusPath              = $StatusPath
        resultPath              = $ResultPath
        workerLiveLogPath       = $workerLiveLogPath
        workerEventsPath        = $workerEventsPath
        workerStatusPath        = $workerStatusPath
        repoBaselinePath        = $repoBaselinePath
        repoDeltaPath           = $repoDeltaPath
        startedAt               = $StartedAt
        endedAt                 = $EndedAt
        stdoutMarker            = if ($Succeeded) { "CURSOR_COMPLETED::$RunId" } else { "CURSOR_FAILED::$RunId" }
    }
}

function Get-RunStatusObject {
    param(
        [string]$Path
    )

    $raw = Get-Content -Path $Path -Raw
    return ($raw | ConvertFrom-Json)
}

function Get-ClassificationFromSummary {
    param(
        [string]$Summary
    )

    $normalized = if ([string]::IsNullOrWhiteSpace($Summary)) { "" } else { $Summary.ToLowerInvariant() }

    if ($normalized.Contains("already") -and $normalized.Contains("done")) {
        return "perceived_completion"
    }

    if ($normalized.Contains("dirty")) {
        return "dirty_files_blocked"
    }

    if ($normalized.Contains("ambig")) {
        return "ambiguity"
    }

    if ($normalized.Contains("refus")) {
        return "refusal"
    }

    if ([string]::IsNullOrWhiteSpace($Summary)) {
        return "no_summary"
    }

    return "unknown"
}

function Invoke-ClaudeWorker {
    param(
        [string]$RepositoryPath,
        [string]$RunDirectory,
        [string]$CursorPromptPath,
        [string]$TaskPath,
        [hashtable]$BaselineSnapshot,
        [hashtable]$Targeting
    )

    $claudeCommand = Get-Command claude.cmd -ErrorAction SilentlyContinue
    if ($null -eq $claudeCommand) {
        $claudeCommand = Get-Command claude -ErrorAction SilentlyContinue
    }

    if ($null -eq $claudeCommand) {
        throw "Claude Code CLI is not installed or not on PATH."
    }

    $tempRoot = "C:\dev\PathOS\n8n-lab\tmp"
    New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

    $stdoutPath = Join-Path $tempRoot ("claude-stdout-" + $RunId + "-" + [guid]::NewGuid().ToString() + ".log")
    $stderrPath = Join-Path $tempRoot ("claude-stderr-" + $RunId + "-" + [guid]::NewGuid().ToString() + ".log")
    $promptPath = Join-Path $tempRoot ("claude-prompt-" + $RunId + "-" + [guid]::NewGuid().ToString() + ".txt")

    $claudePrompt = @"
You are the implementation worker for a PathOS pipeline run.

Work inside this repository:
$RepositoryPath

Before making edits, read these run artifacts:
- $CursorPromptPath
- $TaskPath

Use those files as the source of truth for the requested implementation.
Make real code changes in the repository when the request is implementable.
Do not commit or push.
Return a short summary of what you changed.
"@

    if ($Targeting["forceTargetedModification"]) {
        $allowedTargetFilesText = if (@($Targeting["allowedTargetFiles"]).Count -gt 0) {
            (@($Targeting["allowedTargetFiles"]) | ForEach-Object { "- $_" }) -join [Environment]::NewLine
        }
        else {
            "- No explicit target files were attached."
        }

        $claudePrompt += @"

Strict targeted execution contract:
- This run requires concrete code changes on the intended target surfaces.
- Already-dirty target files are valid implementation targets and are not a reason to skip implementation.
- Analysis-only behavior does not satisfy this run.
- If the canonical PathAdvisor structure is incomplete, modify the target files directly.
- If you make no code changes, explain exactly why and name the files you inspected.

Allowed target files:
$allowedTargetFilesText
"@
    }

    $workerCommand = 'claude.cmd --print --output-format json --permission-mode bypassPermissions --dangerously-skip-permissions --add-dir "' + $RepositoryPath + '" --add-dir "' + $RunDirectory + '" "<prompt omitted>"'

    try {
        $claudePrompt | Out-File -FilePath $promptPath -Encoding utf8

        Add-LiveLogLine -Message ("Launching Claude worker: " + $workerCommand)
        Add-WorkerEvent -Type "worker_started" -Data @{
            workerCommand = $workerCommand
            baselineDirtyFiles = $BaselineSnapshot["dirtyFiles"]
        }

        Push-Location $RepositoryPath
        try {
            $process = Start-Process -FilePath $claudeCommand.Source `
                -ArgumentList @(
                    "--print",
                    "--output-format", "json",
                    "--permission-mode", "bypassPermissions",
                    "--dangerously-skip-permissions",
                    "--add-dir", $RepositoryPath,
                    "--add-dir", $RunDirectory
                ) `
                -WorkingDirectory $RepositoryPath `
                -PassThru `
                -RedirectStandardInput $promptPath `
                -RedirectStandardOutput $stdoutPath `
                -RedirectStandardError $stderrPath

            $stdoutOffset = 0
            $stderrOffset = 0
            $lastChangedFilesKey = ""

        Update-WorkerStatus -Fields @{
            state = "running"
            startedAt = (Get-Date).ToString("o")
            phase = "invoking_claude"
            pid = $process.Id
            workerCommand = $workerCommand
            baselineDirtyFiles = @($BaselineSnapshot["dirtyFiles"])
            changedFilesSoFar = @()
            message = "Claude Code is running."
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
                            Add-LiveLogLine -Message ("STDOUT " + $line)
                        }
                    }
                }

                $stderrAppend = Read-AppendedText -Path $stderrPath -StartOffset $stderrOffset
                $stderrOffset = $stderrAppend["newOffset"]
                if (-not [string]::IsNullOrWhiteSpace($stderrAppend["text"])) {
                    foreach ($line in ($stderrAppend["text"] -split "`r?`n")) {
                        if (-not [string]::IsNullOrWhiteSpace($line)) {
                            Add-LiveLogLine -Message ("STDERR " + $line)
                        }
                    }
                }

                $deltaSnapshot = Get-ChangedFilesSinceBaseline -BaselineSnapshot $BaselineSnapshot -RepositoryPath $RepositoryPath
                Write-JsonArtifact -Path $repoDeltaPath -Data $deltaSnapshot

                $changedFiles = $deltaSnapshot["changedFilesSinceBaseline"]
                $changedFilesKey = ($changedFiles -join "|")
                if ($changedFilesKey -ne $lastChangedFilesKey) {
                    $lastChangedFilesKey = $changedFilesKey
                    Add-WorkerEvent -Type "changed_files_updated" -Data @{
                        changedFilesSoFar = $changedFiles
                    }
                }

                Update-WorkerStatus -Fields @{
                    state = "running"
                    phase = "invoking_claude"
                    changedFilesSoFar = $changedFiles
                    changedFilesDetectedCount = $changedFiles.Count
                    stdoutBytes = $stdoutOffset
                    stderrBytes = $stderrOffset
                    message = "Claude Code is running."
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
        $parsed = $null

        if (-not [string]::IsNullOrWhiteSpace($stdout)) {
            try {
                $parsed = $stdout | ConvertFrom-Json
            }
            catch {
                $parsed = $null
            }
        }

        if ($null -eq $exitCode) {
            if ($null -ne $parsed -and $parsed.PSObject.Properties.Name -contains "is_error") {
                if ([bool]$parsed.is_error) {
                    $exitCode = 1
                }
                else {
                    $exitCode = 0
                }
            }
            elseif (-not [string]::IsNullOrWhiteSpace($stderr)) {
                $exitCode = 1
            }
            else {
                $exitCode = 0
            }
        }

        $finalDeltaSnapshot = Get-ChangedFilesSinceBaseline -BaselineSnapshot $BaselineSnapshot -RepositoryPath $RepositoryPath
        Write-JsonArtifact -Path $repoDeltaPath -Data $finalDeltaSnapshot

        Update-WorkerStatus -Fields @{
            state = if ($exitCode -eq 0) { "completed" } else { "failed" }
            phase = "worker_exited"
            endedAt = (Get-Date).ToString("o")
            changedFilesSoFar = $finalDeltaSnapshot["changedFilesSinceBaseline"]
            changedFilesDetectedCount = $finalDeltaSnapshot["changedFilesSinceBaseline"].Count
            stdoutBytes = $stdout.Length
            stderrBytes = $stderr.Length
            message = if ($exitCode -eq 0) { "Claude Code process exited." } else { "Claude Code process exited with a non-zero status." }
            lastEvent = "worker_exited"
        }

        Add-WorkerEvent -Type "worker_exited" -Data @{
            exitCode = $exitCode
            changedFilesSoFar = @($finalDeltaSnapshot["changedFilesSinceBaseline"])
        }

        return [ordered]@{
            exitCode      = $exitCode
            stdout        = $stdout
            stderr        = $stderr
            parsed        = $parsed
            workerCommand = $workerCommand
            deltaSnapshot = $finalDeltaSnapshot
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

$cursorPromptPath = Join-Path $RunPath "cursorPrompt.md"
$taskPath = Join-Path $RunPath "task.md"
$statusPath = Join-Path $RunPath "status.json"
$resultPath = Join-Path $RunPath "cursor-result.md"
$executionArtifactPath = Join-Path $RunPath "cursor-execution.json"
$workerLiveLogPath = Join-Path $RunPath "worker-live.log"
$workerEventsPath = Join-Path $RunPath "worker-events.jsonl"
$workerStatusPath = Join-Path $RunPath "worker-status.json"
$repoBaselinePath = Join-Path $RunPath "repo-baseline.json"
$repoDeltaPath = Join-Path $RunPath "repo-delta.json"
$startedAt = (Get-Date).ToString("o")
$script:workerStatus = @{}

"" | Out-File -FilePath $workerLiveLogPath -Encoding utf8
"" | Out-File -FilePath $workerEventsPath -Encoding utf8

try {
    Test-NonEmptyValue -Name "RunId" -Value $RunId
    Test-NonEmptyValue -Name "RunPath" -Value $RunPath
    Test-NonEmptyValue -Name "RepoPath" -Value $RepoPath

    Assert-PathExists -Label "RunPath" -PathValue $RunPath
    Assert-PathExists -Label "RepoPath" -PathValue $RepoPath
    Assert-PathExists -Label "Git metadata path" -PathValue (Join-Path $RepoPath ".git")

    Assert-FileExists -Label "cursorPrompt.md" -FilePath $cursorPromptPath
    Assert-FileExists -Label "task.md" -FilePath $taskPath
    Assert-FileExists -Label "status.json" -FilePath $statusPath

    $runStatus = Get-RunStatusObject -Path $statusPath
    $allowedTargetFiles = @()
    if ($null -ne $runStatus.allowedTargetFiles) {
        $allowedTargetFiles = @($runStatus.allowedTargetFiles)
    }
    $strictTargeting = [ordered]@{
        forceTargetedModification = ([string]$runStatus.forceTargetedModification -eq "true")
        noOpOnTargetFilesIsFailure = ([string]$runStatus.noOpOnTargetFilesIsFailure -eq "true")
        allowedTargetFiles = $allowedTargetFiles
    }

    Add-LiveLogLine -Message "Starting implementation worker run."

    $baselineSnapshot = Get-RepoBaselineSnapshot -RepositoryPath $RepoPath
    Write-JsonArtifact -Path $repoBaselinePath -Data $baselineSnapshot
    Write-JsonArtifact -Path $repoDeltaPath -Data ([ordered]@{
        capturedAt = (Get-Date).ToString("o")
        repoPath = $RepoPath
        currentDirtyFiles = @($baselineSnapshot["dirtyFiles"])
        currentFingerprints = $baselineSnapshot["fingerprints"]
        changedFilesSinceBaseline = @()
    })

    Update-WorkerStatus -Fields @{
        state = "starting"
        startedAt = $startedAt
        phase = "collecting_baseline"
        baselineDirtyFiles = @($baselineSnapshot["dirtyFiles"])
        changedFilesSoFar = @()
        changedFilesDetectedCount = 0
        message = "Preparing Claude Code execution."
        lastEvent = "starting"
        stdoutBytes = 0
        stderrBytes = 0
    }

    Add-WorkerEvent -Type "baseline_captured" -Data @{
        baselineDirtyFiles = $baselineSnapshot["dirtyFiles"]
        allowedTargetFiles = $strictTargeting["allowedTargetFiles"]
        forceTargetedModification = $strictTargeting["forceTargetedModification"]
        noOpOnTargetFilesIsFailure = $strictTargeting["noOpOnTargetFilesIsFailure"]
    }

    $workerResult = Invoke-ClaudeWorker -RepositoryPath $RepoPath -RunDirectory $RunPath -CursorPromptPath $cursorPromptPath -TaskPath $taskPath -BaselineSnapshot $baselineSnapshot -Targeting $strictTargeting
    $deltaSnapshot = $workerResult.deltaSnapshot
    $changedFiles = @($deltaSnapshot["changedFilesSinceBaseline"])

    $parsedResult = $workerResult.parsed
    $workerSummary = ""
    if ($null -ne $parsedResult) {
        $workerSummary = [string]$parsedResult.result
    }
    $noChangeReasonClassification = Get-ClassificationFromSummary -Summary $workerSummary
    $allowedTargetFiles = @($strictTargeting["allowedTargetFiles"])
    $matchedTargetFiles = @()
    if ($allowedTargetFiles.Count -gt 0) {
        foreach ($changedFile in $changedFiles) {
            if ($allowedTargetFiles -contains $changedFile) {
                $matchedTargetFiles += $changedFile
            }
        }
    }
    else {
        $matchedTargetFiles = @($changedFiles)
    }

    if ($workerResult.exitCode -ne 0) {
        $failureReason = if ($null -ne $parsedResult -and -not [string]::IsNullOrWhiteSpace([string]$parsedResult.result)) {
            [string]$parsedResult.result
        }
        elseif (-not [string]::IsNullOrWhiteSpace($workerResult.stderr)) {
            $workerResult.stderr.Trim()
        }
        else {
            "Claude Code execution failed."
        }

        throw $failureReason
    }

    if ($null -ne $parsedResult -and $parsedResult.PSObject.Properties.Name -contains "is_error" -and [bool]$parsedResult.is_error) {
        $failureReason = if (-not [string]::IsNullOrWhiteSpace([string]$parsedResult.result)) {
            [string]$parsedResult.result
        }
        else {
            "Claude Code reported an error."
        }

        throw $failureReason
    }

    if ($strictTargeting["noOpOnTargetFilesIsFailure"] -and $matchedTargetFiles.Count -eq 0) {
        throw "no_target_surface_changes_detected"
    }

    if ($changedFiles.Count -eq 0) {
        throw "Claude Code completed without producing detectable repository changes."
    }

    @"
# Claude Code Result

Claude Code was invoked as the implementation worker for run `$RunId`.

## Outcome
- Real implementation attempt was executed through Claude Code.
- Repository changes were detected after the worker completed.

## Changed Files
$(($changedFiles | ForEach-Object { "- $_" }) -join [Environment]::NewLine)

## Target Surface Matches
$(($matchedTargetFiles | ForEach-Object { "- $_" }) -join [Environment]::NewLine)

## Worker Summary
$workerSummary
"@ | Out-File -FilePath $resultPath -Encoding utf8

    $endedAt = (Get-Date).ToString("o")
    $artifact = New-ExecutionArtifact `
        -StageStatus "completed" `
        -Succeeded $true `
        -Message "Claude Code implementation completed and repository changes were detected." `
        -CursorPromptPath $cursorPromptPath `
        -TaskPath $taskPath `
        -StatusPath $statusPath `
        -ResultPath $resultPath `
        -StartedAt $startedAt `
        -EndedAt $endedAt `
        -ExecutionMode "claude_code_cli" `
        -ChangedFiles $changedFiles `
        -WorkerCommand $workerResult.workerCommand `
        -WorkerSummary $workerSummary `
        -ImplementationAttempted $true

    $artifact["workerStdout"] = $workerResult.stdout
    $artifact["workerStderr"] = $workerResult.stderr
    $artifact["allowedTargetFiles"] = $allowedTargetFiles
    $artifact["matchedTargetFiles"] = $matchedTargetFiles
    $artifact["noChangeReasonClassification"] = $noChangeReasonClassification

    Update-WorkerStatus -Fields @{
        state = "completed"
        phase = "completed"
        endedAt = $endedAt
        changedFilesSoFar = $changedFiles
        changedFilesDetectedCount = $changedFiles.Count
        matchedTargetFiles = $matchedTargetFiles
        matchedTargetFilesCount = $matchedTargetFiles.Count
        message = "Claude Code completed with detected repository changes."
        workerSummary = $workerSummary
        lastEvent = "completed"
    }

    Add-WorkerEvent -Type "completed" -Data @{
        changedFilesSoFar = $changedFiles
        matchedTargetFiles = $matchedTargetFiles
        workerSummary = $workerSummary
    }

    Add-LiveLogLine -Message "Claude Code completed with detectable repository changes."

    Write-JsonArtifact -Path $executionArtifactPath -Data $artifact

    Write-Output ($artifact | ConvertTo-Json -Compress -Depth 20)
    Write-Output "CURSOR_COMPLETED::$RunId"
    exit 0
}
catch {
    $endedAt = (Get-Date).ToString("o")
    $failureMessage = $_.Exception.Message

    @"
# Claude Code Result — Failure

Claude Code did not complete a usable implementation for run `$RunId`.

## Error
$failureMessage

## Timestamp
$endedAt

## Note
The pipeline did not claim implementation success.
No downstream success state should be treated as valid from this attempt.
See `cursor-execution.json` for the structured execution record.
"@ | Out-File -FilePath $resultPath -Encoding utf8

    $artifact = New-ExecutionArtifact `
        -StageStatus "failed" `
        -Succeeded $false `
        -Message $failureMessage `
        -CursorPromptPath $cursorPromptPath `
        -TaskPath $taskPath `
        -StatusPath $statusPath `
        -ResultPath $resultPath `
        -StartedAt $startedAt `
        -EndedAt $endedAt `
        -ExecutionMode "claude_code_cli" `
        -ChangedFiles @() `
        -WorkerCommand "claude.cmd" `
        -WorkerSummary "" `
        -ImplementationAttempted $true

    $artifact["allowedTargetFiles"] = $allowedTargetFiles
    $artifact["matchedTargetFiles"] = @()
    $artifact["noChangeReasonClassification"] = $noChangeReasonClassification
    $artifact["workerStdout"] = if ($null -ne $workerResult) { $workerResult.stdout } else { "" }
    $artifact["workerStderr"] = if ($null -ne $workerResult) { $workerResult.stderr } else { "" }

    Update-WorkerStatus -Fields @{
        state = "failed"
        phase = "failed"
        endedAt = $endedAt
        message = $failureMessage
        matchedTargetFiles = @()
        matchedTargetFilesCount = 0
        noChangeReasonClassification = $noChangeReasonClassification
        lastEvent = "failed"
    }

    Add-WorkerEvent -Type "failed" -Data @{
        message = $failureMessage
        allowedTargetFiles = $allowedTargetFiles
        noChangeReasonClassification = $noChangeReasonClassification
    }

    Add-LiveLogLine -Message ("Claude Code failed: " + $failureMessage)

    Write-JsonArtifact -Path $executionArtifactPath -Data $artifact

    Write-Output ($artifact | ConvertTo-Json -Compress -Depth 20)
    Write-Output "CURSOR_FAILED::$RunId"
    exit 1
}
