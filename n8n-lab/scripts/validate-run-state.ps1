# ============================================================================
# validate-run-state.ps1
# ============================================================================
#
# WHY THIS FILE EXISTS
# --------------------
# The n8n "PathOS Cursor Execution v1" child workflow needs to verify that a
# run is actually eligible for Cursor execution before it does any work.
# This script is the very first gate in that workflow.  If validation fails,
# the workflow returns a clean JSON error and never touches the run's files.
#
# HOW IT FITS THE PIPELINE
# ------------------------
# 1. The orchestrator calls the Cursor execution child workflow with a runId.
# 2. The child workflow's first real step is an Execute Command that runs
#    this script.
# 3. If this script exits 0, the workflow trusts the parsed stdout JSON and
#    proceeds to set cursor_in_progress, invoke Cursor, and branch on
#    success/failure.
# 4. If this script exits 1, the workflow reads the stdout JSON for a
#    human-readable error message and returns it to the orchestrator.
#
# HOW EACH SECTION WORKS
# ----------------------
# Parameters    – RunId is required; RunsRoot has a sensible default.
# Path setup    – Derives runPath and statusPath from the inputs.
# FS checks     – Confirms the run folder and status.json exist on disk.
# JSON parse    – Reads and deserializes status.json.
# State guard   – Rejects any run whose runStatus != "ready_for_cursor".
# Output build  – Assembles a single JSON object with every field the
#                 downstream n8n nodes need so they never re-read the file.
#
# OUTPUT CONTRACT
# ---------------
# Exactly one JSON object is written to stdout.
#   On success (exit 0):  { "status": "valid", "message": "...", ... }
#   On invalid state/input (exit 0): { "status": "invalid", "message": "...", ... }
#   On unexpected script failure (exit 1): fallback shell error semantics may still apply
# ============================================================================

[CmdletBinding()]
param(
    # The run identifier, e.g. "run-1773961210063".
    # This is also the folder name under RunsRoot.
    [Parameter(Mandatory = $true)]
    [string]$RunId,

    # Root directory containing all run folders.
    # Defaults to the standard n8n-lab runs directory so the n8n command
    # only has to pass RunId in the common case.
    [Parameter(Mandatory = $false)]
    [string]$RunsRoot = "C:\dev\PathOS\n8n-lab\runs"
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Helper: Write-ResultAndExit
# ---------------------------------------------------------------------------
# Every intentional code path must produce exactly one JSON line on stdout and
# then exit. Validation outcomes now exit 0 for both valid and invalid results
# so the n8n Execute Command node preserves stdout instead of collapsing the
# payload into a generic error string.
# ---------------------------------------------------------------------------
function Write-ResultAndExit {
    param(
        [hashtable]$Data,
        [int]$ExitCode
    )
    $Data | ConvertTo-Json -Depth 20 -Compress | Write-Output
    exit $ExitCode
}

try {
    # ------------------------------------------------------------------
    # Step 1 – Parameter guard
    # ------------------------------------------------------------------
    # A blank RunId would create paths like "C:\...\runs\" which resolve
    # to the runs root itself.  Fail fast.
    # ------------------------------------------------------------------
    if ([string]::IsNullOrWhiteSpace($RunId)) {
        Write-ResultAndExit -Data ([ordered]@{
            status  = "invalid"
            message = "RunId parameter is empty."
            runId   = ""
        }) -ExitCode 0
    }

    # ------------------------------------------------------------------
    # Step 2 – RunsRoot must exist on disk
    # ------------------------------------------------------------------
    if (-not (Test-Path -Path $RunsRoot)) {
        Write-ResultAndExit -Data ([ordered]@{
            status  = "invalid"
            message = "RunsRoot does not exist: $RunsRoot"
            runId   = $RunId
        }) -ExitCode 0
    }

    # ------------------------------------------------------------------
    # Step 3 – Resolve the run folder and verify it exists
    # ------------------------------------------------------------------
    # The run folder is <RunsRoot>\<RunId>.  If the operator passed a
    # bogus RunId the folder will simply be missing.
    # ------------------------------------------------------------------
    $runPath = Join-Path $RunsRoot $RunId

    if (-not (Test-Path -Path $runPath)) {
        Write-ResultAndExit -Data ([ordered]@{
            status  = "invalid"
            message = "Run folder does not exist: $runPath"
            runId   = $RunId
        }) -ExitCode 0
    }

    # ------------------------------------------------------------------
    # Step 4 – status.json must exist inside the run folder
    # ------------------------------------------------------------------
    $statusPath = Join-Path $runPath "status.json"

    if (-not (Test-Path -Path $statusPath -PathType Leaf)) {
        Write-ResultAndExit -Data ([ordered]@{
            status  = "invalid"
            message = "status.json not found: $statusPath"
            runId   = $RunId
        }) -ExitCode 0
    }

    # ------------------------------------------------------------------
    # Step 5 – Parse status.json
    # ------------------------------------------------------------------
    # ConvertFrom-Json will throw on malformed JSON, which lands in the
    # catch block and produces a clean error payload.
    # ------------------------------------------------------------------
    $statusRaw = Get-Content -Path $statusPath -Raw
    $status    = $statusRaw | ConvertFrom-Json

    # ------------------------------------------------------------------
    # Step 6 – State guard: runStatus must be "ready_for_cursor"
    # ------------------------------------------------------------------
    # The pipeline only arrives here after start_run and (optionally) a
    # review step have completed.  Any other runStatus means the run is
    # not in the right phase and Cursor execution must not proceed.
    # ------------------------------------------------------------------
    $currentRunStatus = [string]$status.runStatus

    if ($currentRunStatus -ne "ready_for_cursor") {
        Write-ResultAndExit -Data ([ordered]@{
            status       = "invalid"
            message      = "Run is not eligible for Cursor execution. Current runStatus is '$currentRunStatus', expected 'ready_for_cursor'."
            runId        = $RunId
            runStatus    = $currentRunStatus
            reviewStatus = [string]$status.reviewStatus
            runPath      = $runPath
            statusPath   = $statusPath
        }) -ExitCode 0
    }

    # ------------------------------------------------------------------
    # Step 7 – Build the success payload
    # ------------------------------------------------------------------
    # This payload is the single source of truth for every downstream
    # n8n node.  Nothing after this point should re-read status.json
    # or guess at field values.
    # ------------------------------------------------------------------
    $result = [ordered]@{
        status                 = "valid"
        message                = "Run is eligible for Cursor execution."
        runId                  = $RunId
        runPath                = $runPath
        statusPath             = $statusPath
        repoPath               = [string]$status.repoPath
        branchName             = [string]$status.branchName
        workType               = [string]$status.workType
        requiresVisualApproval = [string]$status.requiresVisualApproval
        runStatus              = $currentRunStatus
        reviewStatus           = [string]$status.reviewStatus
        taskTitle              = [string]$status.taskTitle
        goal                   = [string]$status.goal
        notes                  = [string]$status.notes
    }

    Write-ResultAndExit -Data $result -ExitCode 0
}
catch {
    # ------------------------------------------------------------------
    # Catch-all for unexpected errors (malformed JSON, permission issues,
    # PowerShell internal errors, etc.).  The n8n workflow always gets a
    # parseable JSON payload, never raw PowerShell error text.
    # ------------------------------------------------------------------
    $errorPayload = [ordered]@{
        status  = "invalid"
        message = "Unexpected error: $($_.Exception.Message)"
        runId   = $RunId
    }
    $errorPayload | ConvertTo-Json -Depth 20 -Compress | Write-Output
    exit 0
}
