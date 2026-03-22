param(
    [string]$RunId,
    [string]$RunsRoot,
    [string]$RepoPath,
    [string]$BranchName,
    [string]$AllowBranchCreate = "false"
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
    $workingTreeClean = [string]::IsNullOrWhiteSpace(($gitStatus -join "`n"))

    $branchCreated = $false
    $branchAlreadyExists = $false

    $existingBranchCheck = git branch --list $BranchName
    if (-not [string]::IsNullOrWhiteSpace($existingBranchCheck)) {
        $branchAlreadyExists = $true
    }

    if ($AllowBranchCreate -eq "true" -and -not $branchAlreadyExists) {
        git checkout -b $BranchName | Out-Null
        $branchCreated = $true
    }
}
finally {
    Pop-Location
}

$preflight = @{
    runId = $RunId
    repoPath = $RepoPath
    branchName = $BranchName
    currentBranchBefore = $currentBranch
    workingTreeClean = $workingTreeClean
    branchAlreadyExists = $branchAlreadyExists
    branchCreated = $branchCreated
    allowBranchCreate = $AllowBranchCreate
    timestamp = (Get-Date).ToString("o")
}

$preflight | ConvertTo-Json -Depth 5 | Out-File (Join-Path $runPath "preflight.json") -Encoding utf8
$workingTreeClean.ToString() | Out-File (Join-Path $runPath "working-tree-clean.txt") -Encoding utf8
$branchCreated.ToString() | Out-File (Join-Path $runPath "branch-created.txt") -Encoding utf8

Write-Output "PREFLIGHT_COMPLETE::$RunId::$runPath"