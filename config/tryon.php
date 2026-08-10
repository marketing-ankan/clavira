<?php

// Virtual try-on (proof of concept).
//
// Try-on only appears for pieces that have a hand-prepared TRANSPARENT cutout —
// the catalogue's normal photography is shot on a model's ear or a styled
// surface, and overlaying that would put a second ear on the customer's face.
// A piece missing from `pieces` simply shows no try-on button.
//
// `mode`      'ears' (face tracking), 'finger' or 'wrist' (both hand tracking)
//
// 'wrist' is 3D-only, and not out of laziness: a bangle is a loop the arm
// passes through, which is precisely the thing a flat cutout cannot depict.
// MediaPipe also stops at the wrist landmark and gives no forearm, so the
// forearm is inferred from the line running back through the knuckles, and the
// piece is pushed along it past the wrist crease. Two knobs tune that:
//
//   'offset'       how far past the wrist to sit, as a fraction of the
//                  knuckles-to-wrist span. 0.28 by default.
//   'wrist_ratio'  wrist width as a fraction of the knuckle span, used to size
//                  the depth-only occluder that hides the far side of the
//                  bangle. 0.78 by default.
//
// EARS:   `anchor_x` where on the cutout's width the earlobe sits (0.5 = centre)
//         `drop`     how far below the ear landmark to hang it, as a fraction of face height
//         `scale`    cutout width as a fraction of FACE width, at rest
//
// FINGER: `scale`  cutout width as a multiple of FINGER width
//
//   Rings are photographed two ways and need opposite handling — set `view`:
//
//   'through' (default) shot down the finger axis, so the band's own hole is
//       visible. Measure that hole: its centroid is anchor_x/anchor_y and
//       scale = image width / hole width. Such a shot shows the whole loop
//       including the arc hidden behind a real finger, so it is erased
//       (`occlude`, tune with `occlude_width`).
//
//   'top'  shot looking down at the ring, the way you see one on your own
//       hand. There is NO hole to register on, so anchor_x/anchor_y are the
//       artwork's alpha centroid and scale is measured by eye against a
//       finger. Occlusion defaults OFF — erasing a band here would gouge a
//       hole in a ring that never had one.
//
// These are per-piece because a stud, a 40mm dangle and a cocktail ring all sit
// completely differently; the customer can still fine-tune size on screen.
//
// ---------------------------------------------------------------------------
// 3D pieces
// ---------------------------------------------------------------------------
//
// `render` => '3d' swaps the flat cutout for a glTF model rendered by three.js,
// posed from MediaPipe's metric world landmarks. The difference is not polish:
// a PNG is a sticker that cannot turn, so rotating your hand slides the artwork
// around unchanged. A model shows the band's profile and the setting picks up
// the light, which is the whole point of trying a ring on.
//
// It costs ~700 KB of WebGL, loaded only when such a piece is opened, so 2D
// stays the default for anything that does not have a model yet.
//
//   'render'          '2d' (default) or '3d'
//   'model'           URL of a .glb/.gltf. Required — a 3D piece without one
//                     refuses to start rather than substituting something
//                     invented, so the product simply shows no try-on button.
//   'placeholder'     true renders GENERATED geometry instead: a plain band
//                     with a solitaire that knows nothing about the real
//                     product. Development only. Never ship it against a
//                     catalogue SKU — see the note beside `pieces` below.
//   'model_rotation'  [x, y, z] degrees, applied before anything else, for
//                     assets that were not authored in the convention below.
//   'scale'           RINGS: outer diameter in finger widths (~1.35 typical).
//                     EARS:  width as a fraction of face width, as in 2D.
//   'metal'           fallback geometry only: yellow | white | rose.
//
// MODEL CONVENTION. Export so the finger runs along +Y and the top of the
// piece (stone, setting) faces +Z, centred on its own bounding box. Anything
// else is correctable with model_rotation rather than a re-export.
//
// Keep them small — a customer on mobile data is waiting for this. Aim for
// ≤150k triangles and textures ≤2048px. Export UNCOMPRESSED geometry: Draco
// and Meshopt both need a decoder registered on the loader and neither is
// wired up here, so a compressed .glb will simply fail to load.

return [
    'enabled' => (bool) env('TRYON_ENABLED', true),

    // Face landmark model + wasm, served from this origin so no frame and no
    // request ever leaves the visitor's device.
    'model_url' => '/models/face_landmarker.task',
    'hand_model_url' => '/models/hand_landmarker.task',
    'wasm_path' => '/mediapipe/wasm',

    'pieces' => [
        'pear-drop-dangles' => [
            'mode' => 'ears',
            'asset' => '/images/tryon/pear-drop-dangles.png',
            'anchor_x' => 0.42,
            'drop' => 0.02,
            'scale' => 0.13,
        ],
        'jhumka-drop-duo' => [
            'mode' => 'ears',
            'asset' => '/images/tryon/jhumka-drop-duo.png',
            'anchor_x' => 0.5,
            'drop' => 0.02,
            'scale' => 0.17,
        ],

        // anchor/scale measured from each cutout's own finger hole.
        'navratna-diamond-ring' => [
            'mode' => 'finger',
            'asset' => '/images/tryon/navratna-diamond-ring.png',
            'anchor_x' => 0.487,
            'anchor_y' => 0.794,
            'scale' => 1.26,
        ],
        'rose-swirl-statement-ring' => [
            'mode' => 'finger',
            'asset' => '/images/tryon/rose-swirl-statement-ring.png',
            'anchor_x' => 0.530,
            'anchor_y' => 0.533,
            'scale' => 1.44,
        ],

        // ---- 3D pieces -------------------------------------------------
        //
        // None yet, deliberately. The renderer is built and tested, but no
        // Clavira piece has been modelled, and the same rule that keeps the
        // AI-generated cutouts in public/images/tryon/_unassigned/ out of this
        // file applies here: try-on shows the piece the customer is actually
        // buying. A generated stand-in band under a real SKU would be an
        // invented product on someone's hand.
        //
        // The first real converted model IS already built and verified:
        // public/models/tryon/design-64-cad.glb, from the supplier's
        // 64-CAD Rhino mesh via deploy/n8n/stl-to-glb.mjs. It loads in 466 ms,
        // sits correctly on a tracked wrist, and the occluder hides the far
        // side of the loop. It is not switched on because 64-CAD is a SUPPLIER
        // design number and nobody has yet said which Clavira SKU it is.
        //
        // Give it the right slug and it goes live as-is:
        //
        //   '<the-matching-product-slug>' => [
        //       'mode'   => 'wrist',
        //       'render' => '3d',
        //       'model'  => '/models/tryon/design-64-cad.glb',
        //       // 64-CAD's hole runs along the mesh's thin Z axis; the stage
        //       // wants the limb along +Y.
        //       'model_rotation' => [-90, 0, 0],
        //       'scale'  => 1.15,   // outer diameter in knuckle spans
        //   ],
        //
        // A ring from the same supplier would be identical but for
        // 'mode' => 'finger' and 'scale' => 1.35 (finger widths).
        //
        // 'placeholder' => true renders generated geometry instead of a model.
        // That exists for development only — it is a plain band with a
        // solitaire that knows nothing about any real piece, and it must not
        // ship against a catalogue SKU.
    ],
];
