[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Repo,

    [Parameter(Mandatory = $false)]
    [switch]$AutoLaunch
)

$ErrorActionPreference = "Stop"

function Get-WorkspaceRoot {
    param([string]$ScriptPath)
    return (Resolve-Path (Join-Path $ScriptPath "..")).Path
}

function Resolve-RepoPath {
    param(
        [Parameter(Mandatory = $true)][hashtable]$ReposDoc,
        [Parameter(Mandatory = $true)][string]$RepoKey
    )
    if (-not $ReposDoc.ContainsKey("repos")) {
        throw "Invalid repos.json format: missing 'repos' object."
    }
    if (-not $ReposDoc.repos.ContainsKey($RepoKey)) {
        $valid = (($ReposDoc.repos.Keys | Sort-Object) -join ", ")
        throw "Repo key '$RepoKey' is not defined in repos.json. Valid keys: $valid"
    }
    return [string]$ReposDoc.repos[$RepoKey]
}

function Get-Recommendation {
    param(
        [Parameter(Mandatory = $true)][string]$RepoKey,
        [Parameter(Mandatory = $true)][string]$RepoPath
    )
    if ($RepoKey -eq "frontend") {
        return "pnpm dev"
    }
    if ($RepoKey -eq "backend") {
        if (Test-Path -LiteralPath (Join-Path $RepoPath "pyproject.toml")) {
            return "poetry run uvicorn app.main:app --reload"
        }
        return "Run this repo's standard backend startup command."
    }
    return "Run this repo's standard startup command."
}

function Get-ShellExecutable {
    $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($pwsh) { return $pwsh.Source }
    $powershell = Get-Command powershell -ErrorAction SilentlyContinue
    if ($powershell) { return $powershell.Source }
    throw "Could not locate PowerShell executable (pwsh or powershell)."
}

try {
    # Resolve control files relative to this script for stable execution from any cwd.
    $workspaceRoot = Get-WorkspaceRoot -ScriptPath $PSScriptRoot
    $reposPath = Join-Path $workspaceRoot "repos.json"
    if (-not (Test-Path -LiteralPath $reposPath)) {
        throw "Missing required file: $reposPath"
    }

    $reposDoc = Get-Content -LiteralPath $reposPath -Raw | ConvertFrom-Json -AsHashtable
    $repoPath = Resolve-RepoPath -ReposDoc $reposDoc -RepoKey $Repo

    if (-not (Test-Path -LiteralPath $repoPath)) {
        throw "Repo path does not exist: $repoPath"
    }
    $resolvedRepoPath = (Resolve-Path -LiteralPath $repoPath).Path

    $recommendedCommand = Get-Recommendation -RepoKey $Repo -RepoPath $resolvedRepoPath
    $shellExe = Get-ShellExecutable

    $launchCommand = "Set-Location -LiteralPath '$resolvedRepoPath'"
    $autoLaunchUsed = $false
    if ($AutoLaunch -and $Repo -eq "frontend") {
        # Frontend autolaunch is deterministic and safe for daily use.
        $launchCommand = "$launchCommand; $recommendedCommand"
        $autoLaunchUsed = $true
    }

    # Open one terminal window in the target repo; optionally autolaunch known-safe command.
    Start-Process $shellExe -ArgumentList @("-NoExit", "-Command", $launchCommand) | Out-Null

    Write-Host "Launch Target"
    Write-Host "Resolved repo: $Repo"
    Write-Host "Resolved path: $resolvedRepoPath"
    Write-Host "Auto-launch requested: $($AutoLaunch.IsPresent)"
    if ($autoLaunchUsed) {
        Write-Host "Auto-launched command: $recommendedCommand"
    } else {
        if ($AutoLaunch -and $Repo -eq "backend") {
            Write-Host "Auto-launch skipped for backend to avoid incorrect startup assumptions."
        }
        Write-Host "Opened terminal working directory: $resolvedRepoPath"
        Write-Host "Run this command next: $recommendedCommand"
    }
}
catch {
    Write-Error "launch-target failed: $($_.Exception.Message)"
    exit 1
}
