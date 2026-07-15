<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        return response()->json(['order' => $order]);
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
