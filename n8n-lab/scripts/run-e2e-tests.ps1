[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$n8nBaseUrl = "http://localhost:5678"
$prepWebhookUrl = "$n8nBaseUrl/webhook-test/pathos-dev-run"
$reviewWebhookUrl = "$n8nBaseUrl/webhook-test/pathos-review-decision"
$codexWebhookUrl = "$n8nBaseUrl/webhook-test/pathos-codex-handoff"

$workspaceRoot = "C:\dev\PathOS"
$platformRoot = "C:\dev\PathOS\apps\pathos-platform"
$repoPath = "C:\dev\PathOS\apps\pathos-platform\frontend"
$n8nLabRoot = "C:\dev\PathOS\n8n-lab"
$runsRoot = "C:\dev\PathOS\n8n-lab\runs"
$scriptsRoot = "C:\dev\PathOS\n8n-lab\scripts"
$logsRoot = "C:\dev\PathOS\n8n-lab\logs"
$e2eLogsRoot = Join-Path $logsRoot "e2e"
$reportPath = Join-Path $logsRoot "e2e-test-report.md"

$script:Failures = New-Object System.Collections.Generic.List[string]
$script:ReportSections = New-Object System.Collections.Generic.List[string]
$script:RawArtifacts = New-Object System.Collections.Generic.List[string]
$script:CurrentSectionLines = $null

function Write-Section {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Title
    )

    if ($null -ne $script:CurrentSectionLines) {
        $script:ReportSections.Add(($script:CurrentSectionLines -join [Environment]::NewLine))
    }

    $script:CurrentSectionLines = New-Object System.Collections.Generic.List[string]
    $script:CurrentSectionLines.Add("## $Title")
    $script:CurrentSectionLines.Add("")
}

function Add-ReportLine {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Line
    )

    if ($null -eq $script:CurrentSectionLines) {
        throw "Write-Section must be called before Add-ReportLine."
    }

    $script:CurrentSectionLines.Add($Line)
}

function Finalize-ReportSections {
    if ($null -ne $script:CurrentSectionLines) {
        $script:ReportSections.Add(($script:CurrentSectionLines -join [Environment]::NewLine))
        $script:CurrentSectionLines = $null
    }
}

function Write-JsonLog {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [AllowNull()]
        $Data
    )

    $path = Join-Path $e2eLogsRoot $Name
    if ($null -eq $Data) {
        "null" | Out-File -FilePath $path -Encoding utf8
    }
    elseif ($Data -is [string]) {
        $Data | Out-File -FilePath $path -Encoding utf8
    }
    else {
        $Data | ConvertTo-Json -Depth 20 | Out-File -FilePath $path -Encoding utf8
    }

    $script:RawArtifacts.Add($path)
    return $path
}

function Assert-Equal {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $false)]
        [AllowNull()]
        $Actual,
        [Parameter(Mandatory = $false)]
        [AllowNull()]
        $Expected
    )

    if ([string]$Actual -ne [string]$Expected) {
        throw "$Name expected '$Expected' but found '$Actual'."
    }
}

function Assert-FileExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -Path $Path -PathType Leaf)) {
        throw "Required file missing: $Path"
    }
}

function Assert-FileNotExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (Test-Path -Path $Path -PathType Leaf) {
        throw "File should not exist: $Path"
    }
}

function Wait-ForPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [int]$TimeoutSeconds = 20,
        [int]$IntervalMilliseconds = 500
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path -Path $Path) {
            return
        }

        Start-Sleep -Milliseconds $IntervalMilliseconds
    }

    throw "Timed out waiting for path: $Path"
}

function Wait-ForRunStatus {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunId,
        [Parameter(Mandatory = $true)]
        [string]$ExpectedRunStatus,
        [Parameter(Mandatory = $false)]
        [string]$ExpectedReviewStatus = "",
        [int]$TimeoutSeconds = 30,
        [int]$IntervalMilliseconds = 500
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $status = Read-RunStatus -RunId $RunId
        $runMatches = ([string]$status.runStatus -eq $ExpectedRunStatus)
        $reviewMatches = ([string]::IsNullOrWhiteSpace($ExpectedReviewStatus) -or [string]$status.reviewStatus -eq $ExpectedReviewStatus)

        if ($runMatches -and $reviewMatches) {
            return $status
        }

        Start-Sleep -Milliseconds $IntervalMilliseconds
    } while ((Get-Date) -lt $deadline)

    $latestStatus = Read-RunStatus -RunId $RunId
    $expectedMessage = "runStatus '$ExpectedRunStatus'"
    if (-not [string]::IsNullOrWhiteSpace($ExpectedReviewStatus)) {
        $expectedMessage += " and reviewStatus '$ExpectedReviewStatus'"
    }

    throw "Timed out waiting for $expectedMessage on run '$RunId'. Last status was runStatus '$($latestStatus.runStatus)' and reviewStatus '$($latestStatus.reviewStatus)'."
}

function Invoke-JsonWebhook {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [Parameter(Mandatory = $true)]
        [hashtable]$Payload,
        [Parameter(Mandatory = $true)]
        [string]$RawLogName
    )

    $jsonBody = $Payload | ConvertTo-Json -Depth 20

    try {
        $response = Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $jsonBody
        $rawPath = Write-JsonLog -Name $RawLogName -Data $response
        return @{
            Succeeded = $true
            Response = $response
            ErrorMessage = $null
            StatusCode = $null
            RawPath = $rawPath
        }
    }
    catch {
        $statusCode = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        $errorBody = $null
        if ($_.ErrorDetails -and -not [string]::IsNullOrWhiteSpace($_.ErrorDetails.Message)) {
            $errorBody = $_.ErrorDetails.Message
        }
        else {
            $errorBody = $_.Exception.Message
        }

        $rawPath = Write-JsonLog -Name $RawLogName -Data @{
            url = $Url
            payload = $Payload
            statusCode = $statusCode
            error = $errorBody
        }

        return @{
            Succeeded = $false
            Response = $null
            ErrorMessage = $errorBody
            StatusCode = $statusCode
            RawPath = $rawPath
        }
    }
}

function Get-LatestRun {
    param(
        [datetime]$CreatedAfter
    )

    $candidateRuns = Get-ChildItem -Path $runsRoot -Directory |
        Where-Object { $_.Name -like "run-*" }

    if ($PSBoundParameters.ContainsKey("CreatedAfter")) {
        $candidateRuns = $candidateRuns | Where-Object { $_.CreationTime -gt $CreatedAfter.AddSeconds(-2) }
    }

    $latestRun = $candidateRuns | Sort-Object CreationTime, Name | Select-Object -Last 1

    if ($null -eq $latestRun) {
        throw "No run directory found under $runsRoot"
    }

    return $latestRun
}

function Read-RunStatus {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunId
    )

    $runPath = Join-Path $runsRoot $RunId
    $statusPath = Join-Path $runPath "status.json"
    Wait-ForPath -Path $statusPath
    return Get-Content -Path $statusPath -Raw | ConvertFrom-Json
}

function Validate-HappyPathAfterPrep {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunId
    )

    $runPath = Join-Path $runsRoot $RunId
    Wait-ForPath -Path (Join-Path $runPath "status-history.json")

    Assert-FileExists -Path (Join-Path $runPath "status.json")
    Assert-FileExists -Path (Join-Path $runPath "status-history.json")
    Assert-FileExists -Path (Join-Path $runPath "task.md")
    Assert-FileExists -Path (Join-Path $runPath "cursorPrompt.md")
    Assert-FileExists -Path (Join-Path $runPath "codexPrompt.md")
    Assert-FileExists -Path (Join-Path $runPath "chatgptFinalReview.md")
    Assert-FileExists -Path (Join-Path $runPath "repo-state.json")
    Assert-FileExists -Path (Join-Path $runPath "preflight.json")

    $status = Wait-ForRunStatus -RunId $RunId -ExpectedRunStatus "ready_for_cursor" -ExpectedReviewStatus "pending"
    Assert-Equal -Name "Happy path prep runStatus" -Actual $status.runStatus -Expected "ready_for_cursor"
    Assert-Equal -Name "Happy path prep reviewStatus" -Actual $status.reviewStatus -Expected "pending"

    return $status
}

function Validate-HappyPathAfterApproval {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunId
    )

    $status = Wait-ForRunStatus -RunId $RunId -ExpectedRunStatus "ready_for_codex" -ExpectedReviewStatus "approved"
    Assert-Equal -Name "Happy path approval runStatus" -Actual $status.runStatus -Expected "ready_for_codex"
    Assert-Equal -Name "Happy path approval reviewStatus" -Actual $status.reviewStatus -Expected "approved"
    Assert-Equal -Name "Happy path approval allowCodexHandoff" -Actual $status.allowCodexHandoff -Expected "true"

    return $status
}

function Validate-HappyPathAfterCodex {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunId
    )

    $runPath = Join-Path $runsRoot $RunId
    $handoffPath = Join-Path $runPath "codexHandoff.md"
    Wait-ForPath -Path $handoffPath
    Assert-FileExists -Path $handoffPath

    $status = Wait-ForRunStatus -RunId $RunId -ExpectedRunStatus "codex_handoff_built"
    Assert-Equal -Name "Happy path codex runStatus" -Actual $status.runStatus -Expected "codex_handoff_built"

    return $status
}

function Validate-RejectionPathAfterPrep {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunId
    )

    $status = Wait-ForRunStatus -RunId $RunId -ExpectedRunStatus "ready_for_cursor" -ExpectedReviewStatus "pending"
    Assert-Equal -Name "Rejected run prep runStatus" -Actual $status.runStatus -Expected "ready_for_cursor"
    Assert-Equal -Name "Rejected run prep reviewStatus" -Actual $status.reviewStatus -Expected "pending"

    return $status
}

function Validate-RejectionPathAfterRejection {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunId
    )

    $status = Wait-ForRunStatus -RunId $RunId -ExpectedRunStatus "visual_review_failed" -ExpectedReviewStatus "rejected"
    Assert-Equal -Name "Rejected run rejection runStatus" -Actual $status.runStatus -Expected "visual_review_failed"
    Assert-Equal -Name "Rejected run rejection reviewStatus" -Actual $status.reviewStatus -Expected "rejected"
    Assert-Equal -Name "Rejected run rejection allowCodexHandoff" -Actual $status.allowCodexHandoff -Expected "false"

    return $status
}

function Validate-RejectedCodexBlocked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunId,
        [Parameter(Mandatory = $true)]
        [hashtable]$CodexAttemptResult
    )

    $runPath = Join-Path $runsRoot $RunId
    $handoffPath = Join-Path $runPath "codexHandoff.md"

    if ($CodexAttemptResult.Succeeded) {
        throw "Rejected codex handoff unexpectedly succeeded."
    }

    Assert-FileNotExists -Path $handoffPath

    $status = Read-RunStatus -RunId $RunId
    Assert-Equal -Name "Rejected run blocked codex runStatus" -Actual $status.runStatus -Expected "visual_review_failed"

    return $status
}

function Invoke-PrepRun {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RawLogName
    )

    $payload = @{
        project = "pathos-frontend"
        workspaceRoot = $workspaceRoot
        platformRoot = $platformRoot
        repoPath = $repoPath
        n8nLabRoot = $n8nLabRoot
        runsRoot = $runsRoot
        scriptsRoot = $scriptsRoot
        branchName = "feature/day-75-n8n-dev-pipeline-v1"
        goal = "End-to-end automated validation of PathOS n8n workflows"
        dayNumber = 75
        taskTitle = "Validate n8n orchestration happy path and rejection path"
        notes = "Automated E2E validation. Do not use dev-pipeline. Stop after Cursor implementation for visual approval before Codex."
        acceptanceCriteria = @(
            "Prep workflow succeeds",
            "Status becomes ready_for_cursor",
            "Approval moves run to ready_for_codex",
            "Codex handoff builds successfully for approved run",
            "Rejected run blocks Codex handoff"
        )
        docsToRead = @(
            "docs/ai/cursor-house-rules.md",
            "docs/ai/testing-standards.md",
            "docs/ai/prompt-header.md"
        )
        allowBranchCreate = $false
        runStatus = "initialized"
        workType = "ui"
        requiresVisualApproval = $true
        allowPromptGeneration = $true
        allowCursorHandoff = $true
        allowCodexHandoff = $false
        allowFinalReview = $false
        reviewStatus = "pending"
        revisionOfRunId = $null
    }

    return Invoke-JsonWebhook -Url $prepWebhookUrl -Payload $payload -RawLogName $RawLogName
}

function Invoke-ReviewDecision {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunId,
        [Parameter(Mandatory = $true)]
        [string]$Decision,
        [Parameter(Mandatory = $true)]
        [string]$ReviewNote,
        [Parameter(Mandatory = $true)]
        [string]$RawLogName
    )

    $payload = @{
        runId = $RunId
        runsRoot = $runsRoot
        decision = $Decision
        reviewNote = $ReviewNote
    }

    return Invoke-JsonWebhook -Url $reviewWebhookUrl -Payload $payload -RawLogName $RawLogName
}

function Invoke-CodexHandoff {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunId,
        [Parameter(Mandatory = $true)]
        [string]$RawLogName
    )

    $payload = @{
        runId = $RunId
        runsRoot = $runsRoot
    }

    return Invoke-JsonWebhook -Url $codexWebhookUrl -Payload $payload -RawLogName $RawLogName
}

function Save-StatusSnapshot {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RunId,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $status = Read-RunStatus -RunId $RunId
    Write-JsonLog -Name $Name -Data $status | Out-Null
    return $status
}

function Add-Failure {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    $script:Failures.Add($Message)
}

New-Item -ItemType Directory -Force -Path $logsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $e2eLogsRoot | Out-Null

$suiteStartedAt = Get-Date
$happyRunId = $null
$rejectedRunId = $null

Write-Section -Title "Environment"
Add-ReportLine "- Executed at: $($suiteStartedAt.ToString("o"))"
Add-ReportLine "- n8n base URL: $n8nBaseUrl"
Add-ReportLine "- Workspace root: $workspaceRoot"
Add-ReportLine "- Active repo: $repoPath"
Add-ReportLine "- Runs root: $runsRoot"
Add-ReportLine "- Scripts root: $scriptsRoot"
Add-ReportLine "- Raw log directory: $e2eLogsRoot"
Add-ReportLine ""

Write-Section -Title "Happy Path"
try {
    $beforeHappyPrep = Get-Date
    $happyPrepResult = Invoke-PrepRun -RawLogName "happy-prep-response.json"
    if (-not $happyPrepResult.Succeeded) {
        throw "Happy path prep webhook failed. $($happyPrepResult.ErrorMessage)"
    }

    $happyRun = Get-LatestRun -CreatedAfter $beforeHappyPrep
    $happyRunId = $happyRun.Name
    Add-ReportLine "- Created run: $happyRunId"
    Add-ReportLine "- Prep response log: $($happyPrepResult.RawPath)"

    $happyPrepStatus = Validate-HappyPathAfterPrep -RunId $happyRunId
    Save-StatusSnapshot -RunId $happyRunId -Name "happy-after-prep-status.json" | Out-Null
    Add-ReportLine "- After prep: runStatus=$($happyPrepStatus.runStatus), reviewStatus=$($happyPrepStatus.reviewStatus)"

    $happyApproveResult = Invoke-ReviewDecision -RunId $happyRunId -Decision "approve" -ReviewNote "Initial UI pass looks good. Proceed to Codex hardening." -RawLogName "happy-approve-response.json"
    if (-not $happyApproveResult.Succeeded) {
        throw "Happy path approval webhook failed. $($happyApproveResult.ErrorMessage)"
    }

    $happyApprovedStatus = Validate-HappyPathAfterApproval -RunId $happyRunId
    Save-StatusSnapshot -RunId $happyRunId -Name "happy-after-approval-status.json" | Out-Null
    Add-ReportLine "- After approval: runStatus=$($happyApprovedStatus.runStatus), reviewStatus=$($happyApprovedStatus.reviewStatus), allowCodexHandoff=$($happyApprovedStatus.allowCodexHandoff)"

    $happyCodexResult = Invoke-CodexHandoff -RunId $happyRunId -RawLogName "happy-codex-response.json"
    if (-not $happyCodexResult.Succeeded) {
        throw "Happy path codex handoff webhook failed. $($happyCodexResult.ErrorMessage)"
    }

    $happyCodexStatus = Validate-HappyPathAfterCodex -RunId $happyRunId
    Save-StatusSnapshot -RunId $happyRunId -Name "happy-after-codex-status.json" | Out-Null
    Add-ReportLine "- After codex handoff: runStatus=$($happyCodexStatus.runStatus)"
    Add-ReportLine "- codexHandoff.md: $(Join-Path (Join-Path $runsRoot $happyRunId) 'codexHandoff.md')"
}
catch {
    $message = "Happy path failed: $($_.Exception.Message)"
    Add-Failure -Message $message
    Add-ReportLine "- FAILURE: $message"
}

Write-Section -Title "Rejection Path"
try {
    $beforeRejectedPrep = Get-Date
    $rejectedPrepResult = Invoke-PrepRun -RawLogName "rejection-prep-response.json"
    if (-not $rejectedPrepResult.Succeeded) {
        throw "Rejection path prep webhook failed. $($rejectedPrepResult.ErrorMessage)"
    }

    $rejectedRun = Get-LatestRun -CreatedAfter $beforeRejectedPrep
    $rejectedRunId = $rejectedRun.Name
    Add-ReportLine "- Created run: $rejectedRunId"
    Add-ReportLine "- Prep response log: $($rejectedPrepResult.RawPath)"

    $rejectedPrepStatus = Validate-RejectionPathAfterPrep -RunId $rejectedRunId
    Save-StatusSnapshot -RunId $rejectedRunId -Name "rejection-after-prep-status.json" | Out-Null
    Add-ReportLine "- After prep: runStatus=$($rejectedPrepStatus.runStatus), reviewStatus=$($rejectedPrepStatus.reviewStatus)"

    $rejectedReviewResult = Invoke-ReviewDecision -RunId $rejectedRunId -Decision "reject" -ReviewNote "Header spacing and card alignment need refinement before Codex." -RawLogName "rejection-review-response.json"
    if (-not $rejectedReviewResult.Succeeded) {
        throw "Rejection path reject webhook failed. $($rejectedReviewResult.ErrorMessage)"
    }

    $rejectedStatus = Validate-RejectionPathAfterRejection -RunId $rejectedRunId
    Save-StatusSnapshot -RunId $rejectedRunId -Name "rejection-after-review-status.json" | Out-Null
    Add-ReportLine "- After rejection: runStatus=$($rejectedStatus.runStatus), reviewStatus=$($rejectedStatus.reviewStatus), allowCodexHandoff=$($rejectedStatus.allowCodexHandoff)"

    $rejectedCodexAttempt = Invoke-CodexHandoff -RunId $rejectedRunId -RawLogName "rejection-codex-attempt.json"
    $blockedStatus = Validate-RejectedCodexBlocked -RunId $rejectedRunId -CodexAttemptResult $rejectedCodexAttempt
    Save-StatusSnapshot -RunId $rejectedRunId -Name "rejection-after-blocked-codex-status.json" | Out-Null
    Add-ReportLine "- Blocked codex attempt: statusCode=$($rejectedCodexAttempt.StatusCode), message=$($rejectedCodexAttempt.ErrorMessage)"
    Add-ReportLine "- Final rejected run status: runStatus=$($blockedStatus.runStatus), reviewStatus=$($blockedStatus.reviewStatus)"
}
catch {
    $message = "Rejection path failed: $($_.Exception.Message)"
    Add-Failure -Message $message
    Add-ReportLine "- FAILURE: $message"
}

Write-Section -Title "Results"
$suiteEndedAt = Get-Date
$overallResult = if ($script:Failures.Count -eq 0) { "PASS" } else { "FAIL" }
Add-ReportLine "- Overall result: $overallResult"
Add-ReportLine "- Started: $($suiteStartedAt.ToString("o"))"
Add-ReportLine "- Finished: $($suiteEndedAt.ToString("o"))"
if ($happyRunId) {
    Add-ReportLine "- Happy path run ID: $happyRunId"
}
if ($rejectedRunId) {
    Add-ReportLine "- Rejection path run ID: $rejectedRunId"
}
if ($script:RawArtifacts.Count -gt 0) {
    Add-ReportLine "- Raw artifacts:"
    foreach ($artifact in $script:RawArtifacts) {
        Add-ReportLine "  - $artifact"
    }
}

if ($script:Failures.Count -gt 0) {
    Write-Section -Title "Failures"
    foreach ($failure in $script:Failures) {
        Add-ReportLine "- $failure"
    }
}

Finalize-ReportSections

$reportHeader = @(
    "# PathOS n8n E2E Validation Report",
    ""
)

($reportHeader + $script:ReportSections) -join [Environment]::NewLine + [Environment]::NewLine |
    Out-File -FilePath $reportPath -Encoding utf8

Write-Host "Script: $PSCommandPath"
Write-Host "Report: $reportPath"
Write-Host "Result: $overallResult"

if ($script:Failures.Count -gt 0) {
    exit 1
}

exit 0
