<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Server-to-server webhook is authenticated by HMAC signature, not CSRF
        $middleware->validateCsrfTokens(except: ['api/webhooks/razorpay']);

        // Guests hitting an auth-only URL from a real browser (e.g. an invoice
        // download link in a signed-out tab) go to the sign-in page. Without
        // this Laravel looks for a named 'login' route that doesn't exist and
        // 500s. JSON/axios requests still receive a plain 401.
        $middleware->redirectGuestsTo(fn () => '/account/login');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
