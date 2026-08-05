<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FxRate extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $primaryKey = 'code';

    protected $keyType = 'string';

    protected $guarded = [];

    protected $casts = [
        'per_inr' => 'float',
        'fetched_at' => 'datetime',
    ];

    /**
     * The map the storefront consumes: ['AED' => 0.0383, ...].
     * Stale rates are still published — an indicative conversion from
     * yesterday beats no conversion at all.
     */
    public static function published(): array
    {
        return static::query()->pluck('per_inr', 'code')->map(fn ($r) => (float) $r)->all();
    }
}
