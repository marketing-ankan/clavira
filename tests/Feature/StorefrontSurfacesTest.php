<?php

namespace Tests\Feature;

use App\Models\Certificate;
use App\Models\FxRate;
use App\Models\WishlistItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsShop;
use Tests\TestCase;

/** Sitemap/robots/SEO shell, health, FX, certificate verify, wishlist merge. */
class StorefrontSurfacesTest extends TestCase
{
    use BuildsShop, RefreshDatabase;

    public function test_sitemap_lists_active_catalog_and_robots_points_at_it(): void
    {
        $product = $this->makeProduct();
        $hidden = $this->makeProduct(['active' => false]);

        $sitemap = $this->get('/sitemap.xml')->assertOk();
        $this->assertStringContainsString("/product/{$product->slug}", $sitemap->getContent());
        $this->assertStringNotContainsString("/product/{$hidden->slug}", $sitemap->getContent());

        $robots = $this->get('/robots.txt')->assertOk();
        $this->assertStringContainsString('Sitemap:', $robots->getContent());
        $this->assertStringContainsString('Disallow: /admin', $robots->getContent());
    }

    public function test_product_pages_carry_jsonld_and_private_pages_are_noindex(): void
    {
        $product = $this->makeProduct(['name' => 'Aurora Ring']);

        $page = $this->get("/product/{$product->slug}")->assertOk();
        $this->assertStringContainsString('"@type":"Product"', $page->getContent());
        $this->assertStringContainsString('Aurora Ring', $page->getContent());
        $this->assertStringContainsString('MadeToOrder', $page->getContent());

        $this->assertStringContainsString('noindex', $this->get('/checkout')->getContent());
        $this->assertStringContainsString('noindex', $this->get('/product/does-not-exist')->getContent());
        $this->assertStringContainsString('index, follow', $this->get("/product/{$product->slug}")->getContent());
    }

    public function test_health_reports_ok_with_catalog_and_writable_storage(): void
    {
        $this->makeProduct();

        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('checks.database.status', 'ok');
    }

    public function test_health_fails_without_active_products(): void
    {
        $this->getJson('/api/health')->assertServiceUnavailable();
    }

    public function test_fx_rates_lazily_populate_from_the_feed(): void
    {
        $this->assertSame(0, FxRate::count());

        // Any SPA page render triggers FxService::ensureFresh().
        $this->get('/')->assertOk();

        $this->assertSame(6, FxRate::count());
        $this->assertEqualsWithDelta(0.010432, FxRate::find('USD')->per_inr, 0.000001);
    }

    public function test_certificate_verify_round_trip(): void
    {
        $product = $this->makeProduct();
        Certificate::create([
            'product_id' => $product->id,
            'certificate_no' => 'IGI600199999',
            'type' => 'IGI',
            'item_name' => 'Test Solitaire',
            'details' => ['carat' => '0.75', 'clarity' => 'VVS1'],
        ]);

        $this->postJson('/api/certificates/verify', ['certificate_no' => 'igi600199999'])
            ->assertOk()
            ->assertJsonPath('found', true)
            ->assertJsonPath('certificate.certificate_no', 'IGI600199999');

        $this->postJson('/api/certificates/verify', ['certificate_no' => 'IGI000000000'])
            ->assertOk()
            ->assertJsonPath('found', false);
    }

    public function test_guest_wishlist_merges_into_the_account_on_login(): void
    {
        $product = $this->makeProduct();
        $customer = $this->makeCustomer(['email' => 'merge@example.com']);

        $this->postJson('/api/wishlist/toggle', ['product_id' => $product->id])
            ->assertOk()
            ->assertJsonPath('in_wishlist', true);

        $this->assertNull(WishlistItem::firstOrFail()->user_id);

        $this->postJson('/api/auth/login', ['email' => 'merge@example.com', 'password' => 'CustomerPass123'])
            ->assertOk();

        $item = WishlistItem::firstOrFail();
        $this->assertSame($customer->id, $item->user_id);
        $this->assertNull($item->session_token);
    }
}
