<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $guarded = [];

    protected $casts = [
        'base_price' => 'float',
        'is_jadau' => 'bool',
        'igi_certified' => 'bool',
        'bis_hallmarked' => 'bool',
        'featured' => 'bool',
        'active' => 'bool',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(Collection::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->where('active', true);
    }

    public function primaryImage(): ?string
    {
        $img = $this->images->firstWhere('is_primary', true) ?? $this->images->first();

        return $img?->path;
    }
}
