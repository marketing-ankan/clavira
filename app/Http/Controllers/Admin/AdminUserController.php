<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\AdminInviteMail;
use App\Models\AdminInvitation;
use App\Models\User;
use App\Support\AdminAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AdminUserController extends Controller
{
    /** List current admins + pending invites. */
    public function index(): JsonResponse
    {
        $admins = User::where('is_admin', true)->orderBy('id')->get()->map(function (User $u) {
            $pending = AdminInvitation::where('user_id', $u->id)->whereNull('accepted_at')
                ->where('expires_at', '>', now())->exists();

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'is_owner' => AdminAccess::isOwner($u->email),
                'status' => $pending ? 'pending' : 'active',
                'created_at' => $u->created_at,
            ];
        });

        return response()->json([
            'admins' => $admins->values(),
            'allowed_domains' => config('admin.allowed_domains'),
        ]);
    }

    /** An existing admin invites a new one (company-domain emails only). */
    public function invite(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:190',
        ]);
        $email = strtolower(trim($data['email']));

        if (! AdminAccess::domainAllowed($email) && ! AdminAccess::isOwner($email)) {
            $domains = implode(', ', config('admin.allowed_domains'));

            return response()->json(['message' => "Admin access is limited to {$domains} email addresses."], 422);
        }

        $existing = User::where('email', $email)->first();
        if ($existing && $existing->is_admin
            && ! AdminInvitation::where('user_id', $existing->id)->whereNull('accepted_at')->where('expires_at', '>', now())->exists()) {
            return response()->json(['message' => 'That email is already an active admin.'], 422);
        }

        $user = $existing ?: new User(['email' => $email]);
        $user->name = $data['name'];
        $user->is_admin = true;
        if (! $user->exists) {
            $user->password = Hash::make(Str::random(40)); // unusable until they set their own
        }
        $user->save();

        $link = $this->issueInvite($user, $request->user());

        return response()->json([
            'message' => 'Invitation sent.',
            'invite_url' => app()->environment('production') ? null : $link, // shown in non-prod for convenience
        ], 201);
    }

    public function resend(Request $request, User $user): JsonResponse
    {
        abort_unless($user->is_admin, 404);
        $link = $this->issueInvite($user, $request->user());

        return response()->json(['message' => 'Invitation re-sent.', 'invite_url' => app()->environment('production') ? null : $link]);
    }

    /** Revoke an admin. Owners and yourself are protected. */
    public function revoke(Request $request, User $user): JsonResponse
    {
        if (AdminAccess::isOwner($user->email)) {
            return response()->json(['message' => 'Owner accounts cannot be revoked.'], 422);
        }
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot revoke your own access.'], 422);
        }

        AdminInvitation::where('user_id', $user->id)->delete();
        $user->update(['is_admin' => false]);

        return response()->json(['ok' => true]);
    }

    // ---------- Public, token-gated set-password flow ----------

    public function showInvite(string $token): JsonResponse
    {
        $invite = $this->validInvite($token);
        if (! $invite) {
            return response()->json(['valid' => false], 404);
        }

        return response()->json(['valid' => true, 'email' => $invite->email, 'name' => $invite->user->name]);
    }

    public function acceptInvite(Request $request, string $token): JsonResponse
    {
        $data = $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $invite = $this->validInvite($token);
        if (! $invite) {
            return response()->json(['message' => 'This link is invalid or has expired. Ask an owner to re-send it.'], 422);
        }

        $invite->user->update([
            'password' => Hash::make($data['password']),
            'is_admin' => true,
        ]);
        $invite->update(['accepted_at' => now()]);

        return response()->json(['ok' => true, 'email' => $invite->email]);
    }

    // ---------- helpers ----------

    private function issueInvite(User $user, ?User $invitedBy): string
    {
        $url = AdminInvitation::issue($user, $invitedBy?->id);

        // Mail failures must never break invite creation — the link is always
        // available in the panel as a fallback. Log the failure for the admin.
        try {
            Mail::to($user->email)->send(new AdminInviteMail($user->name, $url, config('admin.invite_ttl_hours')));
        } catch (\Throwable $e) {
            Log::error('Admin invite email failed to send', ['email' => $user->email, 'error' => $e->getMessage()]);
        }

        return $url;
    }

    private function validInvite(string $token): ?AdminInvitation
    {
        return AdminInvitation::findValid($token);
    }
}
