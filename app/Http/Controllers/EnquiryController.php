<?php

namespace App\Http\Controllers;

use App\Models\Enquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EnquiryController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190',
            'phone' => 'nullable|string|max:30',
            'country' => 'string|size:2',
            'product_id' => 'nullable|exists:products,id',
            'message' => 'required|string|max:2000',
        ]);

        Enquiry::create($data + ['country' => $data['country'] ?? 'IN']);

        return response()->json(['ok' => true, 'message' => 'Thank you — our jewellery consultant will reach out within 24 hours.']);
    }
}
