param(
    [string]$RunId,
    [string]$RunsRoot,
    [string]$Decision,
    [string]$ReviewNote = "",
    [string]$ForceDecision = "false"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RunsRoot)) {
    throw "RunsRoot is empty."
}

if ([string]::IsNullOrWhiteSpace($RunId)) {
    throw "RunId is empty."
}

if ([string]::IsNullOrWhiteSpace($Decision)) {
    throw "Decision is empty."
}

$normalizedDecision = $Decision.Trim().ToLowerInvariant()
$normalizedForce = $ForceDecision.Trim().ToLowerInvariant()

if ($normalizedDecision -notin @("approve", "reject")) {
    throw "Decision must be either 'approve' or 'reject'. Received: $Decision"
}

if ($normalizedForce -notin @("true", "false")) {
    throw "ForceDecision must be 'true' or 'false'. Received: $ForceDecision"
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

$historyPath = Join-Path $runPath "status-history.json"

$existingStatus = Get-Content -Path $statusPath -Raw | ConvertFrom-Json

$currentRunStatus = [string]$existingStatus.runStatus
$currentReviewStatus = [string]$existingStatus.reviewStatus

if ($normalizedForce -ne "true") {
    # This guard exists to preserve the original lab behavior while also
    # supporting the new Cursor execution stage. Older smoke-tested runs may
    # still call review directly from ready_for_cursor. The new UI path calls
    # review after Cursor has finished and the run is awaiting_visual_approval.
    $allowedReviewStates = @("ready_for_cursor", "awaiting_visual_approval")

    if ($currentRunStatus -notin $allowedReviewStates) {
        throw "Review decision not allowed. Current runStatus is '$currentRunStatus', but expected one of: $($allowedReviewStates -join ', ')."
    }

    if ($currentReviewStatus -in @("approved", "rejected")) {
        throw "Review decision not allowed. Current reviewStatus is already '$currentReviewStatus'."
    }
}

# Rebuild as hashtable so we can safely update keys
$updatedStatus = @{}
$existingStatus.PSObject.Properties | ForEach-Object {
    $updatedStatus[$_.Name] = $_.Value
}

switch ($normalizedDecision) {
    "approve" {
        $updatedStatus["reviewStatus"] = "approved"
        $updatedStatus["runStatus"] = "ready_for_codex"
        $updatedStatus["allowCodexHandoff"] = "true"
    }
    "reject" {
        $updatedStatus["reviewStatus"] = "rejected"
        $updatedStatus["runStatus"] = "visual_review_failed"
        $updatedStatus["allowCodexHandoff"] = "false"
    }
}

$updatedStatus["lastStatusNote"] = $ReviewNote
$updatedStatus["lastStatusTimestamp"] = (Get-Date).ToString("o")

$updatedStatus | ConvertTo-Json -Depth 20 | Out-File -FilePath $statusPath -Encoding utf8

# Always normalize history to an array
$history = @()

if (Test-Path -Path $historyPath) {
    $rawHistory = Get-Content -Path $historyPath -Raw

    if (-not [string]::IsNullOrWhiteSpace($rawHistory)) {
        $parsedHistory = $rawHistory | ConvertFrom-Json

        if ($parsedHistory -is [System.Array]) {
            $history = @($parsedHistory)
        }
        elseif ($null -ne $parsedHistory) {
            $history = @($parsedHistory)
        }
    }
}

$historyEntry = [ordered]@{
    runStatus    = $updatedStatus["runStatus"]
    reviewStatus = $updatedStatus["reviewStatus"]
    statusNote   = $ReviewNote
    decision     = $normalizedDecision
    forced       = $normalizedForce
    timestamp    = (Get-Date).ToString("o")
}

$history += [pscustomobject]$historyEntry

# Force array shape even with a single entry
@($history) | ConvertTo-Json -Depth 20 | Out-File -FilePath $historyPath -Encoding utf8

Write-Output "REVIEW_DECISION_APPLIED::$RunId::$normalizedDecision::$($updatedStatus["runStatus"])"
