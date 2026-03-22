[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$RunId,

    [Parameter(Mandatory = $true)]
    [string]$RunPath,

    [Parameter(Mandatory = $true)]
    [string]$RepoPath
)

$ErrorActionPreference = "Stop"

function Write-JsonResult {
    param(
        [hashtable]$Data
    )

    $Data | ConvertTo-Json -Depth 20 -Compress | Write-Output
    exit 0
}

try {
    $scriptsRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    $invokeScriptPath = Join-Path $scriptsRoot "invoke-cursor.ps1"
    $tempRoot = "C:\dev\PathOS\n8n-lab\tmp"

    New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

    $stdoutPath = Join-Path $tempRoot ("cursor-stdout-" + $RunId + "-" + [guid]::NewGuid().ToString() + ".log")
    $stderrPath = Join-Path $tempRoot ("cursor-stderr-" + $RunId + "-" + [guid]::NewGuid().ToString() + ".log")

    try {
        $process = Start-Process powershell.exe `
            -ArgumentList @(
                "-ExecutionPolicy", "Bypass",
                "-File", $invokeScriptPath,
                "-RunId", $RunId,
                "-RunPath", $RunPath,
                "-RepoPath", $RepoPath
            ) `
            -NoNewWindow `
            -Wait `
            -PassThru `
            -RedirectStandardOutput $stdoutPath `
            -RedirectStandardError $stderrPath

        $stdout = if (Test-Path $stdoutPath) { [System.IO.File]::ReadAllText($stdoutPath) } else { "" }
        $stderr = if (Test-Path $stderrPath) { [System.IO.File]::ReadAllText($stderrPath) } else { "" }

        Write-JsonResult -Data ([ordered]@{
            stdout   = $stdout
            stderr   = $stderr
            exitCode = $process.ExitCode
        })
    }
    finally {
        if (Test-Path $stdoutPath) {
            Remove-Item $stdoutPath -Force -ErrorAction SilentlyContinue
        }

        if (Test-Path $stderrPath) {
            Remove-Item $stderrPath -Force -ErrorAction SilentlyContinue
        }
    }
}
catch {
    Write-JsonResult -Data ([ordered]@{
        stdout   = ""
        stderr   = $_.Exception.Message
        exitCode = -1
    })
}
