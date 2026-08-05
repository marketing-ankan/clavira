<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Order;
use App\Models\Payment;
use App\Services\OrderMailer;
use App\Services\RazorpayGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly RazorpayGateway $gateway,
        private readonly OrderMailer $mailer,
    ) {}

    /** Create the order + gateway order; frontend then opens Razorpay Checkout. */
    public function place(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190',
            'phone_country_code' => 'string|max:8',
            'phone' => 'required|string|max:20',
            'line1' => 'required|string|max:190',
            'line2' => 'nullable|string|max:190',
            'city' => 'required|string|max:120',
            'state' => 'required|string|max:120',
            'postal_code' => 'required|string|max:20',
            'country' => ['string', 'size:2', \Illuminate\Validation\Rule::in(\App\Support\Countries::codes())],
            'notes' => 'nullable|string|max:1000',
        ]);

        // Logged-in carts were claimed on sign-in; guests can no longer reach
        // this endpoint, but the session token still identifies the cart.
        $token = $request->session()->get('cart_token');
        $cart = $token ? Cart::with('items.product')->where('session_token', $token)->first() : null;

        if (! $cart || $cart->items->isEmpty()) {
            return response()->json(['message' => 'Your cart is empty.'], 422);
        }

        $country = strtoupper($data['country'] ?? \App\Support\Countries::default());

        // GST only applies to domestic orders; exports are zero-rated and pay
        // the market's flat insured-shipping charge instead.
        $subtotal = round($cart->items->sum(fn ($i) => $i->unit_price * $i->qty), 2);
        $shipping = \App\Support\Countries::shipping($country);
        $tax = round($subtotal * \App\Support\Countries::taxRate($country), 2);
        $total = round($subtotal + $shipping + $tax, 2);

        $address = [
            'name' => $data['name'],
            'phone' => ($data['phone_country_code'] ?? '+91').' '.$data['phone'],
            'line1' => $data['line1'],
            'line2' => $data['line2'] ?? null,
            'city' => $data['city'],
            'state' => $data['state'],
            'postal_code' => $data['postal_code'],
            'country' => $country,
        ];

        $order = DB::transaction(function () use ($cart, $data, $address, $subtotal, $shipping, $tax, $total) {
            $order = Order::create([
                'order_no' => Order::nextOrderNo(),
                'user_id' => auth()->id(),
                'email' => $data['email'],
                'phone_country_code' => $data['phone_country_code'] ?? '+91',
                'phone' => $data['phone'],
                'status' => 'pending',
                'currency' => 'INR',
                'subtotal' => $subtotal,
                'shipping' => $shipping,
                'tax' => $tax,
                'total' => $total,
                'shipping_address' => $address,
                'notes' => $data['notes'] ?? null,
                'payment_method' => $this->gateway->enabled() ? 'razorpay' : 'stub',
            ]);

            foreach ($cart->items as $item) {
                $order->items()->create([
                    'product_id' => $item->product_id,
                    'name' => $item->product->name,
                    'image' => $item->product->primaryImage(),
                    'options' => $item->options,
                    'qty' => $item->qty,
                    'unit_price' => $item->unit_price,
                    'total' => round($item->unit_price * $item->qty, 2),
                ]);
            }

            return $order;
        });

        $payment = $this->gateway->createOrder($order);

        return response()->json([
            'order_no' => $order->order_no,
            'amount' => (int) round($order->total * 100),
            'currency' => $order->currency,
            'gateway' => $payment->gateway,
            'gateway_order_id' => $payment->gateway_order_id,
            'razorpay_key' => $this->gateway->enabled() ? $this->gateway->keyId() : null,
            'demo_mode' => ! $this->gateway->enabled(),
        ]);
    }

    /** Razorpay Checkout success callback: verify signature server-side. */
    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'gateway_order_id' => 'required|string',
            'payment_id' => 'nullable|string',
            'signature' => 'nullable|string',
        ]);

        $payment = Payment::where('gateway_order_id', $data['gateway_order_id'])->firstOrFail();
        $order = $payment->order;

        $ok = $this->gateway->verifySignature(
            $data['gateway_order_id'],
            $data['payment_id'] ?? '',
            $data['signature'] ?? ''
        );

        if (! $ok) {
            $payment->update(['status' => 'failed']);
            $order->update(['status' => 'failed']);

            return response()->json(['message' => 'Payment verification failed.'], 422);
        }

        $payment->update([
            'status' => 'captured',
            'gateway_payment_id' => $data['payment_id'] ?? 'demo',
            'gateway_signature' => $data['signature'] ?? null,
        ]);
        $order->update(['status' => 'paid']);

        // Confirmation email. Idempotent — the webhook may also reach this order.
        $this->mailer->sendConfirmation($order);

        // Clear the cart
        if ($token = $request->session()->get('cart_token')) {
            Cart::where('session_token', $token)->first()?->items()->delete();
        }

        return response()->json([
            'order_no' => $order->order_no,
            'status' => 'paid',
            'total' => $order->total,
            'email' => $order->email,
        ]);
    }

    /** Razorpay server-to-server webhook (payment.captured / payment.failed). */
    public function webhook(Request $request): JsonResponse
    {
        $signature = $request->header('X-Razorpay-Signature', '');

        if (! $this->gateway->verifyWebhook($request->getContent(), $signature)) {
            return response()->json(['message' => 'Invalid signature'], 400);
        }

        $event = $request->json('event');
        $entity = $request->json('payload.payment.entity');

        if ($entity && in_array($event, ['payment.captured', 'payment.failed'], true)) {
            $payment = Payment::where('gateway_order_id', $entity['order_id'] ?? '')->first();
            if ($payment) {
                $captured = $event === 'payment.captured';
                $payment->update([
                    'status' => $captured ? 'captured' : 'failed',
                    'gateway_payment_id' => $entity['id'] ?? null,
                    'payload' => $entity,
                ]);
                $payment->order->update(['status' => $captured ? 'paid' : 'failed']);

                // Safety net: if the browser never came back (closed tab, lost
                // connection), this is the only path that will confirm the order.
                if ($captured) {
                    $this->mailer->sendConfirmation($payment->order->refresh());
                }
            }
        }

        return response()->json(['ok' => true]);
    }
}
