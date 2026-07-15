<?php

// Admin-access allowlist. These are the hard guarantees for who may ever hold
// admin rights — enforced server-side in the `admin` Gate and at invite time.

return [

    // Permanent owner accounts. Always admins; cannot be revoked from the panel.
    'owners' => array_values(array_filter(array_map(
        fn ($e) => strtolower(trim($e)),
        explode(',', env('ADMIN_OWNERS', 'dinesh@winquestonline.com,seema@winquestonline.com'))
    ))),

    // Only emails on these domains may EVER be admins (invited or otherwise).
    'allowed_domains' => array_values(array_filter(array_map(
        fn ($d) => strtolower(trim($d)),
        explode(',', env('ADMIN_ALLOWED_DOMAINS', 'winquestonline.com'))
    ))),

    // How long an admin invite / set-password link stays valid.
    'invite_ttl_hours' => (int) env('ADMIN_INVITE_TTL_HOURS', 72),

    // Email both owners whenever an admin signs in.
    'login_alerts' => (bool) env('ADMIN_LOGIN_ALERTS', true),

    // Secret "knock" path that reveals the admin login. When set, /admin returns
    // 404 until the visitor first opens /<gate_key> (which sets a cookie). Leave
    // blank to keep the admin login reachable directly at /admin (default).
    'gate_key' => env('ADMIN_GATE_KEY'),
];
