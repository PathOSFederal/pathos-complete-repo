param(
    [string]$RunId,
    [string]$RunsRoot,
    [string]$NewStatus,
    [string]$ReviewStatus = "",
    [string]$StatusNote = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RunsRoot)) {
    throw "RunsRoot is empty."
}

if ([string]::IsNullOrWhiteSpace($RunId)) {
    throw "RunId is empty."
}

if ([string]::IsNullOrWhiteSpace($NewStatus)) {
    throw "NewStatus is empty."
}

if (-not (Test-Path -Path $RunsRoot)) {
    throw "RunsRoot does not exist: $RunsRoot"
}

$runPath = Join-Path $RunsRoot $RunId
if ([string]::IsNullOrWhiteSpace($runPath)) {
    throw "Computed runPath is empty."
}

if (-not (Test-Path -Path $runPath)) {
    throw "Run path does not exist: $runPath"
}

$statusPath = Join-Path $runPath "status.json"
if ([string]::IsNullOrWhiteSpace($statusPath)) {
    throw "Computed statusPath is empty."
}

if (-not (Test-Path -Path $statusPath)) {
    throw "status.json not found: $statusPath"
}

$historyPath = Join-Path $runPath "status-history.json"

# Load current status
$existingStatus = Get-Content -Path $statusPath -Raw | ConvertFrom-Json

# Rebuild as hashtable so we can safely add/update keys
$updatedStatus = @{}
$existingStatus.PSObject.Properties | ForEach-Object {
    $updatedStatus[$_.Name] = $_.Value
}

$updatedStatus["runStatus"] = $NewStatus

if (-not [string]::IsNullOrWhiteSpace($ReviewStatus)) {
    $updatedStatus["reviewStatus"] = $ReviewStatus
}

$updatedStatus["lastStatusNote"] = $StatusNote
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
    runStatus    = $NewStatus
    reviewStatus = $ReviewStatus
    statusNote   = $StatusNote
    timestamp    = (Get-Date).ToString("o")
}

$history += [pscustomobject]$historyEntry

# Force array shape even with a single entry
@($history) | ConvertTo-Json -Depth 20 | Out-File -FilePath $historyPath -Encoding utf8

Write-Output "RUN_STATUS_UPDATED::$RunId::$NewStatus"