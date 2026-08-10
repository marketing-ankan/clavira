<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the bulk photo ingest endpoints.
 *
 * Deliberately not the admin session guard: n8n is a daemon, not a browser, and
 * making it drive a login form + cookie jar + CSRF token to upload a JPEG buys
 * no security and a great deal of breakage. A single high-entropy shared secret,
 * compared in constant time, is the honest shape of this trust relationship.
 *
 * Unconfigured means CLOSED. There is no branch here that lets a request through
 * when INGEST_TOKEN is missing — a deploy that forgets the variable must fail
 * loudly rather than quietly publish a write endpoint to the internet.
 */
class VerifyIngestToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('ingest.token');

        if ($expected === '') {
            return response()->json([
                'error' => 'Photo ingest is not configured on this environment.',
            ], 503);
        }

        $given = (string) ($request->header('X-Ingest-Token') ?? '');

        // hash_equals is not constant time across differing lengths, so hash
        // both sides first — that also keeps a very long header cheap.
        if (! hash_equals(hash('sha256', $expected), hash('sha256', $given))) {
            return response()->json(['error' => 'Bad ingest token.'], 401);
        }

        return $next($request);
    }
}
