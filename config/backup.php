<?php

// Nightly database backup (clavira:backup).
//
// Dumps land in storage/backups, which is outside the web root — never move
// them under public/, a .sql.gz of this database is every order and every
// customer address in one file.

return [
    // How many daily dumps to keep. Two weeks is enough to notice and recover
    // from a bad deploy or a mistaken bulk edit without filling a shared disk.
    'keep_days' => (int) env('BACKUP_KEEP_DAYS', 14),

    // Absolute path to mysqldump when it is not on PATH. Hostinger usually has
    // it at /usr/bin/mysqldump; leave blank to let the shell resolve it.
    'mysqldump_path' => env('BACKUP_MYSQLDUMP_PATH', ''),

    // Fail the /health check if the newest dump is older than this many hours.
    // 36 gives a daily job one missed run of grace before it is called a fault.
    'stale_after_hours' => (int) env('BACKUP_STALE_AFTER_HOURS', 36),
];
