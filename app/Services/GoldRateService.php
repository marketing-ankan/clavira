<?php

namespace App\Services;

use App\Models\GoldRate;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Fetches and publishes the day's gold rate.
 *
 * Two callers share this logic: the scheduled clavira:gold-rate-fetch command,
 * and the storefront's lazy freshness check (ensureFresh), which exists because
 * shared hosting gives no guarantee the scheduler cron is actually running —
 * without it the ticker silently shows the same rate forever, which is exactly
 * the bug this class was extracted to fix.
 */
class GoldRateService
{
    private const GRAMS_PER_TROY_OUNCE = 31.1034768;

    /** How long a failed/successful lazy attempt suppresses the next one. */
    private const ATTEMPT_COOLDOWN_MINUTES = 60;

    /**
     * The storefront's guarantee: called on gold-rate reads, publishes today's
     * rate if the latest row is from an earlier day. Never throws, never takes
     * more than a few seconds, and never runs more than once per cooldown
     * window no matter how many visitors hit a stale page at once.
     */
    public function ensureFresh(): void
    {
        $latest = GoldRate::latest_rate();

        if ($latest && $this->rateDay($latest)->isToday()) {
            return;
        }

        // One attempt per window, cluster-safe via the cache lock. Everyone
        // else proceeds with the stale-but-dated rate immediately.
        if (! Cache::add('gold-rate:lazy-attempt', now()->toIso8601String(), now()->addMinutes(self::ATTEMPT_COOLDOWN_MINUTES))) {
            return;
        }

        try {
            $rate = $this->fetchCurrent(timeout: 5);

            if ($rate !== null) {
                $this->publish($rate);
            }
        } catch (\Throwable $e) {
            Log::warning('Lazy gold-rate refresh failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Today's 24kt per-gram INR quote from the configured feed, or null.
     *
     * Understands three shapes:
     *  - goldprice.org (the keyless default): {items:[{curr:"INR", xauPrice: <per OUNCE>}]}
     *  - a JSON feed with a recognisable 24kt key (per gram or per 10g)
     *  - an HTML page with a "24 Carat ... 73,500"-style figure
     */
    public function fetchCurrent(int $timeout = 15): ?float
    {
        $url = trim((string) config('clavira.gold_rate.source_url', ''));

        if ($url === '') {
            return null;
        }

        $response = Http::timeout($timeout)
            ->retry(2, 300)
            ->withHeaders([
                'Accept' => 'application/json, text/html',
                // goldprice.org rejects non-browser clients outright.
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
                'Referer' => 'https://goldprice.org/',
            ])
            ->get($url);

        if (! $response->successful()) {
            Log::error('Gold rate fetch bad status', ['url' => $url, 'status' => $response->status()]);

            return null;
        }

        $json = $response->json();

        // goldprice.org: INR per troy ounce, so the per_10g flag does not apply.
        $perOunce = is_array($json) ? data_get($json, 'items.0.xauPrice') : null;
        if (is_numeric($perOunce) && data_get($json, 'items.0.curr') === 'INR') {
            return round($perOunce / self::GRAMS_PER_TROY_OUNCE, 2);
        }

        $rate = $this->extractRate($response->body(), $json);

        if ($rate === null) {
            Log::error('Gold rate fetch unparseable', ['url' => $url]);

            return null;
        }

        return config('clavira.gold_rate.per_10g', true) ? $rate / 10 : $rate;
    }

    /**
     * Publish a 24kt per-gram rate as today's row (one row per calendar day).
     *
     * Applies the max_move sanity guard unless $force: refusing to publish is
     * always safer than publishing a wrong rate — a stale rate is visibly dated
     * on the page, a wrong one is not. Returns null when the guard refuses.
     */
    public function publish(float $rate24k, bool $force = false): ?GoldRate
    {
        if ($rate24k <= 0) {
            return null;
        }

        $last = GoldRate::latest_rate();

        if ($last && $last->rate_24k > 0 && ! $force) {
            $move = abs($rate24k - $last->rate_24k) / $last->rate_24k;
            $max = (float) config('clavira.gold_rate.max_move', 0.20);

            if ($move > $max) {
                Log::warning('Gold rate publish rejected by sanity check', [
                    'fetched' => $rate24k,
                    'last' => $last->rate_24k,
                    'move' => $move,
                ]);

                return null;
            }
        }

        $today = Carbon::today();
        $existing = GoldRate::whereDate('rate_date', $today)->orderByDesc('id')->first();

        $payload = GoldRate::fromPure($rate24k) + [
            'source' => config('clavira.gold_rate.source', 'goldprice'),
            'rate_date' => $today->toDateString(),
            // Always set explicitly. effective_at is the table's first TIMESTAMP
            // column, so it carries ON UPDATE current_timestamp() — leaving it
            // out of an update lets the database rewrite it behind our back.
            'effective_at' => now(),
        ];

        $existing ? $existing->update($payload) : $existing = GoldRate::create($payload);

        return $existing->fresh();
    }

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

    private function rateDay(GoldRate $rate): Carbon
    {
        return Carbon::parse($rate->rate_date ?? $rate->effective_at);
    }
}
