param(
    [string]$RunId,
    [string]$RunsRoot
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RunsRoot)) {
    throw "RunsRoot is empty."
}

if ([string]::IsNullOrWhiteSpace($RunId)) {
    throw "RunId is empty."
}

if (-not (Test-Path -Path $RunsRoot)) {
    throw "RunsRoot does not exist: $RunsRoot"
}

$runPath = Join-Path $RunsRoot $RunId
if (-not (Test-Path -Path $runPath)) {
    throw "Run path does not exist: $runPath"
}

$statusPath = Join-Path $runPath "status.json"
if (-not (Test-Path -Path $statusPath)) {
    throw "status.json not found: $statusPath"
}

$taskPath = Join-Path $runPath "task.md"
$repoStatePath = Join-Path $runPath "repo-state.json"
$preflightPath = Join-Path $runPath "preflight.json"
$cursorPromptPath = Join-Path $runPath "cursorPrompt.md"

$status = Get-Content -Path $statusPath -Raw | ConvertFrom-Json

$currentRunStatus = [string]$status.runStatus
$allowCodexHandoff = [string]$status.allowCodexHandoff
$reviewStatus = [string]$status.reviewStatus

if ($currentRunStatus -ne "ready_for_codex") {
    throw "Codex handoff not allowed. Current runStatus is '$currentRunStatus', expected 'ready_for_codex'."
}

if ($reviewStatus -ne "approved") {
    throw "Codex handoff not allowed. Current reviewStatus is '$reviewStatus', expected 'approved'."
}

if ($allowCodexHandoff -ne "true") {
    throw "Codex handoff not allowed. allowCodexHandoff is '$allowCodexHandoff', expected 'true'."
}

$taskText = if (Test-Path $taskPath) { Get-Content $taskPath -Raw } else { "task.md not found" }
$repoStateText = if (Test-Path $repoStatePath) { Get-Content $repoStatePath -Raw } else { "repo-state.json not found" }
$preflightText = if (Test-Path $preflightPath) { Get-Content $preflightPath -Raw } else { "preflight.json not found" }
$cursorPromptText = if (Test-Path $cursorPromptPath) { Get-Content $cursorPromptPath -Raw } else { "cursorPrompt.md not found" }

$codexHandoff = @"
# Codex Handoff Packet

## Role
You are the hardening and validation agent for this approved run.

## Run ID
$RunId

## Current Status
- runStatus: $currentRunStatus
- reviewStatus: $reviewStatus
- allowCodexHandoff: $allowCodexHandoff

## Task Context
$taskText

## Repo State
$repoStateText

## Preflight State
$preflightText

## Prior Cursor Prompt Context
$cursorPromptText

## Codex Objectives
Review the implementation for:
- correctness
- edge cases
- misuse cases
- regression risk
- missing tests
- missing validations
- merge-readiness concerns

## Constraints
- Do not commit or push.
- Respect the approved scope.
- Focus on hardening and validation, not broad redesign.
- Surface clear findings and concrete next actions.

## Required Output
- hardening findings
- recommended fixes
- test and validation recommendations
- merge-readiness assessment
"@

$handoffPath = Join-Path $runPath "codexHandoff.md"
$codexHandoff | Out-File -FilePath $handoffPath -Encoding utf8

Write-Output "CODEX_HANDOFF_BUILT::$RunId::$handoffPath"