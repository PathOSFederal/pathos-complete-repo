[CmdletBinding()]
param(
    [string]$RunId,
    [string]$RunsRoot,
    [string]$RevisionReason,
    [string]$ReviewFeedback,
    [string]$CarryForwardDesignReference = "true",
    [string]$RevisionSummary = "",
    [string]$RevisedNotes = "",
    [string]$ReferenceImagePath = "",
    [string]$DesignNotesPath = "",
    [string]$DesignSource = ""
)

$ErrorActionPreference = "Stop"

function New-FailureResult {
    param(
        [string]$Message,
        [string]$Reason
    )

    return @{
        status = "failure"
        message = $Message
        reason = $Reason
        runId = $RunId
        revisionReason = $RevisionReason
        reviewFeedback = $ReviewFeedback
        carryForwardDesignReference = $CarryForwardDesignReference
    }
}

if ([string]::IsNullOrWhiteSpace($RunId)) {
    New-FailureResult -Message "Revision run creation failed" -Reason "RunId is required." |
        ConvertTo-Json -Depth 20
    exit 0
}

if ([string]::IsNullOrWhiteSpace($RunsRoot)) {
    New-FailureResult -Message "Revision run creation failed" -Reason "RunsRoot is required." |
        ConvertTo-Json -Depth 20
    exit 0
}

if ([string]::IsNullOrWhiteSpace($RevisionReason)) {
    New-FailureResult -Message "Revision run creation failed" -Reason "revisionReason is required." |
        ConvertTo-Json -Depth 20
    exit 0
}

if ([string]::IsNullOrWhiteSpace($ReviewFeedback)) {
    New-FailureResult -Message "Revision run creation failed" -Reason "reviewFeedback is required." |
        ConvertTo-Json -Depth 20
    exit 0
}

if (-not (Test-Path -Path $RunsRoot)) {
    New-FailureResult -Message "Revision run creation failed" -Reason "RunsRoot does not exist: $RunsRoot" |
        ConvertTo-Json -Depth 20
    exit 0
}

$sourceRunPath = Join-Path $RunsRoot $RunId
if (-not (Test-Path -Path $sourceRunPath)) {
    New-FailureResult -Message "Revision run creation failed" -Reason "Source run path does not exist: $sourceRunPath" |
        ConvertTo-Json -Depth 20
    exit 0
}

$statusPath = Join-Path $sourceRunPath "status.json"
if (-not (Test-Path -Path $statusPath)) {
    New-FailureResult -Message "Revision run creation failed" -Reason "status.json not found: $statusPath" |
        ConvertTo-Json -Depth 20
    exit 0
}

$status = Get-Content -Path $statusPath -Raw | ConvertFrom-Json

$workType = [string]$status.workType
$runStatus = [string]$status.runStatus
$reviewStatus = [string]$status.reviewStatus
$normalizedCarryForward = $CarryForwardDesignReference.Trim().ToLowerInvariant()

if ($workType -ne "ui") {
    New-FailureResult -Message "Revision run creation failed" -Reason "Revision runs are currently supported only for UI runs. Current workType is '$workType'." |
        ConvertTo-Json -Depth 20
    exit 0
}

if ($reviewStatus -ne "rejected") {
    New-FailureResult -Message "Revision run creation failed" -Reason "Revision runs require reviewStatus 'rejected'. Current reviewStatus is '$reviewStatus'." |
        ConvertTo-Json -Depth 20
    exit 0
}

if ($runStatus -ne "visual_review_failed") {
    New-FailureResult -Message "Revision run creation failed" -Reason "Revision runs require runStatus 'visual_review_failed'. Current runStatus is '$runStatus'." |
        ConvertTo-Json -Depth 20
    exit 0
}

if ($normalizedCarryForward -notin @("true", "false")) {
    New-FailureResult -Message "Revision run creation failed" -Reason "carryForwardDesignReference must be 'true' or 'false'. Received: $CarryForwardDesignReference" |
        ConvertTo-Json -Depth 20
    exit 0
}

$rootRunId = [string]$status.rootRunId
if ([string]::IsNullOrWhiteSpace($rootRunId)) {
    $rootRunId = $RunId
}

$attemptNumber = 1
$priorAttempt = [string]$status.attemptNumber
if (-not [string]::IsNullOrWhiteSpace($priorAttempt)) {
    $parsedAttempt = 0
    if ([int]::TryParse($priorAttempt, [ref]$parsedAttempt)) {
        $attemptNumber = $parsedAttempt + 1
    }
    else {
        $attemptNumber = 2
    }
}
else {
    $attemptNumber = 2
}

$effectiveReferenceImagePath = [string]$ReferenceImagePath
$effectiveDesignNotesPath = [string]$DesignNotesPath
$effectiveDesignSource = [string]$DesignSource

if ($normalizedCarryForward -eq "true") {
    if ([string]::IsNullOrWhiteSpace($effectiveReferenceImagePath)) {
        $effectiveReferenceImagePath = [string]$status.referenceImagePathCopied
    }

    if ([string]::IsNullOrWhiteSpace($effectiveDesignNotesPath)) {
        $effectiveDesignNotesPath = [string]$status.designNotesPathCopied
    }

    if ([string]::IsNullOrWhiteSpace($effectiveDesignSource)) {
        $effectiveDesignSource = [string]$status.designSource
    }
}

if (-not [string]::IsNullOrWhiteSpace($effectiveDesignNotesPath) -and [string]::IsNullOrWhiteSpace($effectiveReferenceImagePath)) {
    New-FailureResult -Message "Revision run creation failed" -Reason "designNotesPath requires referenceImagePath for revision runs." |
        ConvertTo-Json -Depth 20
    exit 0
}

$effectiveNotes = if ([string]::IsNullOrWhiteSpace($RevisedNotes)) { [string]$status.notes } else { $RevisedNotes }
$effectiveGoal = [string]$status.goal
$effectiveTaskTitle = [string]$status.taskTitle
$effectiveBranchName = [string]$status.branchName
$effectiveRepoPath = [string]$status.repoPath
$effectiveDayNumber = [string]$status.dayNumber

$revisionPacket = @{
    repoPath = $effectiveRepoPath
    branchName = $effectiveBranchName
    goal = $effectiveGoal
    dayNumber = $effectiveDayNumber
    taskTitle = $effectiveTaskTitle
    notes = $effectiveNotes
    workType = $workType
    requiresVisualApproval = [string]$status.requiresVisualApproval
    reviewStatus = "pending"
    allowCursorHandoff = [string]$status.allowCursorHandoff
    allowCodexHandoff = "false"
    allowFinalReview = [string]$status.allowFinalReview
    revisionOfRunId = $RunId
    rootRunId = $rootRunId
    attemptNumber = [string]$attemptNumber
    reviewFeedback = $ReviewFeedback
    revisionReason = $RevisionReason
    carryForwardDesignReference = $normalizedCarryForward
    revisionSummary = $RevisionSummary
    previousDesignSource = [string]$status.designSource
    previousReferenceImagePathCopied = [string]$status.referenceImagePathCopied
    previousDesignNotesPathCopied = [string]$status.designNotesPathCopied
    referenceImagePath = $effectiveReferenceImagePath
    designNotesPath = $effectiveDesignNotesPath
    designSource = $effectiveDesignSource
}

@{
    status = "success"
    message = "Revision run packet created"
    sourceRunId = $RunId
    sourceRunPath = $sourceRunPath
    rootRunId = $rootRunId
    attemptNumber = [string]$attemptNumber
    revisionReason = $RevisionReason
    reviewFeedback = $ReviewFeedback
    carryForwardDesignReference = $normalizedCarryForward
    revisionPacket = $revisionPacket
} | ConvertTo-Json -Depth 20
