<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Enquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EnquiryAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Enquiry::with('product:id,name,slug');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json(['enquiries' => $query->orderByDesc('id')->paginate(20)]);
    }

    public function updateStatus(Request $request, Enquiry $enquiry): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:new,contacted,closed']);
        $enquiry->update($data);

        return response()->json(['enquiry' => $enquiry->fresh()]);
    }
}
