<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Publish the day's gold rate before the storefront's first Indian visitors.
// NOTE: this only fires if `php artisan schedule:run` is on cron. The Hostinger
// box currently runs ONLY deploy/hostinger-deploy.sh, so a second hPanel cron
// entry is required — see docs/ADMIN-ACCESS-AND-DEPLOY.md.
Schedule::command('clavira:gold-rate-fetch')
    ->dailyAt('09:15')
    ->withoutOverlapping();

// Nightly database backup, in the quiet hours for Indian traffic. Same cron
// caveat as above: without `schedule:run` on cron this never fires.
// --quiet-success keeps cron mail silent unless something actually broke.
Schedule::command('clavira:backup --quiet-success')
    ->dailyAt('02:30')
    ->withoutOverlapping();

// Indicative FX for NRI price display. Cheap and keyless; the storefront also
// refreshes lazily, so this is belt-and-braces rather than load-bearing.
Schedule::command('clavira:fx-fetch')
    ->dailyAt('05:45')
    ->withoutOverlapping();
