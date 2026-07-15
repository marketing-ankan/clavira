<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderAdminController extends Controller
{
    private const STATUSES = ['pending', 'paid', 'failed', 'processing', 'shipped', 'delivered', 'cancelled'];

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
        return response()->json([
            'order' => $order->load(['items', 'payments']),
            'statuses' => self::STATUSES,
        ]);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:'.implode(',', self::STATUSES)]);
        $order->update(['status' => $data['status']]);

        return response()->json(['order' => $order->fresh()]);
    }
}
