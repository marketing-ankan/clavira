<?php

namespace App\Http\Controllers;

use App\Models\Consultation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsultationController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190',
            'phone' => 'required|string|max:30',
            'country' => 'string|size:2',
            'type' => 'in:virtual,atelier,bridal,bespoke',
            'preferred_date' => 'nullable|date|after_or_equal:today',
            'preferred_time' => 'nullable|string|max:40',
            'message' => 'nullable|string|max:1500',
        ]);

        Consultation::create($data + ['country' => $data['country'] ?? 'IN', 'status' => 'new']);

        return response()->json([
            'ok' => true,
            'message' => 'Thank you — our jewellery consultant will confirm your appointment within 24 hours.',
        ], 201);
    }
}
