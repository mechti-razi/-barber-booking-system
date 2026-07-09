<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ShopController;
use App\Http\Controllers\Api\V1\BarberController;
use App\Http\Controllers\Api\V1\ServiceController;
use App\Http\Controllers\Api\V1\AppointmentController;
use App\Http\Controllers\Api\V1\ReviewController;
use App\Http\Controllers\Api\V1\BarberPanelController;

use App\Http\Controllers\Api\V1\PushSubscriptionController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::prefix('v1')->group(function () {
    // Public routes
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Push notification public key (no auth needed so frontend can subscribe before login)
    Route::get('/push/vapid-public-key', [PushSubscriptionController::class, 'vapidPublicKey']);
    // Public read-only routes
    Route::apiResource('shops', ShopController::class)->only(['index', 'show']);
    Route::get('/shops/{id}/services', [ShopController::class, 'show']);
    Route::get('/shops/{id}/barbers', [ShopController::class, 'show']);
    
    Route::apiResource('barbers', BarberController::class)->only(['index', 'show']);
    Route::get('/barbers/{id}/services', [BarberController::class, 'show']);
    Route::get('/barbers/{id}/schedule', [BarberController::class, 'show']);
    
    Route::apiResource('services', ServiceController::class)->only(['index', 'show']);
    
    Route::apiResource('reviews', ReviewController::class)->only(['index', 'show']);
    Route::get('/barbers/{barber_id}/reviews', [ReviewController::class, 'index']);

    // Protected routes (require authentication)
    Route::middleware('auth:api')->group(function () {
        // Auth routes
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::put('/auth/change-password', [AuthController::class, 'changePassword']);
        
        // Shop routes (write)
        Route::apiResource('shops', ShopController::class)->except(['index', 'show']);
        
        // Barber routes (write)
        Route::apiResource('barbers', BarberController::class)->except(['index', 'show']);
        
        // Service routes (write)
        Route::apiResource('services', ServiceController::class)->except(['index', 'show']);
        
        // Appointment routes
        Route::apiResource('appointments', AppointmentController::class);
        Route::get('/my-appointments', [AppointmentController::class, 'index']);
        
        // Review routes (write)
        Route::apiResource('reviews', ReviewController::class)->except(['index', 'show']);

        // Push notification subscription management
        Route::post('/push/subscribe', [PushSubscriptionController::class, 'subscribe']);
        Route::post('/push/unsubscribe', [PushSubscriptionController::class, 'unsubscribe']);

        // ── Barber Panel routes ────────────────────────────────────────────
        Route::prefix('barber-panel')->middleware('barber.active')->group(function () {
            Route::get('/revenue', [BarberPanelController::class, 'revenue']);
            Route::get('/reservations', [BarberPanelController::class, 'reservations']);
            Route::post('/reservations', [BarberPanelController::class, 'createReservation']);
            Route::get('/schedule', [BarberPanelController::class, 'getSchedule']);
            Route::put('/schedule', [BarberPanelController::class, 'saveSchedule']);
            Route::get('/staff', [BarberPanelController::class, 'staff']);
            Route::post('/staff', [BarberPanelController::class, 'hireStaff']);
            Route::delete('/staff/{barber_id}', [BarberPanelController::class, 'removeStaff']);
            Route::patch('/staff/{barber_id}/toggle', [BarberPanelController::class, 'toggleStaff']);
            Route::get('/staff/{barber_id}/performance', [BarberPanelController::class, 'staffPerformance']);
            
            // Profile routes
            Route::get('/profile', [BarberPanelController::class, 'getProfile']);
            Route::put('/profile', [BarberPanelController::class, 'updateProfile']);

            // Shop info routes
            Route::get('/shop',  [BarberPanelController::class, 'getShop']);
            Route::put('/shop',  [BarberPanelController::class, 'updateShop']);
            Route::post('/shop/logo', [BarberPanelController::class, 'uploadLogo']);

            // ── Services (shop-scoped) ─────────────────────────────────────
            Route::get('/services',              [BarberPanelController::class, 'getServices']);
            Route::post('/services',             [BarberPanelController::class, 'createService']);
            Route::put('/services/{id}',         [BarberPanelController::class, 'updateService']);
            Route::delete('/services/{id}',      [BarberPanelController::class, 'deleteService']);
            Route::patch('/services/{id}/toggle',[BarberPanelController::class, 'toggleService']);
        });
    });
});
