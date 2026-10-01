<?php

namespace App\Services;

use App\Models\OtpVerification;
use App\Models\User;
use App\Mail\OtpVerificationMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class OtpService
{
    /**
     * Generate & send a 6-digit OTP for Email channel
     */
    public function createAndSendOtp(User $user, string $channel, string $destination): array
    {
        // Check for existing active OTP and cooldown (30s limit)
        $existing = OtpVerification::where('user_id', $user->id)
            ->where('channel', 'email')
            ->where('destination', $destination)
            ->whereNull('verified_at')
            ->latest()
            ->first();

        if ($existing && $existing->last_sent_at && $existing->last_sent_at->addSeconds(30)->isFuture()) {
            $secondsRemaining = $existing->last_sent_at->addSeconds(30)->diffInSeconds(now());
            return [
                'success' => false,
                'message' => "Please wait {$secondsRemaining} seconds before requesting a new verification code.",
                'cooldown_seconds' => $secondsRemaining,
            ];
        }

        // Generate cryptographically secure 6-digit OTP server-side
        $otp = (string) random_int(100000, 999999);
        $otpHash = hash('sha256', $otp);

        // Dispatch Email OTP
        $deliverySuccess = $this->sendEmailOtp($destination, $otp);

        if (!$deliverySuccess) {
            return [
                'success' => false,
                'code' => 'OTP_EMAIL_DELIVERY_FAILED',
                'delivery_failed' => true,
                'message' => "Unable to send verification code to your email. Please verify SMTP configuration or try again.",
            ];
        }

        // Invalidate older unverified OTPs for this user
        OtpVerification::where('user_id', $user->id)
            ->where('channel', 'email')
            ->whereNull('verified_at')
            ->delete();

        // Save hashed OTP ONLY upon successful delivery
        $verification = OtpVerification::create([
            'user_id' => $user->id,
            'channel' => 'email',
            'destination' => $destination,
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        return [
            'success' => true,
            'message' => "Verification code sent to " . $this->maskDestination('email', $destination),
            'destination_masked' => $this->maskDestination('email', $destination),
            'expires_at' => $verification->expires_at->toIso8601String(),
            'cooldown_seconds' => 30,
        ];
    }

    /**
     * Verify an entered 6-digit OTP
     */
    public function verifyOtp(User $user, string $channel, string $otpInput): array
    {
        $verification = OtpVerification::where('user_id', $user->id)
            ->where('channel', 'email')
            ->whereNull('verified_at')
            ->latest()
            ->first();

        if (!$verification) {
            return [
                'success' => false,
                'message' => 'No active verification code found. Please request a new one.',
            ];
        }

        // Check Expiry (10 minutes)
        if ($verification->expires_at->isPast()) {
            $verification->delete();
            return [
                'success' => false,
                'message' => 'Verification code has expired. Please request a new one.',
            ];
        }

        // Check Max Attempts (5 attempts)
        if ($verification->attempts >= $verification->max_attempts) {
            $verification->delete();
            return [
                'success' => false,
                'message' => 'Too many incorrect attempts. Please request a new verification code.',
            ];
        }

        // Increment attempts
        $verification->increment('attempts');

        // Check Hash Match
        $inputHash = hash('sha256', trim($otpInput));
        if ($inputHash !== $verification->otp_hash) {
            $remaining = max($verification->max_attempts - $verification->attempts, 0);
            if ($remaining === 0) {
                $verification->delete();
                return [
                    'success' => false,
                    'message' => 'Too many incorrect attempts. Please request a new verification code.',
                    'attempts_remaining' => 0,
                ];
            }
            return [
                'success' => false,
                'message' => "Invalid verification code. {$remaining} attempts remaining.",
                'attempts_remaining' => $remaining,
            ];
        }

        // Mark OTP as verified (Single-use)
        $verification->update([
            'verified_at' => now(),
        ]);

        return [
            'success' => true,
            'message' => 'Email verified successfully.',
        ];
    }

    /**
     * Send real email via Laravel Mailer system with diagnostic logging
     */
    protected function sendEmailOtp(string $email, string $otp): bool
    {
        try {
            Log::info("EMAIL_OTP_DISPATCH_INITIATED", ['destination' => $email]);

            Mail::to($email)->send(new OtpVerificationMail($otp));
            
            Log::info("EMAIL_OTP_DISPATCH_SUCCESS", ['destination' => $email]);
            return true;
        } catch (\Throwable $e) {
            $errorMsg = $e->getMessage();
            Log::error("EMAIL_OTP_DELIVERY_FAILURE: {$errorMsg}", [
                'destination' => $email,
                'mailer' => config('mail.default'),
            ]);

            return false;
        }
    }

    /**
     * Mask destination email
     */
    public function maskDestination(string $channel, string $destination): string
    {
        $parts = explode('@', $destination);
        $name = $parts[0] ?? 'user';
        $domain = $parts[1] ?? 'example.com';
        $maskedName = substr($name, 0, 1) . '***';
        return $maskedName . '@' . $domain;
    }
}
