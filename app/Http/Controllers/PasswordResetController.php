<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ClaimsGuestData;
use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;

/**
 * Customer password recovery.
 *
 * Deliberately does not use Laravel's notification stack — every other
 * transactional email in this app is a branded Mailable, so this one is too.
 * The token itself is still issued and validated by the framework's password
 * broker, which gives us hashing, single use and expiry for free.
 */
class PasswordResetController extends Controller
{
    use ClaimsGuestData;

    /**
     * Always answers the same way whether or not the address is registered.
     * Confirming which emails have accounts would turn this endpoint into a
     * customer-list oracle.
     */
    public function sendLink(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email|max:190']);

        $generic = response()->json([
            'message' => 'If an account exists for that address, a reset link is on its way.',
        ]);

        $user = User::where('email', $data['email'])->first();

        // Admins recover through the invite flow, which is owner-gated on
        // purpose. Letting an admin reset via the public storefront form would
        // route around that gate.
        if (! $user || $user->is_admin) {
            return $generic;
        }

        $repository = Password::broker()->getRepository();

        // Broker-level throttle (config/auth.php passwords.users.throttle):
        // silently succeed rather than telling a prober they hit a limit.
        if ($repository->recentlyCreatedToken($user)) {
            return $generic;
        }

        $token = $repository->create($user);

        $url = rtrim(config('app.url'), '/').'/account/reset-password/'.$token
            .'?email='.urlencode($user->email);

        try {
            Mail::to($user->email)->send(new PasswordResetMail(
                name: $user->name,
                url: $url,
                ttlMinutes: (int) config('auth.passwords.users.expire', 60),
            ));
        } catch (\Throwable $e) {
            // Never leak an SMTP failure to the caller — it would also confirm
            // the address exists. The owner sees it in the log instead.
            Log::error('Password reset email failed to send', [
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
        }

        return $generic;
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => 'required|string',
            'email' => 'required|email|max:190',
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        // Refuse admins BEFORE the broker runs — Password::reset() saves the
        // new password inside its callback, so a check after the fact would
        // reject the request while leaving the password already changed.
        if (User::where('email', $data['email'])->value('is_admin')) {
            return response()->json(['message' => 'This account cannot be reset here.'], 403);
        }

        $resetUser = null;

        $status = Password::reset($data, function (User $user, string $password) use (&$resetUser) {
            $user->forceFill([
                'password' => Hash::make($password),
                // Invalidates every outstanding "remember me" cookie.
                'remember_token' => Str::random(60),
            ])->save();

            $resetUser = $user;
        });

        if ($status !== Password::PASSWORD_RESET || ! $resetUser) {
            return response()->json([
                'message' => 'This reset link is invalid or has expired. Please request a new one.',
            ], 422);
        }

        Auth::login($resetUser, remember: true);
        $request->session()->regenerate();
        $this->claimGuestData($request, $resetUser);

        $this->revokeOtherSessions($request, $resetUser);

        return response()->json([
            'user' => [
                'id' => $resetUser->id,
                'name' => $resetUser->name,
                'email' => $resetUser->email,
                'is_admin' => false,
            ],
        ]);
    }

    /**
     * A password reset should log out everyone else holding the old password.
     * Sessions live in the database here, so the stale rows can simply be
     * dropped; the current session is kept so the customer stays signed in.
     */
    private function revokeOtherSessions(Request $request, User $user): void
    {
        if (config('session.driver') !== 'database') {
            return;
        }

        try {
            DB::table(config('session.table', 'sessions'))
                ->where('user_id', $user->id)
                ->where('id', '!=', $request->session()->getId())
                ->delete();
        } catch (\Throwable $e) {
            Log::warning('Could not revoke other sessions after password reset', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
