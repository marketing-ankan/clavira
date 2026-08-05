<?php

// Brand contact + engagement settings, surfaced to the storefront via /api/home.

return [
    // WhatsApp business number in international format WITHOUT '+' or spaces,
    // e.g. 919812345678. Leave blank to hide the floating WhatsApp button.
    'whatsapp' => env('CLAVIRA_WHATSAPP', '919000000000'),

    'phone' => env('CLAVIRA_PHONE', '+91 90000 00000'),
    'email' => env('CLAVIRA_EMAIL', 'care@clavira.in'),
    'instagram' => env('CLAVIRA_INSTAGRAM', 'https://instagram.com/clavira'),

    // Automated gold-rate ingestion (clavira:gold-rate-fetch + the storefront's
    // lazy freshness check in GoldRateService::ensureFresh).
    'gold_rate' => [
        // Where to read today's quote from. The default is goldprice.org's
        // keyless JSON feed (INR per troy ounce — the service converts to per
        // gram; `per_10g` does not apply to that shape). Swap in an IBJA feed
        // here if the client obtains one; IBJA publishes per 10 grams, so set
        // `per_10g` accordingly. Blank disables fetching (manual publish only).
        'source_url' => env('GOLD_RATE_SOURCE_URL', 'https://data-asg.goldprice.org/dbXRates/INR'),

        // Label written to gold_rates.source so a fetched row is distinguishable
        // from an admin-published one.
        'source' => env('GOLD_RATE_SOURCE', 'goldprice'),

        // Most Indian feeds quote per 10 grams; we store per gram.
        'per_10g' => (bool) env('GOLD_RATE_PER_10G', true),

        // Refuse to publish a quote that moves more than this fraction away from
        // the last known rate. A bad scrape must never reprice the storefront.
        'max_move' => (float) env('GOLD_RATE_MAX_MOVE', 0.20),
    ],

    // Indicative FX for NRI price display (clavira:fx-fetch + FxService).
    // Keyless feed, base INR. Display only — every order still charges INR.
    'fx' => [
        'source_url' => env('FX_SOURCE_URL', 'https://open.er-api.com/v6/latest/INR'),
    ],

    // GST rate on jewellery. The single source of truth — this figure was
    // previously hardcoded in three places (CartController, CheckoutController,
    // PriceBreakup.jsx) and only applies to domestic (Indian) orders; exports
    // are zero-rated with duties collected at the destination.
    'gst_rate' => (float) env('CLAVIRA_GST_RATE', 0.03),
];
