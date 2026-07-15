<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\WishlistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WishlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = $this->query($request)->with('product.images')->latest()->get()
            ->filter(fn ($i) => $i->product)
            ->map(fn ($i) => $this->card($i->product));

        return response()->json([
            'items' => $items->values(),
            'ids' => $items->pluck('id')->values(),
        ]);
    }

    /** Add or remove a product; returns the new membership state. */
    public function toggle(Request $request): JsonResponse
    {
        $data = $request->validate(['product_id' => 'required|exists:products,id']);
        $owner = $this->owner($request);

        $existing = WishlistItem::where($owner)->where('product_id', $data['product_id'])->first();

        if ($existing) {
            $existing->delete();
            $inList = false;
        } else {
            WishlistItem::create($owner + ['product_id' => $data['product_id']]);
            $inList = true;
        }

        return response()->json([
            'in_wishlist' => $inList,
            'count' => WishlistItem::where($owner)->count(),
        ]);
    }

    public function destroy(Request $request, int $productId): JsonResponse
    {
        WishlistItem::where($this->owner($request))->where('product_id', $productId)->delete();

        return response()->json(['ok' => true]);
    }

    /** @return array<string,mixed> owner constraint: user_id when logged in, else session token */
    private function owner(Request $request): array
    {
        if ($request->user()) {
            return ['user_id' => $request->user()->id];
        }
        $token = $request->session()->get('wishlist_token');
        if (! $token) {
            $token = Str::random(40);
            $request->session()->put('wishlist_token', $token);
        }

        return ['session_token' => $token];
    }

    private function query(Request $request)
    {
        return WishlistItem::where($this->owner($request));
    }

    private function card(Product $p): array
    {
        return [
            'id' => $p->id,
            'name' => $p->name,
            'slug' => $p->slug,
            'price' => $p->base_price,
            'image' => $p->primaryImage(),
            'diamond_type' => $p->diamond_type,
            'is_jadau' => $p->is_jadau,
            'igi_certified' => $p->igi_certified,
        ];
    }
}
