<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\Order;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AccountController extends Controller
{
    public function orders(Request $request): JsonResponse
    {
        $orders = Order::where('user_id', $request->user()->id)
            ->withCount('items')
            ->latest()
            ->paginate(10);

        return response()->json(['orders' => $orders]);
    }

    public function order(Request $request, string $orderNo): JsonResponse
    {
        $order = Order::where('user_id', $request->user()->id)
            ->where('order_no', $orderNo)
            ->with(['items', 'payments'])
            ->firstOrFail();

        // Customers must be able to see money coming back without emailing us.
        $refunds = $order->refunds()->counted()
            ->orderByDesc('id')
            ->get(['id', 'amount', 'status', 'reason', 'created_at']);

        return response()->json([
            'order' => $order,
            'refunds' => $refunds,
            'refunded_total' => $order->refundedTotal(),
            'invoice_available' => app(\App\Services\InvoiceService::class)->invoiceable($order),
        ]);
    }

    /**
     * GST invoice download, strictly scoped to the signed-in owner of the
     * order. Reached as a plain <a href> so the session cookie authenticates;
     * paid-for statuses only — an unpaid order has no invoice to give.
     */
    public function invoice(Request $request, string $orderNo, InvoiceService $invoices): Response
    {
        $order = Order::where('user_id', $request->user()->id)
            ->where('order_no', $orderNo)
            ->firstOrFail();

        abort_unless($invoices->invoiceable($order), 422, 'This order has no invoice yet.');

        return $invoices->download($order);
    }

    public function addresses(Request $request): JsonResponse
    {
        return response()->json([
            'addresses' => Address::where('user_id', $request->user()->id)->latest()->get(),
        ]);
    }

    public function storeAddress(Request $request): JsonResponse
    {
        $data = $this->validateAddress($request);
        $data['user_id'] = $request->user()->id;

        if ($data['is_default'] ?? false) {
            Address::where('user_id', $request->user()->id)->update(['is_default' => false]);
        }

        return response()->json(['address' => Address::create($data)], 201);
    }

    public function updateAddress(Request $request, Address $address): JsonResponse
    {
        abort_unless($address->user_id === $request->user()->id, 404);
        $data = $this->validateAddress($request);

        if ($data['is_default'] ?? false) {
            Address::where('user_id', $request->user()->id)->where('id', '!=', $address->id)->update(['is_default' => false]);
        }

        $address->update($data);

        return response()->json(['address' => $address]);
    }

    public function destroyAddress(Request $request, Address $address): JsonResponse
    {
        abort_unless($address->user_id === $request->user()->id, 404);
        $address->delete();

        return response()->json(['ok' => true]);
    }

    private function validateAddress(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:120',
            'phone_country_code' => 'string|max:8',
            'phone' => 'required|string|max:20',
            'line1' => 'required|string|max:190',
            'line2' => 'nullable|string|max:190',
            'city' => 'required|string|max:120',
            'state' => 'required|string|max:120',
            'postal_code' => 'required|string|max:20',
            'country' => 'string|size:2',
            'type' => 'in:shipping,billing',
            'is_default' => 'boolean',
        ]);
    }
}
