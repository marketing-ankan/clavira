<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AdminInvitation extends Model
{
    protected $guarded = [];

    protected $casts = [
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function isPending(): bool
    {
        return ! $this->accepted_at && $this->expires_at->isFuture();
    }

    /**
     * Issue a fresh set-password invite for a user, superseding any pending one.
     * Returns the full set-password URL (contains the single-use raw token).
     */
    public static function issue(User $user, ?int $invitedBy = null): string
    {
        static::where('user_id', $user->id)->whereNull('accepted_at')->delete();

        $raw = Str::random(48);
        static::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'token_hash' => hash('sha256', $raw),
            'invited_by' => $invitedBy,
            'expires_at' => now()->addHours(config('admin.invite_ttl_hours')),
        ]);

        return rtrim(config('app.url'), '/')."/admin/set-password/{$raw}";
    }

    public static function findValid(string $token): ?self
    {
        return static::with('user')
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->first();
    }
}
