<?php

// Operational diagnostics. Everything here is opt-in and off by default: this
// repository is public, so a value committed here is a value anyone can read.

return [

    // Secret path segment that exposes the cron deploy log at
    // /ops/<key>/deploy-log. The app folder is blocked from the web and there
    // is no SSH on Hostinger, so this is the only way to read a failed deploy.
    // Blank (the default) means the route is never registered at all.
    // Set OPS_LOG_KEY in the SERVER .env only — never commit a value.
    'log_key' => env('OPS_LOG_KEY'),

];
