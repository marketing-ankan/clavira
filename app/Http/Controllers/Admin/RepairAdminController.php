<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\RepairRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RepairAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = RepairRequest::query();
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json([
            'repairs' => $query->latest()->paginate(20),
            'new_count' => RepairRequest::where('status', 'new')->count(),
        ]);
    }

    public function updateStatus(Request $request, RepairRequest $repair): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:new,reviewing,quoted,done,cancelled']);
        $repair->update($data);

        return response()->json(['repair' => $repair->fresh()]);
    }
}
