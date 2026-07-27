<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class GoldRate extends Model
{
    protected $guarded = [];

    protected $casts = [
        'rate_24k' => 'float',
        'rate_22k' => 'float',
        'rate_18k' => 'float',
        'rate_14k' => 'float',
        'rate_date' => 'date',
        'effective_at' => 'datetime',
    ];

    /**
     * Fineness by karat — the fraction of pure gold in the alloy. Used to derive
     * the other karats from a 24kt quote. NOT to be confused with the commercial
     * purity price deltas in CatalogSeeder::makeVariants(), which are a markup on
     * base_price and a different set of numbers entirely.
     */
    public const FINENESS = [24 => 0.999, 22 => 0.916, 18 => 0.750, 14 => 0.585];

    public static function latest_rate(): ?self
    {
        return static::orderByDesc('effective_at')->first();
    }

    /** The published per-gram rate for a karat, or null if that karat is unknown. */
    public function perGram(int $purity): ?float
    {
        return match ($purity) {
            24 => $this->rate_24k,
            22 => $this->rate_22k,
            18 => $this->rate_18k,
            14 => $this->rate_14k,
            default => null,
        };
    }

    /** Derive all four karats from a 24kt per-gram quote, rounded to paise. */
    public static function fromPure(float $rate24k): array
    {
        return [
            'rate_24k' => round($rate24k, 2),
            'rate_22k' => round($rate24k * (self::FINENESS[22] / self::FINENESS[24]), 2),
            'rate_18k' => round($rate24k * (self::FINENESS[18] / self::FINENESS[24]), 2),
            'rate_14k' => round($rate24k * (self::FINENESS[14] / self::FINENESS[24]), 2),
        ];
    }

    /**
     * One point per calendar day for the last $days days, oldest first.
     *
     * Same-day duplicates are collapsed by keeping the latest publish of that
     * day. Rows predating the rate_date backfill fall back to effective_at's
     * date so nothing is silently dropped from the series.
     */
    public static function series(int $days = 30): Collection
    {
        $from = Carbon::today()->subDays($days - 1);

        return static::query()
            ->where(function ($q) use ($from) {
                $q->where('rate_date', '>=', $from->toDateString())
                    ->orWhere(fn ($q) => $q->whereNull('rate_date')->where('effective_at', '>=', $from));
            })
            ->orderBy('effective_at')
            ->get()
            ->groupBy(fn (self $r) => ($r->rate_date ?? $r->effective_at)->toDateString())
            ->map(fn (Collection $day) => $day->last())
            ->sortKeys()
            ->values()
            ->map(fn (self $r) => [
                'date' => ($r->rate_date ?? $r->effective_at)->toDateString(),
                'rate_24k' => $r->rate_24k,
                'rate_22k' => $r->rate_22k,
                'rate_18k' => $r->rate_18k,
                'rate_14k' => $r->rate_14k,
                'source' => $r->source,
            ]);
    }

    /** The most recent publish from a calendar day BEFORE the latest one. */
    public static function previousDay(): ?self
    {
        $latest = static::latest_rate();
        if (! $latest) {
            return null;
        }

        $latestDay = ($latest->rate_date ?? $latest->effective_at)->toDateString();

        return static::query()
            ->where(function ($q) use ($latestDay) {
                $q->where('rate_date', '<', $latestDay)
                    ->orWhere(fn ($q) => $q->whereNull('rate_date')->whereDate('effective_at', '<', $latestDay));
            })
            ->orderByDesc('effective_at')
            ->first();
    }
}
