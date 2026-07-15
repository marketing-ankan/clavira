<?php

namespace App\Http\Controllers;

use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NewsletterController extends Controller
{
    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email|max:190',
            'source' => 'nullable|string|max:40',
        ]);

        NewsletterSubscriber::updateOrCreate(
            ['email' => strtolower($data['email'])],
            ['status' => 'subscribed', 'source' => $data['source'] ?? 'footer']
        );

        return response()->json(['ok' => true, 'message' => 'Welcome to the Clavira circle — thank you for subscribing.']);
    }
}
