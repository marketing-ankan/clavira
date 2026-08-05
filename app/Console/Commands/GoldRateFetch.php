<?php

namespace App\Console\Commands;

use App\Models\GoldRate;
use App\Services\GoldRateService;
use Illuminate\Console\Command;

/**
 * Pulls the day's 24kt per-gram gold quote and publishes it as a gold_rates row.
 * The fetch/parse/sanity logic lives in GoldRateService, shared with the
 * storefront's lazy freshness check — this command is the scheduled/manual
 * front door with dry-run and force switches.
 */
class GoldRateFetch extends Command
{
    protected $signature = 'clavira:gold-rate-fetch
                            {--dry-run : Fetch and report without writing a row}
                            {--rate= : Publish this 24kt per-gram rate directly, skipping the fetch}
                            {--force : Publish even if the sanity check rejects the move}';

    protected $description = "Fetch today's gold rate and publish it to the storefront ticker";

    public function handle(GoldRateService $service): int
    {
        $rate24k = $this->option('rate') !== null
            ? (float) $this->option('rate')
            : $service->fetchCurrent();

        if ($rate24k === null || $rate24k <= 0) {
            $this->error('No usable 24kt rate obtained — nothing published. (Is GOLD_RATE_SOURCE_URL set?)');

            return self::FAILURE;
        }

        $this->line("24kt per gram: <fg=yellow>{$rate24k}</>");

        if ($last = GoldRate::latest_rate()) {
            $move = $last->rate_24k > 0 ? abs($rate24k - $last->rate_24k) / $last->rate_24k : 0;
            $this->line(sprintf('Move vs last published (%s): %.2f%%', $last->rate_24k, $move * 100));
        }

        foreach (GoldRate::fromPure($rate24k) as $key => $value) {
            $this->line("  {$key}: {$value}");
        }

        if ($this->option('dry-run')) {
            $this->info('Dry run — nothing written.');

            return self::SUCCESS;
        }

        $published = $service->publish($rate24k, force: (bool) $this->option('force'));

        if (! $published) {
            $this->error(sprintf(
                'Rejected: the move exceeds the %.0f%% sanity limit. Re-run with --force if this is real.',
                (float) config('clavira.gold_rate.max_move', 0.20) * 100
            ));

            return self::FAILURE;
        }

        $this->info('Published for '.$published->rate_date->toDateString().'.');

        return self::SUCCESS;
    }
}
