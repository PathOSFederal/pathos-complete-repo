param(
    [string]$RunId,
    [string]$RunsRoot,
    [string]$RepoPath,
    [string]$BranchName,
    [string]$Goal,
    [string]$RunStatus = "initialized",
    [string]$RevisionOfRunId = "",
    [string]$RootRunId = "",
    [string]$AttemptNumber = "",
    [string]$RevisionReason = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $RunsRoot)) {
    throw "RunsRoot does not exist: $RunsRoot"
}

$runPath = Join-Path $RunsRoot $RunId
if (-not (Test-Path $runPath)) {
    throw "Run path does not exist: $runPath"
}

$indexPath = Join-Path $RunsRoot "run-index.json"

if (Test-Path $indexPath) {
    $raw = Get-Content $indexPath -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) {
        $index = @()
    } else {
        $index = $raw | ConvertFrom-Json
        if ($index -isnot [System.Collections.IEnumerable]) {
            $index = @($index)
        }
    }
} else {
    $index = @()
}

$entry = @{
    runId = $RunId
    repoPath = $RepoPath
    branchName = $BranchName
    goal = $Goal
    runStatus = $RunStatus
    revisionOfRunId = $RevisionOfRunId
    rootRunId = $RootRunId
    attemptNumber = $AttemptNumber
    revisionReason = $RevisionReason
    runPath = $runPath
    timestamp = (Get-Date).ToString("o")
}

$index = @($index) + @($entry)
$index | ConvertTo-Json -Depth 5 | Out-File $indexPath -Encoding utf8

Write-Output "RUN_INDEX_UPDATED::$RunId::$indexPath"
