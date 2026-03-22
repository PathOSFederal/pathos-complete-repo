Set-StrictMode -Version Latest

function Get-CodexRetryDefaultConfig {
    return [ordered]@{
        executable               = "codex"
        approval_policy          = "never"
        sandbox_mode             = "workspace-write"
        max_attempts             = 3
        initial_backoff_seconds  = 5
        max_backoff_seconds      = 60
        continue_instruction     = @"
Continue from the interruption.
Do not restart from scratch and do not redo already completed work.
Before taking any new action, inspect the current repository state, git diff, generated artifacts, logs, and any partial work from the interrupted run.
Resume from the last useful point, preserve existing progress, and then finish the task.
"@
    }
}

function New-CodexAttemptStatusRecord {
    param(
        [string]$AttemptId,
        [int]$AttemptNumber,
        [int]$MaxAttempts,
        [string]$Mode,
        [string]$StartedAt,
        [string]$LogPath
    )

    return [ordered]@{
        attempt_id               = $AttemptId
        current_attempt          = $AttemptNumber
        total_max_attempts       = $MaxAttempts
        mode                     = $Mode
        started_at               = $StartedAt
        ended_at                 = ""
        exit_classification      = "retryable_failure"
        last_detected_event_type = ""
        log_path                 = $LogPath
        stderr_path              = ""
        exit_code                = $null
        codex_session_id         = ""
        fallback_from_resume     = $false
        fallback_reason          = ""
        note                     = ""
    }
}

function Get-CodexJsonlSummary {
    param([string[]]$Lines)

    # Codex `exec --json` emits JSONL, but real-world stdout can still contain noise. We parse
    # line-by-line and ignore malformed entries so a stray non-JSON line does not kill recovery.
    $parsedEvents = @()
    $lastEventType = ""
    $lastSessionId = ""
    $lastCompletionIndex = -1
    $lastFailureIndex = -1

    for ($i = 0; $i -lt $Lines.Count; $i++) {
        $line = [string]$Lines[$i]
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        try {
            $evt = $line | ConvertFrom-Json -AsHashtable
            if ($null -eq $evt) { continue }
            $parsedEvents += $evt
            $eventType = ""
            if ($evt.ContainsKey("type")) { $eventType = [string]$evt.type }
            elseif ($evt.ContainsKey("event")) { $eventType = [string]$evt.event }
            if (-not [string]::IsNullOrWhiteSpace($eventType)) {
                $lastEventType = $eventType
                if ($eventType -eq "turn.completed") { $lastCompletionIndex = $i }
                if ($eventType -in @("turn.failed", "error")) { $lastFailureIndex = $i }
            }

            foreach ($key in @("thread_id", "session_id", "id")) {
                if ($evt.ContainsKey($key) -and -not [string]::IsNullOrWhiteSpace([string]$evt[$key])) {
                    $lastSessionId = [string]$evt[$key]
                    break
                }
            }
        }
        catch {
            continue
        }
    }

    $completedSuccessfully = ($lastCompletionIndex -ge 0) -and ($lastCompletionIndex -gt $lastFailureIndex)
    return [ordered]@{
        parsed_event_count       = $parsedEvents.Count
        last_detected_event_type = $lastEventType
        codex_session_id         = $lastSessionId
        completed_successfully   = $completedSuccessfully
        saw_completion           = ($lastCompletionIndex -ge 0)
        saw_failure              = ($lastFailureIndex -ge 0)
    }
}

function Test-CodexResumeUnavailable {
    param(
        [string]$StdoutText,
        [string]$StderrText
    )

    $combined = ("{0}`n{1}" -f [string]$StdoutText, [string]$StderrText).ToLowerInvariant()
    foreach ($needle in @(
        "no session",
        "no resumable session",
        "could not find session",
        "failed to find session",
        "there is no previous session",
        "unable to resume",
        "resume requires a previous session",
        "no recorded session"
    )) {
        if ($combined.Contains($needle)) { return $true }
    }
    return $false
}

function Test-CodexResumeUnusableImmediateFailure {
    param(
        [string]$StdoutText,
        [string]$StderrText,
        [hashtable]$JsonSummary
    )

    if ($JsonSummary.completed_successfully) { return $false }
    if ($JsonSummary.parsed_event_count -gt 0) { return $false }

    $combined = ("{0}`n{1}" -f [string]$StdoutText, [string]$StderrText).ToLowerInvariant()
    foreach ($needle in @(
        "resume failed",
        "unable to resume",
        "session is unusable",
        "invalid session",
        "corrupt session",
        "session unavailable"
    )) {
        if ($combined.Contains($needle)) { return $true }
    }
    return $false
}

function Get-CodexFailureClassification {
    param(
        [int]$ExitCode,
        [string]$StdoutText,
        [string]$StderrText,
        [hashtable]$JsonSummary
    )

    if ($JsonSummary.completed_successfully) {
        return [ordered]@{
            classification = "success"
            reason         = "turn.completed observed"
        }
    }

    $combined = ("{0}`n{1}" -f [string]$StdoutText, [string]$StderrText).ToLowerInvariant()

    foreach ($needle in @(
        "not logged in",
        "unauthorized",
        "authentication",
        "invalid api key",
        "permission denied",
        "unknown option",
        "unexpected argument",
        "sandbox mode",
        "approval policy",
        "is not recognized as the name of a cmdlet",
        "could not find command",
        "command not found"
    )) {
        if ($combined.Contains($needle)) {
            return [ordered]@{
                classification = "terminal_failure"
                reason         = "hard configuration/auth/command failure inferred from CLI output"
            }
        }
    }

    # These patterns are heuristic rather than guaranteed. Codex does not promise a strict stable
    # transient-error taxonomy, so we infer retryability conservatively from obvious interruption
    # text and from failure events that appear without a later successful completion event.
    foreach ($needle in @(
        "timed out",
        "timeout",
        "connection reset",
        "connection aborted",
        "network",
        "stream",
        "provider",
        "temporarily unavailable",
        "econnreset",
        "broken pipe",
        "unexpected eof",
        "429",
        "rate limit",
        "overloaded",
        "transport",
        "disconnect",
        "interrupted"
    )) {
        if ($combined.Contains($needle)) {
            return [ordered]@{
                classification = "retryable_failure"
                reason         = "transient CLI/provider interruption inferred from output"
            }
        }
    }

    if ($JsonSummary.saw_failure -and -not $JsonSummary.saw_completion) {
        return [ordered]@{
            classification = "retryable_failure"
            reason         = "failure event observed without a later completion event"
        }
    }

    if ($ExitCode -eq 0 -and -not $JsonSummary.saw_completion) {
        return [ordered]@{
            classification = "retryable_failure"
            reason         = "process exited cleanly but no successful completion event was observed"
        }
    }

    return [ordered]@{
        classification = "retryable_failure"
        reason         = "non-success exit without a definitive hard-failure signature"
    }
}

function Invoke-DefaultCodexExecutor {
    param(
        [string]$Executable,
        [string]$RepoPath,
        [string]$PromptText,
        [string]$Mode,
        [string]$SandboxMode,
        [string]$ApprovalPolicy,
        [string]$StdoutPath,
        [string]$StderrPath
    )

    $argList = [System.Collections.Generic.List[string]]::new()
    $argList.Add("-a")
    $argList.Add($ApprovalPolicy)
    $argList.Add("-s")
    $argList.Add($SandboxMode)
    $argList.Add("-C")
    $argList.Add($RepoPath)
    $argList.Add("exec")
    if ($Mode -eq "resume") {
        $argList.Add("resume")
        $argList.Add("--last")
    }
    $argList.Add("--json")
    $argList.Add($PromptText)

    $proc = Start-Process -FilePath $Executable -ArgumentList @($argList.ToArray()) -WorkingDirectory $RepoPath -NoNewWindow -PassThru -Wait -RedirectStandardOutput $StdoutPath -RedirectStandardError $StderrPath
    return [ordered]@{
        exit_code = [int]$proc.ExitCode
    }
}

function Invoke-CodexCliRetry {
    param(
        [Parameter(Mandatory = $true)][string]$RepoPath,
        [Parameter(Mandatory = $true)][string]$PromptText,
        [Parameter(Mandatory = $true)][string]$AttemptRoot,
        [Parameter(Mandatory = $true)][string]$LatestStatusPath,
        [Parameter(Mandatory = $false)][string]$Executable = "codex",
        [Parameter(Mandatory = $false)][string]$SandboxMode = "workspace-write",
        [Parameter(Mandatory = $false)][string]$ApprovalPolicy = "never",
        [Parameter(Mandatory = $false)][int]$MaxAttempts = 3,
        [Parameter(Mandatory = $false)][int]$InitialBackoffSeconds = 5,
        [Parameter(Mandatory = $false)][int]$MaxBackoffSeconds = 60,
        [Parameter(Mandatory = $false)][string]$ContinueInstruction,
        [Parameter(Mandatory = $false)][scriptblock]$Executor,
        [Parameter(Mandatory = $false)][scriptblock]$OnAttemptFinished,
        [Parameter(Mandatory = $false)][scriptblock]$SleepAction
    )

    if ([string]::IsNullOrWhiteSpace($ContinueInstruction)) {
        $ContinueInstruction = (Get-CodexRetryDefaultConfig).continue_instruction
    }
    if ($null -eq $Executor) {
        $Executor = {
            param($exec, $repo, $prompt, $mode, $sandbox, $approval, $stdoutPath, $stderrPath)
            Invoke-DefaultCodexExecutor -Executable $exec -RepoPath $repo -PromptText $prompt -Mode $mode -SandboxMode $sandbox -ApprovalPolicy $approval -StdoutPath $stdoutPath -StderrPath $stderrPath
        }
    }
    if ($null -eq $SleepAction) {
        $SleepAction = {
            param($seconds)
            Start-Sleep -Seconds $seconds
        }
    }

    if (-not (Test-Path -LiteralPath $AttemptRoot)) {
        New-Item -ItemType Directory -Path $AttemptRoot -Force | Out-Null
    }

    # Attempt 1 is always a fresh session. Later attempts prefer resume so the agent can continue
    # from partial work instead of redoing already-completed repo inspection or edits.
    $attempt = 1
    $nextResume = $false
    $lastResult = $null

    while ($attempt -le $MaxAttempts) {
        $attemptId = ("attempt-{0:D3}" -f $attempt)
        $attemptDir = Join-Path $AttemptRoot $attemptId
        New-Item -ItemType Directory -Path $attemptDir -Force | Out-Null

        $requestedMode = if ($nextResume) { "resume" } else { "fresh" }
        $startedAt = (Get-Date).ToString("o")
        $stdoutPath = Join-Path $attemptDir "codex-output.jsonl"
        $stderrPath = Join-Path $attemptDir "codex-error.log"
        $statusPath = Join-Path $attemptDir "status.json"
        $status = New-CodexAttemptStatusRecord -AttemptId $attemptId -AttemptNumber $attempt -MaxAttempts $MaxAttempts -Mode $requestedMode -StartedAt $startedAt -LogPath $stdoutPath
        $status.stderr_path = $stderrPath

        $promptForThisAttempt = if ($requestedMode -eq "resume") { $ContinueInstruction } else { $PromptText }
        $actualMode = $requestedMode
        $fallbackTriggered = $false

        while ($true) {
            $result = & $Executor $Executable $RepoPath $promptForThisAttempt $actualMode $SandboxMode $ApprovalPolicy $stdoutPath $stderrPath
            $stdoutText = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw } else { "" }
            $stderrText = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { "" }
            $jsonSummary = Get-CodexJsonlSummary -Lines @($stdoutText -split "(`r`n|`n|`r)")
            $classification = Get-CodexFailureClassification -ExitCode ([int]$result.exit_code) -StdoutText $stdoutText -StderrText $stderrText -JsonSummary $jsonSummary

            # Resume is preferred on retries, but we intentionally fall back to a fresh session when
            # `--last` clearly cannot recover anything useful. That keeps unattended runs moving even
            # when the previous session never persisted or became unusable immediately.
            if ($actualMode -eq "resume" -and -not $fallbackTriggered -and ((Test-CodexResumeUnavailable -StdoutText $stdoutText -StderrText $stderrText) -or (Test-CodexResumeUnusableImmediateFailure -StdoutText $stdoutText -StderrText $stderrText -JsonSummary $jsonSummary))) {
                $fallbackTriggered = $true
                $status.fallback_from_resume = $true
                $status.fallback_reason = $classification.reason
                $actualMode = "fresh"
                $status.mode = "fresh"
                $promptForThisAttempt = $PromptText
                Set-Content -LiteralPath (Join-Path $attemptDir "resume-fallback-note.txt") -Value ("Resume fallback triggered at {0}: {1}" -f (Get-Date).ToString("o"), $classification.reason) -Encoding utf8
                continue
            }

            $status.mode = $actualMode
            $status.ended_at = (Get-Date).ToString("o")
            $status.exit_classification = [string]$classification.classification
            $status.last_detected_event_type = [string]$jsonSummary.last_detected_event_type
            $status.exit_code = [int]$result.exit_code
            $status.codex_session_id = [string]$jsonSummary.codex_session_id
            $status.note = [string]$classification.reason

            $status | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $statusPath -Encoding utf8
            $status | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $LatestStatusPath -Encoding utf8

            if ($null -ne $OnAttemptFinished) {
                & $OnAttemptFinished $status
            }

            $lastResult = [ordered]@{
                status         = $status
                stdout_text    = $stdoutText
                stderr_text    = $stderrText
                json_summary   = $jsonSummary
                classification = $classification
            }

            # Success is driven by the JSONL event stream, not just process exit code. A zero exit
            # without a `turn.completed` event is not trusted as success for unattended operation.
            if ($classification.classification -eq "success") {
                return $lastResult
            }

            if ($attempt -ge $MaxAttempts) {
                $status.exit_classification = "terminal_failure"
                $status.note = "Maximum attempts reached after last retryable failure."
                $status | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $statusPath -Encoding utf8
                $status | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $LatestStatusPath -Encoding utf8
                if ($null -ne $OnAttemptFinished) {
                    & $OnAttemptFinished $status
                }
                $lastResult.status = $status
                return $lastResult
            }

            $sleepSeconds = [Math]::Min($MaxBackoffSeconds, ($InitialBackoffSeconds * [Math]::Pow(2, $attempt - 1)))
            & $SleepAction ([int][Math]::Ceiling($sleepSeconds))
            $nextResume = $true
            break
        }

        $attempt++
    }

    return $lastResult
}
