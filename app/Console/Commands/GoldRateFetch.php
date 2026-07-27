<?php

namespace App\Console\Commands;

use App\Models\GoldRate;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Pulls the day's 24kt per-gram gold quote and publishes it as a gold_rates row,
 * replacing the manual admin publish as the routine path. The other three karats
 * are derived by fineness, exactly as the admin form does in the browser.
 *
 * Storefront prices are shown against this number, so the command is deliberately
 * paranoid: it refuses anything unparseable, non-numeric, or that moves further
 * than config('clavira.gold_rate.max_move') from the last known rate. Refusing to
 * publish is always safer than publishing a wrong rate — a stale rate is visibly
 * dated on the page, a wrong one is not.
 */
class GoldRateFetch extends Command
{
    protected $signature = 'clavira:gold-rate-fetch
                            {--dry-run : Fetch and report without writing a row}
                            {--rate= : Publish this 24kt per-gram rate directly, skipping the fetch}
                            {--force : Publish even if the sanity check rejects the move}';

    protected $description = "Fetch today's gold rate and publish it to the storefront ticker";

    public function handle(): int
    {
        $rate24k = $this->option('rate') !== null
            ? (float) $this->option('rate')
            : $this->fetchRate();

        if ($rate24k === null || $rate24k <= 0) {
            $this->error('No usable 24kt rate obtained — nothing published.');

            return self::FAILURE;
        }

        $this->line("24kt per gram: <fg=yellow>{$rate24k}</>");

        $last = GoldRate::latest_rate();
        if ($last && $last->rate_24k > 0) {
            $move = abs($rate24k - $last->rate_24k) / $last->rate_24k;
            $this->line(sprintf('Move vs last published (%s): %.2f%%', $last->rate_24k, $move * 100));

            $max = (float) config('clavira.gold_rate.max_move', 0.20);
            if ($move > $max && ! $this->option('force')) {
                $msg = sprintf(
                    'Rejected: %.2f%% move exceeds the %.0f%% sanity limit. Re-run with --force if this is real.',
                    $move * 100,
                    $max * 100
                );
                $this->error($msg);
                Log::warning('Gold rate fetch rejected by sanity check', [
                    'fetched' => $rate24k,
                    'last' => $last->rate_24k,
                    'move' => $move,
                ]);

                return self::FAILURE;
            }
        }

        $rates = GoldRate::fromPure($rate24k);
        foreach ($rates as $key => $value) {
            $this->line("  {$key}: {$value}");
        }

        if ($this->option('dry-run')) {
            $this->info('Dry run — nothing written.');

            return self::SUCCESS;
        }

        $this->publish($rates);
        $this->info('Published.');

        return self::SUCCESS;
    }

    /** One row per calendar day: rewrite today's if it exists, else insert. */
    private function publish(array $rates): void
    {
        $today = Carbon::today();
        $existing = GoldRate::whereDate('rate_date', $today)->orderByDesc('id')->first();

        $payload = $rates + [
            'source' => config('clavira.gold_rate.source', 'ibja'),
            'rate_date' => $today->toDateString(),
            // Always set explicitly. effective_at is the table's first TIMESTAMP
            // column, so it carries ON UPDATE current_timestamp() — leaving it out
            // of an update lets the database rewrite it behind our back.
            'effective_at' => now(),
        ];

        $existing ? $existing->update($payload) : GoldRate::create($payload);
    }

    /** @return float|null */
    private function fetchRate(): ?float
    {
        $url = trim((string) config('clavira.gold_rate.source_url', ''));

        if ($url === '') {
            $this->error('No GOLD_RATE_SOURCE_URL configured. Set it in .env, or pass --rate= to publish manually.');

            return null;
        }

        $this->line("Fetching <fg=gray>{$url}</>");

        try {
            $response = Http::timeout(15)
                ->retry(2, 500)
                ->withHeaders(['Accept' => 'application/json, text/html'])
                ->get($url);
        } catch (\Throwable $e) {
            $this->error("Fetch failed: {$e->getMessage()}");
            Log::error('Gold rate fetch failed', ['url' => $url, 'error' => $e->getMessage()]);

            return null;
        }

        if (! $response->successful()) {
            $this->error("Fetch returned HTTP {$response->status()}.");
            Log::error('Gold rate fetch bad status', ['url' => $url, 'status' => $response->status()]);

            return null;
        }

        $rate = $this->extractRate($response->body(), $response->json());

        if ($rate === null) {
            $this->error('Could not find a 24kt rate in the response. Check the feed format.');
            Log::error('Gold rate fetch unparseable', ['url' => $url]);

            return null;
        }

        return config('clavira.gold_rate.per_10g', true) ? $rate / 10 : $rate;
    }

    /**
     * Accepts either a JSON feed carrying a recognisable 24kt key, or an HTML
     * page from which the first plausible 24kt figure is read. Kept intentionally
     * simple: the sanity check above is what makes a loose parser safe.
     */
    private function extractRate(string $body, ?array $json): ?float
    {
        if (is_array($json)) {
            foreach (['rate_24k', '24k', 'gold_24k', 'fine_gold', 'rate', 'price'] as $key) {
                $found = data_get($json, $key);
                if (is_numeric($found)) {
                    return (float) $found;
                }
            }
        }

        // e.g. "24 Carat ... 73,500" / "Gold 999 ... 73500.00"
        $patterns = [
            '/24\s*(?:carat|kt|k)\b[^0-9]{0,60}([0-9][0-9,]{3,})/i',
            '/\b999\b[^0-9]{0,60}([0-9][0-9,]{3,})/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $body, $m)) {
                $value = (float) str_replace(',', '', $m[1]);
                if ($value > 0) {
                    return $value;
                }
            }
        }

        return null;
    }
}
