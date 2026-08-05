<?php

namespace Tests\Unit;

use App\Support\Countries;
use Tests\TestCase;

class CountriesTest extends TestCase
{
    public function test_domestic_flag_and_tax_rate(): void
    {
        $this->assertTrue(Countries::isDomestic('IN'));
        $this->assertFalse(Countries::isDomestic('AE'));
        $this->assertSame(0.03, Countries::taxRate('IN'));
        $this->assertSame(0.0, Countries::taxRate('US'));
    }

    public function test_shipping_and_lookups_are_case_insensitive_and_safe(): void
    {
        $this->assertSame(0.0, Countries::shipping('IN'));
        $this->assertSame(4500.0, Countries::shipping('ae'));
        $this->assertSame('India', Countries::name('in'));
        $this->assertSame('XX', Countries::name('XX'));      // unknown: raw code, never a crash
        $this->assertSame(0.0, Countries::shipping('XX'));
        $this->assertFalse(Countries::supports('XX'));
        $this->assertTrue(Countries::supports('gb'));
    }

    public function test_select_shape_keeps_india_first(): void
    {
        $list = Countries::forSelect();
        $this->assertSame('IN', $list[0]['code']);
        $this->assertArrayHasKey('shipping', $list[0]);
        $this->assertArrayHasKey('domestic', $list[0]);
    }
}
