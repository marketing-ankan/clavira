# Unassigned try-on cutouts — DO NOT wire these to a product

These cut out cleanly, but they are AI-generated concept images from
Design 2 (Gemini). Image matching against the catalogue put them at
diff 0.055 / 0.094 from d2-ring-04 — *similar to* a real ring, but not
the same ring, and not the image of any SKU.

Try-on must show the piece the customer is actually buying. Putting an
invented ring on someone's finger under a real SKU misrepresents the
product, so these stay out of config/tryon.php until someone confirms a
real Clavira piece they correspond to.

  ai-concept-flower-ring.png   <- Gemini_Generated_Image_a3bd6f...
  ai-concept-ornate-ring.png   <- Gemini_Generated_Image_acwwfa...

To use one: confirm the matching product, rename to <product-slug>.png,
move up one directory, then add it to config/tryon.php with the finger
hole geometry (see the measuring note in that file).

---

## topview-swirl-cluster-ring.png  (view: 'top')

From `Fresh creation\WhatsApp Image 2026-01-18 at 15.40.49.jpeg` — a REAL
Clavira product photo, not AI. Held back only because it matches no catalogue
product (closest was p33_03 at diff 0.11, i.e. unrelated).

Measured and verified against a synthetic finger:

    'mode'     => 'finger',
    'view'     => 'top',
    'asset'    => '/images/tryon/topview-swirl-cluster-ring.png',
    'anchor_x' => 0.506,   // alpha centroid — there is no hole to register on
    'anchor_y' => 0.459,
    'scale'    => 2.0,     // image width = 2.0x finger width

Cutout needed three passes beyond a plain flood fill:
  1. enclosed-region sweep — this ring is OPENWORK, and the gaps between the
     swirl arms are walled in by metal, so a border fill leaves them opaque
     white and the finger cannot show through
  2. largest-component keep — drops detached specks
  3. neutral-grey removal — the cast shadow is dead neutral (sat 0.008) while
     gold sits at 0.55 and the diamonds at lum 233, so a narrow neutral+mid
     luminance band lifts the shadow and touches neither
