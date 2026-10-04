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
use App\Http\Controllers\GstAuditController;
use App\Http\Controllers\PricingEnquiryController;

/*
|--------------------------------------------------------------------------
| API Routes - GST REPOTIS Private Client Infrastructure
|--------------------------------------------------------------------------
*/

// Public Pricing Enquiry Submission (Public Sales Contact)
Route::post('/pricing-enquiries', [PricingEnquiryController::class, 'store']);

// Public Authentication Endpoint (Rate limited to prevent brute force)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Disabled legacy endpoints returning structured status
    Route::post('/signup/validate', [AuthController::class, 'validateSignup']);
    Route::post('/register/validate', [AuthController::class, 'validateSignup']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/signup', [AuthController::class, 'register']);
    Route::post('/google', [AuthController::class, 'loginWithFirebase']);
    Route::post('/google/firebase', [AuthController::class, 'loginWithFirebase']);
    Route::post('/check-mobile', [AuthController::class, 'checkMobileAvailability']);
    Route::post('/google/complete-signup', [AuthController::class, 'completeGoogleSignup']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPasswordRequest']);
    Route::post('/forgot-password/request', [AuthController::class, 'forgotPasswordRequest']);
    Route::post('/reset-password', [AuthController::class, 'forgotPasswordReset']);
    Route::post('/forgot-password/reset', [AuthController::class, 'forgotPasswordReset']);
});

// Protected Workspace Routes (Enforces auth.token bearer session validation)
Route::middleware('auth.token')->group(function () {

    // User & Profile
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::get('/auth/profile', [AuthController::class, 'profile']);
    Route::post('/auth/complete-profile', [AuthController::class, 'completeProfile']);
    Route::get('/user/profile', [AuthController::class, 'profile']);
    Route::post('/user/complete-profile', [AuthController::class, 'completeProfile']);
    Route::put('/user/profile', [AuthController::class, 'completeProfile']);

    // Dashboard Overview
    Route::get('/dashboard/summary', [DashboardController::class, 'getSummary']);

    // Bank Statement Converter Engine
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

    // Client Management Module (Multi-tenant isolated per user)
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

    // Subscriptions & Plans
    Route::prefix('subscription')->group(function () {
        Route::get('/plans', [SubscriptionController::class, 'getPlans']);
        Route::get('/current', [SubscriptionController::class, 'getCurrentSubscription']);
        Route::post('/create-order', [SubscriptionController::class, 'createRazorpayOrder']);
        Route::post('/verify-payment', [SubscriptionController::class, 'verifyPayment']);
    });

    // GST Audit & Reconciliation Workspace Module
    Route::prefix('gst-audits')->group(function () {
        Route::get('/', [GstAuditController::class, 'index']);
        Route::post('/', [GstAuditController::class, 'store']);
        Route::get('/{id}', [GstAuditController::class, 'show']);
        Route::put('/{id}', [GstAuditController::class, 'update']);
        Route::delete('/{id}', [GstAuditController::class, 'destroy']);

        // Audit Files Management
        Route::post('/{id}/files', [GstAuditController::class, 'uploadFile']);
        Route::get('/{id}/files', [GstAuditController::class, 'listFiles']);
        Route::delete('/{id}/files/{fileId}', [GstAuditController::class, 'deleteFile']);

        // Reconciliation & Rule Engine
        Route::post('/{id}/process', [GstAuditController::class, 'processAudit']);

        // Views & Analytics
        Route::get('/{id}/summary', [GstAuditController::class, 'getSummary']);
        Route::get('/{id}/reconciliation', [GstAuditController::class, 'getReconciliations']);
        Route::get('/{id}/itc', [GstAuditController::class, 'getItcAnalysis']);

        // Exceptions Management
        Route::get('/{id}/exceptions', [GstAuditController::class, 'getExceptions']);
        Route::patch('/{id}/exceptions/{exceptionId}', [GstAuditController::class, 'updateException']);
        Route::post('/{id}/exceptions/bulk', [GstAuditController::class, 'bulkUpdateExceptions']);

        // Checklist
        Route::get('/{id}/checklist', [GstAuditController::class, 'getChecklist']);
        Route::patch('/{id}/checklist/{itemId}', [GstAuditController::class, 'updateChecklistItem']);

        // CA Working Papers
        Route::get('/{id}/working-papers', [GstAuditController::class, 'getWorkingPapers']);
        Route::post('/{id}/working-papers', [GstAuditController::class, 'storeWorkingPaper']);
        Route::delete('/{id}/working-papers/{wpId}', [GstAuditController::class, 'deleteWorkingPaper']);

        // Reports & Exports
        Route::get('/{id}/report', [GstAuditController::class, 'getReport']);
        Route::get('/{id}/export/csv', [GstAuditController::class, 'exportCsv']);
    });
});

// Admin Control Panel
Route::prefix('admin')->group(function () {
    // Public admin login
    Route::post('/login', [AdminController::class, 'login']);

    // Protected admin management routes
    Route::middleware('auth.admin')->group(function () {
        Route::get('/metrics', [AdminController::class, 'getMetrics']);
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::get('/users/{id}', [AdminController::class, 'getUserDetails']);
        Route::post('/users/{id}/toggle-status', [AdminController::class, 'toggleUserStatus']);
        Route::get('/banks', [AdminController::class, 'getBanks']);
        Route::post('/banks', [AdminController::class, 'addBank']);
        Route::get('/marketplaces', [AdminController::class, 'getMarketplaces']);
        Route::get('/hsn', [AdminController::class, 'getHsnMaster']);
        Route::post('/hsn', [AdminController::class, 'addHsn']);
        Route::get('/audit-logs', [AdminController::class, 'getAuditLogs']);

        // Pricing Enquiries Management
        Route::get('/pricing-enquiries', [PricingEnquiryController::class, 'index']);
        Route::get('/pricing-enquiries/{id}', [PricingEnquiryController::class, 'show']);
        Route::patch('/pricing-enquiries/{id}', [PricingEnquiryController::class, 'update']);
        Route::delete('/pricing-enquiries/{id}', [PricingEnquiryController::class, 'destroy']);
    });
});

