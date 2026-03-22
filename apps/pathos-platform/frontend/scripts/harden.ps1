[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Write-Status {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Label,
    [Parameter(Mandatory = $true)]
    [string[]]$Command
  )

  Write-Status $Label
  Write-Host ("> " + ($Command -join ' ')) -ForegroundColor DarkGray
  $commandName = $Command[0]
  $commandArgs = if ($Command.Length -gt 1) { $Command[1..($Command.Length - 1)] } else { @() }
  & $commandName @commandArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Label"
  }
}

if (-not (Test-Path package.json)) {
  throw 'package.json not found. Run this script from the repo root.'
}

$packageJson = Get-Content package.json -Raw | ConvertFrom-Json
if (-not $packageJson.scripts) {
  throw 'No scripts section found in package.json.'
}

$pnpmLockExists = Test-Path 'pnpm-lock.yaml'
$pnpmWorkspaceExists = Test-Path 'pnpm-workspace.yaml'

if (-not ($pnpmLockExists -or $pnpmWorkspaceExists)) {
  Write-Warning 'This script is optimized for pnpm repos, but pnpm lock/workspace files were not found.'
}

$pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmCommand) {
  throw 'pnpm is not installed or not on PATH.'
}

Invoke-Step -Label 'Running typecheck' -Command @('pnpm', 'run', 'typecheck')
Invoke-Step -Label 'Running build' -Command @('pnpm', 'run', 'build')

if ($packageJson.scripts.PSObject.Properties.Name -contains 'test') {
  Invoke-Step -Label 'Running tests' -Command @('pnpm', 'run', 'test')
} else {
  Write-Status 'Skipping tests'
  Write-Host 'No test script found in package.json.' -ForegroundColor Yellow
}

Write-Status 'Hardening completed successfully'
