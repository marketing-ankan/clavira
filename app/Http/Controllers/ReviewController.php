<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /** Approved reviews for a product, with the rating summary. */
    public function index(string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)->firstOrFail();

        $approved = Review::where('product_id', $product->id)->where('status', 'approved')->latest();

        $all = (clone $approved)->get(['id', 'name', 'rating', 'title', 'body', 'verified', 'created_at']);

        return response()->json([
            'reviews' => $all,
            'summary' => [
                'count' => $all->count(),
                'average' => $all->count() ? round($all->avg('rating'), 1) : null,
                'breakdown' => collect(range(5, 1))->mapWithKeys(fn ($s) => [$s => $all->where('rating', $s)->count()]),
            ],
        ]);
    }

    /** Submit a review — held for moderation before it appears. */
    public function store(Request $request, string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)->firstOrFail();

        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190',
            'rating' => 'required|integer|min:1|max:5',
            'title' => 'nullable|string|max:150',
            'body' => 'required|string|max:2000',
        ]);

        Review::create($data + [
            'product_id' => $product->id,
            'user_id' => $request->user()?->id,
            'status' => 'pending',
            'verified' => $this->hasPurchased($data['email'], $product->id),
        ]);

        return response()->json(['ok' => true, 'message' => 'Thank you — your review will appear once approved by our team.'], 201);
    }

    /** True when this email has a real (paid onward) order containing the product. */
    private function hasPurchased(string $email, int $productId): bool
    {
        return Order::where('email', $email)
            ->whereIn('status', ['paid', 'processing', 'shipped', 'delivered'])
            ->whereHas('items', fn ($q) => $q->where('product_id', $productId))
            ->exists();
    }
}
