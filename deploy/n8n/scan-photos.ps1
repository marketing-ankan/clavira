<#
.SYNOPSIS
    Walk an extracted photo folder and emit one JSON line per image.

.DESCRIPTION
    Step 2 of the photo ingest pipeline: turn a folder of ten thousand images
    into a manifest of { name, sha256, bytes } that the /api/ingest/plan
    endpoint can answer in a few hundred kilobytes of JSON.

    Hashing dominates the runtime - ten thousand photos is tens of gigabytes
    that have to be read end to end. So results are cached against
    path + size + last-write-time: the first run pays for the read, every
    re-run after it is close to instant, which is what makes "just run it
    again" a reasonable answer to a failed batch.

    Output is NDJSON (one object per line) rather than a single array. It
    streams, it survives truncation legibly, and n8n can split it on newlines
    without a 10,000-element parse.

.PARAMETER Root
    Folder to walk recursively. Paths in the manifest are relative to this, and
    that relative path is what the SKU patterns in config/ingest.php match
    against - so point it at the folder whose children are SKU folders.

.PARAMETER CachePath
    Where to keep the hash cache. Defaults to .hash-cache.json inside Root.

.PARAMETER NoCache
    Ignore and rewrite the cache. Use if you suspect files changed without
    their timestamps changing.

.EXAMPLE
    .\scan-photos.ps1 -Root D:\clavira-ingest\shoot-aug
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string] $Root,
    [string] $CachePath,
    [switch] $NoCache
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not (Test-Path -LiteralPath $Root)) { throw "Folder not found: $Root" }

$Root = (Resolve-Path -LiteralPath $Root).Path
if (-not $CachePath) { $CachePath = Join-Path $Root '.hash-cache.json' }

$extensions = @('.jpg', '.jpeg', '.png', '.webp')

# ---- cache -----------------------------------------------------------------
$cache = @{}
if (-not $NoCache -and (Test-Path -LiteralPath $CachePath)) {
    try {
        $raw = Get-Content -LiteralPath $CachePath -Raw -Encoding utf8
        if ($raw.Trim()) {
            # PS 5.1 has no -AsHashtable, so walk the PSCustomObject.
            $parsed = $raw | ConvertFrom-Json
            foreach ($property in $parsed.PSObject.Properties) {
                $cache[$property.Name] = $property.Value
            }
        }
    }
    catch {
        Write-Warning "Hash cache unreadable, starting fresh: $($_.Exception.Message)"
        $cache = @{}
    }
}

# ---- walk ------------------------------------------------------------------
$files = Get-ChildItem -LiteralPath $Root -File -Recurse |
    Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() }

$fresh = @{}
$hashed = 0
$reused = 0

foreach ($file in $files) {
    $relative = $file.FullName.Substring($Root.Length).TrimStart('\', '/').Replace('\', '/')
    $key = '{0}|{1}|{2}' -f $relative, $file.Length, $file.LastWriteTimeUtc.Ticks

    if ($cache.ContainsKey($key)) {
        $sha = $cache[$key]
        $reused++
    }
    else {
        $sha = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        $hashed++
    }

    $fresh[$key] = $sha

    # ConvertTo-Json per record rather than hand-built strings: paths carry
    # quotes, backslashes and non-ASCII, and getting that escaping subtly wrong
    # would corrupt the manifest in ways that only show up on one file in ten
    # thousand.
    [pscustomobject]@{
        name   = $relative
        sha256 = $sha
        bytes  = $file.Length
    } | ConvertTo-Json -Compress
}

# Only the keys seen this run are kept, so the cache cannot grow without bound
# across months of shoots.
if (-not $NoCache) {
    $fresh | ConvertTo-Json -Depth 2 -Compress | Set-Content -LiteralPath $CachePath -Encoding utf8
}

Write-Information "scanned=$($files.Count) hashed=$hashed cached=$reused" -InformationAction Continue
