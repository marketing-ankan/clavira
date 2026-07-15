<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Review::with('product:id,name,slug');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json([
            'reviews' => $query->orderByRaw("FIELD(status,'pending','approved','rejected')")->latest()->paginate(20),
            'pending_count' => Review::where('status', 'pending')->count(),
        ]);
    }

    public function updateStatus(Request $request, Review $review): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:pending,approved,rejected']);

        $review->update([
            'status' => $data['status'],
            'approved_at' => $data['status'] === 'approved' ? now() : null,
        ]);

        return response()->json(['review' => $review->fresh()]);
    }

    public function destroy(Review $review): JsonResponse
    {
        $review->delete();

        return response()->json(['ok' => true]);
    }
}
