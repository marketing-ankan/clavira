<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Refund;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsShop;
use Tests\TestCase;

class RefundCancelTest extends TestCase
{
    use BuildsShop, RefreshDatabase;

    private function actingAsAdmin(): void
    {
        $this->actingAs($this->makeAdmin());
    }

    public function test_customers_cannot_touch_refund_endpoints(): void
    {
        $order = $this->makePaidOrder();

        $this->actingAs($this->makeCustomer());
        $this->postJson("/api/admin/orders/{$order->id}/refund", ['amount' => 1])->assertForbidden();
        $this->postJson("/api/admin/orders/{$order->id}/cancel")->assertForbidden();
    }

    public function test_partial_then_full_refund_flips_payment_and_order(): void
    {
        $this->actingAsAdmin();
        $order = $this->makePaidOrder();

        $this->postJson("/api/admin/orders/{$order->id}/refund", ['amount' => 30000, 'reason' => 'Earrings returned'])
            ->assertOk()
            ->assertJsonPath('refunded_total', 30000)
            ->assertJsonPath('order.status', 'paid');

        // Over-refund of the remainder is refused.
        $this->postJson("/api/admin/orders/{$order->id}/refund", ['amount' => 90000])
            ->assertUnprocessable();

        // Refund the true remainder.
        $this->postJson("/api/admin/orders/{$order->id}/refund", ['amount' => 73000])
            ->assertOk()
            ->assertJsonPath('order.status', 'refunded')
            ->assertJsonPath('refundable', 0);

        $this->assertSame('refunded', Payment::firstOrFail()->status);
        $this->assertSame(2, Refund::count());

        // Nothing further to refund.
        $this->postJson("/api/admin/orders/{$order->id}/refund", ['amount' => 1])
            ->assertUnprocessable();
    }

    public function test_cancelling_a_paid_order_refunds_in_full(): void
    {
        $this->actingAsAdmin();
        $order = $this->makePaidOrder();

        $this->postJson("/api/admin/orders/{$order->id}/cancel", ['reason' => 'Out of stock'])
            ->assertOk()
            ->assertJsonPath('order.status', 'cancelled');

        $this->assertSame(103000.0, $order->fresh()->refundedTotal());
        $this->assertSame('refunded', Payment::firstOrFail()->status);
    }

    public function test_shipped_orders_cannot_be_cancelled(): void
    {
        $this->actingAsAdmin();
        $order = $this->makePaidOrder(overrides: ['status' => 'shipped']);

        $this->postJson("/api/admin/orders/{$order->id}/cancel")->assertUnprocessable();
        $this->assertSame('shipped', $order->fresh()->status);
    }

    public function test_a_failed_refund_releases_the_balance_for_retry(): void
    {
        $this->actingAsAdmin();
        $order = $this->makePaidOrder();

        Refund::create([
            'order_id' => $order->id,
            'payment_id' => Payment::firstOrFail()->id,
            'amount' => 103000, 'currency' => 'INR',
            'status' => 'failed', 'error' => 'simulated outage',
        ]);

        $this->assertSame(0.0, $order->fresh()->refundedTotal());

        $this->postJson("/api/admin/orders/{$order->id}/refund", ['amount' => 103000])
            ->assertOk()
            ->assertJsonPath('order.status', 'refunded');
    }
}
