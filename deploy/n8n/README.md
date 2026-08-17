There are three workflows here:

| Workflow | What it does |
| --- | --- |
| `clavira-watch-folder.json` | **Drop a folder of photos in, get web-ready images out.** Runs itself |
| `clavira-photo-ingest.json` | Supplier renders → catalogue images, matched to SKUs |
| `clavira-cad-to-glb.json` | Supplier Rhino meshes → `.glb` models for 3D try-on |

Both read the same encrypted lots on the NAS and share `extract-archives.ps1`.
**The archives are password-protected throughout** — filenames are readable,
contents are not — so both workflows need `archivePassword` set.

## Before anything else: the files must actually be on this disk

Synology Drive syncs **on demand**. A lot that has never been opened is a
placeholder: it lists with its full size and looks completely normal, but the
bytes are still on the NAS. Both failure modes are silent and neither says
what is wrong:

- **Extracting from a placeholder** makes the extractor trigger the download.
  On this machine that read never returned at all — no CPU, no output, no
  error, indefinitely.
- **Copying it local first is worse.** `Copy-Item` is sparse-aware: it
  duplicates the holes instead of recalling the contents, so you get a file of
  exactly the right byte count filled with zeroes, at an implausible
  ~110 MB/s, and the extractor reports `Bad archive`.

`extract-archives.ps1` now refuses a placeholder and says so, rather than
hanging or producing an empty extraction. To make a lot usable:

> In Explorer, right-click the `.rar` → **Synology Drive → Make available
> offline**, and wait until the icon shows it is downloaded.

Check from PowerShell — the numeric attribute is the only reliable test
(`.Attributes.ToString()` reports these as ordinary local files):

```powershell
Get-ChildItem "C:\SynologyDrive2026\SynologyDrive\Jewelry design download rendering" |
  ForEach-Object { "{0,-46} {1}" -f $_.Name, $(if ([int]$_.Attributes -band 4194304) { "PLACEHOLDER" } else { "local" }) }
```

Once the STLs are converted the lot is no longer needed: right-click →
**Free up space** returns the gigabytes and keeps the few MB of `.glb`.

---

# Watched folder: photos in, web-ready images out

`clavira-watch-folder.json`. Put files in `drop\`, and processed images appear
in `_out\` a couple of minutes later. Nothing to click.

```
D:\clavira-intake\
  drop\        <- you put files or whole folders here
  _work\       a batch mid-process
  _out\        results, one folder per batch, structure mirrored
  _done\       originals, after success
  _failed\     originals + why.txt, after failure
```

Point the **Settings** node's `root` at that folder and activate the workflow.

## What each image gets

A shoot arrives as 6000px JPEGs on a sweep, slightly off-centre, each a
different distance from the lens, carrying camera EXIF and colour profile. A
product grid needs them square, centred, consistently sized and small. Per file:

1. **EXIF rotation applied and stripped** — otherwise a portrait shot is upright
   in Explorer and on its side in the browser, because only some renderers
   honour the tag.
2. **Uniform backdrop keyed out** (see the caveat below).
3. **Trimmed to the piece**, which crops dead space *and* re-centres a piece the
   photographer left off to one side.
4. **Centred on a square** with a little padding, so rows in a grid don't jump.
5. **WebP at each size** — main, `@thumb`, optional `@2x` — in sRGB.

```bash
node deploy/n8n/process-photos.mjs in\ out\ --size 1600 --thumb 400 --bg white --recursive
```

Verified on a 900×700 frame with a 180×180 subject at (120,90): trimmed to
180×181, keyed, centred on 800×800. `--bg white` gives a `[255,255,255]` corner;
`--bg transparent` gives `[0,0,0,0]` with an alpha channel.

## What it will not do

**It cannot cut a piece out of a busy background.** Deciding which pixels are
"the necklace" and which are "the velvet it is lying on" is a matting problem
that needs a trained model; no amount of thresholding substitutes for one.

What it does instead is handle a **uniform** backdrop — a sweep, a lightbox, the
black of a CAD render — by sampling the four corners and keying that colour out.
If the corners disagree, it says so and leaves the shot untouched rather than
eating into the product:

```
d2-bangle-01.jpg
  background white (corners disagreed - left as shot)
```

That line is the signal to send those shots to a real cutout tool, or to use
`--bg keep`. The report counts how many were keyed (`backdropKeyed: 34/40`); a
sudden drop usually means the shoot moved to a different surface.

## Why it polls instead of watching

A filesystem watcher fires the instant a file appears — which is while it is
still being copied. So instead:

- the schedule polls every 2 minutes;
- claiming a batch **moves** it out of `drop\` before anything reads it, so a
  folder dropped in mid-run belongs to the next batch rather than being
  processed half-copied;
- a file the sender still holds open is **skipped, not grabbed** (Windows keeps
  an exclusive lock during a copy), and picked up on the next pass. Without that
  check a 40 MB TIFF gets read at 12 MB and processed into a corrupt thumbnail —
  the kind of bug that only bites the big files and only sometimes.

## When something goes wrong

A batch where 2 of 40 files were corrupt is a **partial success**: the 38 good
ones are kept, the originals are archived, and the report names the failures.
Only a batch where *nothing* processed is quarantined to `_failed\<batch>\` —
originals intact, with a `why.txt` beside them, because a folder of files and no
explanation is worse than useless six weeks later.

Originals are never deleted. Reprocessing at a different size months later needs
the full-resolution file, and a WebP cannot give it back.

## Chaining it into the catalogue

`_out\<batch>\` is laid out exactly as the ingest pipeline expects, so pointing
[the ingest workflow](#synology--clavira-photo-ingest) at it files the results
against SKUs. Keep them separate while you are still tuning the look — you do
not want a half-right crop landing on the live site.

---

# Synology → Clavira photo ingest

Takes a folder of zipped product photography on the NAS, unzips it, works out
which SKU each of ten thousand images belongs to, and files them into the
catalogue — skipping anything already imported.

```
Synology  ──►  extract-archives.ps1  ──►  scan-photos.ps1  ──►  n8n  ──►  clavira.in
 (.zip)         local work dir              name + sha256          /api/ingest/*
```

## Why the work is split this way

n8n orchestrates; PowerShell does the bulk I/O. That division is deliberate:

- **Unzipping in n8n does not scale.** The compression node turns every archive
  member into an in-memory binary item. Ten thousand photos is tens of
  gigabytes, and n8n will die long before the end.
- **Hashing is the expensive step, and it is cacheable.** `scan-photos.ps1`
  keys hashes on path + size + mtime, so the first run reads the whole shoot
  and every run after it finishes in seconds. That is what makes "just run it
  again" a safe answer to a failed batch.
- **The `/plan` call decides before any bytes move.** n8n sends names and
  hashes, the server replies with which files are new and which SKU each
  belongs to. A re-run costs a few hundred KB of JSON instead of a second
  40 GB upload.

## One-time setup

### 1. Server

Add to `.env` on the live site and re-cache config:

```bash
php -r "echo bin2hex(random_bytes(32));"
```

```
INGEST_TOKEN=<the value printed above>
```

```bash
php artisan migrate --force && php artisan config:cache
```

Without `INGEST_TOKEN` the endpoints return **503**. There is no
"open when unconfigured" path — a deploy that forgets the variable fails loudly
rather than quietly publishing a write endpoint.

Also check PHP's `upload_max_filesize` and `post_max_size` on the host are at
least as large as `config('ingest.max_kb')` (20 MB by default). Hostinger
usually ships 64 MB; if a shoot has larger TIFF-sized JPEGs, lower `max_kb`
rather than raising PHP's limit.

### 2. Local machine

- **7-Zip** — <https://7-zip.org>. Optional for `.zip`, required for `.7z`/`.rar`.
- **Map or reach the NAS** — a UNC path (`\\SYNOLOGY\photo\shoots`) is fine.
  n8n must run as a user that can read it; if n8n is a Windows *service* it
  will not see your mapped drives, so prefer the UNC path.
- **Spill binaries to disk**, so one upload batch cannot exhaust the heap:

  ```
  N8N_DEFAULT_BINARY_DATA_MODE=filesystem
  ```

### 3. Import the workflow

In n8n: **Workflows → Import from File →** `clavira-photo-ingest.json`.

Open the **Settings** node and fill in:

| Field          | Meaning                                                       |
| -------------- | ------------------------------------------------------------- |
| `sourceFolder` | NAS folder holding the archives                                |
| `workDir`      | **Local** disk to extract into — never the NAS (see below)     |
| `scriptDir`    | Where these `.ps1` files live                                  |
| `apiBase`      | `https://clavira.in`                                           |
| `ingestToken`  | The `INGEST_TOKEN` value                                       |
| `manifestSize` | Files per `/plan` call. Must stay ≤ 500 (server-side cap)      |
| `uploadBatch`  | Photos held in memory at once. 20 is safe; raise on a fast LAN |

> Extract to a **local** disk. Extracting across SMB is several times slower,
> and the hashing pass then re-reads all of it over the network again.

> `ingestToken` sits in plain text in the Set node and travels with any export
> of the workflow. Move it to an n8n credential before sharing the file.

## Before the first real run: check the filenames

The single thing most likely to waste a night is a filename convention the
patterns do not recognise. Check it against the real folder first — read-only,
writes nothing:

```bash
php artisan photos:ingest "D:\clavira-ingest" --dry
```

It reports how many files parsed, how many matched a SKU, and — the useful part
— every SKU reading that matched nothing, with each interpretation it tried:

```
2 SKU reading(s) in the folder match nothing in the catalogue:
  CLV-1234_07 | CLV-1234   (36 files)
```

If that looks wrong, adjust `patterns` in [`config/ingest.php`](../../config/ingest.php)
and re-run `--dry`. Nothing is written until it reads correctly.

### How a filename becomes a SKU

Filenames are genuinely ambiguous and no regex settles them alone:

| File               | Could be                                          |
| ------------------ | ------------------------------------------------- |
| `CLV-1234.jpg`     | SKU `CLV-1234` — or SKU `CLV`, frame 1234         |
| `CLV1234-007.jpg`  | SKU `CLV1234` frame 7 — or SKU `CLV1234-007`      |

So every reading is generated and **the catalogue breaks the tie**: the first
interpretation whose SKU actually exists in `products` wins. Two catalogue SKUs
that normalise identically (`DUP-1` and `DUP1`) are treated as ambiguous and
refused rather than guessed at.

Matching is otherwise forgiving — `clv1234` finds `CLV-1234` — so a
photographer's casing and punctuation do not have to match the catalogue's.

Shapes recognised out of the box:

```
CLV-1234/001.jpg              folder per SKU, turntable frame   ← most common
Shoot Aug/CLV-1234/012.jpg    wrapper folders are ignored
CLV-1234/front.jpg            folder per SKU, named angle
CLV-1234_frame07.jpg          explicit frame
CLV-1234_07.jpg               trailing number read as a frame
CLV-1234_front.jpg            named angle: front/back/side/top/detail/model/…
CLV-1234.jpg                  a lone shot
```

## Running it

Hit **Execute workflow**. The final node returns:

```json
{
  "batch": "n8n-20260810-143012",
  "catalogue": { "products": 278, "images": 9942 },
  "uploads":   { "stored": 9942, "duplicate": 0, "failed": 0 },
  "skippedByPlan": { "unknown_sku": 58, "bad_extension": 4 },
  "unknownSkus":   { "CLV-8801 | CLV-8801": 24 }
}
```

`catalogue` is read back from the database rather than inferred from HTTP
responses. **If the two disagree, trust `catalogue`.**

Expect the first run to be slow — it reads every byte on the NAS to hash it,
then uploads them all. The workflow's execution timeout is set to 6 hours.

## Re-running is free

Every layer is idempotent, so re-running after a failure is the normal fix
rather than a risk:

- an archive whose timestamp has not moved is not re-extracted;
- a file whose size and mtime have not moved is not re-hashed;
- `/plan` reports anything already held as `duplicate` and it is never uploaded;
- and if two runs overlap, a `UNIQUE (product_id, sha256)` index in the database
  is the final backstop — not application code that a concurrent request could
  race past.

The server also re-hashes what actually arrived and refuses the row if it
disagrees with the client's `sha256`, so a truncated upload can never
masquerade as a stored photo and permanently mask the real one behind a
"duplicate" verdict.

## Undoing a bad import

Every row records the batch that created it:

```sql
SELECT sku, COUNT(*) FROM product_images pi
  JOIN products p ON p.id = pi.product_id
 WHERE ingest_batch = 'n8n-20260810-143012' GROUP BY sku;

DELETE FROM product_images WHERE ingest_batch = 'n8n-20260810-143012';
```

Files on disk are content-addressed (`<first 16 hex of sha256>.jpg`), so
deleting rows orphans files but never corrupts a surviving product.

---

# CAD → 3D try-on models

`clavira-cad-to-glb.json`. Each supplier design ships a Rhino `.3dm` and an
`.stl` beside its renders. The `.stl` is already a mesh, so it converts
straight to a `.glb` the try-on can wear — no photogrammetry, and it is the
real product geometry rather than an approximation of it.

```
extract-archives.ps1  →  find *.stl  →  stl-to-glb.mjs  →  public/models/tryon/
```

## What the converter does, and why

A manufacturing `.stl` handed to a browser unchanged is a 60 MB download that
renders like melted wax. [`stl-to-glb.mjs`](stl-to-glb.mjs) fixes four things:

- **Weld.** STL repeats every shared corner, so a 220k-triangle piece arrives as
  660k vertices. Nothing else works properly until this is done — the simplifier
  cannot collapse an edge whose two sides it thinks are separate vertices.
- **Creased normals.** The one that decides whether it looks like jewellery.
  Averaging every adjacent face rounds the diamonds into shiny blobs, because a
  brilliant cut is nothing *but* hard edges. Averaging only below the crease
  angle (25° default) keeps facets crisp and bands smooth.
- **Decimate.** Casting tolerance is not phone detail. `--budget` caps triangles.
- **Normalise.** Centre and scale the longest axis to 1, so the try-on sizes the
  piece from the wearer's hand instead of caring what units the CAD used.

```bash
node deploy/n8n/stl-to-glb.mjs in.stl out.glb --budget 120000 --metal yellow
```

Verified on the real lot — `64-STL.stl` → 108,816 triangles, 2.79 MB, loads in
466 ms, and the wrist occluder hides 36% of the loop as a real wrist would.

## Two things the pipeline cannot decide for you

**Is the mesh in worn shape?** Some are, some are flat manufacturing layouts.
Of the eight designs in `Loat - 02-LBR`, only `64-CAD` and `588` are shaped as
worn; `57-CAD` is a 184 mm straight strip that would appear on a wrist as a
bar. The workflow reports each model's dimensions so this is visible, but a
human has to look.

**Which Clavira SKU is this?** The lots use supplier design numbers
(`64-CAD`, `588`), not catalogue SKUs. Nothing is switched on in
`config/tryon.php` until someone confirms the mapping — the same rule that
keeps [`_unassigned/`](../../public/images/tryon/_unassigned/README.md) out of
the config: try-on must show the piece the customer is actually buying.

## Why the diamonds are gold

An `.stl` has no layers or materials — metal and stones are one shell — so the
whole piece takes the metal material. The `.3dm` beside it *does* separate them
(jewellery CAD keeps stones on their own layer). Reading that with `rhino3dm`
to emit two primitives, metal and a transmissive diamond, is the upgrade that
takes these from correct to convincing. Not built yet.

---

## When the photos are already on the server

Skip n8n entirely:

```bash
php artisan photos:ingest /path/to/folder --batch=aug-shoot
```

Same rules, same dedupe, no HTTP.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `503` from every call | `INGEST_TOKEN` unset, or `config:cache` not re-run after setting it |
| `401` | Token mismatch between `.env` and the Settings node |
| Everything is `unknown_sku` | Filename convention not matched — run `--dry` and fix `patterns` |
| `413` from the host | File larger than PHP's `post_max_size`; lower `ingest.max_kb` or raise the host limit |
| `hash_mismatch` | File changed between scan and upload — re-run the scan |
| n8n runs out of memory | `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` not set, or `uploadBatch` too high |
| Scan finds nothing | `workDir` points above the extracted folder, or the shoot is not `.jpg/.jpeg/.png/.webp` |
| "is a Synology Drive placeholder" | The lot is not downloaded — see the section at the top |
| `Bad archive`, or extraction hangs with no output | Same cause: a placeholder was read or copied. Never `Copy-Item` one |
