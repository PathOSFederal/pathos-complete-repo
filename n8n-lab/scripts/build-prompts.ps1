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
    [string]$RevisionOfRunId = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $RunsRoot)) {
    throw "RunsRoot does not exist: $RunsRoot"
}

if (-not (Test-Path $RepoPath)) {
    throw "RepoPath does not exist: $RepoPath"
}

$runPath = Join-Path $RunsRoot $RunId
if (-not (Test-Path $runPath)) {
    throw "Run path does not exist: $runPath"
}

$statusPath = Join-Path $runPath "status.json"
$statusText = "{}"
if (Test-Path $statusPath) {
    $statusText = Get-Content $statusPath -Raw
}

$status = $statusText | ConvertFrom-Json
$referenceImagePathCopied = [string]$status.referenceImagePathCopied
$designNotesPathCopied = [string]$status.designNotesPathCopied
$designSource = [string]$status.designSource
$statusRevisionOfRunId = [string]$status.revisionOfRunId
$rootRunId = [string]$status.rootRunId
$attemptNumber = [string]$status.attemptNumber
$reviewFeedback = [string]$status.reviewFeedback
$revisionReason = [string]$status.revisionReason
$carryForwardDesignReference = [string]$status.carryForwardDesignReference
$revisionSummary = [string]$status.revisionSummary
$previousDesignSource = [string]$status.previousDesignSource
$previousReferenceImagePathCopied = [string]$status.previousReferenceImagePathCopied
$previousDesignNotesPathCopied = [string]$status.previousDesignNotesPathCopied
$forceTargetedModification = [string]$status.forceTargetedModification
$noOpOnTargetFilesIsFailure = [string]$status.noOpOnTargetFilesIsFailure
$allowedTargetFiles = @()
if ($null -ne $status.allowedTargetFiles) {
    $allowedTargetFiles = @($status.allowedTargetFiles)
}

$repoStatePath = Join-Path $runPath "repo-state.json"
$preflightPath = Join-Path $runPath "preflight.json"

$repoStateText = "repo-state.json not found"
$preflightText = "preflight.json not found"

if (Test-Path $repoStatePath) {
    $repoStateText = Get-Content $repoStatePath -Raw
}

if (Test-Path $preflightPath) {
    $preflightText = Get-Content $preflightPath -Raw
}

$revisionSection = ""
if (-not [string]::IsNullOrWhiteSpace($statusRevisionOfRunId)) {
    $effectiveRevisionReason = if ([string]::IsNullOrWhiteSpace($revisionReason)) { "Revision requested" } else { $revisionReason }
    $effectiveReviewFeedback = if ([string]::IsNullOrWhiteSpace($reviewFeedback)) { "No detailed review feedback was attached." } else { $reviewFeedback }
    $effectiveRevisionSummary = if ([string]::IsNullOrWhiteSpace($revisionSummary)) { "No short revision summary was attached." } else { $revisionSummary }
    $effectiveCarryForwardDesignReference = if ([string]::IsNullOrWhiteSpace($carryForwardDesignReference)) { "false" } else { $carryForwardDesignReference }

    $revisionSection = @"

## Revision Context
This run is a revision of: $statusRevisionOfRunId
- Root run lineage: $rootRunId
- Attempt number: $attemptNumber
- Revision reason: $effectiveRevisionReason
- Revision summary: $effectiveRevisionSummary
- Carry forward design reference: $effectiveCarryForwardDesignReference
- Previous design source: $previousDesignSource
- Previous reference image: $previousReferenceImagePathCopied
- Previous design notes: $previousDesignNotesPathCopied

### Review Feedback To Apply
$effectiveReviewFeedback
"@
}

$visualApprovalSection = ""
if ($RequiresVisualApproval -eq "true") {
    $visualApprovalSection = @"

## Visual Approval Gate
This work requires a human visual review after the initial Cursor implementation pass.
Stop after the initial implementation and wait for approval before any Codex hardening or final review steps continue.
"@
}

$designReferenceSection = ""
if (-not [string]::IsNullOrWhiteSpace($referenceImagePathCopied)) {
    $designNotesLine = if (-not [string]::IsNullOrWhiteSpace($designNotesPathCopied)) {
        "- Supplemental notes file: design-reference/notes.md"
    }
    else {
        "- No supplemental design notes file was attached."
    }

    $designReferenceSection = @"

## Design Reference Intake
This run includes a design-reference input artifact that defines the UI target for implementation.
- Design source: $designSource
- Primary reference image target: design-reference/mockup.png
$designNotesLine
- Treat the design-reference files as input/reference artifacts, not output artifacts.
- Follow the mockup for layout, grouping, spacing, hierarchy, and intended behavior implied by the design.
- If the mockup and code reality conflict, preserve the visible design target and call out the ambiguity rather than inventing a different UI.
"@
}

$targetedExecutionSection = ""
if ($forceTargetedModification -eq "true") {
    $allowedTargetFilesText = if ($allowedTargetFiles.Count -gt 0) {
        ($allowedTargetFiles | ForEach-Object { "- $_" }) -join [Environment]::NewLine
    }
    else {
        "- No explicit target files were attached."
    }

    $targetedExecutionSection = @"

## Strict Targeted Execution Contract
This run requires concrete implementation changes on the intended target surfaces.
- Force targeted modification: $forceTargetedModification
- No-op on target files is failure: $noOpOnTargetFilesIsFailure
- Already-dirty target files are valid implementation targets and are not a reason to skip implementation.
- Analysis-only behavior does not satisfy this run.
- If the canonical PathAdvisor structure is incomplete, make concrete code edits on the target surfaces.
- If you make no code changes, you must explain exactly why and name the files you inspected.

### Allowed Target Files
$allowedTargetFilesText
"@
}

$cursorPrompt = @"
Read these first:
- docs/ai/cursor-house-rules.md
- docs/ai/testing-standards.md
- docs/ai/prompt-header.md

Do not commit or push.

## Role
You are the initial implementation agent for this run.

## Task
$TaskTitle

## Goal
$Goal

## Repo
$RepoPath

## Branch
$BranchName

## Work Type
$WorkType

## Notes
$Notes
$revisionSection
$visualApprovalSection
$designReferenceSection
$targetedExecutionSection

## Current Repo State
$repoStateText

## Current Preflight State
$preflightText

## Instructions
- Implement only the requested initial pass.
- Keep changes scoped and minimal.
- For UI work, prioritize accurate structure, spacing, flow, and usability.
- Do not continue past the initial implementation when visual approval is required.
- Do not commit or push.

## Required Output
- Initial implementation completed
- Clear summary of files changed
- Any known gaps or follow-up issues
"@

$codexPrompt = @"
Do not commit or push.

## Role
You are the hardening and validation agent for this run.

## Task
$TaskTitle

## Goal
$Goal

## Repo
$RepoPath

## Branch
$BranchName

## Work Type
$WorkType

## Notes
$Notes
$revisionSection
$designReferenceSection
$targetedExecutionSection

## Current Repo State
$repoStateText

## Current Preflight State
$preflightText

## Hardening Scope
Review the implementation for:
- correctness
- edge cases
- misuse cases
- regression risk
- missing tests
- missing validations
- merge-readiness concerns

## Important Gate
Only perform this step after the required human review gate has been approved for UI work.

## Required Output
- hardening findings
- recommended fixes
- test and validation recommendations
- merge-readiness assessment
"@

$chatgptFinalReview = @"
## Final ChatGPT Review Packet

### Role
You are the final judgment layer for this run.

### Task
$TaskTitle

### Goal
$Goal

### Repo
$RepoPath

### Branch
$BranchName

### Work Type
$WorkType

### Notes
$Notes
$revisionSection
$designReferenceSection

### Review Objective
Compare:
- the original task
- the generated run artifacts
- the human review result
- the Codex findings

Then determine:
- whether the work still matches the original task
- whether another revision loop is needed
- whether the work is ready for merge preparation

### Current Repo State
$repoStateText

### Current Preflight State
$preflightText
"@

$taskDoc = @"
# $TaskTitle

## Goal
$Goal

## Repo
$RepoPath

## Branch
$BranchName

## Day Number
$DayNumber

## Work Type
$WorkType

## Notes
$Notes
$revisionSection
$visualApprovalSection
$designReferenceSection
$targetedExecutionSection

## Agent Flow
1. ChatGPT creates the task and packet
2. n8n prepares and tracks the run
3. Cursor performs the initial implementation
4. Human reviews UI work when required
5. Codex performs hardening and validation
6. ChatGPT performs the final review
"@

$cursorPrompt | Out-File (Join-Path $runPath "cursorPrompt.md") -Encoding utf8
$codexPrompt | Out-File (Join-Path $runPath "codexPrompt.md") -Encoding utf8
$chatgptFinalReview | Out-File (Join-Path $runPath "chatgptFinalReview.md") -Encoding utf8
$taskDoc | Out-File (Join-Path $runPath "task.md") -Encoding utf8

Write-Output "PROMPTS_BUILT::$RunId::$runPath"
