<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Collection as EditCollection;
use App\Models\Product;
use App\Support\Seo;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    /**
     * Static routes React owns. They have no database row, so no lastmod —
     * an omitted lastmod is correct here, a fabricated one is not.
     *
     * @var array<string, float> path => priority
     */
    private const STATIC_ROUTES = [
        '' => 1.0,
        'collections' => 0.8,
        'craftsmanship' => 0.6,
        'nri' => 0.6,
        'gold-rate' => 0.7,
        'verify' => 0.5,
        'contact' => 0.5,
        'consultation' => 0.5,
        'services/repair' => 0.5,
        'policies/shipping' => 0.3,
        'policies/returns' => 0.3,
        'policies/exchange' => 0.3,
        'policies/privacy' => 0.3,
        'policies/terms' => 0.3,
        'policies/contact-info' => 0.3,
    ];

    public function index(): Response
    {
        $base = Seo::base();
        $urls = [];

        foreach (self::STATIC_ROUTES as $path => $priority) {
            $urls[] = ['loc' => $base.($path === '' ? '/' : '/'.$path), 'priority' => $priority];
        }

        foreach (Category::where('active', true)->get(['slug', 'updated_at']) as $row) {
            $urls[] = [
                'loc' => $base.'/category/'.$row->slug,
                'lastmod' => $row->updated_at?->toAtomString(),
                'priority' => 0.8,
            ];
        }

        foreach (EditCollection::where('active', true)->get(['slug', 'updated_at']) as $row) {
            $urls[] = [
                'loc' => $base.'/collections/'.$row->slug,
                'lastmod' => $row->updated_at?->toAtomString(),
                'priority' => 0.7,
            ];
        }

        foreach (Product::where('active', true)->orderBy('id')->get(['slug', 'updated_at']) as $row) {
            $urls[] = [
                'loc' => $base.'/product/'.$row->slug,
                'lastmod' => $row->updated_at?->toAtomString(),
                'priority' => 0.9,
            ];
        }

        $xml = view('sitemap', ['urls' => $urls])->render();

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    /**
     * Served from a route rather than public/robots.txt so the Sitemap line
     * always points at the domain the app is actually running on — this site
     * has already moved from a temporary Hostinger host to clavira.in.
     */
    public function robots(): Response
    {
        $lines = [
            'User-agent: *',
            'Allow: /',
            '',
            '# Private and transactional areas — nothing here belongs in an index.',
            'Disallow: /admin',
            'Disallow: /account',
            'Disallow: /checkout',
            'Disallow: /order-success',
            'Disallow: /search',
            'Disallow: /api/',
            '',
            'Sitemap: '.Seo::base().'/sitemap.xml',
            '',
        ];

        return response(implode("\n", $lines), 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }
}
