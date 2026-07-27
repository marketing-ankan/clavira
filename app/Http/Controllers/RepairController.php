<?php

namespace App\Http\Controllers;

use App\Models\RepairRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RepairController extends Controller
{
    /** Public repair / restoration intake — optional photo of the piece. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190',
            'phone' => 'required|string|max:30',
            'message' => 'required|string|max:2000',
            'photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:6144',
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $file = $request->file('photo');
            $name = 'r'.now()->format('YmdHis').'-'.Str::random(6).'.'.$file->getClientOriginalExtension();
            $file->move(public_path('images/repairs'), $name);
            $photoPath = 'images/repairs/'.$name;
        }

        RepairRequest::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'message' => $data['message'],
            'photo_path' => $photoPath,
            'status' => 'new',
        ]);

        return response()->json([
            'ok' => true,
            'message' => 'Thank you — our atelier will review your piece and respond within 2 working days.',
        ], 201);
    }
}
