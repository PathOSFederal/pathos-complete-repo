$ErrorActionPreference = "Stop"

function Show-Usage {
    Write-Host "PathOS Pipeline Wrapper (pp)"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\pp.ps1 <command> [args]"
    Write-Host ""
    Write-Host "Pipeline commands:"
    Write-Host "  start | status | build | implementation-done | runtime-start | runtime-done | runtime-fail"
    Write-Host "  claude-start | claude-check | claude-finish | reconcile-claude-completion"
    Write-Host "  codex-start | codex-check | codex-finish | reconcile-codex-completion"
    Write-Host "  worker-start | worker-heartbeat | worker-fail | worker-retry | worker-status"
    Write-Host "  scheduler-run [-AllRuns] [-RunId <run-id>] [-DryRun] [-ConsumeCompletions]"
    Write-Host "  scheduler-loop [-AllRuns] [-RunId <run-id>] [-IntervalSeconds <n>] [-MaxCycles <n>] [-MaxMinutes <n>] [-ConsumeCompletions] [-DryRun]"
    Write-Host "  scheduler-status [-Json]"
    Write-Host "  scheduler-unlock [-IfStale] [-Force]"
    Write-Host "  service-start [-AllRuns|-RunId <run-id>] [-IntervalSeconds <n>] [-MaxCycles <n>] [-MaxMinutes <n>] [-ConsumeCompletions] [-DryRun]"
    Write-Host "  service-status"
    Write-Host "  auto-consume [-RunId <run-id>] [-DryRun]"
    Write-Host "  notify-test"
    Write-Host "  final-review | resume | events | doctor | approve | revise | commit | no-commit"
    Write-Host "  archive-runs [-AllRuns|-RunId <run-id>]"
    Write-Host "  current | runs | use <run-id>"
    Write-Host ""
    Write-Host "Launch command:"
    Write-Host "  launch -Repo <frontend|backend|desktop_legacy> [-AutoLaunch]"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\pp.ps1 start -TaskId \"day-70-ui-polish\" -Repo frontend -Flow frontend"
    Write-Host "  .\pp.ps1 start -TaskId \"day-70-api-hardening\" -Repo backend -Flow backend"
    Write-Host "  .\pp.ps1 status"
    Write-Host "  .\pp.ps1 build"
    Write-Host "  .\pp.ps1 implementation-done"
    Write-Host "  .\pp.ps1 claude-start"
    Write-Host "  .\pp.ps1 claude-start -PrepareOnly"
    Write-Host "  .\pp.ps1 claude-check"
    Write-Host "  .\pp.ps1 claude-finish"
    Write-Host "  .\pp.ps1 reconcile-claude-completion"
    Write-Host "  .\pp.ps1 codex-start"
    Write-Host "  .\pp.ps1 codex-start -PrepareOnly"
    Write-Host "  .\pp.ps1 codex-check"
    Write-Host "  .\pp.ps1 codex-finish"
    Write-Host "  .\pp.ps1 reconcile-codex-completion"
    Write-Host "  .\pp.ps1 runtime-start"
    Write-Host "  .\pp.ps1 runtime-done"
    Write-Host "  .\pp.ps1 runtime-fail"
    Write-Host "  .\pp.ps1 worker-start"
    Write-Host "  .\pp.ps1 worker-heartbeat -Step \"updated parser\" -Notes \"progress\""
    Write-Host "  .\pp.ps1 worker-fail -ErrorType network_timeout -ErrorMessage \"provider timeout\""
    Write-Host "  .\pp.ps1 worker-retry"
    Write-Host "  .\pp.ps1 worker-status"
    Write-Host "  .\pp.ps1 scheduler-run"
    Write-Host "  .\pp.ps1 scheduler-run -AllRuns -DryRun"
    Write-Host "  .\pp.ps1 scheduler-run -ConsumeCompletions"
    Write-Host "  .\pp.ps1 scheduler-loop -IntervalSeconds 30 -MaxCycles 10 -ConsumeCompletions"
    Write-Host "  .\pp.ps1 scheduler-status"
    Write-Host "  .\pp.ps1 scheduler-unlock -IfStale"
    Write-Host "  .\pp.ps1 service-start -IntervalSeconds 30 -ConsumeCompletions"
    Write-Host "  .\pp.ps1 service-status"
    Write-Host "  .\pp.ps1 auto-consume"
    Write-Host "  .\pp.ps1 auto-consume -RunId <run-id> -DryRun"
    Write-Host "  .\pp.ps1 notify-test"
    Write-Host "  .\pp.ps1 final-review"
    Write-Host "  .\pp.ps1 events"
    Write-Host "  .\pp.ps1 doctor"
    Write-Host "  .\pp.ps1 resume"
    Write-Host "  .\pp.ps1 archive-runs -AllRuns"
    Write-Host "  .\pp.ps1 archive-runs -RunId my-old-run"
    Write-Host "  .\pp.ps1 launch -Repo frontend"
    Write-Host "  .\pp.ps1 launch -Repo frontend -AutoLaunch"
}

try {
    $root = Split-Path -Parent $MyInvocation.MyCommand.Path
    $pipelineScript = Join-Path $root "scripts\pipeline.ps1"
    $launchScript = Join-Path $root "scripts\launch-target.ps1"

    if (-not (Test-Path -LiteralPath $pipelineScript)) {
        throw "Missing script: $pipelineScript"
    }
    if (-not (Test-Path -LiteralPath $launchScript)) {
        throw "Missing script: $launchScript"
    }

    $rawArgs = @($args)
    if ($rawArgs.Count -eq 0) {
        Show-Usage
        exit 0
    }

    $command = [string]$rawArgs[0]
    $forwardArgs = @()
    if ($rawArgs.Count -gt 1) {
        $forwardArgs = @($rawArgs[1..($rawArgs.Count - 1)])
    }

    if ([string]::IsNullOrWhiteSpace($command) -or $command -in @("help", "-h", "--help", "/?")) {
        Show-Usage
        exit 0
    }

    $pipelineCommands = @("start", "status", "build", "implementation-done", "claude-start", "claude-check", "claude-finish", "reconcile-claude-completion", "codex-start", "codex-check", "codex-finish", "reconcile-codex-completion", "runtime-start", "runtime-done", "runtime-fail", "worker-start", "worker-heartbeat", "worker-fail", "worker-retry", "worker-status", "scheduler-run", "scheduler-loop", "scheduler-status", "scheduler-unlock", "service-start", "service-status", "auto-consume", "notify-test", "final-review", "resume", "events", "doctor", "approve", "revise", "commit", "no-commit", "archive-runs", "current", "runs", "use")
    if ($command -in $pipelineCommands) {
        if ($command -eq "use" -and $forwardArgs.Count -gt 0 -and -not ([string]$forwardArgs[0]).StartsWith("-")) {
            $remaining = @()
            if ($forwardArgs.Count -gt 1) {
                $remaining = @($forwardArgs[1..($forwardArgs.Count - 1)])
            }
            & $pipelineScript $command -RunId ([string]$forwardArgs[0]) @remaining
            exit $LASTEXITCODE
        }
        if ($forwardArgs.Count -eq 0) {
            & $pipelineScript $command
        }
        else {
            & $pipelineScript $command @forwardArgs
        }
        exit $LASTEXITCODE
    }

    if ($command -eq "launch") {
        if ($forwardArgs.Count -eq 0) {
            & $launchScript
        }
        else {
            & $launchScript @forwardArgs
        }
        exit $LASTEXITCODE
    }

    Write-Error "Unknown command '$command'. Run '.\pp.ps1 help' for usage."
    exit 1
}
catch {
    Write-Error "pp failed: $($_.Exception.Message)"
    exit 1
}
