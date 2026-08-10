<?php

use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\ConsultationAdminController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EnquiryAdminController;
use App\Http\Controllers\Admin\OrderAdminController;
use App\Http\Controllers\Admin\ProductAdminController;
use App\Http\Controllers\Admin\RepairAdminController;
use App\Http\Controllers\Admin\ReviewAdminController;
use App\Http\Controllers\Admin\SettingsAdminController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\ConsultationController;
use App\Http\Controllers\CustomerAuthController;
use App\Http\Controllers\EnquiryController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\NewsletterController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\PhotoIngestController;
use App\Http\Controllers\RepairController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\WishlistController;
use Illuminate\Support\Facades\Route;

Route::prefix('api')->group(function () {
    Route::get('/home', [CatalogController::class, 'home']);
    Route::get('/categories/{slug}', [CatalogController::class, 'category']);
    Route::get('/products/{slug}', [CatalogController::class, 'product']);
    Route::get('/collections', [CatalogController::class, 'collections']);
    Route::get('/collections/{slug}', [CatalogController::class, 'collection']);
    Route::get('/search', [CatalogController::class, 'search']);
    Route::get('/gold-rate', [CatalogController::class, 'goldRate']);
    Route::get('/gold-rate/history', [CatalogController::class, 'goldRateHistory']);

    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart', [CartController::class, 'add']);
    Route::patch('/cart/{item}', [CartController::class, 'update']);
    Route::delete('/cart/{item}', [CartController::class, 'remove']);

    // Checkout requires an account: orders must always belong to a customer who
    // can see them, invoice them, and reset their password. The guest cart is
    // preserved through sign-in by claimGuestData, so nothing is lost.
    Route::middleware('auth')->group(function () {
        Route::post('/checkout', [CheckoutController::class, 'place']);
        Route::post('/checkout/confirm', [CheckoutController::class, 'confirm']);
    });
    Route::post('/webhooks/razorpay', [CheckoutController::class, 'webhook']);

    // Uptime monitoring: 200 healthy, 503 not. No auth — it reveals nothing.
    Route::get('/health', HealthController::class);

    // ---- Bulk photo ingest (n8n, Synology) ----
    // Shared-secret header rather than the admin session: the caller is a
    // daemon. Throttled generously because a real run is thousands of small
    // uploads back to back, but still bounded so a runaway loop cannot fill
    // the disk unattended.
    Route::prefix('ingest')->middleware(['ingest.token', 'throttle:600,1'])->group(function () {
        Route::post('/plan', [PhotoIngestController::class, 'plan']);
        Route::post('/image', [PhotoIngestController::class, 'image']);
        Route::get('/report', [PhotoIngestController::class, 'report']);
    });

    Route::post('/certificates/verify', [CertificateController::class, 'verify']);
    Route::post('/enquiries', [EnquiryController::class, 'store']);

    // ---- Engagement (Phase 11) ----
    Route::get('/products/{slug}/reviews', [ReviewController::class, 'index']);
    Route::post('/products/{slug}/reviews', [ReviewController::class, 'store'])->middleware('throttle:10,1');
    Route::post('/consultations', [ConsultationController::class, 'store'])->middleware('throttle:10,1');
    Route::post('/repairs', [RepairController::class, 'store'])->middleware('throttle:6,1');
    Route::post('/newsletter', [NewsletterController::class, 'subscribe'])->middleware('throttle:10,1');

    // ---- Wishlist (works for guests via session, merges on login) ----
    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::post('/wishlist/toggle', [WishlistController::class, 'toggle']);
    Route::delete('/wishlist/{product}', [WishlistController::class, 'destroy']);

    // ---- Customer accounts ----
    Route::post('/auth/register', [CustomerAuthController::class, 'register'])->middleware('throttle:6,1');
    Route::post('/auth/login', [CustomerAuthController::class, 'login'])->middleware('throttle:6,1');
    Route::post('/auth/logout', [CustomerAuthController::class, 'logout']);
    Route::post('/auth/forgot-password', [PasswordResetController::class, 'sendLink'])->middleware('throttle:6,1');
    Route::post('/auth/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:6,1');
    Route::middleware('auth')->group(function () {
        Route::get('/auth/me', [CustomerAuthController::class, 'me']);
        Route::get('/account/orders', [AccountController::class, 'orders']);
        Route::get('/account/orders/{orderNo}', [AccountController::class, 'order']);
        Route::get('/account/orders/{orderNo}/invoice', [AccountController::class, 'invoice']);
        Route::get('/account/addresses', [AccountController::class, 'addresses']);
        Route::post('/account/addresses', [AccountController::class, 'storeAddress']);
        Route::put('/account/addresses/{address}', [AccountController::class, 'updateAddress']);
        Route::delete('/account/addresses/{address}', [AccountController::class, 'destroyAddress']);
    });

    // ---- Admin ----
    Route::prefix('admin')->group(function () {
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

        // Public, token-gated admin set-password (invite acceptance)
        Route::get('/invite/{token}', [AdminUserController::class, 'showInvite']);
        Route::post('/invite/{token}', [AdminUserController::class, 'acceptInvite'])->middleware('throttle:6,1');

        Route::middleware(['auth', 'can:admin'])->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'me']);
            Route::get('/stats', [DashboardController::class, 'stats']);

            Route::get('/products', [ProductAdminController::class, 'index']);
            Route::post('/products', [ProductAdminController::class, 'store']);
            Route::get('/products/{product}', [ProductAdminController::class, 'show']);
            Route::put('/products/{product}', [ProductAdminController::class, 'update']);
            Route::delete('/products/{product}', [ProductAdminController::class, 'destroy']);
            Route::post('/products/{product}/images', [ProductAdminController::class, 'uploadImage']);
            Route::delete('/products/{product}/images/{image}', [ProductAdminController::class, 'deleteImage']);
            Route::patch('/products/{product}/images/{image}/primary', [ProductAdminController::class, 'setPrimaryImage']);

            Route::get('/orders', [OrderAdminController::class, 'index']);
            Route::get('/orders/{order}', [OrderAdminController::class, 'show']);
            Route::patch('/orders/{order}/status', [OrderAdminController::class, 'updateStatus']);
            Route::get('/orders/{order}/invoice', [OrderAdminController::class, 'invoice']);
            Route::post('/orders/{order}/refund', [OrderAdminController::class, 'refund']);
            Route::post('/orders/{order}/cancel', [OrderAdminController::class, 'cancel']);

            Route::get('/enquiries', [EnquiryAdminController::class, 'index']);
            Route::patch('/enquiries/{enquiry}/status', [EnquiryAdminController::class, 'updateStatus']);

            Route::get('/gold-rates', [SettingsAdminController::class, 'goldRates']);
            Route::post('/gold-rates', [SettingsAdminController::class, 'storeGoldRate']);
            Route::get('/certificates', [SettingsAdminController::class, 'certificates']);
            Route::post('/certificates', [SettingsAdminController::class, 'storeCertificate']);
            Route::delete('/certificates/{certificate}', [SettingsAdminController::class, 'destroyCertificate']);

            // Admin-user management (invite-only; owners protected)
            Route::get('/admins', [AdminUserController::class, 'index']);
            Route::post('/admins/invite', [AdminUserController::class, 'invite']);
            Route::post('/admins/{user}/resend', [AdminUserController::class, 'resend']);
            Route::delete('/admins/{user}', [AdminUserController::class, 'revoke']);

            // Engagement moderation (Phase 11)
            Route::get('/reviews', [ReviewAdminController::class, 'index']);
            Route::patch('/reviews/{review}/status', [ReviewAdminController::class, 'updateStatus']);
            Route::delete('/reviews/{review}', [ReviewAdminController::class, 'destroy']);
            Route::get('/consultations', [ConsultationAdminController::class, 'index']);
            Route::patch('/consultations/{consultation}/status', [ConsultationAdminController::class, 'updateStatus']);
            Route::get('/repairs', [RepairAdminController::class, 'index']);
            Route::patch('/repairs/{repair}/status', [RepairAdminController::class, 'updateStatus']);
        });
    });
});

// Crawler endpoints. Both must be declared above the SPA catch-all, and
// public/robots.txt was removed so this route is reachable — a static file in
// public/ would shadow it and could never track a domain change.
Route::get('/sitemap.xml', [SitemapController::class, 'index']);
Route::get('/robots.txt', [SitemapController::class, 'robots']);

// Secret admin "knock" — visiting /<gate_key> reveals the admin login by
// setting a cookie, then redirects to it. Only registered when a key is set.
if ($gateKey = config('admin.gate_key')) {
    Route::get('/'.$gateKey, function () {
        // 30-day, http-only, signed-by-app cookie; owners bookmark THIS url
        return redirect('/admin/login')->cookie('clv_admin_gate', '1', 60 * 24 * 30, null, null, request()->secure(), true);
    });
}

// SPA — React Router owns every non-API path. When a gate key is configured,
// admin UI paths 404 unless the visitor has knocked first (set-password links
// stay reachable so invitees can always activate their accounts).
Route::get('/{any?}', function (string $any = '') {
    $gateKey = config('admin.gate_key');
    if ($gateKey
        && (str_starts_with($any, 'admin/') || $any === 'admin')
        && ! str_starts_with($any, 'admin/set-password/')
        && ! request()->cookie('clv_admin_gate')) {
        abort(404);
    }

    // Keep the indicative FX in window.__CLAVIRA current (daily; lazy because
    // the scheduler cron is not guaranteed on shared hosting). Cheap when
    // fresh: one indexed count, no HTTP.
    app(\App\Services\FxService::class)->ensureFresh();

    return view('app', ['seo' => \App\Support\Seo::forPath($any)]);
})->where('any', '^(?!api).*$');
