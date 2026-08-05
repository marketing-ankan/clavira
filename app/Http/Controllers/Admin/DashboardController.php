<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Enquiry;
use App\Models\GoldRate;
use App\Models\Order;
use App\Models\Product;
use App\Models\Refund;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        return response()->json([
            'orders_total' => Order::count(),
            'orders_paid' => Order::where('status', 'paid')->count(),
            'orders_pending' => Order::where('status', 'pending')->count(),
            // Net of refunds. Dropping a fully-refunded order out of the status
            // list is not enough — a PARTIAL refund leaves the order 'delivered'
            // with its full total, which would overstate revenue.
            'revenue_paid' => round(
                (float) Order::whereIn('status', ['paid', 'processing', 'shipped', 'delivered'])->sum('total')
                - (float) Refund::counted()->whereHas('order', fn ($q) => $q->whereIn('status', ['paid', 'processing', 'shipped', 'delivered']))->sum('amount'),
                2
            ),
            'refunded_total' => round((float) Refund::counted()->sum('amount'), 2),
            'products_total' => Product::count(),
            'products_active' => Product::where('active', true)->count(),
            'enquiries_new' => Enquiry::where('status', 'new')->count(),
            'gold_rate' => GoldRate::latest_rate(),
            'recent_orders' => Order::latest()->limit(8)->get(['id', 'order_no', 'email', 'status', 'total', 'created_at']),
            'recent_enquiries' => Enquiry::latest()->limit(6)->get(['id', 'name', 'email', 'message', 'status', 'created_at']),
        ]);
    }
}
