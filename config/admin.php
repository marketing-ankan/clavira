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
];
