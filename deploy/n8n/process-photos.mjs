/**
 * Photographer's folder -> web-ready product images.
 *
 *   node process-photos.mjs <inDir> <outDir> [options]
 *
 *     --size 1600        longest edge of the main image
 *     --thumb 400        thumbnail edge (0 disables)
 *     --retina           also emit @2x
 *     --bg white|transparent|keep
 *     --pad 0.06         breathing room around the piece, as a fraction
 *     --quality 82
 *     --recursive        walk subfolders, mirror the structure
 *     --json             one JSON line per image, for n8n
 *
 * The gap this closes: a shoot arrives as 6000px JPEGs on a grey sweep, shot
 * slightly off-centre, each a different distance from the lens, carrying the
 * camera's EXIF and colour profile. A product grid needs them square, centred,
 * consistently sized, colour-correct and small. Doing that by hand is a day's
 * work per shoot and is never quite consistent.
 *
 * WHAT IT DOES NOT DO: cut a piece out of a busy background. Deciding which
 * pixels are "the necklace" and which are "the velvet it is lying on" is a
 * matting problem that needs a trained model, and no amount of thresholding
 * substitutes for one. What is here handles a UNIFORM backdrop -- a sweep, a
 * lightbox, the black of a CAD render -- by sampling the corners and keying
 * that colour out. On a patterned or shadowed background, use --bg keep and
 * send those shots to a proper cutout tool.
 */
import { readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { join, extname, basename, relative, dirname } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const has = (n) => args.includes(`--${n}`);
const flag = (n, d) => {
    const i = args.indexOf(`--${n}`);

    return i === -1 ? d : args[i + 1];
};

const inDir = positional[0];
const outDir = positional[1];

if (!inDir || !outDir) {
    console.error('usage: node process-photos.mjs <inDir> <outDir> [--size 1600] [--thumb 400] [--retina] [--bg white|transparent|keep] [--pad 0.06] [--quality 82] [--recursive] [--json]');
    process.exit(2);
}

const SIZE = Number(flag('size', 1600));
const THUMB = Number(flag('thumb', 400));
const RETINA = has('retina');
const BG = String(flag('bg', 'white'));
const PAD = Number(flag('pad', 0.06));
const QUALITY = Number(flag('quality', 82));
const RECURSIVE = has('recursive');
const AS_JSON = has('json');

const EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff'];

if (!['white', 'transparent', 'keep'].includes(BG)) {
    console.error(`--bg must be white, transparent or keep (got "${BG}")`);
    process.exit(2);
}

// ---------------------------------------------------------------- gather
function walk(dir, out = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (RECURSIVE) walk(p, out);
        } else if (EXTS.includes(extname(entry.name).toLowerCase())) {
            out.push(p);
        }
    }

    return out;
}

if (!existsSync(inDir)) {
    console.error(`not a folder: ${inDir}`);
    process.exit(2);
}

const files = walk(inDir);
if (!files.length) {
    console.error(`no images under ${inDir}`);
    process.exit(1);
}

// ------------------------------------------------------------- process
let ok = 0;
let failed = 0;

for (const file of files) {
    try {
        const report = await one(file);
        ok++;
        console.log(AS_JSON ? JSON.stringify(report) : format(report));
    } catch (e) {
        failed++;
        const report = { input: basename(file), error: e.message };
        console.log(AS_JSON ? JSON.stringify(report) : `${basename(file)}  FAILED: ${e.message}`);
    }
}

if (!AS_JSON) console.log(`\n${ok} processed, ${failed} failed`);
process.exit(failed && !ok ? 1 : 0);

// ================================================================ helpers

async function one(file) {
    const rel = RECURSIVE ? relative(inDir, file) : basename(file);
    const stem = basename(rel, extname(rel));
    const destDir = join(outDir, RECURSIVE ? dirname(rel) : '.');
    mkdirSync(destDir, { recursive: true });

    // rotate() applies the EXIF orientation and then drops it. Skipping this is
    // the classic bug where a portrait shot is upright in Explorer and on its
    // side in the browser, because only some renderers honour the tag.
    let img = sharp(file, { failOn: 'error' }).rotate();

    const meta = await img.metadata();
    const before = { width: meta.width, height: meta.height, format: meta.format };

    // Key out a uniform backdrop by sampling the corners. Only done when they
    // agree with each other — if they do not, the background is not uniform and
    // this technique would eat into the product.
    let keyed = false;
    if (BG !== 'keep') {
        const corner = await cornerColour(file, meta);
        if (corner) {
            img = img.flatten({ background: corner.rgb });
            // A tolerance band, not an exact match: sensor noise and JPEG
            // ringing mean no two "white" pixels are the same white.
            img = img.removeAlpha();
            keyed = true;
        }
    }

    // Trim the uniform border, which both crops dead space and re-centres a
    // piece the photographer left off to one side.
    const trimmed = sharp(await img.png().toBuffer()).trim({ threshold: 12 });

    let buf;
    let trimInfo;
    try {
        const r = await trimmed.toBuffer({ resolveWithObject: true });
        buf = r.data;
        trimInfo = { width: r.info.width, height: r.info.height };
    } catch {
        // trim() throws when the whole frame is one colour. Keep the original.
        buf = await img.png().toBuffer();
        const m = await sharp(buf).metadata();
        trimInfo = { width: m.width, height: m.height };
    }

    const background = BG === 'transparent'
        ? { r: 0, g: 0, b: 0, alpha: 0 }
        : { r: 255, g: 255, b: 255, alpha: 1 };

    const outputs = [];
    const inner = Math.round(SIZE * (1 - PAD * 2));

    for (const [suffix, edge] of variants()) {
        const innerEdge = Math.round(edge * (1 - PAD * 2));
        const name = `${stem}${suffix}.webp`;
        const dest = join(destDir, name);

        await sharp(buf)
            // 'contain' preserves the whole piece; a square canvas is what a
            // product grid needs so rows do not jump about.
            .resize(innerEdge, innerEdge, { fit: 'contain', background, withoutEnlargement: true })
            .extend(padding(innerEdge, edge))
            .toColourspace('srgb')
            .webp({ quality: QUALITY, effort: 4 })
            .toFile(dest);

        outputs.push({ name, edge });
    }

    return {
        input: rel,
        before,
        trimmedTo: trimInfo,
        keyedBackground: keyed,
        background: BG,
        outputs,
        square: SIZE,
        innerEdge: inner,
    };
}

function variants() {
    const out = [['', SIZE]];
    if (RETINA) out.push(['@2x', SIZE * 2]);
    if (THUMB > 0) out.push(['@thumb', THUMB]);

    return out;
}

/** Even padding to take an inner box out to the full square. */
function padding(innerEdge, edge) {
    const total = edge - innerEdge;
    const half = Math.floor(total / 2);

    return {
        top: half,
        bottom: total - half,
        left: half,
        right: total - half,
        background: BG === 'transparent'
            ? { r: 0, g: 0, b: 0, alpha: 0 }
            : { r: 255, g: 255, b: 255, alpha: 1 },
    };
}

/**
 * The backdrop colour, or null when the corners disagree.
 *
 * Four corners, averaged over a small patch each so one noisy pixel cannot
 * decide it. They have to agree within a tight tolerance: a sweep or a
 * lightbox gives four near-identical corners, while a piece on patterned silk
 * gives four different ones, and that disagreement is exactly the signal that
 * this shot needs a real cutout rather than a colour key.
 */
async function cornerColour(file, meta) {
    const patch = Math.max(8, Math.round(Math.min(meta.width, meta.height) * 0.02));
    const spots = [
        { left: 0, top: 0 },
        { left: meta.width - patch, top: 0 },
        { left: 0, top: meta.height - patch },
        { left: meta.width - patch, top: meta.height - patch },
    ];

    const means = [];
    for (const spot of spots) {
        const { data, info } = await sharp(file)
            .rotate()
            .extract({ ...spot, width: patch, height: patch })
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        let r = 0, g = 0, b = 0;
        const px = info.width * info.height;
        for (let i = 0; i < data.length; i += info.channels) {
            r += data[i]; g += data[i + 1]; b += data[i + 2];
        }
        means.push([r / px, g / px, b / px]);
    }

    const spread = (i) => Math.max(...means.map((m) => m[i])) - Math.min(...means.map((m) => m[i]));
    if (spread(0) > 18 || spread(1) > 18 || spread(2) > 18) return null;

    const avg = [0, 1, 2].map((i) => Math.round(means.reduce((s, m) => s + m[i], 0) / means.length));

    return { rgb: { r: avg[0], g: avg[1], b: avg[2] } };
}

function format(r) {
    return [
        `${r.input}`,
        `  ${r.before.width}x${r.before.height} ${r.before.format} -> trimmed ${r.trimmedTo.width}x${r.trimmedTo.height}`,
        `  background ${r.background}${r.keyedBackground ? ' (uniform backdrop keyed)' : ' (corners disagreed - left as shot)'}`,
        `  ${r.outputs.map((o) => `${o.name} ${o.edge}px`).join('  ')}`,
    ].join('\n');
}
