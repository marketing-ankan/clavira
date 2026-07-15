<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CartController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return $this->payload($this->resolve($request));
    }

    public function add(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
            'qty' => 'integer|min:1|max:10',
            'options' => 'nullable|array',
        ]);

        $cart = $this->resolve($request);
        $product = Product::findOrFail($data['product_id']);

        $price = $product->base_price;
        if (! empty($data['variant_id'])) {
            $variant = ProductVariant::where('product_id', $product->id)->findOrFail($data['variant_id']);
            $price += $variant->price_delta;
        }

        $existing = $cart->items()
            ->where('product_id', $product->id)
            ->where('product_variant_id', $data['variant_id'] ?? null)
            ->first();

        if ($existing) {
            $existing->update(['qty' => min(10, $existing->qty + ($data['qty'] ?? 1))]);
        } else {
            $cart->items()->create([
                'product_id' => $product->id,
                'product_variant_id' => $data['variant_id'] ?? null,
                'qty' => $data['qty'] ?? 1,
                'unit_price' => $price,
                'options' => $data['options'] ?? null,
            ]);
        }

        return $this->payload($cart->fresh());
    }

    public function update(Request $request, int $itemId): JsonResponse
    {
        $data = $request->validate(['qty' => 'required|integer|min:0|max:10']);
        $cart = $this->resolve($request);
        $item = $cart->items()->findOrFail($itemId);

        $data['qty'] === 0 ? $item->delete() : $item->update(['qty' => $data['qty']]);

        return $this->payload($cart->fresh());
    }

    public function remove(Request $request, int $itemId): JsonResponse
    {
        $cart = $this->resolve($request);
        $cart->items()->findOrFail($itemId)->delete();

        return $this->payload($cart->fresh());
    }

    private function resolve(Request $request): Cart
    {
        $token = $request->session()->get('cart_token');
        $cart = $token ? Cart::where('session_token', $token)->first() : null;

        if (! $cart) {
            $cart = Cart::create(['session_token' => Str::random(40)]);
            $request->session()->put('cart_token', $cart->session_token);
        }

        return $cart;
    }

    private function payload(Cart $cart): JsonResponse
    {
        $cart->load('items.product.images');

        $items = $cart->items->map(fn ($i) => [
            'id' => $i->id,
            'product_id' => $i->product_id,
            'name' => $i->product->name,
            'slug' => $i->product->slug,
            'image' => $i->product->primaryImage(),
            'qty' => $i->qty,
            'unit_price' => $i->unit_price,
            'options' => $i->options,
            'line_total' => round($i->unit_price * $i->qty, 2),
        ]);

        $subtotal = round($items->sum('line_total'), 2);
        $tax = round($subtotal * 0.03, 2); // 3% GST on jewellery

        return response()->json([
            'items' => $items,
            'subtotal' => $subtotal,
            'tax' => $tax,
            'shipping' => 0,
            'total' => round($subtotal + $tax, 2),
            'currency' => $cart->currency,
        ]);
    }
}
