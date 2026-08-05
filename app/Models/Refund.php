<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Refund extends Model
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

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * A failed refund returned no money, so it must not count against the
     * refundable balance. Pending ones DO count — the request is with the
     * gateway and double-submitting would refund twice.
     */
    public function scopeCounted($query)
    {
        return $query->where('status', '!=', 'failed');
    }
}
