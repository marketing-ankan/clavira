<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    protected $guarded = [];

    protected $casts = [
        'amount' => 'float',
        'payload' => 'array',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    /** What is still returnable on this payment, after refunds already issued. */
    public function refundableAmount(): float
    {
        if ($this->status !== 'captured' && $this->status !== 'refunded') {
            return 0.0;
        }

        return max(0.0, round($this->amount - (float) $this->refunds()->counted()->sum('amount'), 2));
    }
}
