<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use App\Services\RazorpayGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderAdminController extends Controller
{
    private const STATUSES = ['pending', 'paid', 'failed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

    /** Once a parcel is with the courier it is a return, not a cancellation. */
    private const CANCELLABLE = ['pending', 'paid', 'processing'];

    public function __construct(private readonly RazorpayGateway $gateway) {}

    public function index(Request $request): JsonResponse
    {
        $query = Order::withCount('items');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(fn ($w) => $w->where('order_no', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%"));
        }

        return response()->json([
            'orders' => $query->orderByDesc('id')->paginate(20),
            'statuses' => self::STATUSES,
        ]);
    }

    public function show(Order $order): JsonResponse
    {
        return response()->json($this->payload($order));
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:'.implode(',', self::STATUSES)]);
        $order->update(['status' => $data['status']]);

        return response()->json(['order' => $order->fresh()]);
    }

    /** Same invoice the customer downloads, for support and bookkeeping. */
    public function invoice(Order $order, \App\Services\InvoiceService $invoices): \Symfony\Component\HttpFoundation\Response
    {
        abort_unless($invoices->invoiceable($order), 422, 'This order has no invoice yet.');

        return $invoices->download($order);
    }

    /**
     * Return money against a captured payment. Partial refunds are supported;
     * omitting `amount` refunds everything still outstanding.
     */
    public function refund(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'amount' => 'nullable|numeric|min:0.01',
            'reason' => 'nullable|string|max:190',
            'payment_id' => 'nullable|integer',
        ]);

        $payment = $this->refundablePayment($order, $data['payment_id'] ?? null);

        if (! $payment) {
            return response()->json(['message' => 'There is no captured payment on this order to refund.'], 422);
        }

        $outstanding = $payment->refundableAmount();

        if ($outstanding <= 0) {
            return response()->json(['message' => 'This payment has already been fully refunded.'], 422);
        }

        $amount = round((float) ($data['amount'] ?? $outstanding), 2);

        if ($amount > $outstanding) {
            return response()->json([
                'message' => 'The most that can still be refunded on this payment is '.number_format($outstanding, 2).'.',
            ], 422);
        }

        [$refund, $error] = $this->issueRefund($order, $payment, $amount, $data['reason'] ?? null, $request->user()?->id);

        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        return response()->json($this->payload($order->fresh()) + ['refund' => $refund]);
    }

    /**
     * Cancel an order that has not shipped. If it was paid for, the money goes
     * back in the same action — a cancelled order that silently keeps the
     * customer's payment is the worst possible outcome here.
     */
    public function cancel(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'reason' => 'nullable|string|max:190',
            'refund' => 'boolean',
        ]);

        if (! in_array($order->status, self::CANCELLABLE, true)) {
            return response()->json([
                'message' => "An order that is already {$order->status} cannot be cancelled.",
            ], 422);
        }

        $reason = $data['reason'] ?? 'Order cancelled';
        $payment = $this->refundablePayment($order);
        $outstanding = $payment?->refundableAmount() ?? 0.0;

        // `refund: false` is the deliberate escape hatch for money settled
        // outside the gateway (a bank transfer, a store credit).
        if ($payment && $outstanding > 0 && ($data['refund'] ?? true)) {
            [, $error] = $this->issueRefund($order, $payment, $outstanding, $reason, $request->user()?->id);

            if ($error) {
                return response()->json([
                    'message' => 'The order was NOT cancelled because the refund failed: '.$error,
                ], 422);
            }
        }

        $order->update([
            'status' => 'cancelled',
            'notes' => trim(($order->notes ? $order->notes."\n" : '').'Cancelled: '.$reason),
        ]);

        return response()->json($this->payload($order->fresh()));
    }

    /**
     * Creates the refund row and calls the gateway.
     *
     * The row is written first, inside a locked transaction, so that two admins
     * clicking Refund at the same moment cannot both pass the "is there enough
     * left?" check. The gateway call happens *after* the transaction commits —
     * holding a database lock open across a third-party HTTP request is how you
     * get a table-wide stall when Razorpay is slow.
     *
     * @return array{0: ?Refund, 1: ?string} [refund, error message]
     */
    private function issueRefund(Order $order, Payment $payment, float $amount, ?string $reason, ?int $userId): array
    {
        $refund = DB::transaction(function () use ($order, $payment, $amount, $reason, $userId) {
            $locked = Payment::whereKey($payment->getKey())->lockForUpdate()->first();

            // Re-check under the lock: the value read before the transaction
            // may already be stale.
            if (! $locked || $locked->refundableAmount() < $amount) {
                return null;
            }

            return Refund::create([
                'order_id' => $order->id,
                'payment_id' => $locked->id,
                'amount' => $amount,
                'currency' => $order->currency ?? 'INR',
                'status' => 'pending',
                'reason' => $reason,
                'initiated_by' => $userId,
            ]);
        });

        if (! $refund) {
            return [null, 'Another refund on this payment was processed first. Reload the order and try again.'];
        }

        try {
            $result = $this->gateway->refund($payment, $amount, 'clv_refund_'.$refund->id, $reason);

            $refund->update([
                'gateway_refund_id' => $result['gateway_refund_id'],
                'status' => $result['status'],
                'payload' => $result['payload'],
            ]);
        } catch (\Throwable $e) {
            // Mark it failed so the amount is released back into the refundable
            // balance and the admin can retry.
            $refund->update(['status' => 'failed', 'error' => $e->getMessage()]);

            Log::error('Refund failed', [
                'order_no' => $order->order_no,
                'refund_id' => $refund->id,
                'amount' => $amount,
                'error' => $e->getMessage(),
            ]);

            return [null, $e->getMessage()];
        }

        $this->syncRefundedState($order, $payment);

        return [$refund->fresh(), null];
    }

    /** Roll the refund up onto the payment and the order. */
    private function syncRefundedState(Order $order, Payment $payment): void
    {
        if ($payment->fresh()->refundableAmount() <= 0) {
            $payment->update(['status' => 'refunded']);
        }

        if ($order->refundedTotal() >= round($order->total, 2) && $order->status !== 'cancelled') {
            $order->update(['status' => 'refunded']);
        }
    }

    private function refundablePayment(Order $order, ?int $paymentId = null): ?Payment
    {
        $query = $order->payments()->whereIn('status', ['captured', 'refunded']);

        return $paymentId
            ? $query->whereKey($paymentId)->first()
            : $query->orderByDesc('id')->first();
    }

    private function payload(Order $order): array
    {
        $order->load(['items', 'payments', 'refunds.payment']);
        $payment = $this->refundablePayment($order);

        return [
            'order' => $order,
            'statuses' => self::STATUSES,
            'refunds' => $order->refunds,
            'refunded_total' => $order->refundedTotal(),
            'refundable' => $payment?->refundableAmount() ?? 0.0,
            'refundable_payment_id' => $payment?->id,
            'can_cancel' => in_array($order->status, self::CANCELLABLE, true),
        ];
    }
}
