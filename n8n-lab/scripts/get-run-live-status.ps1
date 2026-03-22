[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$RunId,

    [string]$RunsRoot = "C:\dev\PathOS\n8n-lab\runs",

    [string]$TailLines = "40"
)

$ErrorActionPreference = "Stop"

function Get-JsonFileOrNull {
    param(
        [string]$Path
    )

    if (-not (Test-Path -Path $Path -PathType Leaf)) {
        return $null
    }

    $raw = Get-Content -Path $Path -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $null
    }

    return ($raw | ConvertFrom-Json)
}

if ([string]::IsNullOrWhiteSpace($RunId)) {
    throw "RunId is empty."
}

if ([string]::IsNullOrWhiteSpace($RunsRoot)) {
    throw "RunsRoot is empty."
}

$parsedTailLines = 40
if (-not [int]::TryParse($TailLines, [ref]$parsedTailLines)) {
    $parsedTailLines = 40
}

$runPath = Join-Path $RunsRoot $RunId
if (-not (Test-Path -Path $runPath)) {
    throw "Run path does not exist: $runPath"
}

$statusPath = Join-Path $runPath "status.json"
$workerStatusPath = Join-Path $runPath "worker-status.json"
$workerLiveLogPath = Join-Path $runPath "worker-live.log"
$workerEventsPath = Join-Path $runPath "worker-events.jsonl"
$repoBaselinePath = Join-Path $runPath "repo-baseline.json"
$repoDeltaPath = Join-Path $runPath "repo-delta.json"
$executionArtifactPath = Join-Path $runPath "cursor-execution.json"
$resultPath = Join-Path $runPath "cursor-result.md"
$codexStatusPath = Join-Path $runPath "codex-status.json"
$codexLiveLogPath = Join-Path $runPath "codex-live.log"
$codexEventsPath = Join-Path $runPath "codex-events.jsonl"
$codexBaselinePath = Join-Path $runPath "codex-baseline.json"
$codexDeltaPath = Join-Path $runPath "codex-delta.json"
$codexExecutionArtifactPath = Join-Path $runPath "codex-execution.json"
$codexReviewPath = Join-Path $runPath "codexReview.md"

$status = Get-JsonFileOrNull -Path $statusPath
$workerStatus = Get-JsonFileOrNull -Path $workerStatusPath
$repoBaseline = Get-JsonFileOrNull -Path $repoBaselinePath
$repoDelta = Get-JsonFileOrNull -Path $repoDeltaPath
$executionArtifact = Get-JsonFileOrNull -Path $executionArtifactPath
$codexStatus = Get-JsonFileOrNull -Path $codexStatusPath
$codexBaseline = Get-JsonFileOrNull -Path $codexBaselinePath
$codexDelta = Get-JsonFileOrNull -Path $codexDeltaPath
$codexExecutionArtifact = Get-JsonFileOrNull -Path $codexExecutionArtifactPath

$logTail = @()
if (Test-Path -Path $workerLiveLogPath) {
    $logTail = @(Get-Content -Path $workerLiveLogPath -Tail $parsedTailLines)
}

$eventTail = @()
if (Test-Path -Path $workerEventsPath) {
    $eventTail = @(Get-Content -Path $workerEventsPath -Tail $parsedTailLines)
}

$codexLogTail = @()
if (Test-Path -Path $codexLiveLogPath) {
    $codexLogTail = @(Get-Content -Path $codexLiveLogPath -Tail $parsedTailLines)
}

$codexEventTail = @()
if (Test-Path -Path $codexEventsPath) {
    $codexEventTail = @(Get-Content -Path $codexEventsPath -Tail $parsedTailLines)
}

[ordered]@{
    status = "success"
    runId = $RunId
    runPath = $runPath
    statusJson = $status
    workerStatus = $workerStatus
    repoBaseline = $repoBaseline
    repoDelta = $repoDelta
    executionArtifact = $executionArtifact
    workerLiveLogPath = if (Test-Path $workerLiveLogPath) { $workerLiveLogPath } else { "" }
    workerEventsPath = if (Test-Path $workerEventsPath) { $workerEventsPath } else { "" }
    cursorExecutionPath = if (Test-Path $executionArtifactPath) { $executionArtifactPath } else { "" }
    cursorResultPath = if (Test-Path $resultPath) { $resultPath } else { "" }
    logTail = $logTail
    eventTail = $eventTail
    codexStatus = $codexStatus
    codexBaseline = $codexBaseline
    codexDelta = $codexDelta
    codexExecutionArtifact = $codexExecutionArtifact
    codexLiveLogPath = if (Test-Path $codexLiveLogPath) { $codexLiveLogPath } else { "" }
    codexEventsPath = if (Test-Path $codexEventsPath) { $codexEventsPath } else { "" }
    codexExecutionPath = if (Test-Path $codexExecutionArtifactPath) { $codexExecutionArtifactPath } else { "" }
    codexReviewPath = if (Test-Path $codexReviewPath) { $codexReviewPath } else { "" }
    codexLogTail = $codexLogTail
    codexEventTail = $codexEventTail
    inspectedAt = (Get-Date).ToString("o")
} | ConvertTo-Json -Depth 20
