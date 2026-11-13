<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AuthorController;
use App\Http\Controllers\BookController;
use App\Http\Controllers\GenreController;
use App\Http\Controllers\MidtransNotificationController;
use App\Http\Controllers\TransactionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::apiResource('books', BookController::class)->only(['index', 'show']);
Route::apiResource('genres', GenreController::class)->only(['index', 'show']);
Route::apiResource('authors', AuthorController::class)->only(['index', 'show']);
Route::post('/payments/midtrans/notification', MidtransNotificationController::class)->middleware('throttle:60,1');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return response()->json([
            'success' => true,
            'data' => $request->user(),
        ]);
    });

    Route::middleware('customer')->group(function (): void {
        Route::get('/my-transactions', [TransactionController::class, 'customerIndex']);
        Route::apiResource('transactions', TransactionController::class)->only(['store', 'show', 'update']);
        Route::post('/transactions/{transaction}/payment', [TransactionController::class, 'createPayment']);
    });

    Route::middleware('admin')->group(function (): void {
        Route::apiResource('books', BookController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('genres', GenreController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('authors', AuthorController::class)->only(['store', 'update', 'destroy']);
        Route::get('/admin/transactions', [TransactionController::class, 'index']);
        Route::put('/admin/transactions/{transaction}', [TransactionController::class, 'adminUpdate']);
        Route::delete('/admin/transactions/{transaction}', [TransactionController::class, 'destroy']);
        Route::get('/admin/stats', [TransactionController::class, 'stats']);
    });
});
