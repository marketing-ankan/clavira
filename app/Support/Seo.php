<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Collection as EditCollection;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Support\Str;

/**
 * Server-rendered SEO for a client-rendered storefront.
 *
 * The whole site is one React SPA behind a single Blade shell, so without this
 * every URL served Google the same <title> and description, and no crawler ever
 * saw a price, a rating or a product image. This class resolves the requested
 * path back to its catalog row and produces the tags + JSON-LD the shell needs.
 *
 * It deliberately runs on the catch-all route rather than in dedicated
 * server-side routes, so the SPA's routing table stays the single source of
 * truth for what a URL means. Anything not recognised here still renders — it
 * just falls back to the site-wide defaults.
 */
class Seo
{
    private const POLICIES = [
        'shipping' => ['Shipping Policy', 'Every Clavira piece is dispatched fully insured, in tamper-evident luxury packaging.'],
        'returns' => ['Returns & Exchange', 'Clavira offers a considered returns and lifetime exchange framework.'],
        'exchange' => ['Gold & Diamond Exchange Promise', 'Jewellery that holds its worth — backed in writing.'],
        'privacy' => ['Privacy Policy', 'We collect only what we need to serve you, and we never sell your data.'],
        'terms' => ['Terms & Conditions', 'The terms on which we offer this website and our jewellery.'],
        'contact-info' => ['Care & Contact', 'We are here to help — from selection to sizing to certification.'],
    ];

    private const STATIC_PAGES = [
        'craftsmanship' => ['The Clavira Atelier', 'Hand-finished in India: lost-wax casting, stone setting and the Jadau Kundan tradition, piece by piece.'],
        'nri' => ['For Indians Abroad', 'Insured worldwide delivery to 50+ countries, BIS-hallmarked gold and IGI-certified diamonds, bought from anywhere.'],
        'verify' => ['Verify Your Certificate', 'Confirm the authenticity of any Clavira certificate — BIS hallmark and IGI diamond grading.'],
        'gold-rate' => ["Today's Gold Rate", 'Live 24kt, 22kt, 18kt and 14kt gold rates, and what your exchange is worth at 98% of gold value.'],
        'contact' => ['Contact Clavira', 'Speak to a Clavira jewellery advisor about sizing, certification, custom commissions or an existing order.'],
        'consultation' => ['Book a Consultation', 'A private appointment with a Clavira advisor — bridal, solitaire or a bespoke commission.'],
        'services/repair' => ['Jewellery Repair & Restoration', 'Resizing, re-polishing, rhodium plating, stone tightening and restoration by the atelier that made it.'],
        'collections' => ['The Edits', 'Curated Clavira collections — bridal, everyday solitaires, Jadau heritage and the seasonal edits.'],
    ];

    /** Paths that must never be indexed: private, transactional, or infinite. */
    private const NOINDEX_PREFIXES = ['admin', 'account', 'checkout', 'order-success', 'search'];

    /**
     * @return array{
     *   title: string, description: string, canonical: string, image: ?string,
     *   type: string, robots: string, jsonld: array<int, array>
     * }
     */
    public static function forPath(string $path): array
    {
        $path = trim($path, '/');
        $meta = static::defaults($path);

        if (static::isPrivate($path)) {
            $meta['robots'] = 'noindex, nofollow';

            return $meta;
        }

        $segments = $path === '' ? [] : explode('/', $path);

        $resolved = match (true) {
            $path === '' => static::home($meta),
            $segments[0] === 'product' && isset($segments[1]) => static::product($meta, $segments[1]),
            $segments[0] === 'category' && isset($segments[1]) => static::category($meta, $segments[1]),
            $segments[0] === 'collections' && isset($segments[1]) => static::edit($meta, $segments[1]),
            $segments[0] === 'policies' && isset($segments[1]) => static::policy($meta, $segments[1]),
            isset(static::STATIC_PAGES[$path]) => static::staticPage($meta, $path),
            default => null,
        };

        // Nothing matched, or the slug no longer resolves to an active row.
        // React renders its 404 for these, and a soft 404 that says "index me"
        // is worse than no page at all.
        if ($resolved === null) {
            $meta['robots'] = 'noindex, follow';

            return $meta;
        }

        return $resolved;
    }

    // ---------------------------------------------------------------- pages

    private static function home(array $meta): array
    {
        $meta['jsonld'][] = static::organization();
        $meta['jsonld'][] = [
            '@context' => 'https://schema.org',
            '@type' => 'WebSite',
            'name' => 'Clavira',
            'url' => static::base(),
            'potentialAction' => [
                '@type' => 'SearchAction',
                'target' => ['@type' => 'EntryPoint', 'urlTemplate' => static::base().'/search?q={search_term_string}'],
                'query-input' => 'required name=search_term_string',
            ],
        ];

        return $meta;
    }

    private static function product(array $meta, string $slug): ?array
    {
        $product = Product::with(['images', 'variants', 'category'])
            ->where('slug', $slug)
            ->where('active', true)
            ->first();

        if (! $product) {
            return null;
        }

        $image = static::absoluteImage($product->primaryImage());
        $material = trim(ucfirst((string) $product->default_metal).' Gold'
            .($product->default_purity ? ' '.$product->default_purity.'kt' : ''));

        $meta['title'] = $product->name.' — '.$material.' | Clavira';
        $meta['description'] = Str::limit(strip_tags((string) ($product->description ?: $product->story)), 155);
        $meta['image'] = $image;
        $meta['type'] = 'product';

        $offer = static::offer($product);

        $ld = array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'Product',
            'name' => $product->name,
            'sku' => $product->sku,
            'description' => $meta['description'],
            'image' => $image ? [$image] : null,
            'brand' => ['@type' => 'Brand', 'name' => 'Clavira'],
            'category' => $product->category?->name,
            'material' => $material,
            'offers' => $offer,
        ]);

        if ($props = static::additionalProperties($product)) {
            $ld['additionalProperty'] = $props;
        }

        // schema.org rejects an aggregateRating with zero reviews, and the
        // catalog API returns 0.0 rather than null for unreviewed products —
        // so gate on the count, never on the average.
        $approved = Review::where('product_id', $product->id)->where('status', 'approved');
        $count = (clone $approved)->count();

        if ($count > 0) {
            $ld['aggregateRating'] = [
                '@type' => 'AggregateRating',
                'ratingValue' => round((float) (clone $approved)->avg('rating'), 1),
                'reviewCount' => $count,
                'bestRating' => 5,
                'worstRating' => 1,
            ];
        }

        $meta['jsonld'][] = $ld;
        $meta['jsonld'][] = static::breadcrumbs(array_filter([
            ['Home', static::base()],
            $product->category ? [$product->category->name, static::base().'/category/'.$product->category->slug] : null,
            [$product->name, static::base().'/product/'.$product->slug],
        ]));

        return $meta;
    }

    private static function category(array $meta, string $slug): ?array
    {
        $category = Category::where('slug', $slug)->where('active', true)->first();

        if (! $category) {
            return null;
        }

        $meta['title'] = $category->name.' — Fine Jewellery | Clavira';
        $meta['description'] = Str::limit(strip_tags((string) ($category->tagline ?: $category->description))
            ?: 'Explore Clavira '.strtolower($category->name).' in BIS-hallmarked gold with IGI-certified diamonds.', 155);
        $meta['image'] = static::absoluteImage($category->hero_image);
        $meta['jsonld'][] = static::breadcrumbs([
            ['Home', static::base()],
            [$category->name, static::base().'/category/'.$category->slug],
        ]);

        return $meta;
    }

    private static function edit(array $meta, string $slug): ?array
    {
        $edit = EditCollection::where('slug', $slug)->where('active', true)->first();

        if (! $edit) {
            return null;
        }

        $meta['title'] = $edit->name.' — The Edits | Clavira';
        $meta['description'] = Str::limit(strip_tags((string) ($edit->subtitle ?: $edit->description))
            ?: 'A curated Clavira edit: '.$edit->name.'.', 155);
        $meta['image'] = static::absoluteImage($edit->hero_image);
        $meta['jsonld'][] = static::breadcrumbs([
            ['Home', static::base()],
            ['The Edits', static::base().'/collections'],
            [$edit->name, static::base().'/collections/'.$edit->slug],
        ]);

        return $meta;
    }

    private static function policy(array $meta, string $slug): ?array
    {
        if (! isset(static::POLICIES[$slug])) {
            return null;
        }

        [$title, $intro] = static::POLICIES[$slug];
        $meta['title'] = $title.' | Clavira';
        $meta['description'] = $intro;

        return $meta;
    }

    private static function staticPage(array $meta, string $path): array
    {
        [$title, $description] = static::STATIC_PAGES[$path];
        $meta['title'] = $title.' | Clavira';
        $meta['description'] = $description;

        if ($path === 'contact' || $path === 'consultation') {
            $meta['jsonld'][] = static::organization();
        }

        return $meta;
    }

    // --------------------------------------------------------------- pieces

    /**
     * Variant price deltas swing roughly 0.88x to 1.85x of base, so a single
     * price would be wrong on most configurations — publish the real range.
     *
     * Prices here are ex-GST, matching exactly what the product page displays.
     * Publishing the GST-inclusive figure would read as a price mismatch to
     * Google against the on-page number.
     */
    private static function offer(Product $product): array
    {
        $base = (float) $product->base_price;
        $deltas = $product->variants->pluck('price_delta')->map(fn ($d) => (float) $d);

        $common = [
            'priceCurrency' => $product->currency ?: 'INR',
            'availability' => 'https://schema.org/MadeToOrder',
            'itemCondition' => 'https://schema.org/NewCondition',
            'url' => static::base().'/product/'.$product->slug,
            'seller' => ['@type' => 'Organization', 'name' => 'Clavira'],
        ];

        if ($deltas->isEmpty()) {
            return ['@type' => 'Offer', 'price' => round($base, 2)] + $common;
        }

        return [
            '@type' => 'AggregateOffer',
            'lowPrice' => round($base + $deltas->min(), 2),
            'highPrice' => round($base + $deltas->max(), 2),
            'offerCount' => $deltas->count(),
        ] + $common;
    }

    private static function additionalProperties(Product $product): array
    {
        $pairs = array_filter([
            'Diamond type' => $product->diamond_type && $product->diamond_type !== 'none'
                ? str_replace('_', '-', $product->diamond_type)
                : null,
            'Diamond quality' => $product->diamond_quality,
            'Gross weight' => $product->gross_weight_g ? $product->gross_weight_g.' g' : null,
            'BIS hallmarked' => $product->bis_hallmarked ? 'Yes' : null,
            'IGI certified' => $product->igi_certified ? 'Yes' : null,
            'Jadau Kundan' => $product->is_jadau ? 'Yes' : null,
        ]);

        return array_values(array_map(
            fn ($name, $value) => ['@type' => 'PropertyValue', 'name' => $name, 'value' => $value],
            array_keys($pairs),
            $pairs,
        ));
    }

    private static function organization(): array
    {
        return array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'JewelryStore',
            'name' => 'Clavira',
            'url' => static::base(),
            'logo' => static::base().'/images/brand/clavira-wordmark.png',
            'description' => 'Clavira fine jewellery — lab-grown IGI-certified diamonds and Jadau Kundan heritage in BIS-hallmarked gold.',
            'email' => config('clavira.email'),
            'telephone' => config('clavira.phone'),
            'sameAs' => array_values(array_filter([config('clavira.instagram')])),
        ]);
    }

    /** @param array<int, array{0: string, 1: string}> $crumbs */
    private static function breadcrumbs(array $crumbs): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => array_values(array_map(fn ($crumb, $i) => [
                '@type' => 'ListItem',
                'position' => $i + 1,
                'name' => $crumb[0],
                'item' => $crumb[1],
            ], $crumbs, array_keys($crumbs))),
        ];
    }

    // -------------------------------------------------------------- helpers

    private static function defaults(string $path): array
    {
        return [
            'title' => 'Clavira — Fine Jewellery | BIS Hallmarked · IGI Certified',
            'description' => 'Clavira fine jewellery — lab-grown IGI-certified diamonds and Jadau Kundan heritage in BIS-hallmarked gold. Zero deductions on gold exchange, 98% gold value return.',
            'canonical' => static::base().($path === '' ? '/' : '/'.$path),
            'image' => static::base().'/images/brand/og-default.jpg',
            'type' => 'website',
            'robots' => 'index, follow',
            'jsonld' => [],
        ];
    }

    private static function isPrivate(string $path): bool
    {
        foreach (static::NOINDEX_PREFIXES as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix.'/')) {
                return true;
            }
        }

        return false;
    }

    /** Stored image paths have no leading slash; crawlers need absolute URLs. */
    private static function absoluteImage(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return str_starts_with($path, 'http') ? $path : static::base().'/'.ltrim($path, '/');
    }

    public static function base(): string
    {
        return rtrim(config('app.url'), '/');
    }
}
