param()

$ErrorActionPreference = "Stop"

$root = "C:\dev\PathOS"
$appsRoot = Join-Path $root "apps\pathos-platform"

$repos = @(
    @{ Name = "desktop"; Source = "C:\dev\PathOS\codebase\pathos-desktop"; Dest = (Join-Path $appsRoot "desktop") },
    @{ Name = "web"; Source = "C:\dev\PathOS\codebase\pathos-desktop-web3"; Dest = (Join-Path $appsRoot "web") },
    @{ Name = "backend"; Source = "C:\dev\PathOS\codebase\pathos-backend"; Dest = (Join-Path $appsRoot "backend") }
)

$dirsToCreate = @(
    $appsRoot,
    "C:\dev\PathOS\archives\old-repos",
    "C:\dev\PathOS\archives\patches",
    "C:\dev\PathOS\assets\screenshots",
    "C:\dev\PathOS\assets\images",
    "C:\dev\PathOS\planning",
    "C:\dev\PathOS\master-plans",
    "C:\dev\PathOS\personal",
    "C:\dev\PathOS\dev-pipeline"
)

foreach ($dir in $dirsToCreate) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$results = @()

foreach ($repo in $repos) {
    $src = $repo.Source
    $dst = $repo.Dest

    if (-not (Test-Path $src)) {
        $results += [pscustomobject]@{ Name = $repo.Name; Status = "FAILED"; Details = "Source missing: $src" }
        continue
    }

    New-Item -ItemType Directory -Force -Path $dst | Out-Null

    $rcLog = Join-Path $env:TEMP ("robocopy-{0}.log" -f $repo.Name)
    $rcArgs = @(
        "`"$src`"",
        "`"$dst`"",
        "/E",
        "/COPY:DATS",
        "/DCOPY:DAT",
        "/R:2",
        "/W:2",
        "/NFL",
        "/NDL",
        "/NP",
        "/NJH",
        "/NJS",
        "/LOG:`"$rcLog`""
    )

    & robocopy @rcArgs | Out-Null
    $rc = $LASTEXITCODE

    $gitPath = Join-Path $dst ".git"
    $gitOk = Test-Path $gitPath

    if ($rc -le 7 -and $gitOk) {
        $results += [pscustomobject]@{ Name = $repo.Name; Status = "OK"; Details = "Copied to $dst; .git verified" }
    } elseif (-not $gitOk) {
        $results += [pscustomobject]@{ Name = $repo.Name; Status = "FAILED"; Details = ".git missing at $gitPath" }
    } else {
        $results += [pscustomobject]@{ Name = $repo.Name; Status = "FAILED"; Details = "Robocopy exit code $rc; see $rcLog" }
    }
}

Write-Host ""
Write-Host "Workspace migration summary"
Write-Host "---------------------------"
foreach ($r in $results) {
    Write-Host ("{0}: {1} - {2}" -f $r.Name, $r.Status, $r.Details)
}

if ($results.Status -contains "FAILED") {
    exit 1
}

exit 0
