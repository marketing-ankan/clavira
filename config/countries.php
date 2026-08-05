<?php

// The markets Clavira ships to. This is the single source of truth: the
// checkout country selector, order emails, invoices and NRI currency display
// all read from here, so adding a market is a one-line change rather than an
// edit in four files.
//
// `currency` is the display currency for that market — it does not change what
// is charged. Razorpay settles in INR; foreign currency is shown as an
// indicative conversion only (see config/currency.php).
//
// `domestic` marks the market where GST applies. Everything else is treated as
// an export for tax purposes: zero-rated GST, with any import duty collected by
// the destination country from the recipient.
//
// `shipping` is the flat insured-shipping charge in INR. Domestic shipping is
// free; the international figures are INDICATIVE placeholders pending real
// courier quotes from the client — override per market via env if needed
// before real international orders are taken.

return [
    'default' => 'IN',

    'list' => [
        'IN' => ['name' => 'India', 'dial' => '+91', 'currency' => 'INR', 'domestic' => true, 'shipping' => 0],
        'AE' => ['name' => 'United Arab Emirates', 'dial' => '+971', 'currency' => 'AED', 'domestic' => false, 'shipping' => (float) env('SHIPPING_AE', 4500)],
        'US' => ['name' => 'United States', 'dial' => '+1', 'currency' => 'USD', 'domestic' => false, 'shipping' => (float) env('SHIPPING_US', 6500)],
        'GB' => ['name' => 'United Kingdom', 'dial' => '+44', 'currency' => 'GBP', 'domestic' => false, 'shipping' => (float) env('SHIPPING_GB', 6000)],
        'SG' => ['name' => 'Singapore', 'dial' => '+65', 'currency' => 'SGD', 'domestic' => false, 'shipping' => (float) env('SHIPPING_SG', 4500)],
        'AU' => ['name' => 'Australia', 'dial' => '+61', 'currency' => 'AUD', 'domestic' => false, 'shipping' => (float) env('SHIPPING_AU', 6500)],
        'CA' => ['name' => 'Canada', 'dial' => '+1', 'currency' => 'CAD', 'domestic' => false, 'shipping' => (float) env('SHIPPING_CA', 6500)],
    ],
];
