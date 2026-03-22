# This script exists to give the PathOS n8n orchestrator one deterministic,
# read-only way to inspect a run and decide what the next legal orchestration
# step should be.
#
# The orchestrator already knows how to call child workflows. What it does not
# currently have is a single local helper that:
# - loads the canonical run status from disk
# - validates the run folder exists
# - translates a raw runStatus into the next orchestrator action
# - returns a stable JSON payload that an n8n Code/IF/Switch chain can use
#
# This file is intentionally over-commented because it is part of the teaching
# surface for the n8n lab. A future maintainer should be able to answer:
# - why this file exists
# - how the status mapping works
# - which states are considered legal continuation points
# - how compatibility is handled while the pipeline evolves

[CmdletBinding()]
param(
    # The run identifier to inspect.
    # This is the same runId used by the run folder and the orchestration API.
    [Parameter(Mandatory = $true)]
    [string]$RunId,

    # The root folder that contains all run folders.
    # The default matches the current n8n-lab layout so the helper is easy to
    # call from n8n without repeating a value in every request.
    [string]$RunsRoot = "C:\dev\PathOS\n8n-lab\runs"
)

$ErrorActionPreference = "Stop"

function Test-RequiredValue {
    param(
        [string]$Name,
        [string]$Value
    )

    # This helper exists so all missing-value failures are consistent.
    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "$Name is empty."
    }
}

function Assert-ExistingPath {
    param(
        [string]$Label,
        [string]$PathValue
    )

    # This helper exists so path validation errors are deterministic and easy
    # for the orchestrator to surface back to the caller.
    if (-not (Test-Path -Path $PathValue)) {
        throw "$Label does not exist: $PathValue"
    }
}

function New-InspectionResult {
    param(
        [string]$Decision,
        [string]$Reason,
        [bool]$Supported,
        [string]$NormalizedStatus,
        [string]$CompatibilityNote = ""
    )

    # This helper exists so the orchestrator receives one stable response shape
    # regardless of which status was inspected.
    return [ordered]@{
        runId               = $RunId
        runPath             = $runPath
        statusPath          = $statusPath
        runStatus           = $currentRunStatus
        normalizedRunStatus = $NormalizedStatus
        reviewStatus        = $reviewStatus
        workType            = $workType
        requiresVisualApproval = $requiresVisualApproval
        nextOrchestratorAction  = $Decision
        supported           = $Supported
        reason              = $Reason
        compatibilityNote   = $CompatibilityNote
        inspectedAt         = (Get-Date).ToString("o")
    }
}

Test-RequiredValue -Name "RunId" -Value $RunId
Test-RequiredValue -Name "RunsRoot" -Value $RunsRoot

Assert-ExistingPath -Label "RunsRoot" -PathValue $RunsRoot

$runPath = Join-Path $RunsRoot $RunId
$statusPath = Join-Path $runPath "status.json"

Assert-ExistingPath -Label "Run path" -PathValue $runPath
Assert-ExistingPath -Label "status.json" -PathValue $statusPath

$status = Get-Content -Path $statusPath -Raw | ConvertFrom-Json

$currentRunStatus = [string]$status.runStatus
$reviewStatus = [string]$status.reviewStatus
$workType = [string]$status.workType
$requiresVisualApproval = [string]$status.requiresVisualApproval

$result = switch ($currentRunStatus) {
    # This is the normal post-prep state. The orchestrator should advance by
    # invoking the dedicated Cursor execution child workflow.
    "ready_for_cursor" {
        New-InspectionResult `
            -Decision "invoke_cursor_execution" `
            -Reason "Run is prepared and legally ready for Cursor execution." `
            -Supported $true `
            -NormalizedStatus "ready_for_cursor"
        break
    }

    # This is an intentional human gate. The orchestrator must not auto-advance.
    "awaiting_visual_approval" {
        New-InspectionResult `
            -Decision "wait_for_visual_approval" `
            -Reason "Run is waiting on human visual approval and cannot auto-advance." `
            -Supported $true `
            -NormalizedStatus "awaiting_visual_approval"
        break
    }

    # This is the legal start point for the Codex execution stage. The Codex
    # execution workflow may build the handoff first if it is still missing.
    "ready_for_codex" {
        New-InspectionResult `
            -Decision "invoke_codex_execution" `
            -Reason "Run is ready for the Codex execution workflow." `
            -Supported $true `
            -NormalizedStatus "ready_for_codex"
        break
    }

    # This is the desired future post-Codex state from the user's target state
    # machine. Once the Codex stage is upgraded, continue_run should route from
    # here toward the final review surface.
    "codex_review_complete" {
        New-InspectionResult `
            -Decision "prepare_final_review" `
            -Reason "Codex review is complete and the run can move to final review preparation." `
            -Supported $true `
            -NormalizedStatus "codex_review_complete"
        break
    }

    # Compatibility note:
    # the currently proven n8n-lab flow ends the pre-execution Codex workflow at
    # `codex_handoff_built`. Once Codex execution exists, that state should
    # route into execution, not final review.
    "codex_handoff_built" {
        New-InspectionResult `
            -Decision "invoke_codex_execution" `
            -Reason "Current lab compatibility mode: codex handoff already exists, so the next step is Codex execution." `
            -Supported $true `
            -NormalizedStatus "codex_handoff_built" `
            -CompatibilityNote "Compatibility mapping applied: codex_handoff_built is treated as ready to run Codex execution."
        break
    }

    default {
        New-InspectionResult `
            -Decision "unsupported_status" `
            -Reason "Run status is not supported by continue_run." `
            -Supported $false `
            -NormalizedStatus $currentRunStatus
    }
}

$result | ConvertTo-Json -Depth 20
