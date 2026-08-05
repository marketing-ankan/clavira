<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    /**
     * The storefront lazily refreshes gold and FX rates from live feeds on
     * ordinary page/API hits. Tests must never depend on (or leak requests to)
     * the real internet, so both feeds are faked here and anything unfaked is
     * a hard failure rather than a silent network call.
     */
    protected function setUp(): void
    {
        parent::setUp();

        Http::fake([
            'data-asg.goldprice.org/*' => Http::response([
                'items' => [['curr' => 'INR', 'xauPrice' => 385864.05]], // 12405.94/g
            ]),
            'open.er-api.com/*' => Http::response([
                'result' => 'success',
                'rates' => [
                    'AED' => 0.0383, 'USD' => 0.010432, 'GBP' => 0.007847,
                    'SGD' => 0.013484, 'AUD' => 0.014963, 'CAD' => 0.014715,
                ],
            ]),
        ]);

        Http::preventStrayRequests();
    }
}
