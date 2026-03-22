param(
    [string]$RunId,
    [string]$RunsRoot,
    [string]$RepoPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $RunsRoot)) {
    throw "RunsRoot does not exist: $RunsRoot"
}

if (-not (Test-Path $RepoPath)) {
    throw "RepoPath does not exist: $RepoPath"
}

$gitFolder = Join-Path $RepoPath ".git"
if (-not (Test-Path $gitFolder)) {
    throw "RepoPath is not a git repo: $RepoPath"
}

$runPath = Join-Path $RunsRoot $RunId
if (-not (Test-Path $runPath)) {
    throw "Run path does not exist: $runPath"
}

Push-Location $RepoPath
try {
    $currentBranch = git branch --show-current
    $gitStatus = git status --short
    $repoRoot = git rev-parse --show-toplevel
}
finally {
    Pop-Location
}

$currentBranch | Out-File (Join-Path $runPath "current-branch.txt") -Encoding utf8
$gitStatus | Out-File (Join-Path $runPath "git-status.txt") -Encoding utf8
$repoRoot | Out-File (Join-Path $runPath "repo-root.txt") -Encoding utf8

$repoState = @{
    runId = $RunId
    repoPath = $RepoPath
    repoRoot = $repoRoot
    currentBranch = $currentBranch
    gitStatusCount = @($gitStatus).Count
    timestamp = (Get-Date).ToString("o")
}

$repoState | ConvertTo-Json -Depth 5 | Out-File (Join-Path $runPath "repo-state.json") -Encoding utf8

Write-Output "REPO_STATE_CAPTURED::$RunId::$runPath"