<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\AdminLoginAlertMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (! Auth::attempt($credentials)) {
            return response()->json(['message' => 'Invalid email or password.'], 422);
        }

        // Full authorization check — the DB flag alone is never enough; the
        // account must also satisfy the admin Gate (owner or allowlisted domain).
        if (Gate::denies('admin', $request->user())) {
            Auth::logout();

            return response()->json(['message' => 'This account does not have admin access.'], 403);
        }

        $request->session()->regenerate();

        $this->sendLoginAlert($request);

        return response()->json(['user' => $request->user()->only(['id', 'name', 'email'])]);
    }

    /** Notify all owners of a successful admin sign-in. Never blocks login. */
    private function sendLoginAlert(Request $request): void
    {
        if (! config('admin.login_alerts')) {
            return;
        }

        $owners = config('admin.owners', []);
        if (empty($owners)) {
            return;
        }

        try {
            Mail::to($owners)->send(new AdminLoginAlertMail(
                who: $request->user()->name,
                email: $request->user()->email,
                ip: $request->ip() ?? 'unknown',
                agent: substr((string) $request->userAgent(), 0, 180),
                when: now()->timezone(config('app.timezone', 'UTC'))->format('d M Y, H:i').' UTC',
            ));
        } catch (\Throwable $e) {
            Log::warning('Admin login alert failed to send', ['error' => $e->getMessage()]);
        }
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->only(['id', 'name', 'email'])]);
    }
}
