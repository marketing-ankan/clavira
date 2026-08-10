import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * The 3D half of virtual try-on: a real glTF piece rendered over the camera
 * feed, taking its pose from MediaPipe.
 *
 * The flat-PNG path this replaces could only ever slide a sticker around the
 * screen — turn your hand and the ring turned with it like a decal, because a
 * photograph has no other side. Here the model is lit by the scene and posed
 * from the hand's metric 3D landmarks, so rotating your hand shows the band's
 * profile and the setting catches the light from a new angle.
 *
 * Two things are doing most of the work:
 *
 *   ENVIRONMENT LIGHTING. Polished gold is almost entirely reflection. Under
 *   plain directional lights a gold PBR material renders as a dull brown
 *   silhouette, so the scene carries a generated studio environment and the
 *   metal reflects that.
 *
 *   DEPTH-ONLY OCCLUDER. A ring is a closed loop; on a real finger the far arc
 *   is hidden behind it. An invisible cylinder standing in for the finger is
 *   drawn first, writing depth but no colour, so the back of the band fails the
 *   depth test exactly where the finger would have covered it. This is the
 *   honest version of the erase-a-rectangle trick the 2D path uses.
 *
 * Nothing here uploads anything. Same promise as the 2D path: the camera frame
 * reaches a canvas and a WebGL context on the visitor's own device, and stops.
 */

// ---- Hand landmark indices --------------------------------------------
const WRIST = 0;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const RING_MCP = 13;   // knuckle
const RING_PIP = 14;   // first joint
const PINKY_MCP = 17;

/** Where along knuckle -> first joint a ring actually sits. */
const RING_ALONG = 0.4;

// ---- Face landmark indices (earrings) ---------------------------------
const EAR_L = 234;
const EAR_R = 454;
const EYE_L = 33;
const EYE_R = 263;
const BROW = 10;
const CHIN = 152;
const NOSE = 1;

/** Head-turn fade, matching the 2D path: you cannot see the far earring either. */
const YAW_HIDE = 0.3;
const YAW_FULL = 0.4;

/**
 * Everything is placed on a plane this far in front of the camera. Apparent
 * size comes from the measured pixel width of the finger, so this distance only
 * sets how strong the perspective is, never how big the piece looks.
 */
const PLANE_DIST = 1;
const FOV = 45;

/** Exponential smoothing, matching the 2D path. Raw landmarks jitter. */
const SMOOTH = 0.45;
const lerp = (a, b, t) => a + (b - a) * t;

export default class JewelleryStage3D {
    constructor(canvas) {
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,        // the camera feed shows through
            antialias: true,
            premultipliedAlpha: false,
        });
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100);

        // A generated studio interior, prefiltered into an environment map.
        // This is what makes gold look like gold rather than brown plastic.
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environment = this.envMap;
        pmrem.dispose();

        // A little directed light on top of the environment, so facets and
        // claw settings still read as sharp highlights.
        const key = new THREE.DirectionalLight(0xffffff, 1.6);
        key.position.set(0.6, 1, 1.4);
        this.scene.add(key);
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));

        /** One slot per tracked hand / ear: model + occluder + smoothing state. */
        this.slots = [];
        this.template = null;
        this.piece = null;
        this.size = { w: 1, h: 1 };
    }

    // ------------------------------------------------------------------ load

    /**
     * Load the piece. A `model` is a real glTF/GLB; without one we fall back to
     * generated geometry, so a SKU with no 3D asset yet still demonstrates the
     * feature instead of showing an empty camera.
     */
    async load(piece) {
        this.piece = piece;

        // Generated geometry is a DEVELOPMENT affordance and has to be asked
        // for by name. The catalogue's rule — see
        // public/images/tryon/_unassigned/README.md — is that try-on shows the
        // piece the customer is actually buying; a stand-in band rendered under
        // a real SKU is a misrepresentation, not a graceful degradation. A
        // piece whose model is missing therefore fails, and the product simply
        // offers no try-on.
        if (!piece.model && !piece.placeholder) throw new Error('ASSET');

        const model = piece.model
            ? await this.loadGltf(piece.model)
            : buildFallback(piece);

        this.template = this.normalise(model, piece);

        // Two slots covers both hands and both ears — beyond that a customer is
        // no longer evaluating the piece.
        for (let i = 0; i < 2; i++) {
            const group = new THREE.Group();
            const instance = this.template.clone(true);
            group.add(instance);

            // Rings and bangles both close around a limb, so both need the far
            // side hidden. Earrings hang in free air and must not be occluded.
            const occluder = piece.mode === 'finger' || piece.mode === 'wrist'
                ? buildOccluder()
                : null;
            if (occluder) group.add(occluder);

            group.visible = false;
            this.scene.add(group);
            this.slots.push({ group, occluder, smoothed: null });
        }
    }

    loadGltf(url) {
        return new Promise((resolve, reject) => {
            new GLTFLoader().load(
                url,
                (gltf) => resolve(gltf.scene),
                undefined,
                () => reject(new Error('ASSET')),
            );
        });
    }

    /**
     * Put the model into the convention the placement maths assumes:
     * centred on its own bounding box, one world unit across, with the finger
     * running along +Y and the top of the piece facing +Z.
     *
     * `model_rotation` (degrees) exists because a real asset arrives however
     * the modeller left it, and re-exporting someone's GLB to fix an axis is a
     * worse answer than three numbers in config.
     */
    normalise(source, piece) {
        const wrapper = new THREE.Group();
        const inner = new THREE.Group();

        const [rx, ry, rz] = piece.model_rotation ?? [0, 0, 0];
        inner.rotation.set(
            THREE.MathUtils.degToRad(rx),
            THREE.MathUtils.degToRad(ry),
            THREE.MathUtils.degToRad(rz),
        );
        inner.add(source);
        wrapper.add(inner);

        // Measure AFTER the corrective rotation, or the normalising scale would
        // be derived from an axis that is about to move.
        wrapper.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(wrapper);
        const size = new THREE.Vector3();
        const centre = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(centre);

        // For a ring the meaningful measure is the outer diameter ACROSS the
        // finger, so the span along the finger axis (+Y) is deliberately
        // ignored — a wide band would otherwise render smaller than a narrow
        // one of the same diameter.
        const across = piece.mode === 'finger' || piece.mode === 'wrist'
            ? Math.max(size.x, size.z)
            : Math.max(size.x, size.y, size.z);

        const unit = across > 1e-6 ? 1 / across : 1;
        inner.position.sub(centre.multiplyScalar(1));
        wrapper.scale.setScalar(unit);

        // Gold that came out of a modelling package is often authored with
        // roughness 1 and no environment response. Nudge only what would
        // otherwise look wrong, and leave textured assets alone.
        wrapper.traverse((child) => {
            if (!child.isMesh || !child.material) return;
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            for (const material of materials) {
                if (material.isMeshStandardMaterial && !material.map && material.metalness > 0.5) {
                    material.envMapIntensity = 1.4;
                }
            }
        });

        return wrapper;
    }

    // ---------------------------------------------------------------- layout

    resize(width, height) {
        if (this.size.w === width && this.size.h === height) return;
        this.size = { w: width, h: height };

        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    /** World-space extent of the plane everything is placed on. */
    get planeHeight() {
        return 2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * PLANE_DIST;
    }

    /** Normalised landmark (0..1, origin top-left) -> world position. */
    toWorld(nx, ny) {
        const h = this.planeHeight;
        const w = h * this.camera.aspect;

        return new THREE.Vector3((nx - 0.5) * w, -(ny - 0.5) * h, -PLANE_DIST);
    }

    /** Pixels on the video -> world units on that plane. */
    pxToWorld(px) {
        return (px / this.size.h) * this.planeHeight;
    }

    /**
     * How wide the limb is, in the group's own units.
     *
     * Prefer the hole the CAD actually has. A ring's inner diameter IS the
     * finger that wears it, measured rather than inferred, and it is the only
     * figure here that cannot drift. Estimating instead from the gap between
     * knuckles overshoots badly — on a 24.5 mm ring that gap measures 24.7 mm,
     * so the occluder swallows the entire band and the piece vanishes.
     *
     * The landmark estimate stays as the fallback for hand-authored pieces
     * that never went through the converter and so have no measurements.
     */
    occluderLocal(limbPx, widthPx, sizeMul) {
        if (this.piece.hole_mm && this.piece.real_mm) {
            return this.piece.hole_mm / this.piece.real_mm;
        }

        return limbPx / (widthPx * sizeMul);
    }

    /**
     * Millimetres per screen pixel, measured off the wearer's own hand.
     *
     * MediaPipe's world landmarks are metric — actual metres — so the span
     * across the knuckles gives a real ruler in the frame. Combined with the
     * CAD's real millimetres, a 62 mm bangle renders 62 mm wide on any hand at
     * any distance, with no per-piece multiplier to tune and nothing to
     * re-tune when someone holds their hand closer to the camera.
     *
     * Returns null when world landmarks are unavailable, and the caller falls
     * back to the old proportional `scale`.
     */
    mmPerPixel(hand, world) {
        if (!world?.[INDEX_MCP] || !world?.[PINKY_MCP]) return null;

        const a = world[INDEX_MCP];
        const b = world[PINKY_MCP];
        const spanM = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

        const spanPx = Math.hypot(
            (hand[INDEX_MCP].x - hand[PINKY_MCP].x) * this.size.w,
            (hand[INDEX_MCP].y - hand[PINKY_MCP].y) * this.size.h,
        );

        if (!(spanM > 1e-4) || !(spanPx > 1)) return null;

        return (spanM * 1000) / spanPx;
    }

    // ----------------------------------------------------------- ring on hand

    /**
     * @param hands       normalised 2D landmarks, one array per hand
     * @param worldHands  metric 3D landmarks, same order — these carry the
     *                    orientation that a screen-space projection cannot
     * @param handedness  MediaPipe's per-hand Left/Right categories
     */
    placeOnHands(hands, worldHands, handedness, sizeMul) {
        this.slots.forEach((slot, i) => {
            const hand = hands?.[i];
            const world = worldHands?.[i];

            if (!hand) {
                slot.group.visible = false;
                slot.smoothed = null;

                return;
            }

            const W = this.size.w;
            const H = this.size.h;
            const at = (idx) => ({ x: hand[idx].x, y: hand[idx].y });

            const mcp = at(RING_MCP);
            const pip = at(RING_PIP);
            const midMcp = at(MIDDLE_MCP);

            // Knuckle spacing is the only proxy for finger width available —
            // MediaPipe reports no thickness of its own.
            const fingerPx = Math.hypot((midMcp.x - mcp.x) * W, (midMcp.y - mcp.y) * H);

            // Sit the ring below the knuckle, along the first phalanx.
            const nx = mcp.x + (pip.x - mcp.x) * RING_ALONG;
            const ny = mcp.y + (pip.y - mcp.y) * RING_ALONG;

            const position = this.toWorld(nx, ny);

            // True size when the CAD told us how big the piece really is;
            // otherwise the old proportional guess.
            const mmPerPx = this.mmPerPixel(hand, world);
            const widthPx = this.piece.real_mm && mmPerPx
                ? this.piece.real_mm / mmPerPx
                : fingerPx * (this.piece.scale ?? 1.35);

            const diameter = this.pxToWorld(widthPx) * sizeMul;

            const label = handedness?.[i]?.[0]?.categoryName ?? handedness?.[i]?.categoryName;
            const quaternion = world
                ? this.handQuaternion(world, label, RING_MCP, RING_PIP)
                : new THREE.Quaternion();

            this.applySlot(slot, position, quaternion, diameter);

            if (slot.occluder) {
                // A cylinder standing in for the finger: invisible, but present
                // in the depth buffer.
                //
                // Sized in the GROUP's local units, not world units — the model
                // was normalised to exactly 1 unit across, so the occluder is
                // simply the hole's share of the piece's width. Setting a world
                // measurement here instead multiplies the two scales together
                // and leaves an occluder far too small to cover anything.
                slot.occluder.scale.setScalar(this.occluderLocal(fingerPx, widthPx, sizeMul));
                slot.occluder.scale.y = 4;
            }
        });
    }

    /**
     * Orientation from the hand's metric landmarks.
     *
     * The convention the model was normalised into: the limb runs along +Y,
     * the top of the piece faces +Z. So the rotation is just the basis whose
     * Y is the limb direction and whose Z is the back-of-hand normal — which
     * is why a ring and a bangle share this maths and differ only in which two
     * landmarks define the axis.
     */
    handQuaternion(world, handednessLabel, axisFrom, axisTo) {
        const v = (i) => new THREE.Vector3(world[i].x, -world[i].y, -world[i].z);

        const wrist = v(WRIST);
        const alongLimb = v(axisTo).sub(v(axisFrom)).normalize();

        // The palm plane, from two spans across it.
        const toIndex = v(INDEX_MCP).sub(wrist);
        const toPinky = v(PINKY_MCP).sub(wrist);
        let normal = new THREE.Vector3().crossVectors(toPinky, toIndex).normalize();

        // That cross product points out of the palm for one hand and out of the
        // back for the other; the label is what disambiguates. Without this a
        // ring's setting faces into the finger on the left hand.
        if (handednessLabel === 'Left') normal.negate();

        if (!isFinite(alongLimb.x) || alongLimb.lengthSq() < 1e-8) {
            return new THREE.Quaternion();
        }

        // Gram-Schmidt: keep the limb axis exact and square the normal to it,
        // since the two are only approximately perpendicular on a real hand.
        const y = alongLimb;
        const z = normal.sub(y.clone().multiplyScalar(normal.dot(y)));
        if (z.lengthSq() < 1e-8) return new THREE.Quaternion();
        z.normalize();
        const x = new THREE.Vector3().crossVectors(y, z);

        return new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().makeBasis(x, y, z),
        );
    }

    // ------------------------------------------------- bangle on wrist

    /**
     * Places a bangle or bracelet on the wrist.
     *
     * The hard part is that MediaPipe tracks the HAND and stops at landmark 0 —
     * there is no forearm to anchor to. So the forearm is inferred: the line
     * from the middle knuckle back through the wrist points down it, and the
     * piece is pushed a little further along that line, past the wrist crease
     * to where a bangle actually rests.
     *
     * Width comes from the knuckle span rather than anything at the wrist,
     * because the wrist landmark is a single point with no width of its own. A
     * wrist is roughly four fifths of the span across the knuckles, which is
     * what `scale` is calibrated against.
     */
    placeOnWrists(hands, worldHands, handedness, sizeMul) {
        this.slots.forEach((slot, i) => {
            const hand = hands?.[i];
            const world = worldHands?.[i];

            if (!hand) {
                slot.group.visible = false;
                slot.smoothed = null;

                return;
            }

            const W = this.size.w;
            const H = this.size.h;

            const wrist = hand[WRIST];
            const midMcp = hand[MIDDLE_MCP];
            const indexMcp = hand[INDEX_MCP];
            const pinkyMcp = hand[PINKY_MCP];

            const handPx = Math.hypot(
                (indexMcp.x - pinkyMcp.x) * W,
                (indexMcp.y - pinkyMcp.y) * H,
            );

            // Down the forearm, away from the fingers.
            const dx = wrist.x - midMcp.x;
            const dy = wrist.y - midMcp.y;

            const nx = wrist.x + dx * (this.piece.offset ?? 0.28);
            const ny = wrist.y + dy * (this.piece.offset ?? 0.28);

            const position = this.toWorld(nx, ny);

            // A bangle is ~65 mm across and a knuckle span ~80 mm, so a
            // proportional guess is easy to get badly wrong — measuring both
            // sides in real units is what stops a bracelet rendering the size
            // of a whole hand.
            const mmPerPx = this.mmPerPixel(hand, world);
            const widthPx = this.piece.real_mm && mmPerPx
                ? this.piece.real_mm / mmPerPx
                : handPx * (this.piece.scale ?? 0.85);

            const diameter = this.pxToWorld(widthPx) * sizeMul;

            const label = handedness?.[i]?.[0]?.categoryName ?? handedness?.[i]?.categoryName;
            const quaternion = world
                ? this.handQuaternion(world, label, MIDDLE_MCP, WRIST)
                : new THREE.Quaternion();

            this.applySlot(slot, position, quaternion, diameter);

            if (slot.occluder) {
                // Same reasoning as the ring: the wrist fills the bangle's hole.
                const wristPx = handPx * (this.piece.wrist_ratio ?? 0.78);
                slot.occluder.scale.setScalar(this.occluderLocal(wristPx, widthPx, sizeMul));
                slot.occluder.scale.y = 4;
            }
        });
    }

    // --------------------------------------------------------- earrings

    placeOnFace(marks, sizeMul) {
        if (!marks) {
            this.slots.forEach((slot) => {
                slot.group.visible = false;
                slot.smoothed = null;
            });

            return;
        }

        const W = this.size.w;
        const H = this.size.h;
        const at = (i) => marks[i];

        const left = at(EAR_L);
        const right = at(EAR_R);
        const eyeL = at(EYE_L);
        const eyeR = at(EYE_R);
        const nose = at(NOSE);

        const faceW = Math.hypot((right.x - left.x) * W, (right.y - left.y) * H);
        const faceH = Math.hypot((at(CHIN).x - at(BROW).x) * W, (at(CHIN).y - at(BROW).y) * H);

        // Head roll from the eye line — steadier than the jaw, which moves when
        // the customer talks or smiles.
        const roll = Math.atan2((eyeR.y - eyeL.y) * H, (eyeR.x - eyeL.x) * W);

        // How far the nose sits between the ears gives head yaw, which both
        // rotates the piece and fades out the ear that has turned away.
        const dl = Math.hypot(nose.x - left.x, nose.y - left.y);
        const dr = Math.hypot(nose.x - right.x, nose.y - right.y);
        const span = dl + dr || 1;
        const fade = (v) => Math.min(1, Math.max(0, (v - YAW_HIDE) / (YAW_FULL - YAW_HIDE)));
        const yaw = (dl / span - 0.5) * Math.PI;

        const ears = [
            { mark: left, alpha: fade(dl / span) },
            { mark: right, alpha: fade(dr / span) },
        ];

        const drop = faceH * (this.piece.drop ?? 0.02);
        const width = this.pxToWorld(faceW * (this.piece.scale ?? 0.15) * sizeMul);

        this.slots.forEach((slot, i) => {
            const ear = ears[i];
            if (!ear || ear.alpha <= 0.02) {
                slot.group.visible = false;
                slot.smoothed = null;

                return;
            }

            const position = this.toWorld(ear.mark.x, ear.mark.y + drop / H);

            // Hang from the top of the piece rather than its centre.
            position.y -= width / 2;

            const quaternion = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(0, yaw, -roll, 'YXZ'),
            );

            this.applySlot(slot, position, quaternion, width, ear.alpha);
        });
    }

    // ------------------------------------------------------------ shared

    /** Smooth into place. Raw landmarks jitter a pixel or two even held still. */
    applySlot(slot, position, quaternion, scale, opacity = 1) {
        if (!slot.smoothed) {
            slot.smoothed = {
                position: position.clone(),
                quaternion: quaternion.clone(),
                scale,
            };
        } else {
            slot.smoothed.position.lerp(position, SMOOTH);
            // slerp, not per-component lerp: a ring passing through ±180°
            // would otherwise spin the long way round.
            slot.smoothed.quaternion.slerp(quaternion, SMOOTH);
            slot.smoothed.scale = lerp(slot.smoothed.scale, scale, SMOOTH);
        }

        slot.group.position.copy(slot.smoothed.position);
        slot.group.quaternion.copy(slot.smoothed.quaternion);
        slot.group.scale.setScalar(slot.smoothed.scale);
        slot.group.visible = true;

        if (opacity < 1) {
            slot.group.traverse((child) => {
                if (!child.isMesh || !child.material || child.userData.isOccluder) return;
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                for (const material of materials) {
                    material.transparent = true;
                    material.opacity = opacity;
                }
            });
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Release the GPU. A WebGL context that is merely dropped keeps its
     * textures and buffers until the driver feels like collecting them, and a
     * customer who opens try-on on five pieces in a row would exhaust the
     * browser's context limit.
     */
    dispose() {
        this.scene.traverse((child) => {
            if (!child.isMesh) return;
            child.geometry?.dispose();
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            for (const material of materials) material?.dispose();
        });

        this.envMap?.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss?.();
        this.slots = [];
        this.template = null;
    }
}

/**
 * The invisible finger.
 *
 * colorWrite off, depth write on, drawn before everything else: it paints no
 * pixels but claims their depth, so the far arc of the band is rejected exactly
 * where a real finger would have hidden it.
 */
function buildOccluder() {
    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 1, 24),
        new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true }),
    );
    mesh.renderOrder = -1;
    mesh.userData.isOccluder = true;

    return mesh;
}

/**
 * Generated stand-in for a piece that has no glTF yet.
 *
 * Not a substitute for a real scan — it knows nothing about the actual product.
 * It exists so the 3D path can be enabled, tested and demonstrated before a
 * single asset has been modelled, and so a SKU missing its file degrades to
 * something honest rather than to a blank camera.
 */
function buildFallback(piece) {
    return piece.mode === 'ears' ? buildFallbackDrop(piece) : buildFallbackRing(piece);
}

function metalMaterial(piece) {
    return new THREE.MeshStandardMaterial({
        color: METAL[piece.metal] ?? METAL.yellow,
        metalness: 1,
        roughness: 0.15,
        envMapIntensity: 1.5,
    });
}

function stoneMaterial() {
    return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0,
        transmission: 0.9,
        thickness: 0.5,
        ior: 2.4,           // diamond
        envMapIntensity: 2,
    });
}

function buildFallbackRing(piece) {
    const group = new THREE.Group();

    // TorusGeometry lies in the XY plane with its hole along Z; the ring
    // convention wants the finger — and therefore the hole — along +Y.
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.075, 24, 96), metalMaterial(piece));
    band.rotation.x = Math.PI / 2;
    group.add(band);

    if (piece.stone !== false) {
        const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), stoneMaterial());
        stone.position.z = 0.56;   // sits on top of the band, facing the camera
        group.add(stone);
    }

    return group;
}

/**
 * An earring reads completely differently from a ring: it hangs in the plane
 * FACING the viewer, where a ring is seen edge-on around a finger. Reusing the
 * ring here rendered a five-pixel sliver, which is worse than no fallback at
 * all — it looks like a bug rather than a placeholder.
 */
function buildFallbackDrop(piece) {
    const group = new THREE.Group();

    // Left in the XY plane: the hoop faces the camera, as a worn one does.
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 20, 64), metalMaterial(piece));
    hoop.position.y = 0.25;
    group.add(hoop);

    const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), stoneMaterial());
    drop.position.y = -0.32;
    drop.scale.set(1, 1.5, 1);   // a teardrop rather than a ball
    group.add(drop);

    return group;
}

const METAL = {
    yellow: 0xd4af37,
    white: 0xe6e8ea,
    rose: 0xe0a899,
};
