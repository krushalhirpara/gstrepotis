<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\BankStatementController;
use App\Http\Controllers\EcommerceGstr1Controller;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\FileManagerController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\AdminController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Authentication & OTP Verification System
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/verify-email-otp', [AuthController::class, 'verifyEmailOtp']);
    Route::post('/resend-email-otp', [AuthController::class, 'resendEmailOtp']);
    Route::post('/verify-mobile-otp', [AuthController::class, 'verifyMobileOtp']);
    Route::post('/resend-mobile-otp', [AuthController::class, 'resendMobileOtp']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::get('/profile', [AuthController::class, 'profile']);
});

// Dashboard
Route::get('/dashboard/summary', [DashboardController::class, 'getSummary']);

// Bank Statement Converter
Route::prefix('bank-statements')->group(function () {
    Route::get('/banks', [BankStatementController::class, 'getBanks']);
    Route::post('/process', [BankStatementController::class, 'processStatement']);
    Route::post('/export-csv', [BankStatementController::class, 'exportCsv']);
    Route::post('/export-excel', [BankStatementController::class, 'exportExcel']);
    Route::post('/export-xml', [BankStatementController::class, 'exportTallyXml']);
});

// E-Commerce GSTR-1 Engine
Route::prefix('ecommerce')->group(function () {
    Route::get('/marketplaces', [EcommerceGstr1Controller::class, 'getMarketplaces']);
    Route::post('/process', [EcommerceGstr1Controller::class, 'processReport']);
    Route::post('/export-json', [EcommerceGstr1Controller::class, 'exportGstr1Json']);
    Route::post('/export-tally-xml', [EcommerceGstr1Controller::class, 'exportGstr1TallyXml']);
});

// Client Management System
Route::prefix('clients')->group(function () {
    Route::get('/', [ClientController::class, 'index']);
    Route::post('/', [ClientController::class, 'store']);
    Route::post('/bulk-upload', [ClientController::class, 'bulkUpload']);
    Route::get('/{id}', [ClientController::class, 'show']);
    Route::put('/{id}', [ClientController::class, 'update']);
    Route::delete('/{id}', [ClientController::class, 'destroy']);
});

// File Management
Route::prefix('files')->group(function () {
    Route::get('/', [FileManagerController::class, 'getFiles']);
    Route::delete('/{id}', [FileManagerController::class, 'deleteFile']);
});

// Subscriptions & Razorpay
Route::prefix('subscription')->group(function () {
    Route::get('/plans', [SubscriptionController::class, 'getPlans']);
    Route::get('/current', [SubscriptionController::class, 'getCurrentSubscription']);
    Route::post('/create-order', [SubscriptionController::class, 'createRazorpayOrder']);
    Route::post('/verify-payment', [SubscriptionController::class, 'verifyPayment']);
});

// Admin Control Panel
Route::prefix('admin')->group(function () {
    Route::get('/metrics', [AdminController::class, 'getMetrics']);
    Route::get('/users', [AdminController::class, 'getUsers']);
    Route::post('/users/{id}/toggle-status', [AdminController::class, 'toggleUserStatus']);
    Route::get('/banks', [AdminController::class, 'getBanks']);
    Route::post('/banks', [AdminController::class, 'addBank']);
    Route::get('/marketplaces', [AdminController::class, 'getMarketplaces']);
    Route::get('/hsn', [AdminController::class, 'getHsnMaster']);
    Route::post('/hsn', [AdminController::class, 'addHsn']);
    Route::get('/audit-logs', [AdminController::class, 'getAuditLogs']);
});
