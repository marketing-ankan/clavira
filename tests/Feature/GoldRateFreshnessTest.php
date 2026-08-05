<?php

namespace Tests\Feature;

use App\Models\GoldRate;
use App\Services\GoldRateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoldRateFreshnessTest extends TestCase
{
    use RefreshDatabase;

    private function seedRate(array $overrides = []): GoldRate
    {
        return GoldRate::create(array_merge(
            GoldRate::fromPure(12400.00),
            ['source' => 'test', 'rate_date' => today()->toDateString(), 'effective_at' => now()],
            $overrides,
        ));
    }

    public function test_a_stale_rate_self_heals_to_todays_on_read(): void
    {
        $this->seedRate([
            'rate_date' => today()->subDay()->toDateString(),
            'effective_at' => now()->subDay(),
        ]);

        $response = $this->getJson('/api/gold-rate')->assertOk()
            ->assertJsonPath('gold_rate.source', 'goldprice');

        // faked feed: 385864.05 / 31.1034768 per gram
        $this->assertEqualsWithDelta(12405.82, $response->json('gold_rate.rate_24k'), 0.01);

        $this->assertTrue(GoldRate::latest_rate()->rate_date->isToday());
    }

    public function test_a_fresh_rate_is_left_alone_and_no_fetch_happens(): void
    {
        $this->seedRate(GoldRate::fromPure(12000.00));

        $response = $this->getJson('/api/gold-rate')->assertOk();
        $this->assertEqualsWithDelta(12000.0, $response->json('gold_rate.rate_24k'), 0.001);

        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'goldprice'));
    }

    public function test_the_cooldown_stops_a_failing_feed_from_being_hammered(): void
    {
        // The base TestCase already stubs goldprice with a SUCCESS response and
        // earlier-registered stubs win, so a same-URL 403 override would never
        // fire. Point the service at a host only this test knows about.
        config(['clavira.gold_rate.source_url' => 'https://feed-down.example.test/rates']);
        Http::fake(['feed-down.example.test/*' => Http::response('Forbidden', 403)]);

        $this->seedRate([
            'rate_date' => today()->subDay()->toDateString(),
            'effective_at' => now()->subDay(),
        ]);

        $service = app(GoldRateService::class);
        $service->ensureFresh();
        $service->ensureFresh();
        $service->ensureFresh();

        // retry(2) inside ONE attempt is fine; a second attempt is not.
        $sent = collect(Http::recorded())->filter(fn ($pair) => str_contains($pair[0]->url(), 'feed-down'))->count();
        $this->assertLessThanOrEqual(2, $sent);
        $this->assertGreaterThanOrEqual(1, $sent);

        // The stale rate survives — never wiped by a failed fetch.
        $this->assertSame(12400.0, GoldRate::latest_rate()->rate_24k);
    }

    public function test_the_sanity_guard_refuses_wild_moves_without_force(): void
    {
        $this->seedRate(GoldRate::fromPure(7500.00) + ['rate_date' => today()->subDay()->toDateString(), 'effective_at' => now()->subDay()]);

        $service = app(GoldRateService::class);

        $this->assertNull($service->publish(12405.94));            // +65% → refused
        $this->assertSame(7500.0, GoldRate::latest_rate()->rate_24k);

        $this->assertNotNull($service->publish(12405.94, force: true));
        $this->assertSame(12405.94, GoldRate::latest_rate()->rate_24k);
    }
}
