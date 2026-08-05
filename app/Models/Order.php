<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $guarded = [];

    protected $casts = [
        'subtotal' => 'float',
        'shipping' => 'float',
        'tax' => 'float',
        'total' => 'float',
        'shipping_address' => 'array',
        'billing_address' => 'array',
        'confirmation_email_sent_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    /** Money actually returned (or in flight) against this order. */
    public function refundedTotal(): float
    {
        return round((float) $this->refunds()->counted()->sum('amount'), 2);
    }

    public static function nextOrderNo(): string
    {
        $seq = (int) (static::max('id') ?? 0) + 1;

        return sprintf('CLV-%s-%06d', date('Y'), $seq);
    }
}
