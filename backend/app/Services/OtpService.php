<?php

namespace App\Services;

use App\Models\OtpVerification;
use App\Models\User;
use App\Mail\OtpVerificationMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class OtpService
{
    protected SmsService $smsService;

    public function __construct(SmsService $smsService)
    {
        $this->smsService = $smsService;
    }

    /**
     * Generate & send a 6-digit OTP for Email or Mobile channel
     */
    public function createAndSendOtp(User $user, string $channel, string $destination): array
    {
        // Check for existing active OTP and cooldown (60s limit)
        $existing = OtpVerification::where('user_id', $user->id)
            ->where('channel', $channel)
            ->where('destination', $destination)
            ->whereNull('verified_at')
            ->latest()
            ->first();

        if ($existing && $existing->last_sent_at && $existing->last_sent_at->addSeconds(60)->isFuture()) {
            $secondsRemaining = $existing->last_sent_at->addSeconds(60)->diffInSeconds(now());
            return [
                'success' => false,
                'message' => "Please wait {$secondsRemaining} seconds before requesting a new verification code.",
                'cooldown_seconds' => $secondsRemaining,
            ];
        }

        // Generate cryptographically secure 6-digit OTP
        $otp = (string) random_int(100000, 999999);
        $otpHash = hash('sha256', $otp);

        // Dispatch OTP via appropriate channel FIRST before saving to DB
        $deliverySuccess = false;
        if ($channel === 'email') {
            $deliverySuccess = $this->sendEmailOtp($destination, $otp);
        } else if ($channel === 'mobile') {
            $deliverySuccess = $this->smsService->sendOtp($destination, $otp);
        }

        // If real delivery failed, do NOT pretend that the OTP was sent
        if (!$deliverySuccess) {
            return [
                'success' => false,
                'code' => $channel === 'email' ? 'OTP_EMAIL_DELIVERY_FAILED' : 'OTP_MOBILE_DELIVERY_FAILED',
                'delivery_failed' => true,
                'message' => "Unable to send verification code to your " . ($channel === 'email' ? 'email' : 'mobile number') . ". Please try again.",
            ];
        }

        // Invalidate older unverified OTPs for this channel
        OtpVerification::where('user_id', $user->id)
            ->where('channel', $channel)
            ->whereNull('verified_at')
            ->delete();

        // Save hashed OTP ONLY upon successful delivery
        $verification = OtpVerification::create([
            'user_id' => $user->id,
            'channel' => $channel,
            'destination' => $destination,
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        return [
            'success' => true,
            'message' => "Verification code sent to " . $this->maskDestination($channel, $destination),
            'destination_masked' => $this->maskDestination($channel, $destination),
            'expires_at' => $verification->expires_at->toIso8601String(),
            'cooldown_seconds' => 60,
        ];
    }

    /**
     * Verify an entered 6-digit OTP
     */
    public function verifyOtp(User $user, string $channel, string $otpInput): array
    {
        $verification = OtpVerification::where('user_id', $user->id)
            ->where('channel', $channel)
            ->whereNull('verified_at')
            ->latest()
            ->first();

        if (!$verification) {
            return [
                'success' => false,
                'message' => 'No active OTP verification session found. Please request a new code.',
            ];
        }

        // Check Expiry (10 mins)
        if ($verification->expires_at->isPast()) {
            return [
                'success' => false,
                'message' => 'The verification code has expired. Please request a new code.',
            ];
        }

        // Check Attempt Limits (5 max attempts)
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
            $remaining = $verification->max_attempts - $verification->attempts;
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
            'message' => ucfirst($channel) . ' verified successfully.',
        ];
    }

    /**
     * Send real email via Laravel Mailer system using OtpVerificationMail
     */
    protected function sendEmailOtp(string $email, string $otp): bool
    {
        try {
            Log::info("EMAIL_OTP_DISPATCH_INITIATED", ['destination' => $email]);
            
            // Synchronous delivery to user's email address
            Mail::to($email)->send(new OtpVerificationMail($otp));
            
            return true;
        } catch (\Exception $e) {
            Log::error("EMAIL_OTP_DELIVERY_FAILURE: " . $e->getMessage(), [
                'destination' => $email,
            ]);
            return false;
        }
    }

    /**
     * Mask destination email or phone
     */
    public function maskDestination(string $channel, string $destination): string
    {
        if ($channel === 'email') {
            $parts = explode('@', $destination);
            $name = $parts[0];
            $domain = $parts[1] ?? 'example.com';
            $maskedName = substr($name, 0, 2) . str_repeat('*', max(strlen($name) - 2, 3));
            return $maskedName . '@' . $domain;
        } else {
            $clean = preg_replace('/[^0-9]/', '', $destination);
            $last4 = substr($clean, -4);
            return '+91 ******' . $last4;
        }
    }
}
