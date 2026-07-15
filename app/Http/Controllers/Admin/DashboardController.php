<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Enquiry;
use App\Models\GoldRate;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        return response()->json([
            'orders_total' => Order::count(),
            'orders_paid' => Order::where('status', 'paid')->count(),
            'orders_pending' => Order::where('status', 'pending')->count(),
            'revenue_paid' => (float) Order::whereIn('status', ['paid', 'processing', 'shipped', 'delivered'])->sum('total'),
            'products_total' => Product::count(),
            'products_active' => Product::where('active', true)->count(),
            'enquiries_new' => Enquiry::where('status', 'new')->count(),
            'gold_rate' => GoldRate::latest_rate(),
            'recent_orders' => Order::latest()->limit(8)->get(['id', 'order_no', 'email', 'status', 'total', 'created_at']),
            'recent_enquiries' => Enquiry::latest()->limit(6)->get(['id', 'name', 'email', 'message', 'status', 'created_at']),
        ]);
    }
}
