<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CertificateController extends Controller
{
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate(['certificate_no' => 'required|string|max:40']);

        $cert = Certificate::with('product.images')
            ->where('certificate_no', strtoupper(trim($data['certificate_no'])))
            ->first();

        if (! $cert) {
            return response()->json(['found' => false]);
        }

        return response()->json([
            'found' => true,
            'certificate' => [
                'certificate_no' => $cert->certificate_no,
                'type' => $cert->type,
                'item_name' => $cert->item_name,
                'details' => $cert->details,
                'issued_on' => $cert->issued_on?->toDateString(),
                'product_slug' => $cert->product?->slug,
                'product_image' => $cert->product?->primaryImage(),
            ],
        ]);
    }
}
