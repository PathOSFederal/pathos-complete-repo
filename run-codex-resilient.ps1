[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Prompt,

    [Parameter()]
    [string]$ContinuePrompt = 'Continue from the last point, recover from any transient failure, and complete the task.',

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$CodexExecutable = 'codex',

    [Parameter()]
    [ValidateRange(1, 100)]
    [int]$MaxAttempts = 5,

    [Parameter()]
    [ValidateRange(1, 3600)]
    [int]$InitialBackoffSeconds = 5,

    [Parameter()]
    [ValidateRange(1, 86400)]
    [int]$MaxBackoffSeconds = 60,

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$ApprovalPolicy = 'never',

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$SandboxMode = 'workspace-write',

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$LogDirectory = '.\codex-logs',

    [Parameter()]
    [switch]$SkipGitRepoCheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-FullPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    # Resolve relative paths without requiring the target to already exist.
    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }

    return [System.IO.Path]::GetFullPath((Join-Path -Path (Get-Location) -ChildPath $Path))
}

function Ensure-Directory {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function New-AttemptLogPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$DirectoryPath,

        [Parameter(Mandatory = $true)]
        [ValidateRange(1, 9999)]
        [int]$AttemptNumber
    )

    $timestamp = [datetime]::Now.ToString('yyyyMMdd-HHmmss-fff')
    $fileName = 'attempt-{0:D2}-{1}-{2}.jsonl' -f $AttemptNumber, $PID, $timestamp
    return Join-Path -Path $DirectoryPath -ChildPath $fileName
}

function ConvertTo-JsonLineSafe {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [AllowNull()]
        [object]$InputObject
    )

    try {
        return ($InputObject | ConvertTo-Json -Depth 20 -Compress)
    }
    catch {
        return '{"type":"local.serialization_error","message":"Unable to serialize log entry."}'
    }
}

function Try-ParseJsonLine {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Line
    )

    $result = [ordered]@{
        Success = $false
        Object  = $null
    }

    if ([string]::IsNullOrWhiteSpace($Line)) {
        return [pscustomobject]$result
    }

    try {
        $result.Success = $true
        $result.Object = $Line | ConvertFrom-Json -Depth 20
    }
    catch {
        # Invalid JSON lines should never terminate the wrapper. They are logged
        # verbatim and simply ignored by the event parser.
    }

    return [pscustomobject]$result
}

function Get-EventType {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [AllowNull()]
        [object]$Event
    )

    if ($null -eq $Event) {
        return $null
    }

    foreach ($name in @('type', 'event', 'kind')) {
        $property = $Event.PSObject.Properties[$name]
        if ($null -ne $property -and -not [string]::IsNullOrWhiteSpace([string]$property.Value)) {
            return [string]$property.Value
        }
    }

    return $null
}

function Get-ThreadIdFromEvent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [AllowNull()]
        [object]$Event
    )

    if ($null -eq $Event) {
        return $null
    }

    $candidatePaths = @(
        @('thread_id'),
        @('threadId'),
        @('session_id'),
        @('sessionId'),
        @('id'),
        @('thread', 'id'),
        @('thread', 'thread_id'),
        @('thread', 'session_id'),
        @('session', 'id'),
        @('data', 'thread_id'),
        @('data', 'threadId'),
        @('data', 'session_id'),
        @('data', 'sessionId'),
        @('data', 'id')
    )

    foreach ($path in $candidatePaths) {
        $current = $Event
        $found = $true

        foreach ($segment in $path) {
            if ($null -eq $current) {
                $found = $false
                break
            }

            $property = $current.PSObject.Properties[$segment]
            if ($null -eq $property) {
                $found = $false
                break
            }

            $current = $property.Value
        }

        if ($found -and -not [string]::IsNullOrWhiteSpace([string]$current)) {
            return [string]$current
        }
    }

    return $null
}

function New-AttemptState {
    [CmdletBinding()]
    param()

    return [ordered]@{
        ThreadId           = $null
        LastEventType      = $null
        SawTurnCompleted   = $false
        SawTurnFailed      = $false
        SawError           = $false
        ParseErrors        = 0
        ProcessExitCode    = $null
        ExitClassification = 'unknown'
    }
}

function Update-StateFromJsonEvent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$State,

        [Parameter(Mandatory = $true)]
        [AllowNull()]
        [object]$Event
    )

    if ($null -eq $Event) {
        return
    }

    $eventType = Get-EventType -Event $Event
    if (-not [string]::IsNullOrWhiteSpace($eventType)) {
        $State.LastEventType = $eventType
    }

    $threadId = Get-ThreadIdFromEvent -Event $Event
    if (-not [string]::IsNullOrWhiteSpace($threadId)) {
        $State.ThreadId = $threadId
    }

    switch ($eventType) {
        'thread.started' {
            if (-not $State.ThreadId) {
                $State.ThreadId = $threadId
            }
        }
        'turn.completed' {
            $State.SawTurnCompleted = $true
        }
        'turn.failed' {
            $State.SawTurnFailed = $true
        }
        'error' {
            $State.SawError = $true
        }
    }
}

function Get-ExitClassification {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$State
    )

    if ($State.SawTurnCompleted -and -not $State.SawTurnFailed -and -not $State.SawError) {
        return 'success'
    }

    if ($State.SawTurnFailed) {
        return 'turn_failed'
    }

    if ($State.SawError) {
        return 'error_event'
    }

    if ($null -ne $State.ProcessExitCode -and $State.ProcessExitCode -ne 0) {
        return 'process_exit_nonzero'
    }

    if ($State.ParseErrors -gt 0) {
        return 'json_parse_warning'
    }

    return 'incomplete'
}

function Write-StatusFile {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$StatusPath,

        [Parameter(Mandatory = $true)]
        [string]$RepoRootValue,

        [Parameter(Mandatory = $true)]
        [int]$Attempt,

        [Parameter(Mandatory = $true)]
        [int]$MaxAttemptsValue,

        [Parameter(Mandatory = $true)]
        [string]$Mode,

        [Parameter()]
        [AllowNull()]
        [string]$ThreadId,

        [Parameter(Mandatory = $true)]
        [datetimeoffset]$StartedAt,

        [Parameter(Mandatory = $true)]
        [datetimeoffset]$EndedAt,

        [Parameter(Mandatory = $true)]
        [string]$ExitClassification,

        [Parameter()]
        [AllowNull()]
        [string]$LastEventType,

        [Parameter(Mandatory = $true)]
        [string]$LogPath,

        [Parameter(Mandatory = $true)]
        [string[]]$Command
    )

    $statusObject = [ordered]@{
        repo_root           = $RepoRootValue
        attempt             = $Attempt
        max_attempts        = $MaxAttemptsValue
        mode                = $Mode
        thread_id           = $ThreadId
        started_at          = $StartedAt.ToString('o')
        ended_at            = $EndedAt.ToString('o')
        exit_classification = $ExitClassification
        last_event_type     = $LastEventType
        log_path            = $LogPath
        command             = $Command
    }

    $json = $statusObject | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($StatusPath, $json, [System.Text.UTF8Encoding]::new($false))
}

function Format-ArgumentForDisplay {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Value
    )

    if ($Value -match '[\s"]') {
        return '"' + ($Value -replace '"', '\"') + '"'
    }

    return $Value
}

function Build-CodexCommand {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('fresh', 'resume-id', 'resume-last')]
        [string]$Mode,

        [Parameter(Mandatory = $true)]
        [string]$RepoRootValue,

        [Parameter(Mandatory = $true)]
        [string]$PromptValue,

        [Parameter(Mandatory = $true)]
        [string]$CodexExecutableValue,

        [Parameter(Mandatory = $true)]
        [string]$ApprovalPolicyValue,

        [Parameter(Mandatory = $true)]
        [string]$SandboxModeValue,

        [Parameter()]
        [AllowNull()]
        [string]$ThreadId,

        [Parameter()]
        [switch]$SkipGitRepoCheckValue
    )

    $arguments = [System.Collections.Generic.List[string]]::new()
    $arguments.Add('exec')

    switch ($Mode) {
        'fresh' {
        }
        'resume-id' {
            $arguments.Add('resume')
            $arguments.Add($ThreadId)
        }
        'resume-last' {
            $arguments.Add('resume')
            $arguments.Add('--last')
            $arguments.Add('--all')
        }
    }

    $arguments.Add('--cd')
    $arguments.Add($RepoRootValue)
    $arguments.Add('--json')

    if ($SkipGitRepoCheckValue) {
        $arguments.Add('--skip-git-repo-check')
    }

    if ($Mode -eq 'fresh') {
        $arguments.Add('--approval-policy')
        $arguments.Add($ApprovalPolicyValue)
        $arguments.Add('--sandbox')
        $arguments.Add($SandboxModeValue)
    }

    $arguments.Add($PromptValue)

    return [pscustomobject]@{
        FilePath      = $CodexExecutableValue
        Arguments     = [string[]]$arguments
        DisplayString = ((@($CodexExecutableValue) + $arguments) | ForEach-Object {
                Format-ArgumentForDisplay -Value $_
            }) -join ' '
    }
}

function Invoke-CodexAttempt {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [Parameter(Mandatory = $true)]
        [string]$LogPath
    )

    $state = New-AttemptState
    $state.LogPath = $LogPath
    $logWriter = $null
    $logFileStream = $null

    try {
        $logFileStream = [System.IO.File]::Open($LogPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
        $logWriter = [System.IO.StreamWriter]::new($logFileStream, [System.Text.UTF8Encoding]::new($false))
        $logWriter.AutoFlush = $true

        $output = @(& $FilePath @Arguments 2>&1)
        $state.ProcessExitCode = $LASTEXITCODE

        foreach ($entry in $output) {
            $isErrorEntry = $entry -is [System.Management.Automation.ErrorRecord]
            $text = if ($null -eq $entry) {
                ''
            }
            elseif ($isErrorEntry) {
                $entry.ToString()
            }
            else {
                [string]$entry
            }

            foreach ($line in ($text -split "`r?`n")) {
                if ($isErrorEntry) {
                    $payload = [ordered]@{
                        type      = 'local.stderr'
                        timestamp = [datetimeoffset]::UtcNow.ToString('o')
                        message   = $line
                    }
                    $logWriter.WriteLine((ConvertTo-JsonLineSafe -InputObject $payload))

                    $parsed = Try-ParseJsonLine -Line $line
                    if ($parsed.Success) {
                        Update-StateFromJsonEvent -State $state -Event $parsed.Object
                    }

                    continue
                }

                $logWriter.WriteLine($line)
                $parsed = Try-ParseJsonLine -Line $line
                if ($parsed.Success) {
                    Update-StateFromJsonEvent -State $state -Event $parsed.Object
                }
                else {
                    $state.ParseErrors++
                }
            }
        }
    }
    finally {
        if ($null -ne $logWriter) {
            $logWriter.Dispose()
        }

        if ($null -ne $logFileStream) {
            $logFileStream.Dispose()
        }
    }

    $state.ExitClassification = Get-ExitClassification -State $state
    return [pscustomobject]$state
}

function Get-BackoffSeconds {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [int]$Attempt,

        [Parameter(Mandatory = $true)]
        [int]$InitialSeconds,

        [Parameter(Mandatory = $true)]
        [int]$MaxSeconds
    )

    $computed = $InitialSeconds * [math]::Pow(2, [math]::Max(0, $Attempt - 1))
    $rounded = [int][math]::Ceiling($computed)
    return [math]::Min($rounded, $MaxSeconds)
}

try {
    $resolvedRepoRoot = Resolve-FullPath -Path $RepoRoot
    if (-not (Test-Path -LiteralPath $resolvedRepoRoot -PathType Container)) {
        throw "RepoRoot does not exist or is not a directory: $resolvedRepoRoot"
    }

    $resolvedLogDirectory = Resolve-FullPath -Path $LogDirectory
    Ensure-Directory -Path $resolvedLogDirectory

    $statusPath = Join-Path -Path $resolvedLogDirectory -ChildPath 'codex-status.json'
    $latestThreadId = $null
    $success = $false

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        $mode = 'fresh'
        $promptToUse = $Prompt

        if ($attempt -gt 1) {
            $promptToUse = $ContinuePrompt
            if (-not [string]::IsNullOrWhiteSpace($latestThreadId)) {
                $mode = 'resume-id'
            }
            else {
                $mode = 'resume-last'
            }
        }

        $commandInfo = Build-CodexCommand `
            -Mode $mode `
            -RepoRootValue $resolvedRepoRoot `
            -PromptValue $promptToUse `
            -CodexExecutableValue $CodexExecutable `
            -ApprovalPolicyValue $ApprovalPolicy `
            -SandboxModeValue $SandboxMode `
            -ThreadId $latestThreadId `
            -SkipGitRepoCheckValue:$SkipGitRepoCheck

        $logPath = New-AttemptLogPath -DirectoryPath $resolvedLogDirectory -AttemptNumber $attempt
        $startedAt = [datetimeoffset]::Now
        Write-Host ("[{0}] Attempt {1}/{2} using mode '{3}'." -f $startedAt.ToString('u'), $attempt, $MaxAttempts, $mode)
        Write-Host ("Command: {0}" -f $commandInfo.DisplayString)

        $attemptState = Invoke-CodexAttempt -FilePath $commandInfo.FilePath -Arguments $commandInfo.Arguments -LogPath $logPath
        if (-not [string]::IsNullOrWhiteSpace($attemptState.ThreadId)) {
            $latestThreadId = $attemptState.ThreadId
        }

        $endedAt = [datetimeoffset]::Now
        Write-StatusFile `
            -StatusPath $statusPath `
            -RepoRootValue $resolvedRepoRoot `
            -Attempt $attempt `
            -MaxAttemptsValue $MaxAttempts `
            -Mode $mode `
            -ThreadId $latestThreadId `
            -StartedAt $startedAt `
            -EndedAt $endedAt `
            -ExitClassification $attemptState.ExitClassification `
            -LastEventType $attemptState.LastEventType `
            -LogPath $logPath `
            -Command (@($commandInfo.FilePath) + $commandInfo.Arguments)

        $lastEventDisplay = if ($null -ne $attemptState.LastEventType) { $attemptState.LastEventType } else { '<none>' }
        $threadIdDisplay = if ($null -ne $latestThreadId) { $latestThreadId } else { '<none>' }
        Write-Host ("Result: {0}; last event: {1}; thread id: {2}" -f `
                $attemptState.ExitClassification, `
                $lastEventDisplay, `
                $threadIdDisplay)

        if ($attemptState.ExitClassification -eq 'success') {
            $success = $true
            break
        }

        if ($attempt -lt $MaxAttempts) {
            $sleepSeconds = Get-BackoffSeconds -Attempt $attempt -InitialSeconds $InitialBackoffSeconds -MaxSeconds $MaxBackoffSeconds
            Write-Warning ("Attempt {0} did not complete successfully. Retrying in {1} second(s)." -f $attempt, $sleepSeconds)
            Start-Sleep -Seconds $sleepSeconds
        }
    }

    if ($success) {
        Write-Host ("Completed successfully after {0} attempt(s)." -f ($attempt))
        exit 0
    }

    Write-Error ("Codex did not complete successfully after {0} attempts. Review status file: {1}" -f $MaxAttempts, $statusPath)
    exit 1
}
catch {
    Write-Error $_
    exit 1
}
