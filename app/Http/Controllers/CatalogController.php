<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Certificate;
use App\Models\Collection;
use App\Models\GoldRate;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function home(): JsonResponse
    {
        return response()->json([
            'categories' => Category::where('active', true)->orderBy('sort_order')->get(),
            'collections' => Collection::where('active', true)->orderBy('sort_order')->get(),
            'featured' => Product::with('images')->where('featured', true)->where('active', true)->get()
                ->map(fn ($p) => $this->card($p)),
            'gold_rate' => GoldRate::latest_rate(),
        ]);
    }

    public function category(Request $request, string $slug): JsonResponse
    {
        $category = Category::where('slug', $slug)->firstOrFail();

        $query = Product::with('images')
            ->where('category_id', $category->id)
            ->where('active', true);

        if ($dt = $request->query('diamond_type')) {
            $query->where('diamond_type', $dt);
        }
        if ($request->query('jadau') === '1') {
            $query->where('is_jadau', true);
        }
        if ($min = $request->query('min_price')) {
            $query->where('base_price', '>=', (float) $min);
        }
        if ($max = $request->query('max_price')) {
            $query->where('base_price', '<=', (float) $max);
        }

        $query = match ($request->query('sort', 'featured')) {
            'price_asc' => $query->orderBy('base_price'),
            'price_desc' => $query->orderByDesc('base_price'),
            'newest' => $query->orderByDesc('id'),
            default => $query->orderByDesc('featured')->orderBy('id'),
        };

        return response()->json([
            'category' => $category,
            'products' => $query->paginate(24)->through(fn ($p) => $this->card($p)),
        ]);
    }

    public function product(string $slug): JsonResponse
    {
        $product = Product::with(['images', 'variants', 'category', 'collections'])
            ->where('slug', $slug)->where('active', true)->firstOrFail();

        $related = Product::with('images')
            ->where('category_id', $product->category_id)
            ->where('id', '!=', $product->id)
            ->where('active', true)
            ->inRandomOrder()->limit(4)->get()
            ->map(fn ($p) => $this->card($p));

        $certificate = Certificate::where('product_id', $product->id)->first();

        return response()->json([
            'product' => $product,
            'related' => $related,
            'certificate' => $certificate?->only(['certificate_no', 'type']),
        ]);
    }

    public function collections(): JsonResponse
    {
        return response()->json([
            'collections' => Collection::where('active', true)->orderBy('sort_order')->get(),
        ]);
    }

    public function collection(string $slug): JsonResponse
    {
        $collection = Collection::where('slug', $slug)->firstOrFail();

        return response()->json([
            'collection' => $collection,
            'products' => $collection->products()->with('images')->where('active', true)->get()
                ->map(fn ($p) => $this->card($p)),
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['products' => []]);
        }

        $products = Product::with('images')
            ->where('active', true)
            ->where(fn ($w) => $w->where('name', 'like', "%{$q}%")->orWhere('description', 'like', "%{$q}%"))
            ->limit(12)->get()
            ->map(fn ($p) => $this->card($p));

        return response()->json(['products' => $products]);
    }

    public function goldRate(): JsonResponse
    {
        return response()->json(['gold_rate' => GoldRate::latest_rate()]);
    }

    private function card(Product $p): array
    {
        return [
            'id' => $p->id,
            'name' => $p->name,
            'slug' => $p->slug,
            'price' => $p->base_price,
            'currency' => $p->currency,
            'image' => $p->primaryImage(),
            'diamond_type' => $p->diamond_type,
            'diamond_quality' => $p->diamond_quality,
            'is_jadau' => $p->is_jadau,
            'igi_certified' => $p->igi_certified,
            'category_slug' => $p->category?->slug,
        ];
    }
}
