/**
 * Showroom snapshot -> studio on-model shot, with the real product preserved.
 *
 *   node onmodel.mjs <inDir> <outDir> [--scene ring-hand|neck|ear|wrist]
 *                    [--dry-run] [--proof] [--json]
 *
 * The problem this solves: the catalogue is shot on the shop floor. Rings sit on
 * a shopkeeper's hand against a concrete wall; necklaces and earrings sit on
 * brown velvet busts under mixed showroom light. None of it looks like the
 * studio photography a jewellery site is judged against.
 *
 * THE FIDELITY PROBLEM, AND WHY THIS IS BUILT THE WAY IT IS
 *
 * Handing a diamond piece to an image model and asking for "the same necklace on
 * a woman" gets you a different necklace. Generative models redraw jewellery:
 * stone counts drift, settings rearrange, a cluster gains a row. That is not
 * hypothetical for this catalogue - a Gemini multi-angle sheet in the shared
 * drive shows one bangle as four stacked bangles in its "Front View" panel and
 * a single bangle in "Back View". On a piece costing six figures, that is a
 * customer receiving something other than what they were shown.
 *
 * So the product is never regenerated. Four stages:
 *
 *   1 LOCATE   a vision call returns the product's bounding box.
 *   2 MASK     refine inside that box down to the product's own pixels.
 *   3 INPAINT  the model regenerates everything OUTSIDE the mask - the hand,
 *              the bust, the wall - and never touches the piece.
 *   4 RESTORE  the ORIGINAL product pixels are composited back over the result.
 *
 * Stage 4 is the point. Even if the model ignores its mask and repaints the
 * necklace, its version is overwritten by the real one. Fidelity stops being a
 * promise the vendor makes and becomes a property of the pipeline.
 *
 * The cost is honest: the product cannot be re-posed. A necklace lying flat on a
 * bust still hangs flat once the bust becomes a neck. That reads well for rings,
 * studs and bracelets and less well for a heavy draped set, which is why
 * --proof writes a before/generated/after strip for a person to judge before
 * four thousand of these go anywhere near the live site.
 */
import { readdirSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
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
    console.error('usage: node onmodel.mjs <inDir> <outDir> [--scene ring-hand|neck|ear|wrist] [--dry-run] [--proof] [--json]');
    process.exit(2);
}

const SCENE = String(flag('scene', 'auto'));
const DRY = has('dry-run');
const PROOF = has('proof');
const AS_JSON = has('json');
const KEY = process.env.OPENAI_API_KEY;

if (!DRY && !KEY) {
    console.error('OPENAI_API_KEY is not set. Use --dry-run to exercise mask + restore without calling the API.');
    process.exit(2);
}

/**
 * Scene briefs. Deliberately describe the SET and never the jewellery - the
 * model is being asked to build a room around a product it must not touch, and
 * naming the piece is an invitation to improve on it.
 */
const SCENES = {
    'ring-hand': 'A close-up studio photograph of an elegant female hand with a neat natural manicure, soft warm key light from the left, shallow depth of field, seamless warm ivory backdrop. Editorial jewellery photography.',
    neck: 'A studio portrait crop of a woman neck and collarbones, smooth skin, soft diffused beauty lighting, plain warm grey seamless backdrop, bare shoulders or simple silk. Editorial jewellery photography.',
    ear: 'A studio profile crop of a woman ear and jawline, hair swept back, soft diffused beauty lighting, plain warm grey seamless backdrop. Editorial jewellery photography.',
    wrist: 'A close-up studio photograph of an elegant female wrist and forearm resting gracefully, soft warm key light, seamless warm ivory backdrop. Editorial jewellery photography.',
};

const GUARD = ' Do not draw, add, alter or embellish any jewellery. Leave the masked region exactly as it is.';

const EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const SIDE = 1024;

if (!existsSync(inDir)) {
    console.error(`not a folder: ${inDir}`);
    process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const files = readdirSync(inDir).filter((f) => EXTS.includes(extname(f).toLowerCase()));
if (!files.length) {
    console.error(`no images in ${inDir}`);
    process.exit(1);
}

let ok = 0;
let failed = 0;

for (const f of files) {
    try {
        const r = await one(join(inDir, f));
        ok++;
        console.log(AS_JSON ? JSON.stringify(r) : format(r));
    } catch (e) {
        failed++;
        const r = { input: f, error: e.message };
        console.log(AS_JSON ? JSON.stringify(r) : `${f}  FAILED: ${e.message}`);
    }
}

if (!AS_JSON) console.log(`\n${ok} done, ${failed} failed`);
process.exit(failed && !ok ? 1 : 0);

// ================================================================= stages

async function one(file) {
    const stem = basename(file, extname(file));
    const src = sharp(file).rotate();
    const meta = await src.metadata();

    // Square canvas: the edits endpoint wants one, and so does a product grid.
    const base = await src
        .resize(SIDE, SIDE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png()
        .toBuffer();

    const boxArg = flag('box', null);
    const box = boxArg
        ? (([bx, by, bw, bh]) => ({ x: bx, y: by, w: bw, h: bh }))(boxArg.split(',').map(Number))
        : DRY ? dryBox() : await locateProduct(base);
    const { maskPng, productPng, coverage } = await buildMask(base, box);

    const scene = SCENE === 'auto' ? guessScene(stem) : SCENE;
    const brief = (SCENES[scene] ?? SCENES.neck) + GUARD;

    const generated = DRY ? await dryScene() : await inpaint(base, maskPng, brief);

    // The original product, laid back over whatever the model produced. This is
    // what makes the guarantee structural rather than aspirational.
    const final = await sharp(generated)
        .resize(SIDE, SIDE, { fit: 'fill' })
        .composite([{ input: productPng, top: 0, left: 0 }])
        .webp({ quality: 88 })
        .toBuffer();

    const outPath = join(outDir, `${stem}.webp`);
    writeFileSync(outPath, final);

    let proof = null;
    if (PROOF) {
        proof = `${stem}@proof.webp`;
        await writeProof(base, generated, final, join(outDir, proof));
    }

    return {
        input: basename(file),
        source: { width: meta.width, height: meta.height },
        scene,
        box,
        productCoverage: coverage,
        dryRun: DRY,
        output: basename(outPath),
        proof,
    };
}

/**
 * Ask a vision model where the jewellery is.
 *
 * One cheap call, and far more reliable than any colour rule could be: gold on
 * skin and gold on brown velvet have almost nothing in common at the pixel
 * level, while "the jewellery" is obvious to something that can actually see.
 */
async function locateProduct(pngBuffer) {
    const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gpt-5',
            input: [{
                role: 'user',
                content: [
                    {
                        type: 'input_text',
                        text: `Return ONLY compact JSON {"x":,"y":,"w":,"h":} giving the tight pixel bounding box of the JEWELLERY in this ${SIDE}x${SIDE} image. Exclude hands, skin, display busts, stands and background. If several pieces are shown, return one box covering all of them.`,
                    },
                    { type: 'input_image', image_url: `data:image/png;base64,${pngBuffer.toString('base64')}` },
                ],
            }],
        }),
    });

    if (!res.ok) throw new Error(`locate failed ${res.status}: ${(await res.text()).slice(0, 200)}`);

    const json = await res.json();
    const text = json.output_text
        ?? (json.output ?? []).flatMap((o) => o.content ?? []).map((c) => c.text ?? '').join('');

    const m = String(text).match(/\{[^}]*\}/);
    if (!m) throw new Error(`locate returned no JSON: ${String(text).slice(0, 120)}`);

    const b = JSON.parse(m[0]);
    if (![b.x, b.y, b.w, b.h].every((n) => Number.isFinite(n))) throw new Error('locate returned a malformed box');

    return b;
}


/**
 * KNOWN LIMIT - the mask, and what it needs next
 *
 * The luminance split below is a stopgap, and the ring-on-hand case is where it
 * shows. Jewellery separates cleanly from dark velvet, and not at all from a
 * brightly lit hand: skin and polished gold sit at the same luminance, so the
 * mask takes fingers along with the band. Verified on d2-ring-01 - the restored
 * patch carries slivers of knuckle either side of the ring.
 *
 * The fix is a box-promptable segmenter rather than a threshold. SAM is built
 * for exactly this - hand it the bounding box the vision call already returns
 * and it gives back the product's own outline. It runs locally through
 * onnxruntime-node (slimsam is ~40MB), so it costs nothing per image and needs
 * no second API key.
 *
 * Until that is in, treat --proof as mandatory and expect velvet-bust shots to
 * mask well and hand shots to need review.
 */
/**
 * Turn a bounding box into a mask of the product's own pixels.
 *
 * The box alone would freeze a rectangle of hand along with the ring. Inside it,
 * jewellery separates from whatever holds it on brightness: polished metal and
 * faceted stones are the brightest, most specular thing in any of these frames,
 * whether they sit on skin or on near-black velvet.
 */
async function buildMask(basePng, box) {
    const x = Math.max(0, Math.min(SIDE - 1, Math.round(box.x)));
    const y = Math.max(0, Math.min(SIDE - 1, Math.round(box.y)));
    const w = Math.max(1, Math.min(SIDE - x, Math.round(box.w)));
    const h = Math.max(1, Math.min(SIDE - y, Math.round(box.h)));

    if (w < 8 || h < 8) throw new Error(`box too small: ${w}x${h}`);

    const { data, info } = await sharp(basePng)
        .extract({ left: x, top: y, width: w, height: h })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const c = info.channels;
    const lum = new Float32Array(w * h);
    let lo = 255;
    let hi = 0;

    for (let i = 0, p = 0; i < data.length; i += c, p++) {
        const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        lum[p] = l;
        if (l < lo) lo = l;
        if (l > hi) hi = l;
    }

    // The split comes from this frame's own histogram. A fixed threshold cannot
    // serve both a ring lit at f/2.8 against skin and a necklace on dark velvet.
    const cut = lo + (hi - lo) * 0.45;

    const alpha = Buffer.alloc(w * h, 0);
    for (let p = 0; p < lum.length; p++) alpha[p] = lum[p] >= cut ? 255 : 0;

    // Soften and re-harden: closes pinholes between stones and leaves a slightly
    // feathered edge, so the restored product does not sit on the generated
    // scene looking like a cut-out.
    // resolveWithObject, and honour info.channels: sharp does not promise to
    // hand back the channel count it was given. These operations return three,
    // and indexing the result as if it were one greyscale plane samples every
    // third byte - which shears the mask sideways and stripes it, while looking
    // just plausible enough in a thumbnail to be missed.
    const { data: refined, info: rinfo } = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } })
        .blur(2)
        .linear(2.2, -40)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const rc = rinfo.channels;

    // Built as raw RGBA rather than composited: the mask has to live in the
    // ALPHA channel for dest-in to work, and a greyscale PNG carries no alpha -
    // it would blend as fully opaque and select the whole frame.
    const rgba = Buffer.alloc(SIDE * SIDE * 4, 0);
    let on = 0;
    for (let ry = 0; ry < h; ry++) {
        for (let rx = 0; rx < w; rx++) {
            const a = refined[(ry * w + rx) * rc];
            if (a > 128) on++;
            const o = ((y + ry) * SIDE + (x + rx)) * 4;
            rgba[o] = 255;
            rgba[o + 1] = 255;
            rgba[o + 2] = 255;
            rgba[o + 3] = a;
        }
    }
    const full = await sharp(rgba, { raw: { width: SIDE, height: SIDE, channels: 4 } }).png().toBuffer();

    // The product, cut out of the original, ready to lay back down at the end.
    const productPng = await sharp(basePng)
        .ensureAlpha()
        .composite([{ input: full, blend: 'dest-in' }])
        .png()
        .toBuffer();

    // The edits endpoint repaints wherever the mask is TRANSPARENT, so the mask
    // wants the product opaque and everything else clear. That is the same
    // image as the cut-out above - not its inverse, which would have handed the
    // model the product to repaint and protected the wall.
    return { maskPng: productPng, productPng, coverage: +((on / (SIDE * SIDE)) * 100).toFixed(2) };
}

async function inpaint(basePng, maskPng, prompt) {
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', prompt);
    form.append('size', `${SIDE}x${SIDE}`);
    form.append('image', new Blob([basePng], { type: 'image/png' }), 'image.png');
    form.append('mask', new Blob([maskPng], { type: 'image/png' }), 'mask.png');

    const res = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}` },
        body: form,
    });

    if (!res.ok) throw new Error(`edit failed ${res.status}: ${(await res.text()).slice(0, 200)}`);

    const json = await res.json();
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error('edit returned no image');

    return Buffer.from(b64, 'base64');
}

// ------------------------------------------------------------- dry run

/** Centre box, so mask + restore can be exercised with no API key. */
function dryBox() {
    return {
        x: Math.round(SIDE * 0.22),
        y: Math.round(SIDE * 0.22),
        w: Math.round(SIDE * 0.56),
        h: Math.round(SIDE * 0.56),
    };
}

/**
 * A flat plate standing in for a generated scene, in a colour that appears
 * nowhere in jewellery photography. Any of it surviving into the product area
 * is then visible at a glance, which is exactly what the restore step is
 * supposed to prevent.
 */
async function dryScene() {
    return sharp({ create: { width: SIDE, height: SIDE, channels: 3, background: { r: 32, g: 96, b: 160 } } })
        .png()
        .toBuffer();
}

async function writeProof(basePng, generated, final, path) {
    const t = Math.round(SIDE / 2);
    const panel = (b) => sharp(b).resize(t, t, { fit: 'contain', background: { r: 20, g: 20, b: 20 } }).png().toBuffer();

    await sharp({ create: { width: t * 3, height: t, channels: 3, background: { r: 20, g: 20, b: 20 } } })
        .composite([
            { input: await panel(basePng), left: 0, top: 0 },
            { input: await panel(generated), left: t, top: 0 },
            { input: await panel(final), left: t * 2, top: 0 },
        ])
        .webp({ quality: 85 })
        .toFile(path);
}

function guessScene(stem) {
    const s = stem.toLowerCase();
    if (/ring/.test(s)) return 'ring-hand';
    if (/earring|stud|jhumk/.test(s)) return 'ear';
    if (/bangle|bracelet|kada/.test(s)) return 'wrist';

    return 'neck';
}

function format(r) {
    return [
        `${r.input}  ->  ${r.output}${r.dryRun ? '   [DRY RUN]' : ''}`,
        `  scene    ${r.scene}`,
        `  product  box ${r.box.w}x${r.box.h} at (${r.box.x},${r.box.y}), ${r.productCoverage}% of frame masked`,
        r.proof ? `  proof    ${r.proof}` : null,
    ].filter(Boolean).join('\n');
}
