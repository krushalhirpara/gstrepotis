<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class TwilioVerifyService
{
    protected function getAccountSid(): ?string
    {
        return config('services.twilio.account_sid') ?: env('TWILIO_ACCOUNT_SID');
    }

    protected function getAuthToken(): ?string
    {
        return config('services.twilio.auth_token') ?: env('TWILIO_AUTH_TOKEN');
    }

    protected function getVerifyServiceSid(): ?string
    {
        return config('services.twilio.verify_service_sid') ?: env('TWILIO_VERIFY_SERVICE_SID');
    }

    /**
     * Check if Twilio Verify is configured and active
     */
    public function isEnabled(): bool
    {
        $enabled = config('services.twilio.verify_enabled');
        if ($enabled === null) {
            $enabled = env('TWILIO_VERIFY_ENABLED', true);
        }

        $enabledBool = ($enabled === true || $enabled === 'true' || $enabled === '1' || $enabled === 1 || $enabled === 'yes');
        $sid = $this->getAccountSid();
        $token = $this->getAuthToken();
        $verifySid = $this->getVerifyServiceSid();

        return $enabledBool && !empty($sid) && !empty($token) && !empty($verifySid);
    }

    /**
     * Normalize Indian or international mobile number to canonical E.164 format (+91XXXXXXXXXX)
     */
    public function normalizeE164(string $phone): ?string
    {
        $cleaned = preg_replace('/[\s\-\(\)\.]/', '', trim($phone));

        // Format 1: +91XXXXXXXXXX
        if (preg_match('/^\+91([6-9]\d{9})$/', $cleaned, $matches)) {
            return '+91' . $matches[1];
        }

        // Format 2: 91XXXXXXXXXX
        if (preg_match('/^91([6-9]\d{9})$/', $cleaned, $matches)) {
            return '+91' . $matches[1];
        }

        // Format 3: 0XXXXXXXXXX
        if (preg_match('/^0([6-9]\d{9})$/', $cleaned, $matches)) {
            return '+91' . $matches[1];
        }

        // Format 4: 10-digit Indian number
        if (preg_match('/^([6-9]\d{9})$/', $cleaned, $matches)) {
            return '+91' . $matches[1];
        }

        // Generic E.164 international fallback
        if (preg_match('/^\+[1-9]\d{7,14}$/', $cleaned)) {
            return $cleaned;
        }

        return null;
    }

    /**
     * Mask phone number for safe structured logging
     */
    protected function maskPhone(string $phone): string
    {
        $clean = preg_replace('/\D/', '', $phone);
        $last4 = substr($clean, -4);
        return '******' . $last4;
    }

    /**
     * Send Verification OTP via Twilio Verify v2
     *
     * POST https://verify.twilio.com/v2/Services/{VERIFY_SERVICE_SID}/Verifications
     *
     * @param string $phone Mobile number (e.g. +918511008884 or 8511008884)
     * @return array ['success' => bool, 'status' => string, 'error_code' => ?int, 'message' => string]
     */
    public function sendVerification(string $phone): array
    {
        $e164 = $this->normalizeE164($phone);
        if (!$e164) {
            return [
                'success' => false,
                'status' => 'failed',
                'error_code' => 60200,
                'message' => 'Please enter a valid 10-digit Indian mobile number.',
            ];
        }

        // In test or non-configured local environments, handle gracefully without crashing
        if (!$this->isEnabled()) {
            if (!app()->environment('production')) {
                Log::info("TWILIO_VERIFY_LOCAL_MOCK_DISPATCH", [
                    'phone' => $this->maskPhone($e164),
                    'reason' => 'Twilio Verify not configured or disabled in local/testing',
                ]);
            }

            return [
                'success' => true,
                'status' => 'pending',
                'mock' => true,
                'message' => 'Verification code sent.',
            ];
        }

        $verifySid = $this->getVerifyServiceSid();
        $accountSid = $this->getAccountSid();
        $authToken = $this->getAuthToken();
        $url = "https://verify.twilio.com/v2/Services/{$verifySid}/Verifications";

        try {
            $response = Http::withBasicAuth($accountSid, $authToken)
                ->asForm()
                ->timeout(12)
                ->post($url, [
                    'To' => $e164,
                    'Channel' => 'sms',
                ]);

            if ($response->successful()) {
                $body = $response->json();
                $status = $body['status'] ?? 'pending';

                Log::info("TWILIO_VERIFY_START_SUCCESS", [
                    'phone' => $this->maskPhone($e164),
                    'status' => $status,
                ]);

                return [
                    'success' => true,
                    'status' => $status,
                    'message' => 'Verification code sent to your mobile number.',
                ];
            }

            $body = $response->json() ?? [];
            $twilioCode = $body['code'] ?? $response->status();
            $twilioMsg = $body['message'] ?? 'Twilio API Error';

            Log::warning("TWILIO_VERIFY_START_FAILED", [
                'phone' => $this->maskPhone($e164),
                'twilio_code' => $twilioCode,
                'http_status' => $response->status(),
            ]);

            // Handle Twilio Trial Account restriction (code 21608 or unverified number message)
            if ($twilioCode == 21608 || str_contains(strtolower($twilioMsg), 'unverified')) {
                return [
                    'success' => false,
                    'status' => 'failed',
                    'error_code' => 21608,
                    'message' => 'This mobile number cannot be verified with the current Twilio trial account. Please use a verified test number.',
                ];
            }

            // Handle invalid phone format (code 60200)
            if ($twilioCode == 60200) {
                return [
                    'success' => false,
                    'status' => 'failed',
                    'error_code' => 60200,
                    'message' => 'Invalid mobile number format for verification.',
                ];
            }

            // Handle Twilio rate limits (code 60203 / 60212)
            if ($twilioCode == 60203 || $twilioCode == 60212) {
                return [
                    'success' => false,
                    'status' => 'failed',
                    'error_code' => $twilioCode,
                    'message' => 'Too many verification attempts for this mobile number. Please wait a few minutes.',
                ];
            }

            return [
                'success' => false,
                'status' => 'failed',
                'error_code' => $twilioCode,
                'message' => "We couldn't send the mobile OTP. Please try again.",
            ];
        } catch (Throwable $e) {
            Log::error("TWILIO_VERIFY_EXCEPTION: " . $e->getMessage(), [
                'phone' => $this->maskPhone($e164),
            ]);

            return [
                'success' => false,
                'status' => 'failed',
                'error_code' => 500,
                'message' => "We couldn't send the mobile OTP. Please try again.",
            ];
        }
    }

    /**
     * Check Verification Code via Twilio Verify v2
     *
     * POST https://verify.twilio.com/v2/Services/{VERIFY_SERVICE_SID}/VerificationCheck
     *
     * @param string $phone Mobile number
     * @param string $code 6-digit verification code entered by user
     * @return array ['success' => bool, 'approved' => bool, 'error_code' => ?int, 'message' => string]
     */
    public function checkVerification(string $phone, string $code): array
    {
        $e164 = $this->normalizeE164($phone);
        if (!$e164) {
            return [
                'success' => false,
                'approved' => false,
                'error_code' => 60200,
                'message' => 'Invalid mobile number format.',
            ];
        }

        $cleanCode = preg_replace('/\D/', '', trim($code));
        if (strlen($cleanCode) < 4 || strlen($cleanCode) > 10) {
            return [
                'success' => false,
                'approved' => false,
                'error_code' => 422,
                'message' => 'Verification code must be 6 digits.',
            ];
        }

        // If Twilio Verify is not configured, indicate to caller to use local fallback
        if (!$this->isEnabled()) {
            return [
                'success' => false,
                'approved' => false,
                'fallback_to_local' => true,
                'message' => 'Twilio Verify not active; using local verification check.',
            ];
        }

        $verifySid = $this->getVerifyServiceSid();
        $accountSid = $this->getAccountSid();
        $authToken = $this->getAuthToken();
        $url = "https://verify.twilio.com/v2/Services/{$verifySid}/VerificationCheck";

        try {
            $response = Http::withBasicAuth($accountSid, $authToken)
                ->asForm()
                ->timeout(12)
                ->post($url, [
                    'To' => $e164,
                    'Code' => $cleanCode,
                ]);

            if ($response->successful()) {
                $body = $response->json();
                $status = $body['status'] ?? '';
                $valid = (bool) ($body['valid'] ?? false);

                if ($status === 'approved' && $valid) {
                    Log::info("TWILIO_VERIFY_CHECK_APPROVED", [
                        'phone' => $this->maskPhone($e164),
                    ]);

                    return [
                        'success' => true,
                        'approved' => true,
                        'message' => 'Mobile number verified successfully.',
                    ];
                }

                return [
                    'success' => false,
                    'approved' => false,
                    'message' => 'Invalid mobile OTP. Please check and try again.',
                ];
            }

            $body = $response->json() ?? [];
            $twilioCode = $body['code'] ?? $response->status();

            Log::warning("TWILIO_VERIFY_CHECK_FAILED", [
                'phone' => $this->maskPhone($e164),
                'twilio_code' => $twilioCode,
                'http_status' => $response->status(),
            ]);

            // Max attempts or expired
            if ($twilioCode == 60202 || $twilioCode == 20404) {
                return [
                    'success' => false,
                    'approved' => false,
                    'error_code' => $twilioCode,
                    'message' => 'Too many incorrect attempts or OTP has expired. Please request a new OTP.',
                ];
            }

            return [
                'success' => false,
                'approved' => false,
                'error_code' => $twilioCode,
                'message' => 'Invalid mobile OTP. Please check and try again.',
            ];
        } catch (Throwable $e) {
            Log::error("TWILIO_VERIFY_CHECK_EXCEPTION: " . $e->getMessage(), [
                'phone' => $this->maskPhone($e164),
            ]);

            return [
                'success' => false,
                'approved' => false,
                'error_code' => 500,
                'message' => 'Unable to verify mobile OTP. Please try again.',
            ];
        }
    }
}
