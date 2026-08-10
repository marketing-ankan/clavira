/**
 * CAD mesh (.stl) -> web model (.glb), for virtual try-on.
 *
 *   node stl-to-glb.mjs <input.stl> <output.glb> [--budget 120000]
 *                       [--metal yellow|white|rose] [--crease 25] [--json]
 *
 * The supplier ships a Rhino .3dm plus an .stl per design. The .stl is already
 * a mesh, which is why it is the input here — but it arrives as a raw triangle
 * soup straight off a manufacturing exporter, and handing that to a browser
 * unchanged gives you a 60 MB download that renders like melted wax. Four
 * things have to happen:
 *
 *   WELD. STL stores three loose vertices per triangle and repeats every shared
 *   corner, so a 220k-triangle piece arrives as 660k vertices. Welding roughly
 *   thirds that before anything else touches it.
 *
 *   CREASED NORMALS. This is the one that decides whether the piece looks like
 *   jewellery. Averaging every adjacent face — what a plain computeVertexNormals
 *   does — rounds the diamonds off into shiny blobs, because a brilliant cut is
 *   nothing but hard edges between facets. Averaging only across angles below
 *   the crease threshold keeps facets crisp while the band stays smooth.
 *
 *   DECIMATE. A manufacturing mesh is tessellated for casting tolerance, not
 *   for a phone. 1.2M triangles is invisible detail at try-on size and a long
 *   wait on mobile data.
 *
 *   NORMALISE. Centre on the bounding box and scale the longest axis to 1, so
 *   the try-on can size the piece from the wearer's hand instead of caring what
 *   units the CAD happened to use.
 *
 * Materials: an .stl carries no material information at all — metal and stones
 * are one undifferentiated shell — so the whole piece gets a single metal PBR
 * material. Getting the diamonds to render as diamonds needs the .3dm, where
 * they are on their own layer. See the note at the bottom of this file.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'meshoptimizer';
import * as THREE from 'three';

// ---------------------------------------------------------------- arguments
const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flag = (name, fallback) => {
    const i = args.indexOf(`--${name}`);

    return i === -1 ? fallback : args[i + 1];
};

const input = positional[0];
const output = positional[1];

if (!input || !output) {
    console.error('usage: node stl-to-glb.mjs <input.stl> <output.glb> [--budget N] [--metal yellow|white|rose] [--crease deg] [--json]');
    process.exit(2);
}

const budget = Number(flag('budget', 120000));
const creaseDeg = Number(flag('crease', 25));
const metal = String(flag('metal', 'yellow')).toLowerCase();
const asJson = args.includes('--json');

/**
 * Measured off the supplier's own @Y/@W/@R renders rather than picked by eye,
 * so a converted piece matches the render the customer sees on the PDP.
 */
const METALS = {
    yellow: { color: [0.831, 0.686, 0.216], roughness: 0.18 },
    white: { color: [0.902, 0.906, 0.914], roughness: 0.13 },
    rose: { color: [0.878, 0.663, 0.596], roughness: 0.18 },
};

if (!METALS[metal]) {
    console.error(`unknown metal "${metal}" — expected yellow, white or rose`);
    process.exit(2);
}

// ------------------------------------------------------------------- load
let geometry = new STLLoader().parse(toArrayBuffer(readFileSync(input)));
const trianglesIn = (geometry.getIndex() ? geometry.getIndex().count : geometry.getAttribute('position').count) / 3;

// STL repeats every shared corner. Weld before anything else — the simplifier
// cannot collapse an edge whose two sides it believes are separate vertices,
// so skipping this makes decimation almost a no-op.
geometry.deleteAttribute('normal');
geometry = BufferGeometryUtils.mergeVertices(geometry, 1e-5);

const verticesWelded = geometry.getAttribute('position').count;

// ---------------------------------------------------------------- decimate
let simplifyError = 0;
const indexCount = geometry.getIndex().count;
const targetIndexCount = Math.floor(budget * 3);

if (indexCount > targetIndexCount) {
    await MeshoptSimplifier.ready;

    const indices = new Uint32Array(geometry.getIndex().array);
    const positions = new Float32Array(geometry.getAttribute('position').array);

    // LockBorder keeps open boundaries — clasp openings, the inside rim of a
    // bangle — exactly where they are. Without it the simplifier pulls holes
    // shut and a bracelet slowly becomes a solid ring.
    const [simplified, error] = MeshoptSimplifier.simplify(
        indices, positions, 3, targetIndexCount, 0.01, ['LockBorder'],
    );

    simplifyError = error;
    geometry.setIndex(new THREE.BufferAttribute(simplified, 1));

    // Simplification orphans vertices; drop them or the file still carries
    // every original position.
    geometry = compact(geometry);
}

// --------------------------------------------------------------- normals
// After decimation, not before: simplifying rewrites the surface, and normals
// computed on the old one would light the new one wrongly.
geometry = BufferGeometryUtils.toCreasedNormals(geometry, THREE.MathUtils.degToRad(creaseDeg));

// toCreasedNormals splits vertices along every crease, so it returns a
// NON-indexed geometry. Re-weld what it split apart, matching on normal too so
// the creases it just created survive.
geometry = BufferGeometryUtils.mergeVertices(geometry, 1e-5);

// ---------------------------------------------------------------- analyse
// Done while the mesh is still in real millimetres, which is what makes the
// rest of the pipeline automatic: a hole 17 mm across is a ring and a hole
// 60 mm across is a bangle, and no human has to say which.
const shape = analyse(geometry);

// -------------------------------------------------------------- normalise
geometry.computeBoundingBox();
const box = geometry.boundingBox;
const size = new THREE.Vector3();
const centre = new THREE.Vector3();
box.getSize(size);
box.getCenter(centre);

const longest = Math.max(size.x, size.y, size.z) || 1;
geometry.translate(-centre.x, -centre.y, -centre.z);
geometry.scale(1 / longest, 1 / longest, 1 / longest);

// ------------------------------------------------------------------ write
const glb = buildGlb(geometry, METALS[metal], basename(output, '.glb'));
writeFileSync(output, glb);

const trianglesOut = geometry.getIndex().count / 3;
const report = {
    input: basename(input),
    output: basename(output),
    metal,
    trianglesIn,
    trianglesOut,
    verticesWelded,
    verticesOut: geometry.getAttribute('position').count,
    simplifyError: Number(simplifyError.toFixed(5)),
    // Millimetres, assuming the CAD used them — jewellery CAD invariably does.
    dimensionsMm: [size.x, size.y, size.z].map((n) => Number(n.toFixed(2))),
    bytes: glb.length,
    ...shape,
    tryon: suggestConfig(shape, basename(output)),
};

console.log(asJson ? JSON.stringify(report) : format(report));

// =========================================================== helpers

function toArrayBuffer(buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/**
 * Work out what this piece IS, from the geometry alone.
 *
 * The lots arrive as design numbers with no indication of whether a mesh is a
 * ring, a bangle, or a flat strip laid out for casting — and eyeballing eighty
 * of them is exactly the manual step this pipeline exists to remove.
 *
 * Two facts make it decidable. A worn piece is an annulus: viewed down the axis
 * the limb passes through, it has a solid rim and an empty middle. And the CAD
 * is in real millimetres, so the size of that empty middle says what limb it is
 * for — a finger is about 17 mm across, a wrist about 60 mm, and nothing sits
 * between them.
 *
 * A mesh with no hollow axis is not a loop at all. In this supplier's lots that
 * means a flat manufacturing layout, which must not be put on a wrist.
 */
function analyse(geometry) {
    const pos = geometry.getAttribute('position').array;
    const N = 40;

    geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    const min = geometry.boundingBox.min.clone();
    geometry.boundingBox.getSize(size);
    const span = [size.x, size.y, size.z];
    const lo = [min.x, min.y, min.z];

    let best = null;

    for (let axis = 0; axis < 3; axis++) {
        const [u, v] = [0, 1, 2].filter((a) => a !== axis);
        if (span[u] < 1e-6 || span[v] < 1e-6) continue;

        // SQUARE cells, sized in millimetres. An oval bangle spans 78 mm one
        // way and 67 mm the other; laying an N x N grid over that makes a cell
        // mean a different distance on each axis, and a disc grown through it
        // is not a disc at all — which is exactly how a 55 mm hole measures as
        // 40 mm.
        const cell = Math.max(span[u], span[v]) / N;
        const nu = Math.max(1, Math.ceil(span[u] / cell));
        const nv = Math.max(1, Math.ceil(span[v] / cell));

        const grid = new Uint8Array(nu * nv);
        for (let i = 0; i < pos.length; i += 3) {
            const gu = Math.min(nu - 1, Math.floor((pos[i + u] - lo[u]) / cell));
            const gv = Math.min(nv - 1, Math.floor((pos[i + v] - lo[v]) / cell));
            grid[gv * nu + gu] = 1;
        }

        // Grow a disc from the centre until it meets material. That radius is
        // the hole; measuring it on the grid rather than on raw vertices means
        // a single stray point cannot report a hole as closed.
        const cu = (nu - 1) / 2;
        const cv = (nv - 1) / 2;
        let holeCells = 0;
        for (let r = 1; r < Math.min(nu, nv) / 2; r++) {
            let clear = true;
            for (let a = 0; a < 96 && clear; a++) {
                const t = (a / 96) * Math.PI * 2;
                const x = Math.round(cu + Math.cos(t) * r);
                const y = Math.round(cv + Math.sin(t) * r);
                if (x < 0 || y < 0 || x >= nu || y >= nv || grid[y * nu + x]) clear = false;
            }
            if (!clear) break;
            holeCells = r;
        }

        const holeMm = holeCells * 2 * cell;

        if (!best || holeMm > best.holeMm) {
            best = {
                holeAxis: 'xyz'[axis],
                holeMm: Number(holeMm.toFixed(1)),
                outerMm: Number(Math.max(span[u], span[v]).toFixed(1)),
                thicknessMm: Number(span[axis].toFixed(1)),
            };
        }
    }

    if (!best) return { shape: 'unknown', holeMm: 0 };

    // Ranges are deliberately wide and deliberately non-adjacent: the gap
    // between them is where "I am not sure" lives, and a piece landing there
    // should be looked at rather than guessed.
    const kind = best.holeMm >= 14 && best.holeMm <= 25 ? 'ring'
        : best.holeMm >= 45 && best.holeMm <= 80 ? 'bangle'
            : best.holeMm < 6 ? 'solid'
                : 'unclear';

    return {
        shape: kind === 'solid' ? 'flat-or-solid' : kind,
        wearable: kind === 'ring' || kind === 'bangle',
        ...best,
    };
}

/**
 * Turn the measurements into a config block a human only has to confirm.
 *
 * `real_mm` is the important field: it lets the try-on size the piece against
 * the wearer's own hand in real units rather than against a hand-tuned
 * multiplier, so a 62 mm bangle renders 62 mm wide on every hand it sees.
 */
function suggestConfig(shape, file) {
    if (!shape.wearable) {
        return {
            enable: false,
            reason: shape.shape === 'flat-or-solid'
                ? 'No hollow axis — this is a flat manufacturing layout, not a worn shape.'
                : `Hole is ${shape.holeMm} mm, which is neither finger (14-25) nor wrist (45-80).`,
        };
    }

    // The hole must end up along +Y, which is where the try-on expects the limb.
    const rotation = { x: [0, 0, 90], y: [0, 0, 0], z: [-90, 0, 0] }[shape.holeAxis];

    return {
        enable: true,
        mode: shape.shape === 'ring' ? 'finger' : 'wrist',
        render: '3d',
        model: `/models/tryon/${file}`,
        model_rotation: rotation,
        real_mm: shape.outerMm,
    };
}

/** Drop vertices no triangle references any more, and renumber. */
function compact(geo) {
    const index = geo.getIndex().array;
    const position = geo.getAttribute('position').array;

    const remap = new Int32Array(position.length / 3).fill(-1);
    const newPositions = [];
    const newIndex = new Uint32Array(index.length);

    for (let i = 0; i < index.length; i++) {
        const old = index[i];
        if (remap[old] === -1) {
            remap[old] = newPositions.length / 3;
            newPositions.push(position[old * 3], position[old * 3 + 1], position[old * 3 + 2]);
        }
        newIndex[i] = remap[old];
    }

    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    out.setIndex(new THREE.BufferAttribute(newIndex, 1));

    return out;
}

/**
 * Write a binary glTF by hand.
 *
 * three's GLTFExporter expects browser globals (Blob, FileReader) and shimming
 * them in Node is more code than the container format, which is a 12-byte
 * header followed by a JSON chunk and a binary chunk.
 */
function buildGlb(geo, material, name) {
    const position = geo.getAttribute('position').array;
    const normal = geo.getAttribute('normal').array;
    const indexArray = geo.getIndex().array;

    const vertexCount = position.length / 3;
    // Unsigned short indices halve the index buffer, which is usually the
    // largest thing in the file — but only if every vertex is addressable.
    const useShort = vertexCount <= 65535;
    const indices = useShort ? new Uint16Array(indexArray) : new Uint32Array(indexArray);

    const parts = [];
    let offset = 0;
    const push = (typed) => {
        const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
        const view = { byteOffset: offset, byteLength: bytes.length };
        parts.push(bytes);
        offset += bytes.length;

        // Every accessor's data must start on a multiple of its component size.
        const pad = (4 - (offset % 4)) % 4;
        if (pad) {
            parts.push(Buffer.alloc(pad));
            offset += pad;
        }

        return view;
    };

    const positionView = push(position);
    const normalView = push(normal);
    const indexView = push(indices);

    geo.computeBoundingBox();
    const { min, max } = geo.boundingBox;

    const json = {
        asset: { version: '2.0', generator: 'clavira stl-to-glb' },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0, name }],
        meshes: [{
            name,
            primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }],
        }],
        materials: [{
            name: `${name}-metal`,
            pbrMetallicRoughness: {
                baseColorFactor: [...material.color, 1],
                metallicFactor: 1,
                roughnessFactor: material.roughness,
            },
            doubleSided: false,
        }],
        accessors: [
            {
                bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3',
                // POSITION min/max is required by the spec — viewers use it to
                // frame the model without reading the whole buffer.
                min: [min.x, min.y, min.z], max: [max.x, max.y, max.z],
            },
            { bufferView: 1, componentType: 5126, count: vertexCount, type: 'VEC3' },
            { bufferView: 2, componentType: useShort ? 5123 : 5125, count: indices.length, type: 'SCALAR' },
        ],
        bufferViews: [
            { buffer: 0, byteOffset: positionView.byteOffset, byteLength: positionView.byteLength, target: 34962 },
            { buffer: 0, byteOffset: normalView.byteOffset, byteLength: normalView.byteLength, target: 34962 },
            { buffer: 0, byteOffset: indexView.byteOffset, byteLength: indexView.byteLength, target: 34963 },
        ],
        buffers: [{ byteLength: offset }],
    };

    const bin = Buffer.concat(parts, offset);

    // Chunks are padded to 4 bytes: JSON with spaces, binary with zeroes.
    let jsonChunk = Buffer.from(JSON.stringify(json), 'utf8');
    const jsonPad = (4 - (jsonChunk.length % 4)) % 4;
    if (jsonPad) jsonChunk = Buffer.concat([jsonChunk, Buffer.alloc(jsonPad, 0x20)]);

    const header = Buffer.alloc(12);
    header.write('glTF', 0, 'ascii');
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + bin.length, 8);

    const jsonHeader = Buffer.alloc(8);
    jsonHeader.writeUInt32LE(jsonChunk.length, 0);
    jsonHeader.write('JSON', 4, 'ascii');

    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(bin.length, 0);
    binHeader.write('BIN\0', 4, 'ascii');

    return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, bin]);
}

function format(r) {
    return [
        `${r.input}  ->  ${r.output}`,
        `  triangles   ${r.trianglesIn.toLocaleString()} -> ${r.trianglesOut.toLocaleString()}`,
        `  vertices    ${r.verticesWelded.toLocaleString()} welded -> ${r.verticesOut.toLocaleString()}`,
        `  size        ${r.dimensionsMm.join(' x ')} mm`,
        `  shape       ${r.shape}${r.holeMm ? `, ${r.holeMm} mm hole on ${r.holeAxis}` : ''}`,
        `  try-on      ${r.tryon.enable
            ? `${r.tryon.mode}, rotate ${JSON.stringify(r.tryon.model_rotation)}, ${r.tryon.real_mm} mm across`
            : `NOT WEARABLE - ${r.tryon.reason}`}`,
        `  metal       ${r.metal}`,
        `  file        ${(r.bytes / 1024 / 1024).toFixed(2)} MB`,
    ].join('\n');
}

// ---------------------------------------------------------------------------
// Why the diamonds are gold
//
// An .stl has no layers, materials or object boundaries — the whole piece is
// one shell, so there is no way to tell a stone from its setting and everything
// takes the metal material. The .3dm beside it does have that separation
// (jewellery CAD keeps stones on their own layer), and reading it with
// rhino3dm to emit two primitives — metal, and a transmissive diamond — is the
// upgrade that makes these look right rather than merely correct.
// ---------------------------------------------------------------------------
