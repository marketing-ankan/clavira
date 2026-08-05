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

    /**
     * Return money against a captured payment. Partial refunds are allowed, so
     * the amount is always sent explicitly rather than relying on Razorpay's
     * "omit for full refund" default.
     *
     * $idempotencyKey is our own refund row id. If the connection drops after
     * Razorpay accepted the request, retrying with the same key returns the
     * original refund instead of sending the money twice.
     *
     * @return array{gateway_refund_id: ?string, status: string, payload: ?array}
     */
    public function refund(Payment $payment, float $amount, string $idempotencyKey, ?string $reason = null): array
    {
        if (! $this->enabled()) {
            return [
                'gateway_refund_id' => 'stub_rfnd_'.Str::random(12),
                'status' => 'processed',
                'payload' => ['demo' => true, 'amount' => $amount, 'reason' => $reason],
            ];
        }

        if (! $payment->gateway_payment_id) {
            throw new RuntimeException('This payment has no gateway payment id, so it cannot be refunded.');
        }

        $response = Http::withBasicAuth(config('services.razorpay.key_id'), config('services.razorpay.key_secret'))
            ->withHeaders(['X-Razorpay-Idempotency-Key' => $idempotencyKey])
            ->post("https://api.razorpay.com/v1/payments/{$payment->gateway_payment_id}/refund", [
                'amount' => (int) round($amount * 100), // paise
                'speed' => 'normal',
                'notes' => array_filter([
                    'order_no' => $payment->order?->order_no,
                    'reason' => $reason,
                ]),
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Refund failed at the gateway: '.$response->body());
        }

        return [
            'gateway_refund_id' => $response->json('id'),
            // Razorpay returns 'pending' for refunds still being settled and
            // 'processed' once the money is on its way back.
            'status' => $response->json('status') === 'processed' ? 'processed' : 'pending',
            'payload' => $response->json(),
        ];
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
