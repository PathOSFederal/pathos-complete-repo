$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here "..\scripts\lib\codex-retry-lib.ps1")

Describe "Invoke-CodexCliRetry" {
    function New-TempAttemptRoot {
        $root = Join-Path $env:TEMP ("pathos-codex-retry-tests-" + [guid]::NewGuid().ToString("N"))
        New-Item -ItemType Directory -Path $root -Force | Out-Null
        return $root
    }

    It "starts fresh on the first attempt" {
        $script:calls = @()
        $root = New-TempAttemptRoot
        $latest = Join-Path $root "latest-status.json"

        $result = Invoke-CodexCliRetry -RepoPath "C:\repo" -PromptText "fresh prompt" -AttemptRoot $root -LatestStatusPath $latest -Executor {
            param($exec, $repo, $prompt, $mode, $sandbox, $approval, $stdoutPath, $stderrPath)
            $script:calls += [ordered]@{ mode = $mode; prompt = $prompt }
            '{"type":"turn.completed"}' | Set-Content -LiteralPath $stdoutPath -Encoding utf8
            "" | Set-Content -LiteralPath $stderrPath -Encoding utf8
            return @{ exit_code = 0 }
        } -SleepAction { param($seconds) }

        $script:calls.Count | Should Be 1
        $script:calls[0].mode | Should Be "fresh"
        $result.status.exit_classification | Should Be "success"
    }

    It "retries with resume after a failed first attempt" {
        $script:calls = @()
        $root = New-TempAttemptRoot
        $latest = Join-Path $root "latest-status.json"

        $result = Invoke-CodexCliRetry -RepoPath "C:\repo" -PromptText "fresh prompt" -AttemptRoot $root -LatestStatusPath $latest -Executor {
            param($exec, $repo, $prompt, $mode, $sandbox, $approval, $stdoutPath, $stderrPath)
            $script:calls += [ordered]@{ mode = $mode; prompt = $prompt }
            if ($script:calls.Count -eq 1) {
                '{"type":"error","message":"stream disconnected"}' | Set-Content -LiteralPath $stdoutPath -Encoding utf8
                "stream disconnected" | Set-Content -LiteralPath $stderrPath -Encoding utf8
                return @{ exit_code = 1 }
            }
            '{"type":"turn.completed"}' | Set-Content -LiteralPath $stdoutPath -Encoding utf8
            "" | Set-Content -LiteralPath $stderrPath -Encoding utf8
            return @{ exit_code = 0 }
        } -SleepAction { param($seconds) }

        $script:calls.Count | Should Be 2
        $script:calls[0].mode | Should Be "fresh"
        $script:calls[1].mode | Should Be "resume"
        $script:calls[1].prompt | Should Match "Do not restart from scratch"
        $result.status.exit_classification | Should Be "success"
    }

    It "falls back to fresh when resume is unavailable" {
        $script:calls = @()
        $root = New-TempAttemptRoot
        $latest = Join-Path $root "latest-status.json"

        $result = Invoke-CodexCliRetry -RepoPath "C:\repo" -PromptText "fresh prompt" -AttemptRoot $root -LatestStatusPath $latest -Executor {
            param($exec, $repo, $prompt, $mode, $sandbox, $approval, $stdoutPath, $stderrPath)
            $script:calls += [ordered]@{ mode = $mode; prompt = $prompt }
            if ($script:calls.Count -eq 1) {
                '{"type":"error","message":"network timeout"}' | Set-Content -LiteralPath $stdoutPath -Encoding utf8
                "network timeout" | Set-Content -LiteralPath $stderrPath -Encoding utf8
                return @{ exit_code = 1 }
            }
            if ($script:calls.Count -eq 2) {
                "" | Set-Content -LiteralPath $stdoutPath -Encoding utf8
                "no resumable session" | Set-Content -LiteralPath $stderrPath -Encoding utf8
                return @{ exit_code = 1 }
            }
            '{"type":"turn.completed"}' | Set-Content -LiteralPath $stdoutPath -Encoding utf8
            "" | Set-Content -LiteralPath $stderrPath -Encoding utf8
            return @{ exit_code = 0 }
        } -SleepAction { param($seconds) }

        $script:calls.Count | Should Be 3
        $script:calls[1].mode | Should Be "resume"
        $script:calls[2].mode | Should Be "fresh"
        $result.status.fallback_from_resume | Should Be $true
        $result.status.exit_classification | Should Be "success"
    }

    It "stops retrying after success" {
        $script:calls = @()
        $root = New-TempAttemptRoot
        $latest = Join-Path $root "latest-status.json"

        $null = Invoke-CodexCliRetry -RepoPath "C:\repo" -PromptText "fresh prompt" -AttemptRoot $root -LatestStatusPath $latest -Executor {
            param($exec, $repo, $prompt, $mode, $sandbox, $approval, $stdoutPath, $stderrPath)
            $script:calls += $mode
            '{"type":"turn.completed"}' | Set-Content -LiteralPath $stdoutPath -Encoding utf8
            "" | Set-Content -LiteralPath $stderrPath -Encoding utf8
            return @{ exit_code = 0 }
        } -SleepAction { param($seconds) }

        $script:calls.Count | Should Be 1
    }

    It "returns terminal failure after max attempts" {
        $root = New-TempAttemptRoot
        $latest = Join-Path $root "latest-status.json"

        $result = Invoke-CodexCliRetry -RepoPath "C:\repo" -PromptText "fresh prompt" -AttemptRoot $root -LatestStatusPath $latest -MaxAttempts 2 -Executor {
            param($exec, $repo, $prompt, $mode, $sandbox, $approval, $stdoutPath, $stderrPath)
            '{"type":"error","message":"network timeout"}' | Set-Content -LiteralPath $stdoutPath -Encoding utf8
            "network timeout" | Set-Content -LiteralPath $stderrPath -Encoding utf8
            return @{ exit_code = 1 }
        } -SleepAction { param($seconds) }

        $result.status.current_attempt | Should Be 2
        $result.status.exit_classification | Should Be "terminal_failure"
    }

    It "ignores malformed or noisy output when parsing JSONL" {
        $summary = Get-CodexJsonlSummary -Lines @(
            "not json",
            '{"type":"thread.started"}',
            "{broken",
            '{"type":"turn.completed"}'
        )

        $summary.last_detected_event_type | Should Be "turn.completed"
        $summary.completed_successfully | Should Be $true
    }
}
