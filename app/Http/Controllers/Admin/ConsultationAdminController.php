<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsultationAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Consultation::query();
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json([
            'consultations' => $query->latest()->paginate(20),
            'new_count' => Consultation::where('status', 'new')->count(),
            'subscriber_count' => NewsletterSubscriber::where('status', 'subscribed')->count(),
        ]);
    }

    public function updateStatus(Request $request, Consultation $consultation): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:new,scheduled,done,cancelled']);
        $consultation->update($data);

        return response()->json(['consultation' => $consultation->fresh()]);
    }
}
