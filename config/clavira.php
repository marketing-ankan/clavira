<?php

// Brand contact + engagement settings, surfaced to the storefront via /api/home.

return [
    // WhatsApp business number in international format WITHOUT '+' or spaces,
    // e.g. 919812345678. Leave blank to hide the floating WhatsApp button.
    'whatsapp' => env('CLAVIRA_WHATSAPP', '919000000000'),

    'phone' => env('CLAVIRA_PHONE', '+91 90000 00000'),
    'email' => env('CLAVIRA_EMAIL', 'care@clavira.in'),
    'instagram' => env('CLAVIRA_INSTAGRAM', 'https://instagram.com/clavira'),

    // Automated gold-rate ingestion (clavira:gold-rate-fetch).
    'gold_rate' => [
        // Where to read today's 24kt per-gram INR quote from. IBJA publishes
        // rates per 10 grams; set `per_10g` accordingly for whichever feed is
        // used. Blank disables the fetch entirely (manual publishing only).
        'source_url' => env('GOLD_RATE_SOURCE_URL', ''),

        // Label written to gold_rates.source so a fetched row is distinguishable
        // from an admin-published one.
        'source' => env('GOLD_RATE_SOURCE', 'ibja'),

        // Most Indian feeds quote per 10 grams; we store per gram.
        'per_10g' => (bool) env('GOLD_RATE_PER_10G', true),

        // Refuse to publish a quote that moves more than this fraction away from
        // the last known rate. A bad scrape must never reprice the storefront.
        'max_move' => (float) env('GOLD_RATE_MAX_MOVE', 0.20),
    ],
];
