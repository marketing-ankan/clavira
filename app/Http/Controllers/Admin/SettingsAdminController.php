<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\GoldRate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsAdminController extends Controller
{
    public function goldRates(): JsonResponse
    {
        return response()->json([
            'current' => GoldRate::latest_rate(),
            'history' => GoldRate::orderByDesc('effective_at')->limit(30)->get(),
        ]);
    }

    public function storeGoldRate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rate_24k' => 'required|numeric|min:1',
            'rate_22k' => 'required|numeric|min:1',
            'rate_18k' => 'required|numeric|min:1',
            'rate_14k' => 'required|numeric|min:1',
        ]);

        $rate = GoldRate::create($data + ['source' => 'manual', 'effective_at' => now()]);

        return response()->json(['rate' => $rate], 201);
    }

    public function certificates(Request $request): JsonResponse
    {
        $query = Certificate::with('product:id,name,slug');
        if ($q = trim((string) $request->query('q', ''))) {
            $query->where('certificate_no', 'like', "%{$q}%")->orWhere('item_name', 'like', "%{$q}%");
        }

        return response()->json(['certificates' => $query->orderByDesc('id')->paginate(20)]);
    }

    public function storeCertificate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'certificate_no' => 'required|string|max:40|unique:certificates,certificate_no',
            'type' => 'required|in:IGI,BIS',
            'product_id' => 'nullable|exists:products,id',
            'item_name' => 'required|string|max:190',
            'details' => 'nullable|array',
            'issued_on' => 'nullable|date',
        ]);
        $data['certificate_no'] = strtoupper($data['certificate_no']);
        $data['details'] = $data['details'] ?? [];

        return response()->json(['certificate' => Certificate::create($data)], 201);
    }

    public function destroyCertificate(Certificate $certificate): JsonResponse
    {
        $certificate->delete();

        return response()->json(['ok' => true]);
    }
}
