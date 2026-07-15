<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Payment gateway abstraction. Razorpay when configured; a clearly-flagged
 * demo stub otherwise, so checkout is testable before live keys exist.
 * Card data never touches this server — Razorpay Checkout collects it
 * client-side; we only create gateway orders and verify signatures.
 */
class RazorpayGateway
{
    public function enabled(): bool
    {
        return (bool) config('services.razorpay.enabled')
            && config('services.razorpay.key_id')
            && config('services.razorpay.key_secret');
    }

    public function keyId(): ?string
    {
        return config('services.razorpay.key_id');
    }

    /** Create a gateway order; returns payment row with gateway_order_id. */
    public function createOrder(Order $order): Payment
    {
        if (! $this->enabled()) {
            return Payment::create([
                'order_id' => $order->id,
                'gateway' => 'stub',
                'gateway_order_id' => 'stub_'.Str::random(14),
                'amount' => $order->total,
                'currency' => $order->currency,
                'status' => 'created',
            ]);
        }

        $response = Http::withBasicAuth(config('services.razorpay.key_id'), config('services.razorpay.key_secret'))
            ->post('https://api.razorpay.com/v1/orders', [
                'amount' => (int) round($order->total * 100), // paise
                'currency' => $order->currency,
                'receipt' => $order->order_no,
                'notes' => ['order_no' => $order->order_no],
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Payment gateway error: '.$response->body());
        }

        return Payment::create([
            'order_id' => $order->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => $response->json('id'),
            'amount' => $order->total,
            'currency' => $order->currency,
            'status' => 'created',
            'payload' => $response->json(),
        ]);
    }

    /** Verify the checkout callback signature (HMAC-SHA256, timing-safe). */
    public function verifySignature(string $gatewayOrderId, string $paymentId, string $signature): bool
    {
        if (! $this->enabled()) {
            return str_starts_with($gatewayOrderId, 'stub_'); // demo mode
        }

        $expected = hash_hmac('sha256', $gatewayOrderId.'|'.$paymentId, config('services.razorpay.key_secret'));

        return hash_equals($expected, $signature);
    }

    /** Verify a webhook payload signature. */
    public function verifyWebhook(string $body, string $signature): bool
    {
        $secret = config('services.razorpay.webhook_secret');
        if (! $secret) {
            return false;
        }

        return hash_equals(hash_hmac('sha256', $body, $secret), $signature);
    }
}
