import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Virtual jewellery try-on — earrings (face tracking) and rings (hand tracking).
 *
 * Everything runs on the visitor's device: MediaPipe's landmarkers are
 * WebAssembly served from our own origin, the camera stream is drawn to a local
 * canvas, and no frame is ever uploaded. That is a deliberate design choice, not
 * an implementation detail — it is what makes it acceptable to ask a customer to
 * turn a camera on, and it is stated plainly in the UI.
 *
 * The two modes share all the camera, capture and teardown plumbing and differ
 * only in which landmarker runs and how the piece is anchored.
 */

// ---- FaceMesh indices (earrings) ---------------------------------------
const EAR_L = 234;   // silhouette beside the left ear (unmirrored image space)
const EAR_R = 454;
const EYE_L = 33;    // outer corners — the most stable roll reference
const EYE_R = 263;
const BROW = 10;
const CHIN = 152;
const NOSE = 1;      // tip — used to infer head yaw

/**
 * Yaw fade. MediaPipe keeps reporting the silhouette point beside the far ear
 * when the head turns, but that point has slid onto the cheek and the real ear
 * is hidden behind it — which is how you end up with an earring floating on
 * someone's face. Fading the far side out as the head turns matches reality:
 * you cannot see that earring either.
 */
const YAW_HIDE = 0.30;
const YAW_FULL = 0.40;

// ---- Hand indices (rings) ----------------------------------------------
const MIDDLE_MCP = 9;
const RING_MCP = 13;   // knuckle
const RING_PIP = 14;   // first joint
/** Where along knuckle → first joint a ring actually sits. */
const RING_ALONG = 0.40;

/** Exponential smoothing. Raw landmarks jitter ~1-2px even when held still. */
const SMOOTH = 0.45;
const lerp = (a, b, t) => a + (b - a) * t;

const MODE_COPY = {
    ears: { hint: 'Look straight at the camera', task: 'face' },
    finger: { hint: 'Hold your hand up, palm away', task: 'hand' },
};

export default function JewelleryTryOn({ piece, productName, onClose }) {
    const mode = piece.mode === 'finger' ? 'finger' : 'ears';

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const overlayRef = useRef(null);      // the loaded jewellery PNG
    const landmarkerRef = useRef(null);
    const streamRef = useRef(null);
    const rafRef = useRef(null);
    const smoothedRef = useRef(null);
    const sizeRef = useRef(1);            // live copy so the loop sees changes

    const [phase, setPhase] = useState('starting'); // starting | ready | error
    const [error, setError] = useState('');
    const [size, setSize] = useState(1);
    const [shot, setShot] = useState(null);
    const [tracked, setTracked] = useState(false);

    useEffect(() => { sizeRef.current = size; }, [size]);

    // ---------------------------------------------------------------- teardown
    const stopEverything = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;

        // Releasing the tracks is what actually turns the camera light off.
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        landmarkerRef.current?.close?.();
        landmarkerRef.current = null;
    }, []);

    useEffect(() => stopEverything, [stopEverything]);

    // Esc closes, and the page behind must not scroll while this is open.
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);

    // ------------------------------------------------------------------ start
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) throw new Error('UNSUPPORTED');
                // getUserMedia is HTTPS-only (localhost exempted).
                if (!window.isSecureContext) throw new Error('INSECURE');

                const cfg = window.__CLAVIRA?.tryon;
                if (!cfg) throw new Error('DISABLED');

                const imgPromise = new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error('ASSET'));
                    img.src = piece.asset;
                });

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                });
                if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
                streamRef.current = stream;

                const video = videoRef.current;
                video.srcObject = stream;
                await video.play();

                // Dynamic import: ~2MB of glue that must not sit in the main bundle.
                const vision = await import('@mediapipe/tasks-vision');
                const fileset = await vision.FilesetResolver.forVisionTasks(cfg.wasm_path);

                const landmarker = mode === 'finger'
                    ? await vision.HandLandmarker.createFromOptions(fileset, {
                        baseOptions: { modelAssetPath: cfg.hand_model_url, delegate: 'GPU' },
                        runningMode: 'VIDEO',
                        numHands: 2,
                    })
                    : await vision.FaceLandmarker.createFromOptions(fileset, {
                        baseOptions: { modelAssetPath: cfg.model_url, delegate: 'GPU' },
                        runningMode: 'VIDEO',
                        numFaces: 1,
                    });
                if (cancelled) { landmarker.close(); return; }

                landmarkerRef.current = landmarker;
                overlayRef.current = await imgPromise;

                setPhase('ready');
                loop();
            } catch (e) {
                if (cancelled) return;
                setError(messageFor(e));
                setPhase('error');
            }
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [piece.asset, mode]);

    // ------------------------------------------------------------- draw loop
    const loop = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const landmarker = landmarkerRef.current;

        if (!video || !canvas || !landmarker) return;

        if (video.readyState >= 2) {
            if (canvas.width !== video.videoWidth) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let result;
            try {
                result = landmarker.detectForVideo(video, performance.now());
            } catch {
                result = null; // a dropped frame must not kill the loop
            }

            if (mode === 'finger') {
                const hands = result?.landmarks ?? [];
                setTracked(hands.length > 0);
                if (hands.length) {
                    hands.forEach((hand, i) => drawRing(ctx, canvas, hand, overlayRef.current, piece, sizeRef.current, smoothedRef, i));
                } else {
                    smoothedRef.current = null;
                }
            } else {
                const marks = result?.faceLandmarks?.[0];
                setTracked(!!marks);
                if (marks) {
                    drawEarrings(ctx, canvas, marks, overlayRef.current, piece, sizeRef.current, smoothedRef);
                } else {
                    smoothedRef.current = null; // don't lerp from a stale pose
                }
            }
        }

        rafRef.current = requestAnimationFrame(loop);
    }, [piece, mode]);

    // --------------------------------------------------------------- capture
    const capture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const out = document.createElement('canvas');
        out.width = canvas.width;
        out.height = canvas.height;
        const ctx = out.getContext('2d');

        // Mirror once for the whole composite, so the saved image matches what
        // the customer was looking at.
        ctx.translate(out.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, out.width, out.height);
        ctx.drawImage(canvas, 0, 0);

        setShot(out.toDataURL('image/jpeg', 0.92));
    };

    const body = (
        <div className="fixed inset-0 z-[95] bg-charcoal/95 flex flex-col" role="dialog" aria-modal="true" aria-label={`Virtual try-on: ${productName}`}>
            <header className="flex items-center justify-between px-4 sm:px-6 py-4 shrink-0">
                <div>
                    <p className="eyebrow text-gold-light">Virtual try-on</p>
                    <h2 className="font-display text-lg sm:text-xl text-white mt-0.5">{productName}</h2>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-white/80 hover:text-white p-2 -m-2"
                    aria-label="Close try-on"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                </button>
            </header>

            <div className="flex-1 min-h-0 flex items-center justify-center px-4 pb-4">
                <div className="relative w-full max-w-3xl aspect-video bg-black overflow-hidden">
                    {/* One mirror for both layers: landmarks stay in native video
                        space, and the customer still sees a selfie view. */}
                    <div className="absolute inset-0" style={{ transform: 'scaleX(-1)' }}>
                        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
                    </div>

                    {phase === 'starting' && <Notice>Starting the camera…</Notice>}
                    {phase === 'error' && <Notice tone="error">{error}</Notice>}
                    {phase === 'ready' && !tracked && <Notice subtle>{MODE_COPY[mode].hint}</Notice>}

                    {shot && (
                        <div className="absolute inset-0 bg-black/85 grid place-items-center p-4">
                            <div className="text-center">
                                <img src={shot} alt="Your try-on" className="max-h-[60vh] mx-auto" />
                                <div className="flex gap-2 justify-center mt-4">
                                    <a href={shot} download={`clavira-tryon-${Date.now()}.jpg`} className="btn-gold !py-2.5 !px-5">Save photo</a>
                                    <button type="button" onClick={() => setShot(null)} className="btn-outline !py-2.5 !px-5 !text-white !border-white/40">Retake</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <footer className="shrink-0 px-4 sm:px-6 pb-6 space-y-3">
                {phase === 'ready' && (
                    <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-3 text-white/80 text-xs uppercase tracking-[0.14em] flex-1 min-w-[220px]">
                            Size
                            <input
                                type="range" min="0.6" max="1.6" step="0.02"
                                value={size}
                                onChange={(e) => setSize(Number(e.target.value))}
                                className="flex-1 accent-[color:var(--color-gold-light)]"
                                aria-label="Adjust size"
                            />
                        </label>
                        <button type="button" onClick={capture} className="btn-gold !py-2.5 !px-6">
                            Take photo
                        </button>
                    </div>
                )}
                <p className="max-w-3xl mx-auto text-[11px] text-white/55 leading-relaxed">
                    Everything here runs on your device — the video never leaves your browser and
                    nothing is uploaded or stored. This is a guide to scale and drape, not an exact
                    representation; stone and metal colour vary with your lighting.
                </p>
            </footer>
        </div>
    );

    return createPortal(body, document.body);
}

/** Places one earring under each ear, rotated with the head. */
function drawEarrings(ctx, canvas, marks, img, piece, sizeMul, smoothedRef) {
    if (!img) return;

    const W = canvas.width;
    const H = canvas.height;
    const px = (i) => ({ x: marks[i].x * W, y: marks[i].y * H });

    const left = px(EAR_L);
    const right = px(EAR_R);
    const eyeL = px(EYE_L);
    const eyeR = px(EYE_R);
    const faceH = Math.hypot(px(CHIN).x - px(BROW).x, px(CHIN).y - px(BROW).y);
    const faceW = Math.hypot(right.x - left.x, right.y - left.y);

    // Head roll from the eye line — steadier than the jaw, which moves when
    // the customer talks or smiles.
    const roll = Math.atan2(eyeR.y - eyeL.y, eyeR.x - eyeL.x);

    // How far the nose sits between the ears: 0.5 square-on, lower on the side
    // that is turning away from the camera.
    const nose = px(NOSE);
    const dl = Math.hypot(nose.x - left.x, nose.y - left.y);
    const dr = Math.hypot(nose.x - right.x, nose.y - right.y);
    const span = dl + dr || 1;
    const fade = (v) => Math.min(1, Math.max(0, (v - YAW_HIDE) / (YAW_FULL - YAW_HIDE)));

    const raw = {
        lx: left.x, ly: left.y, rx: right.x, ry: right.y, faceW, roll,
        la: fade(dl / span), ra: fade(dr / span),
    };
    const s = smoothedRef.current
        ? {
            lx: lerp(smoothedRef.current.lx, raw.lx, SMOOTH),
            ly: lerp(smoothedRef.current.ly, raw.ly, SMOOTH),
            rx: lerp(smoothedRef.current.rx, raw.rx, SMOOTH),
            ry: lerp(smoothedRef.current.ry, raw.ry, SMOOTH),
            faceW: lerp(smoothedRef.current.faceW, raw.faceW, SMOOTH),
            roll: lerp(smoothedRef.current.roll, raw.roll, SMOOTH),
            la: lerp(smoothedRef.current.la, raw.la, SMOOTH),
            ra: lerp(smoothedRef.current.ra, raw.ra, SMOOTH),
        }
        : raw;
    smoothedRef.current = s;

    const width = s.faceW * piece.scale * sizeMul;
    const height = width * (img.naturalHeight / img.naturalWidth);
    const drop = faceH * piece.drop;

    for (const [ax, ay, alpha] of [[s.lx, s.ly, s.la], [s.rx, s.ry, s.ra]]) {
        if (alpha <= 0.02) continue; // that ear has turned away

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(ax, ay + drop);
        ctx.rotate(s.roll);
        // Hang from the anchor: the lobe sits at the top of the cutout.
        ctx.drawImage(img, -width * piece.anchor_x, 0, width, height);
        ctx.restore();
    }
}

/**
 * Places a ring on the ring finger.
 *
 * The cutout's own finger hole is the registration mark: `anchor_x/anchor_y`
 * are the measured centre of that hole, so scaling the image until the hole
 * matches the finger puts the band exactly where the finger is. `scale` is how
 * many finger-widths wide the whole image is, also measured from the artwork.
 */
function drawRing(ctx, canvas, hand, img, piece, sizeMul, smoothedRef, handIndex) {
    if (!img) return;

    const W = canvas.width;
    const H = canvas.height;
    const px = (i) => ({ x: hand[i].x * W, y: hand[i].y * H });

    const mcp = px(RING_MCP);
    const pip = px(RING_PIP);
    const midMcp = px(MIDDLE_MCP);

    // Knuckle spacing is the most stable proxy for finger width available —
    // MediaPipe reports no thickness of its own.
    const fingerW = Math.hypot(midMcp.x - mcp.x, midMcp.y - mcp.y);

    // Sit the ring a little below the knuckle, along the first phalanx.
    const ax = mcp.x + (pip.x - mcp.x) * RING_ALONG;
    const ay = mcp.y + (pip.y - mcp.y) * RING_ALONG;

    // Rotate so the artwork's "up" runs along the finger toward the fingertip.
    const angle = Math.atan2(pip.y - mcp.y, pip.x - mcp.x) + Math.PI / 2;

    // Smoothing is per hand, so two hands do not drag each other around.
    const store = smoothedRef.current ?? {};
    const prev = store[handIndex];
    const raw = { ax, ay, fingerW, angle };
    const s = prev
        ? {
            ax: lerp(prev.ax, raw.ax, SMOOTH),
            ay: lerp(prev.ay, raw.ay, SMOOTH),
            fingerW: lerp(prev.fingerW, raw.fingerW, SMOOTH),
            // Unwrap so the ring does not spin the long way round at ±180°.
            angle: prev.angle + wrapPi(raw.angle - prev.angle) * SMOOTH,
        }
        : raw;
    store[handIndex] = s;
    smoothedRef.current = store;

    const width = s.fingerW * piece.scale * sizeMul;
    const height = width * (img.naturalHeight / img.naturalWidth);

    ctx.save();
    ctx.translate(s.ax, s.ay);
    ctx.rotate(s.angle);
    // Put the artwork's finger hole exactly on the finger.
    ctx.drawImage(img, -width * piece.anchor_x, -height * piece.anchor_y, width, height);

    // The artwork is a front-on studio shot, so it shows the COMPLETE band —
    // including the arc that, on a real finger, is hidden behind it. Drawn as
    // is, that closed loop floating over the skin is what makes a 2D try-on
    // read as a sticker. Erase the span of band that falls within the finger's
    // silhouette on the palm side; the shank still shows at both edges, which
    // is exactly what you see when you look down at your own hand.
    if (piece.occlude !== false) {
        const band = s.fingerW * (piece.occlude_width ?? 0.9);
        ctx.globalCompositeOperation = 'destination-out';
        // +y is away from the fingertip once rotated, i.e. toward the palm.
        ctx.fillRect(-band / 2, 0, band, height);
    }

    ctx.restore();
}

/** Shortest signed angular difference, so smoothing never takes the long way. */
function wrapPi(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
}

function messageFor(e) {
    const name = e?.name || e?.message;

    if (name === 'NotAllowedError') {
        return 'Camera access was blocked. Allow the camera for this site in your browser’s address-bar settings, then try again.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return 'No camera was found on this device.';
    }
    if (name === 'NotReadableError') {
        return 'Your camera is already in use by another app. Close it and try again.';
    }
    if (name === 'INSECURE') {
        return 'A camera can only be used over a secure (https) connection.';
    }
    if (name === 'ASSET') {
        return 'The try-on image for this piece could not be loaded.';
    }
    if (name === 'UNSUPPORTED') {
        return 'This browser does not support camera access. Try Chrome, Edge or Safari.';
    }

    return 'Try-on could not start on this device.';
}

function Notice({ children, tone, subtle }) {
    return (
        <div className={`absolute inset-x-0 ${subtle ? 'bottom-4' : 'top-1/2 -translate-y-1/2'} px-6 text-center pointer-events-none`}>
            <p className={`inline-block px-4 py-2.5 text-sm ${tone === 'error' ? 'bg-maroon text-white max-w-md' : 'bg-charcoal/80 text-white/90'}`}>
                {children}
            </p>
        </div>
    );
}
