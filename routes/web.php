<?php

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
});

// SPA — React Router owns every non-API path
Route::get('/{any?}', fn () => view('app'))->where('any', '^(?!api).*$');
