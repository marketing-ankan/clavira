<?php

// Measurement tags. Both are blank by default, which disables the tag entirely
// AND hides the cookie banner — a site that sets no non-essential cookies must
// not ask for consent to set them.
//
// Nothing here loads until the visitor has actively accepted. See
// resources/js/consent.jsx: the IDs are published to the page, but the vendor
// scripts are injected only after a positive choice.

return [
    // GA4 measurement id, e.g. G-XXXXXXXXXX
    'ga4' => env('GA4_MEASUREMENT_ID', ''),

    // Meta (Facebook) Pixel id, e.g. 1234567890
    'meta_pixel' => env('META_PIXEL_ID', ''),

    // Months a stored consent choice is honoured before we ask again.
    // The ICO and CNIL both settle around 6-12 months; 12 is the common EU norm.
    'consent_ttl_months' => (int) env('CONSENT_TTL_MONTHS', 12),
];
