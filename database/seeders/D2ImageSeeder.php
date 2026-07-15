<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

/**
 * Promotes curated, watermark-free "Design 2" photography to each product's
 * primary image. Existing brochure images are kept as gallery alternates.
 * Re-runnable: it clears any previously-assigned d2 primaries first.
 */
class D2ImageSeeder extends Seeder
{
    /** product category slug => d2_images.json bucket key */
    private const MAP = [
        'rings' => 'ring',
        'earrings' => 'earring',
        'bracelets' => 'bracelet',
        'bangles' => 'bangle',
        'necklaces' => 'necklace',
        'pendants' => 'pendant',
        'pendant-sets' => 'pendant-set',
    ];

    public function run(): void
    {
        $manifestPath = database_path('seeders/d2_images.json');
        if (! is_file($manifestPath)) {
            $this->command->warn('d2_images.json not found — skipping.');

            return;
        }
        $manifest = json_decode(file_get_contents($manifestPath), true);

        foreach (self::MAP as $slug => $bucket) {
            $images = $manifest[$bucket] ?? [];
            if (! $images) {
                continue;
            }

            $category = Category::where('slug', $slug)->first();
            if (! $category) {
                continue;
            }

            $products = Product::where('category_id', $category->id)->orderBy('id')->get();

            foreach ($products as $i => $product) {
                $path = $images[$i % count($images)];

                // Remove any prior d2 assignment so this stays idempotent
                $product->images()->where('path', 'like', 'images/catalog/d2-%')->delete();

                // Demote current primaries and push them back in the gallery order
                $product->images()->update(['is_primary' => false]);
                $product->images()->increment('sort_order');

                // Insert the curated shot as the new primary, first in order
                $product->images()->create([
                    'path' => $path,
                    'alt' => $product->name,
                    'is_primary' => true,
                    'sort_order' => 0,
                ]);
            }

            $this->command->info("{$slug}: promoted ".count($products).' primaries from '.count($images).' clean images.');
        }

        // Refresh category hero tiles with a strong clean shot from each bucket
        $heroPick = [
            'rings' => 'ring', 'earrings' => 'earring', 'bracelets' => 'bracelet',
            'bangles' => 'bangle', 'necklaces' => 'necklace', 'pendants' => 'pendant',
            'pendant-sets' => 'pendant-set',
        ];
        foreach ($heroPick as $slug => $bucket) {
            $imgs = $manifest[$bucket] ?? [];
            if ($imgs) {
                Category::where('slug', $slug)->update(['hero_image' => $imgs[intdiv(count($imgs), 2)]]);
            }
        }
    }
}
