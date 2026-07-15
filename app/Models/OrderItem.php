<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $guarded = [];

    protected $casts = [
        'unit_price' => 'float',
        'total' => 'float',
        'options' => 'array',
    ];
}
