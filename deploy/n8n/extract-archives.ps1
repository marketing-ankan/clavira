<#
.SYNOPSIS
    Extract every archive in a Synology folder into a local working directory.

.DESCRIPTION
    Step 1 of the photo ingest pipeline. Kept out of n8n deliberately: n8n's
    compression node loads archive members into memory as binary items, which is
    fine for a dozen files and fatal for ten thousand.

    Extraction is skipped when the destination already holds files and the
    archive has not changed since - a resumed run should not spend twenty
    minutes re-inflating the same 40 GB.

.PARAMETER Source
    Folder holding the .zip / .7z / .rar files. A UNC path to the NAS is fine
    (\\SYNOLOGY\photo\shoots), as is a mapped drive.

.PARAMETER WorkDir
    Local folder to extract into. Use a LOCAL disk, not the NAS - extracting
    across SMB is several times slower and hashing afterwards re-reads it all.

.PARAMETER Password
    For encrypted archives. The supplier's CAD lots are encrypted throughout -
    filenames are readable but every entry's contents need this.

.PARAMETER Force
    Re-extract even when the destination looks complete.

.EXAMPLE
    .\extract-archives.ps1 -Source "C:\SynologyDrive2026\SynologyDrive\Jewelry design download rendering" -WorkDir D:\clavira-ingest -Password 1234567890
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string] $Source,
    [Parameter(Mandatory = $true)][string] $WorkDir,
    [string] $Password,
    [switch] $Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not (Test-Path -LiteralPath $Source)) { throw "Source folder not found: $Source" }
if (-not (Test-Path -LiteralPath $WorkDir)) { New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null }

# 7-Zip handles every format, streams better, and is markedly faster than
# Expand-Archive on large archives.
$sevenZip = @(
    'C:\Program Files\7-Zip\7z.exe',
    'C:\Program Files (x86)\7-Zip\7z.exe'
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $sevenZip) {
    $cmd = Get-Command 7z.exe -ErrorAction SilentlyContinue
    if ($cmd) { $sevenZip = $cmd.Source }
}

# WinRAR ships UnRAR.exe and is far more commonly installed on a design
# workstation than 7-Zip. Without this fallback a machine that can already open
# every archive on the NAS by double-clicking would be told to install
# something, which is a silly thing for a script to demand.
$unrar = @(
    'C:\Program Files\WinRAR\UnRAR.exe',
    'C:\Program Files (x86)\WinRAR\UnRAR.exe'
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $unrar) {
    $cmd = Get-Command UnRAR.exe -ErrorAction SilentlyContinue
    if ($cmd) { $unrar = $cmd.Source }
}

$archives = Get-ChildItem -LiteralPath $Source -File -Recurse |
    Where-Object { $_.Extension -in '.zip', '.7z', '.rar' }

if (-not $archives) { throw "No .zip/.7z/.rar found under $Source" }

$results = @()

foreach ($archive in $archives) {
    # One subfolder per archive keeps two shoots that both contain "001.jpg"
    # from overwriting each other, and makes a partial run easy to inspect.
    $destination = Join-Path $WorkDir ([System.IO.Path]::GetFileNameWithoutExtension($archive.Name))
    $stamp = Join-Path $destination '.extracted'

    $upToDate = (Test-Path -LiteralPath $stamp) -and
                ((Get-Content -LiteralPath $stamp -Raw).Trim() -eq $archive.LastWriteTimeUtc.Ticks.ToString())

    if ($upToDate -and -not $Force) {
        $results += [pscustomobject]@{ archive = $archive.Name; destination = $destination; status = 'already-extracted' }
        continue
    }

    if (-not (Test-Path -LiteralPath $destination)) {
        New-Item -ItemType Directory -Path $destination -Force | Out-Null
    }

    # Synology Drive syncs on demand. A file that has never been opened is a
    # sparse placeholder (RecallOnDataAccess) whose bytes live only on the NAS,
    # and there is no cheap way to tell that apart from a real file: it reports
    # its full size, and Get-ChildItem lists it like any other.
    #
    # Two things go wrong if this is not checked, and both were hit for real:
    #
    #   Extracting straight from a placeholder makes the extractor trigger the
    #   download. That looks exactly like a hang - no CPU, no output, no error -
    #   for however long several gigabytes take to arrive.
    #
    #   Copying it somewhere local first does NOT fix it. Copy-Item is
    #   sparse-aware and duplicates the holes rather than recalling the
    #   contents, so you get a file of the right size full of zero bytes and an
    #   extractor that reports "Bad archive" with no hint as to why.
    #
    # So: refuse, and say what to do. Downloading gigabytes unasked is the
    # wrong default on a laptop that may not have room for them.
    if ([int]$archive.Attributes -band 4194304) {
        throw @"
$($archive.Name) is a Synology Drive placeholder - the file is on the NAS, not on this disk.
Extracting it here would silently produce an empty archive.

Fix it one of these ways, then re-run:
  * In Explorer, right-click the file -> Synology Drive -> "Make available offline",
    wait for the icon to show it is downloaded ($([math]::Round($archive.Length/1GB,2)) GB).
  * Or copy it off the NAS with File Station / the web UI and point -Source at that copy.
"@
    }

    if ($sevenZip) {
        # -aoa overwrite, -bso0/-bsp0 silence progress so n8n's stdout stays
        # small enough to be worth capturing. '-p-' means "never prompt": an
        # encrypted archive with no password must FAIL, not park a hidden
        # console prompt that hangs the n8n execution until it times out.
        $pw = if ($Password) { "-p$Password" } else { '-p-' }
        & $sevenZip x $archive.FullName "-o$destination" -aoa -bso0 -bsp0 $pw | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "7-Zip failed on $($archive.Name) (exit $LASTEXITCODE) - wrong or missing -Password?" }
    }
    elseif ($unrar -and $archive.Extension -eq '.rar') {
        # x = extract with paths, -o+ = overwrite, -y = assume yes, -idq = quiet.
        $pw = if ($Password) { "-p$Password" } else { '-p-' }
        & $unrar x -o+ -y -idq $pw $archive.FullName "$destination\" | Out-Null
        # UnRAR returns 1 for "warning" (e.g. a skipped file) - only 0 is clean,
        # anything above 1 is a genuine failure worth stopping for.
        if ($LASTEXITCODE -gt 1) { throw "UnRAR failed on $($archive.Name) (exit $LASTEXITCODE) - wrong or missing -Password?" }
    }
    elseif ($archive.Extension -eq '.zip') {
        # A password does not necessarily mean THIS archive needs one - the
        # supplier's outer zip is plain and only the .rar inside it is
        # encrypted. So try, and only complain about encryption if it fails.
        try {
            Expand-Archive -LiteralPath $archive.FullName -DestinationPath $destination -Force -ErrorAction Stop
        }
        catch {
            throw "Could not open $($archive.Name): $($_.Exception.Message). If it is encrypted, Expand-Archive cannot help - install 7-Zip."
        }
    }
    else {
        throw "$($archive.Name) needs 7-Zip or WinRAR, neither of which was found. Get 7-Zip from https://7-zip.org"
    }

    # The supplier nests: a .zip whose only entry is another .rar. Extract one
    # level down so the caller gets images and CAD, not another archive.
    foreach ($nested in Get-ChildItem -LiteralPath $destination -File -Recurse |
        Where-Object { $_.Extension -in '.rar', '.7z' }) {

        $nestedDest = Join-Path $destination ([System.IO.Path]::GetFileNameWithoutExtension($nested.Name))
        if (-not (Test-Path -LiteralPath $nestedDest)) {
            New-Item -ItemType Directory -Path $nestedDest -Force | Out-Null
        }

        if ($sevenZip) {
            $pw = if ($Password) { "-p$Password" } else { '-p-' }
            & $sevenZip x $nested.FullName "-o$nestedDest" -aoa -bso0 -bsp0 $pw | Out-Null
        }
        elseif ($unrar) {
            $pw = if ($Password) { "-p$Password" } else { '-p-' }
            & $unrar x -o+ -y -idq $pw $nested.FullName "$nestedDest\" | Out-Null
        }
        if ($LASTEXITCODE -gt 1) { throw "Failed on nested $($nested.Name) (exit $LASTEXITCODE)" }

        Remove-Item -LiteralPath $nested.FullName -Force
    }

    # Written last, so an interrupted extraction is never mistaken for a
    # finished one on the next run.
    Set-Content -LiteralPath $stamp -Value $archive.LastWriteTimeUtc.Ticks -Encoding utf8

    $results += [pscustomobject]@{ archive = $archive.Name; destination = $destination; status = 'extracted' }
}

# n8n reads this off stdout.
[pscustomobject]@{
    workDir  = $WorkDir
    archives = $results
} | ConvertTo-Json -Depth 4 -Compress
