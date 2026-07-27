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
            'testimonials' => \App\Models\Review::with('product:id,name,slug')
                ->where('status', 'approved')->where('rating', '>=', 4)
                ->latest('approved_at')->limit(8)->get()
                ->map(fn ($r) => [
                    'id' => $r->id,
                    'name' => $r->name,
                    'rating' => $r->rating,
                    'title' => $r->title,
                    'body' => \Illuminate\Support\Str::limit($r->body, 220),
                    'product_name' => $r->product?->name,
                    'product_slug' => $r->product?->slug,
                ]),
            'gold_rate' => GoldRate::latest_rate(),
            'contact' => [
                'whatsapp' => config('clavira.whatsapp'),
                'phone' => config('clavira.phone'),
                'email' => config('clavira.email'),
                'instagram' => config('clavira.instagram'),
            ],
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
        if ($metal = $request->query('metal')) {
            $query->whereHas('variants', fn ($q) => $q->where('metal', $metal));
        }
        if ($purity = $request->query('purity')) {
            $query->whereHas('variants', fn ($q) => $q->where('purity', (int) $purity));
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

        $approved = \App\Models\Review::where('product_id', $product->id)->where('status', 'approved');

        return response()->json([
            'product' => $product,
            'related' => $related,
            // Lets the PDP price breakup value the gold at today's published
            // rate instead of a figure frozen at seed time.
            'gold_rate' => GoldRate::latest_rate(),
            'certificate' => $certificate?->only(['certificate_no', 'type']),
            'rating' => [
                'count' => (clone $approved)->count(),
                'average' => round((clone $approved)->avg('rating') ?? 0, 1),
            ],
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

    /**
     * Public rate history for the /gold-rate page. Always returns the full
     * 30-day window; the page slices it client-side for its 7/14/21/30 toggle
     * so switching ranges costs no round-trip.
     */
    public function goldRateHistory(): JsonResponse
    {
        $current = GoldRate::latest_rate();
        $previous = GoldRate::previousDay();

        $change = null;
        if ($current && $previous) {
            $change = [
                'rate_24k' => round($current->rate_24k - $previous->rate_24k, 2),
                'rate_22k' => round($current->rate_22k - $previous->rate_22k, 2),
                'rate_18k' => round($current->rate_18k - $previous->rate_18k, 2),
                'rate_14k' => round($current->rate_14k - $previous->rate_14k, 2),
                'since' => ($previous->rate_date ?? $previous->effective_at)->toDateString(),
            ];
        }

        return response()->json([
            'gold_rate' => $current,
            'change' => $change,
            'series' => GoldRate::series(30),
        ]);
    }

    private function card(Product $p): array
    {
        $primary = $p->primaryImage();

        return [
            'id' => $p->id,
            'name' => $p->name,
            'slug' => $p->slug,
            'price' => $p->base_price,
            'currency' => $p->currency,
            'image' => $primary,
            // A different shot for the card's hover crossfade (null when only one image)
            'image_alt' => $p->images->firstWhere('path', '!=', $primary)?->path,
            'diamond_type' => $p->diamond_type,
            'diamond_quality' => $p->diamond_quality,
            'is_jadau' => $p->is_jadau,
            'igi_certified' => $p->igi_certified,
            'category_slug' => $p->category?->slug,
        ];
    }
}
