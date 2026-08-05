<?php

namespace Tests\Feature;

use App\Mail\OrderPlacedMail;
use App\Models\Order;
use App\Models\Payment;
use App\Services\OrderMailer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Concerns\BuildsShop;
use Tests\TestCase;

class CheckoutFlowTest extends TestCase
{
    use BuildsShop, RefreshDatabase;

    private function shippingForm(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Test Customer', 'email' => 'buyer@example.com',
            'phone_country_code' => '+91', 'phone' => '9820011223',
            'line1' => '14 Test Road', 'city' => 'Mumbai', 'state' => 'Maharashtra',
            'postal_code' => '400001', 'country' => 'IN',
        ], $overrides);
    }

    public function test_guests_can_fill_a_cart_but_not_place_an_order(): void
    {
        $product = $this->makeProduct();

        $this->postJson('/api/cart', ['product_id' => $product->id, 'qty' => 1])
            ->assertOk();

        $this->postJson('/api/checkout', $this->shippingForm())->assertUnauthorized();
        $this->postJson('/api/checkout/confirm', ['gateway_order_id' => 'stub_x'])->assertUnauthorized();

        $this->assertSame(0, Order::count());
    }

    public function test_domestic_order_charges_gst_and_free_shipping(): void
    {
        $product = $this->makeProduct(['base_price' => 100000.00]);
        $customer = $this->makeCustomer();

        $this->actingAs($customer);
        $this->postJson('/api/cart', ['product_id' => $product->id, 'qty' => 1])->assertOk();

        $response = $this->postJson('/api/checkout', $this->shippingForm())->assertOk();

        $order = Order::firstOrFail();
        $this->assertSame($customer->id, $order->user_id);
        $this->assertSame(100000.0, $order->subtotal);
        $this->assertSame(0.0, (float) $order->shipping);
        $this->assertSame(3000.0, $order->tax);            // 3% GST
        $this->assertSame(103000.0, $order->total);
        $response->assertJsonPath('amount', 10300000);      // paise
        $response->assertJsonPath('demo_mode', true);
    }

    public function test_export_order_is_zero_rated_and_pays_flat_shipping(): void
    {
        $product = $this->makeProduct(['base_price' => 195000.00]);
        $customer = $this->makeCustomer();

        $this->actingAs($customer);
        $this->postJson('/api/cart', ['product_id' => $product->id, 'qty' => 1])->assertOk();

        $this->postJson('/api/checkout', $this->shippingForm([
            'country' => 'AE', 'city' => 'Dubai', 'state' => 'Dubai', 'phone_country_code' => '+971',
        ]))->assertOk()->assertJsonPath('amount', 19950000); // (195000 + 4500) * 100, no GST

        $order = Order::firstOrFail();
        $this->assertSame(0.0, (float) $order->tax);
        $this->assertSame(4500.0, (float) $order->shipping);
        $this->assertSame('AE', $order->shipping_address['country']);
    }

    public function test_unsupported_country_is_rejected(): void
    {
        $product = $this->makeProduct();
        $customer = $this->makeCustomer();

        $this->actingAs($customer);
        $this->postJson('/api/cart', ['product_id' => $product->id, 'qty' => 1])->assertOk();

        $this->postJson('/api/checkout', $this->shippingForm(['country' => 'ZZ']))
            ->assertUnprocessable();
    }

    public function test_confirm_marks_paid_and_emails_exactly_once_even_with_webhook_replay(): void
    {
        Mail::fake();

        $product = $this->makeProduct();
        $customer = $this->makeCustomer();

        $this->actingAs($customer);
        $this->postJson('/api/cart', ['product_id' => $product->id, 'qty' => 1])->assertOk();
        $place = $this->postJson('/api/checkout', $this->shippingForm())->assertOk();

        $gatewayOrderId = $place->json('gateway_order_id');

        $this->postJson('/api/checkout/confirm', ['gateway_order_id' => $gatewayOrderId])
            ->assertOk()
            ->assertJsonPath('status', 'paid');

        $order = Order::firstOrFail();
        $this->assertSame('paid', $order->status);
        $this->assertNotNull($order->confirmation_email_sent_at);
        $this->assertSame('captured', Payment::firstOrFail()->status);

        // The webhook path reaching the same order later must not re-send.
        app(OrderMailer::class)->sendConfirmation($order->fresh());

        Mail::assertSent(OrderPlacedMail::class, 1);
        // The confirmation goes to the address on the ORDER (the shipping
        // form), which may legitimately differ from the account email.
        Mail::assertSent(OrderPlacedMail::class, fn (OrderPlacedMail $mail) => $mail->hasTo('buyer@example.com'));
    }

    public function test_confirm_with_bad_stub_signature_fails_the_order(): void
    {
        $product = $this->makeProduct();
        $customer = $this->makeCustomer();

        $this->actingAs($customer);
        $this->postJson('/api/cart', ['product_id' => $product->id, 'qty' => 1])->assertOk();
        $this->postJson('/api/checkout', $this->shippingForm())->assertOk();

        // A gateway_order_id that exists but fails demo-mode verification is
        // impossible to fabricate via the API (stub ids always verify), so
        // exercise the branch through a forged payment row.
        $payment = Payment::firstOrFail();
        $payment->update(['gateway_order_id' => 'forged_'.$payment->id]);

        $this->postJson('/api/checkout/confirm', ['gateway_order_id' => $payment->fresh()->gateway_order_id])
            ->assertUnprocessable();

        $this->assertSame('failed', Order::firstOrFail()->status);
    }
}
