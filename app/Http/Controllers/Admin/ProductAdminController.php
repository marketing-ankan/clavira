<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Collection;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('images', 'category')->withCount('variants');

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(fn ($w) => $w->where('name', 'like', "%{$q}%")->orWhere('sku', 'like', "%{$q}%"));
        }
        if ($cat = $request->query('category')) {
            $query->whereHas('category', fn ($w) => $w->where('slug', $cat));
        }

        return response()->json([
            'products' => $query->orderByDesc('id')->paginate(20),
            'categories' => Category::orderBy('sort_order')->get(['id', 'name', 'slug']),
        ]);
    }

    public function show(Product $product): JsonResponse
    {
        $product->load(['images', 'category', 'collections']);
        $product->setRelation('variants', $product->allVariants()->orderBy('id')->get());

        return response()->json([
            'product' => $product,
            'categories' => Category::orderBy('sort_order')->get(['id', 'name']),
            'collections' => Collection::orderBy('sort_order')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['slug'] = $this->uniqueSlug($data['name']);
        $data['sku'] = $data['sku'] ?? 'CLV-'.strtoupper(Str::random(6));

        $product = Product::create($data);
        $this->generateVariants($product);
        $product->collections()->sync($request->input('collection_ids', []));

        return response()->json(['product' => $product->load('images', 'variants')], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $this->validated($request, $product->id);
        $product->update($data);
        $product->collections()->sync($request->input('collection_ids', []));

        // Variant price-delta / active updates
        foreach ($request->input('variants', []) as $row) {
            if (! isset($row['id'])) {
                continue;
            }
            $product->allVariants()
                ->where('id', $row['id'])
                ->update([
                    'price_delta' => (float) ($row['price_delta'] ?? 0),
                    'active' => (bool) ($row['active'] ?? true),
                ]);
        }

        return response()->json(['product' => $product->fresh(['images', 'collections'])]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(['ok' => true]);
    }

    public function uploadImage(Request $request, Product $product): JsonResponse
    {
        $request->validate(['image' => 'required|image|mimes:jpg,jpeg,png,webp|max:4096']);

        $file = $request->file('image');
        $name = 'u'.now()->format('YmdHis').'-'.Str::random(6).'.'.$file->getClientOriginalExtension();
        $file->move(public_path('images/catalog/uploads'), $name);

        $image = $product->images()->create([
            'path' => 'images/catalog/uploads/'.$name,
            'alt' => $product->name,
            'is_primary' => ! $product->images()->exists(),
            'sort_order' => (int) $product->images()->max('sort_order') + 1,
        ]);

        return response()->json(['image' => $image], 201);
    }

    public function deleteImage(Product $product, ProductImage $image): JsonResponse
    {
        abort_unless($image->product_id === $product->id, 404);
        $image->delete();

        return response()->json(['ok' => true]);
    }

    public function setPrimaryImage(Product $product, ProductImage $image): JsonResponse
    {
        abort_unless($image->product_id === $product->id, 404);
        $product->images()->update(['is_primary' => false]);
        $image->update(['is_primary' => true, 'sort_order' => 0]);

        return response()->json(['ok' => true]);
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:190',
            'sku' => 'nullable|string|max:60|unique:products,sku'.($ignoreId ? ','.$ignoreId : ''),
            'description' => 'nullable|string|max:2000',
            'story' => 'nullable|string|max:4000',
            'base_price' => 'required|numeric|min:0',
            // Price-breakup inputs. These existed as columns since the batch-2
            // migration but were missing here, so the admin API silently dropped
            // every write — which is why they were null on 92 of 93 products.
            'metal_value' => 'nullable|numeric|min:0',
            'making_charge' => 'nullable|numeric|min:0',
            'stone_value' => 'nullable|numeric|min:0',
            'gross_weight_g' => 'nullable|numeric|min:0',
            'diamond_type' => 'required|in:lab_grown,natural,polki,none',
            'diamond_quality' => 'nullable|string|max:60',
            'default_metal' => 'required|in:yellow,white,rose',
            'default_purity' => 'required|in:14,18,22',
            'is_jadau' => 'boolean',
            'igi_certified' => 'boolean',
            'bis_hallmarked' => 'boolean',
            'featured' => 'boolean',
            'active' => 'boolean',
        ]);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $n = 1;
        while (Product::where('slug', $slug)->exists()) {
            $slug = $base.'-'.(++$n);
        }

        return $slug;
    }

    /** Same variant matrix as the seeder: metal × purity × diamond type. */
    private function generateVariants(Product $product): void
    {
        $purities = $product->is_jadau ? [18, 22] : [14, 18, 22];
        $purityDelta = [14 => -0.12, 18 => 0.0, 22 => 0.15];
        $diamondTypes = $product->diamond_type === 'lab_grown' ? ['lab_grown', 'natural'] : [$product->diamond_type];

        foreach (['yellow', 'white', 'rose'] as $metal) {
            if ($product->is_jadau && $metal !== 'yellow') {
                continue;
            }
            foreach ($purities as $purity) {
                foreach ($diamondTypes as $dt) {
                    $delta = round($product->base_price * $purityDelta[$purity], 2);
                    if ($dt === 'natural' && $product->diamond_type === 'lab_grown') {
                        $delta += round($product->base_price * 0.85, 2);
                    }
                    $product->variants()->create([
                        'metal' => $metal,
                        'purity' => $purity,
                        'diamond_type' => $dt,
                        'price_delta' => $delta,
                        'sku' => $product->sku.'-'.strtoupper(substr($metal, 0, 1)).$purity.($dt === 'natural' ? 'N' : 'L'),
                    ]);
                }
            }
        }
    }
}
