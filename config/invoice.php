<?php

// GST invoice identity. Every value here prints on customer tax documents —
// fill the SELLER_* env vars with the real registered entity before real
// orders. Blanks render as an em-dash and the invoice is watermarked
// "PROVISIONAL — GSTIN pending" until a GSTIN is configured.

return [
    'seller' => [
        'legal_name' => env('SELLER_LEGAL_NAME', 'Clavira'),
        'address' => env('SELLER_ADDRESS', ''),          // single line, commas welcome
        'city' => env('SELLER_CITY', ''),
        'state' => env('SELLER_STATE', 'Maharashtra'),   // must match how buyers type their state
        'state_code' => env('SELLER_STATE_CODE', '27'),  // GST state code (27 = Maharashtra)
        'postal_code' => env('SELLER_POSTAL_CODE', ''),
        'gstin' => env('SELLER_GSTIN', ''),
        'pan' => env('SELLER_PAN', ''),
        'email' => env('SELLER_EMAIL', 'care@clavira.in'),
        'phone' => env('SELLER_PHONE', ''),
    ],

    // HSN 7113: articles of jewellery and parts thereof. SAC 996812 covers the
    // courier leg when shipping is charged separately (exports).
    'hsn_jewellery' => env('INVOICE_HSN', '7113'),
    'sac_shipping' => env('INVOICE_SAC_SHIPPING', '996812'),

    // Invoice number series, separate from order_no by GST convention:
    // CLV-INV-<fiscal year>-<sequence>, e.g. CLV-INV-2627-000014.
    // The sequence comes from the invoices table, allocated under a lock —
    // NOT from max(id)+1, which reuses numbers after deletes.
    'prefix' => env('INVOICE_PREFIX', 'CLV-INV'),
];
