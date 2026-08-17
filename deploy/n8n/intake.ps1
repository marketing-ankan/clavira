<#
.SYNOPSIS
    Drop-folder mechanics for the watched-folder pipeline.

.DESCRIPTION
    Turns "a folder someone drops files into" into discrete batches that can be
    processed, retried and audited. The layout under -Root:

        drop\      you put files (or whole folders) here
        _work\     a claimed batch, mid-process
        _out\      processed results, one folder per batch
        _done\     originals, after the batch succeeded
        _failed\   originals, with why.txt, after it did not

    CLAIMING IS A MOVE, and that is the whole design. A batch is taken out of
    drop\ before anything reads it, so a file copied in halfway through a run
    simply belongs to the next batch instead of being processed half-written.

    Files still being written are skipped rather than claimed: Windows holds an
    exclusive lock during a copy, so a file that cannot be opened for read is
    one the sender has not finished with. Without that check a 40 MB TIFF gets
    picked up at 12 MB and processed into a corrupt thumbnail, which is the
    kind of bug that only shows up on the big files and only sometimes.

.PARAMETER Action
    claim     move stable files out of drop\ into _work\<batch>, print JSON
    complete  move _work\<batch> to _done\<batch>
    fail      move _work\<batch> to _failed\<batch> and write why.txt

.EXAMPLE
    .\intake.ps1 -Root D:\clavira-intake -Action claim
    .\intake.ps1 -Root D:\clavira-intake -Action complete -Batch 20260817-120500
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string] $Root,
    [Parameter(Mandatory = $true)][ValidateSet('claim', 'complete', 'fail')][string] $Action,
    [string] $Batch,
    [string] $Reason = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$drop = Join-Path $Root 'drop'
$work = Join-Path $Root '_work'
$out = Join-Path $Root '_out'
$done = Join-Path $Root '_done'
$failed = Join-Path $Root '_failed'

foreach ($d in @($drop, $work, $out, $done, $failed)) {
    if (-not (Test-Path -LiteralPath $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

# Extensions worth claiming. Anything else is left in drop\ rather than moved
# somewhere the sender will not think to look for it.
$extensions = @('.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff')

function Test-Writable {
    <#
        Can this file be opened for read with no sharing? If not, something
        still has it open - almost always the copy that is putting it there.
    #>
    param([string] $Path)

    try {
        $fs = [System.IO.File]::Open($Path, 'Open', 'Read', 'None')
        $fs.Close()

        return $true
    }
    catch {
        return $false
    }
}

switch ($Action) {

    'claim' {
        $batchId = Get-Date -Format 'yyyyMMdd-HHmmss'
        $target = Join-Path $work $batchId

        $candidates = @(Get-ChildItem -LiteralPath $drop -File -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() })

        $claimed = @()
        $busy = 0

        foreach ($f in $candidates) {
            if (-not (Test-Writable $f.FullName)) { $busy++; continue }

            # Mirror the sender's folder structure: a shoot arranged as
            # <SKU>\<frame>.jpg carries meaning in those folder names, and
            # flattening it here would throw away the only clue about which
            # piece each file belongs to.
            $relative = $f.FullName.Substring($drop.Length).TrimStart('\', '/')
            $dest = Join-Path $target $relative
            $destDir = Split-Path $dest -Parent
            if (-not (Test-Path -LiteralPath $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }

            try {
                Move-Item -LiteralPath $f.FullName -Destination $dest -Force
                $claimed += $relative
            }
            catch {
                # Lost a race with the sender. Leave it for the next run.
                $busy++
            }
        }

        # Tidy the empty folders the move left behind, so drop\ does not slowly
        # fill with the skeleton of every shoot ever sent.
        if (Test-Path -LiteralPath $drop) {
            Get-ChildItem -LiteralPath $drop -Directory -Recurse -ErrorAction SilentlyContinue |
                Sort-Object { $_.FullName.Length } -Descending |
                Where-Object { -not (Get-ChildItem -LiteralPath $_.FullName -Recurse -File -ErrorAction SilentlyContinue) } |
                ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
        }

        if (-not $claimed) {
            # Nothing to do is the normal state of a watched folder, not a fault.
            if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction SilentlyContinue }
            [pscustomobject]@{ batch = $null; count = 0; busy = $busy } | ConvertTo-Json -Compress

            return
        }

        [pscustomobject]@{
            batch   = $batchId
            path    = $target
            outPath = Join-Path $out $batchId
            count   = $claimed.Count
            busy    = $busy
            files   = @($claimed | Select-Object -First 20)
        } | ConvertTo-Json -Depth 3 -Compress
    }

    'complete' {
        if (-not $Batch) { throw '-Batch is required for complete' }
        $src = Join-Path $work $Batch
        if (-not (Test-Path -LiteralPath $src)) { throw "No such batch: $src" }

        Move-Item -LiteralPath $src -Destination (Join-Path $done $Batch) -Force
        [pscustomobject]@{ batch = $Batch; movedTo = (Join-Path $done $Batch) } | ConvertTo-Json -Compress
    }

    'fail' {
        if (-not $Batch) { throw '-Batch is required for fail' }
        $src = Join-Path $work $Batch
        if (-not (Test-Path -LiteralPath $src)) { throw "No such batch: $src" }

        $dest = Join-Path $failed $Batch
        Move-Item -LiteralPath $src -Destination $dest -Force

        # The originals travel with the reason they failed. Six weeks later
        # nobody remembers, and a folder of files with no explanation is worse
        # than useless.
        Set-Content -LiteralPath (Join-Path $dest 'why.txt') `
            -Value "Batch $Batch failed on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`r`n`r`n$Reason" -Encoding utf8

        [pscustomobject]@{ batch = $Batch; movedTo = $dest } | ConvertTo-Json -Compress
    }
}
