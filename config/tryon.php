<?php

// Virtual try-on (proof of concept).
//
// Try-on only appears for pieces that have a hand-prepared TRANSPARENT cutout —
// the catalogue's normal photography is shot on a model's ear or a styled
// surface, and overlaying that would put a second ear on the customer's face.
// A piece missing from `pieces` simply shows no try-on button.
//
// `mode`      'ears' (face tracking) or 'finger' (hand tracking)
//
// EARS:   `anchor_x` where on the cutout's width the earlobe sits (0.5 = centre)
//         `drop`     how far below the ear landmark to hang it, as a fraction of face height
//         `scale`    cutout width as a fraction of FACE width, at rest
//
// FINGER: `anchor_x`/`anchor_y` the measured centre of the cutout's own finger
//         hole — that hole is the registration mark, so lining it up with the
//         finger puts the band exactly where it belongs
//         `scale`    cutout width as a multiple of FINGER width
//
// These are per-piece because a stud, a 40mm dangle and a cocktail ring all sit
// completely differently; the customer can still fine-tune size on screen.

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
    ],
];
