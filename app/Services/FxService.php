<?php

namespace App\Services;

use App\Models\FxRate;
use App\Support\Countries;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Daily indicative FX for the NRI display layer, mirroring GoldRateService's
 * fetch-plus-lazy-freshness shape. Charging stays in INR everywhere; a wrong
 * or stale rate here can mislead but never mischarge, which is why a keyless
 * public feed is acceptable.
 */
class FxService
{
    /** Display currencies = every non-INR currency a shipping market uses. */
    public function currencies(): array
    {
        $codes = array_values(array_unique(array_map(
            fn (array $c) => $c['currency'],
            Countries::all(),
        )));

        return array_values(array_diff($codes, ['INR']));
    }

    /** Fetch and store today's rates. Returns how many currencies were updated. */
    public function fetch(int $timeout = 10): int
    {
        $wanted = $this->currencies();

        if (! $wanted) {
            return 0;
        }

        $response = Http::timeout($timeout)
            ->retry(2, 300)
            ->get(config('clavira.fx.source_url'));

        if (! $response->successful() || $response->json('result') !== 'success') {
            Log::error('FX fetch failed', ['status' => $response->status()]);

            return 0;
        }

        $rates = $response->json('rates', []);
        $written = 0;

        foreach ($wanted as $code) {
            $perInr = $rates[$code] ?? null;

            if (! is_numeric($perInr) || $perInr <= 0) {
                Log::warning('FX feed missing currency', ['code' => $code]);

                continue;
            }

            FxRate::updateOrCreate(
                ['code' => $code],
                ['per_inr' => $perInr, 'fetched_at' => now()],
            );
            $written++;
        }

        return $written;
    }

    /**
     * Refresh at most once per cooldown window when any display currency is
     * missing or wasn't fetched today. Never throws — the storefront falls
     * back to the last stored rates (or plain INR when there are none).
     */
    public function ensureFresh(): void
    {
        $wanted = $this->currencies();

        if (! $wanted) {
            return;
        }

        $fresh = FxRate::whereIn('code', $wanted)
            ->whereDate('fetched_at', today())
            ->count();

        if ($fresh === count($wanted)) {
            return;
        }

        if (! Cache::add('fx:lazy-attempt', now()->toIso8601String(), now()->addMinutes(60))) {
            return;
        }

        try {
            $this->fetch(timeout: 5);
        } catch (\Throwable $e) {
            Log::warning('Lazy FX refresh failed', ['error' => $e->getMessage()]);
        }
    }
}
