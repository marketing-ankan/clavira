<?php

// Brand contact + engagement settings, surfaced to the storefront via /api/home.

return [
    // WhatsApp business number in international format WITHOUT '+' or spaces,
    // e.g. 919812345678. Leave blank to hide the floating WhatsApp button.
    'whatsapp' => env('CLAVIRA_WHATSAPP', '919000000000'),

    'phone' => env('CLAVIRA_PHONE', '+91 90000 00000'),
    'email' => env('CLAVIRA_EMAIL', 'care@clavira.in'),
    'instagram' => env('CLAVIRA_INSTAGRAM', 'https://instagram.com/clavira'),
];
