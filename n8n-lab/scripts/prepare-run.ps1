# This script exists to bootstrap a single local run folder for the n8n lab experiment.
# The goal is to give an n8n Execute Command node one stable entry point that:
# - validates the operator inputs early
# - confirms the target repo path is usable
# - creates a predictable run folder structure
# - emits machine-readable and human-readable run metadata
# - prints one exact completion line that downstream n8n nodes can parse
#
# This file is intentionally over-commented because the lab is meant to be educational.
# Another developer should be able to open this script and understand:
# - why the script exists
# - how each validation step protects the experiment
# - how parameters map from an n8n packet into local filesystem actions
# - what artifacts get created for each run

[CmdletBinding()]
param(
    [string]$RunId,
    [string]$RunsRoot,
    [string]$RepoPath,
    [string]$BranchName,
    [string]$Goal,
    [string]$DayNumber,
    [string]$TaskTitle,
    [string]$Notes,
    [string]$WorkType = "ui",
    [string]$RequiresVisualApproval = "true",
    [string]$AllowCursorHandoff = "true",
    [string]$AllowCodexHandoff = "false",
    [string]$AllowFinalReview = "false",
    [string]$ReviewStatus = "pending",
    [string]$RevisionOfRunId = "",
    [string]$RootRunId = "",
    [string]$AttemptNumber = "",
    [string]$ReviewFeedback = "",
    [string]$RevisionReason = "",
    [string]$CarryForwardDesignReference = "false",
    [string]$RevisionSummary = "",
    [string]$PreviousDesignSource = "",
    [string]$PreviousReferenceImagePathCopied = "",
    [string]$PreviousDesignNotesPathCopied = "",
    [string]$ReferenceImagePath = "",
    [string]$DesignNotesPath = "",
    [string]$DesignSource = "",
    [string]$ForceTargetedModification = "false",
    [string]$AllowedTargetFiles = "",
    [string]$NoOpOnTargetFilesIsFailure = "false"
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

$base = Join-Path $RunsRoot $RunId
New-Item -ItemType Directory -Force -Path $base | Out-Null

$referenceImagePathOriginal = ""
$referenceImagePathCopied = ""
$designNotesPathOriginal = ""
$designNotesPathCopied = ""
$effectiveDesignSource = ""
$effectiveRootRunId = $RootRunId
$effectiveAttemptNumber = $AttemptNumber
$effectiveCarryForwardDesignReference = $CarryForwardDesignReference
$normalizedAllowedTargetFiles = @()

if ([string]::IsNullOrWhiteSpace($effectiveRootRunId)) {
    if ([string]::IsNullOrWhiteSpace($RevisionOfRunId)) {
        $effectiveRootRunId = $RunId
    }
    else {
        $effectiveRootRunId = $RevisionOfRunId
    }
}

if ([string]::IsNullOrWhiteSpace($effectiveAttemptNumber)) {
    if ([string]::IsNullOrWhiteSpace($RevisionOfRunId)) {
        $effectiveAttemptNumber = "1"
    }
    else {
        $effectiveAttemptNumber = "2"
    }
}

if (-not [string]::IsNullOrWhiteSpace($DesignNotesPath) -and [string]::IsNullOrWhiteSpace($ReferenceImagePath)) {
    throw "designNotesPath requires referenceImagePath."
}

if (-not [string]::IsNullOrWhiteSpace($ReferenceImagePath)) {
    if (-not (Test-Path -Path $ReferenceImagePath -PathType Leaf)) {
        throw "referenceImagePath does not exist: $ReferenceImagePath"
    }

    $referenceImagePathOriginal = $ReferenceImagePath
    $designNotesPathOriginal = $DesignNotesPath
    $effectiveDesignSource = if ([string]::IsNullOrWhiteSpace($DesignSource)) { "v0" } else { $DesignSource }

    $designReferencePath = Join-Path $base "design-reference"
    New-Item -ItemType Directory -Force -Path $designReferencePath | Out-Null

    $referenceImagePathCopied = Join-Path $designReferencePath "mockup.png"
    Copy-Item -Path $ReferenceImagePath -Destination $referenceImagePathCopied -Force

    if (-not [string]::IsNullOrWhiteSpace($DesignNotesPath) -and (Test-Path -Path $DesignNotesPath -PathType Leaf)) {
        $designNotesPathCopied = Join-Path $designReferencePath "notes.md"
        Copy-Item -Path $DesignNotesPath -Destination $designNotesPathCopied -Force
    }

    @{
        runId = $RunId
        designSource = $effectiveDesignSource
        referenceImagePathOriginal = $referenceImagePathOriginal
        referenceImagePathCopied = $referenceImagePathCopied
        designNotesPathOriginal = $designNotesPathOriginal
        designNotesPathCopied = $designNotesPathCopied
        copiedAt = (Get-Date).ToString("o")
    } | ConvertTo-Json -Depth 10 | Out-File (Join-Path $designReferencePath "source.json") -Encoding utf8
}
elseif (-not [string]::IsNullOrWhiteSpace($DesignSource)) {
    $effectiveDesignSource = $DesignSource
}

if (-not [string]::IsNullOrWhiteSpace($AllowedTargetFiles)) {
    $normalizedAllowedTargetFiles = @(
        $AllowedTargetFiles.Split("|") |
            ForEach-Object { $_.Trim() } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
}

$status = @{
    runId = $RunId
    status = "created"
    runPath = $base
    repoPath = $RepoPath
    branchName = $BranchName
    goal = $Goal
    dayNumber = $DayNumber
    taskTitle = $TaskTitle
    notes = $Notes
    timestamp = (Get-Date).ToString("o")
    workType = $WorkType
    requiresVisualApproval = $RequiresVisualApproval
    allowCursorHandoff = $AllowCursorHandoff
    allowCodexHandoff = $AllowCodexHandoff
    allowFinalReview = $AllowFinalReview
    reviewStatus = $ReviewStatus
    revisionOfRunId = $RevisionOfRunId
    rootRunId = $effectiveRootRunId
    attemptNumber = $effectiveAttemptNumber
    reviewFeedback = $ReviewFeedback
    revisionReason = $RevisionReason
    carryForwardDesignReference = $effectiveCarryForwardDesignReference
    revisionSummary = $RevisionSummary
    previousDesignSource = $PreviousDesignSource
    previousReferenceImagePathCopied = $PreviousReferenceImagePathCopied
    previousDesignNotesPathCopied = $PreviousDesignNotesPathCopied
    runStatus = "initialized"
    referenceImagePathOriginal = $referenceImagePathOriginal
    referenceImagePathCopied = $referenceImagePathCopied
    designNotesPathOriginal = $designNotesPathOriginal
    designNotesPathCopied = $designNotesPathCopied
    designSource = $effectiveDesignSource
    forceTargetedModification = $ForceTargetedModification
    allowedTargetFiles = $normalizedAllowedTargetFiles
    noOpOnTargetFilesIsFailure = $NoOpOnTargetFilesIsFailure
}

$status | ConvertTo-Json -Depth 5 | Out-File (Join-Path $base "status.json") -Encoding utf8

@"
Run created successfully
RunId: $RunId
RunPath: $base
RepoPath: $RepoPath
BranchName: $BranchName
Goal: $Goal
DayNumber: $DayNumber
TaskTitle: $TaskTitle
"@ | Out-File (Join-Path $base "summary.txt") -Encoding utf8

@"
# $TaskTitle

## Goal
$Goal

## Repo
$RepoPath

## Branch
$BranchName

## Day Number
$DayNumber

## Notes
$Notes

## Acceptance Criteria
- Run folder is created successfully
- status.json is written
- summary.txt is written
- task.md is written
- cursorPrompt.md is written
- codexPrompt.md is written
- branch-command.txt is written
- commit-command.txt is written
- pr-title.txt is written
- pr-description.md is written
"@ | Out-File (Join-Path $base "task.md") -Encoding utf8

@"
Read these first:
- docs/ai/cursor-house-rules.md
- docs/ai/testing-standards.md
- docs/ai/prompt-header.md

Do not commit or push.

Task:
$TaskTitle

Goal:
$Goal

Repo:
$RepoPath

Branch:
$BranchName

Notes:
$Notes

Acceptance criteria:
- Run folder is created successfully
- status.json is written
- summary.txt is written
- task.md is written
- cursorPrompt.md is written
- codexPrompt.md is written
- branch-command.txt is written
- commit-command.txt is written
- pr-title.txt is written
- pr-description.md is written
"@ | Out-File (Join-Path $base "cursorPrompt.md") -Encoding utf8

@"
Review and validate the generated n8n-lab run artifacts.

Context:
- RepoPath: $RepoPath
- BranchName: $BranchName
- Goal: $Goal
- DayNumber: $DayNumber
- TaskTitle: $TaskTitle

Validate:
1. status.json exists
2. summary.txt exists
3. task.md exists
4. cursorPrompt.md exists
5. codexPrompt.md exists
6. branch-command.txt exists
7. commit-command.txt exists
8. pr-title.txt exists
9. pr-description.md exists

Do not commit or push.
"@ | Out-File (Join-Path $base "codexPrompt.md") -Encoding utf8

"git checkout -b $BranchName" |
    Out-File (Join-Path $base "branch-command.txt") -Encoding utf8

"git commit -m ""#$BranchName Day $DayNumber - $TaskTitle""" |
    Out-File (Join-Path $base "commit-command.txt") -Encoding utf8

"Day $DayNumber - $TaskTitle" |
    Out-File (Join-Path $base "pr-title.txt") -Encoding utf8

@"
## Summary
$TaskTitle

## Changes
1. Initialized n8n-lab run package
2. Generated task and prompt artifacts
3. Prepared branch and PR metadata

## Technical notes
- RepoPath: $RepoPath
- BranchName: $BranchName
- RunId: $RunId

## Testing
- Verified run folder creation
- Verified artifact generation

## Follow-ups
- Add repo metadata collection
- Add webhook intake
- Add AI tool handoff automation
"@ | Out-File (Join-Path $base "pr-description.md") -Encoding utf8

Write-Output "RUN_CREATED::$RunId::$base"
