<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Single source of truth for who may hold admin rights.
 * Used by the `admin` Gate (login/authorization) and at invite time (creation).
 */
class AdminAccess
{
    public static function isOwner(string $email): bool
    {
        return in_array(strtolower(trim($email)), config('admin.owners', []), true);
    }

    public static function domainAllowed(string $email): bool
    {
        $domain = strtolower(Str::afterLast(trim($email), '@'));

        return in_array($domain, config('admin.allowed_domains', []), true);
    }

    /** May this email ever be an admin? Owners always; otherwise domain must be allowed. */
    public static function emailEligible(string $email): bool
    {
        return static::isOwner($email) || static::domainAllowed($email);
    }
}
