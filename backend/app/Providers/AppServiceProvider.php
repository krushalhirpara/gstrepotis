<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Rate Limiter for Authentication Requests (Signup & Login OTP Generation)
        RateLimiter::for('auth-requests', function (Request $request) {
            return Limit::perMinute(15)->by($request->ip() ?: 'anonymous');
        });

        // Rate Limiter for OTP Resends
        RateLimiter::for('otp-resend', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip() ?: 'anonymous');
        });

        // Rate Limiter for OTP Verification
        RateLimiter::for('otp-verify', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip() ?: 'anonymous');
        });
    }
}
