<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GoldRate extends Model
{
    protected $guarded = [];

    protected $casts = [
        'rate_24k' => 'float',
        'rate_22k' => 'float',
        'rate_18k' => 'float',
        'rate_14k' => 'float',
        'effective_at' => 'datetime',
    ];

    public static function latest_rate(): ?self
    {
        return static::orderByDesc('effective_at')->first();
    }
}
