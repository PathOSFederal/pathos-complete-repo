[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Prompt,

    [Parameter(ValueFromRemainingArguments = $true)]
    [object[]]$ExtraArgs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path -Path $PSScriptRoot -ChildPath 'run-codex-resilient.ps1'

if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "Unable to locate resilient launcher: $scriptPath"
}

$forwardedArguments = @(
    '-RepoRoot', $RepoRoot,
    '-Prompt', $Prompt
)

if ($null -ne $ExtraArgs -and $ExtraArgs.Count -gt 0) {
    $forwardedArguments += $ExtraArgs
}

& $scriptPath @forwardedArguments
$exitCode = $LASTEXITCODE
if ($null -eq $exitCode) {
    $exitCode = 0
}

exit $exitCode
