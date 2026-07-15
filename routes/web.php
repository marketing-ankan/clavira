<?php

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EnquiryAdminController;
use App\Http\Controllers\Admin\OrderAdminController;
use App\Http\Controllers\Admin\ProductAdminController;
use App\Http\Controllers\Admin\SettingsAdminController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\EnquiryController;
use Illuminate\Support\Facades\Route;

Route::prefix('api')->group(function () {
    Route::get('/home', [CatalogController::class, 'home']);
    Route::get('/categories/{slug}', [CatalogController::class, 'category']);
    Route::get('/products/{slug}', [CatalogController::class, 'product']);
    Route::get('/collections', [CatalogController::class, 'collections']);
    Route::get('/collections/{slug}', [CatalogController::class, 'collection']);
    Route::get('/search', [CatalogController::class, 'search']);
    Route::get('/gold-rate', [CatalogController::class, 'goldRate']);

    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart', [CartController::class, 'add']);
    Route::patch('/cart/{item}', [CartController::class, 'update']);
    Route::delete('/cart/{item}', [CartController::class, 'remove']);

    Route::post('/checkout', [CheckoutController::class, 'place']);
    Route::post('/checkout/confirm', [CheckoutController::class, 'confirm']);
    Route::post('/webhooks/razorpay', [CheckoutController::class, 'webhook']);

    Route::post('/certificates/verify', [CertificateController::class, 'verify']);
    Route::post('/enquiries', [EnquiryController::class, 'store']);

    // ---- Admin ----
    Route::prefix('admin')->group(function () {
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

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

            Route::get('/enquiries', [EnquiryAdminController::class, 'index']);
            Route::patch('/enquiries/{enquiry}/status', [EnquiryAdminController::class, 'updateStatus']);

            Route::get('/gold-rates', [SettingsAdminController::class, 'goldRates']);
            Route::post('/gold-rates', [SettingsAdminController::class, 'storeGoldRate']);
            Route::get('/certificates', [SettingsAdminController::class, 'certificates']);
            Route::post('/certificates', [SettingsAdminController::class, 'storeCertificate']);
            Route::delete('/certificates/{certificate}', [SettingsAdminController::class, 'destroyCertificate']);
        });
    });
});

// SPA — React Router owns every non-API path
Route::get('/{any?}', fn () => view('app'))->where('any', '^(?!api).*$');
