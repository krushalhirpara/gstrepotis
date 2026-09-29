<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Throwable;

class SmsService
{
    protected string $provider;
    protected ?string $apiKey;
    protected ?string $senderId;
    protected ?string $templateId;
    protected TwilioVerifyService $twilioVerify;

    public function __construct(TwilioVerifyService $twilioVerify)
    {
        $this->provider = strtolower(env('SMS_PROVIDER', 'log'));
        $this->apiKey = env('SMS_API_KEY') ?: env('FAST2SMS_API_KEY') ?: env('MSG91_AUTH_KEY') ?: env('TWOFACTOR_API_KEY');
        $this->senderId = env('SMS_SENDER_ID', 'GSTREP');
        $this->templateId = env('SMS_TEMPLATE_ID');
        $this->twilioVerify = $twilioVerify;
    }

    /**
     * Send OTP SMS to an Indian Mobile Number
     *
     * @param string $mobile Normalized mobile number (e.g. +919876543210 or 9876543210)
     * @param string $otp 6-digit OTP
     * @param string $purpose Purpose of OTP ('signup', 'login', 'password_reset')
     * @return bool Whether dispatch was initiated successfully
     */
    public function sendOtp(string $mobile, string $otp, string $purpose = 'signup'): bool
    {
        $cleanDigits = preg_replace('/\D/', '', $mobile);
        $tenDigitMobile = substr($cleanDigits, -10);

        if (strlen($tenDigitMobile) !== 10) {
            Log::error("SMS_SERVICE_ERROR: Invalid 10-digit mobile number format: {$mobile}");
            return false;
        }

        // 1. Twilio Verify v2 Provider
        if ($this->provider === 'twilio' || $this->provider === 'twilio_verify' || $this->twilioVerify->isEnabled()) {
            $result = $this->twilioVerify->sendVerification("+91{$tenDigitMobile}");
            return (bool) ($result['success'] ?? false);
        }

        $actionText = match ($purpose) {
            'login' => 'login verification',
            'signup' => 'account verification',
            'password_reset' => 'password reset',
            default => 'verification',
        };

        $message = "Your GST REPOTIS {$actionText} OTP is: {$otp}. Valid for 5 minutes. Do not share this code with anyone.";

        // 2. Fast2SMS Provider (Indian SMS gateway)
        if ($this->provider === 'fast2sms') {
            if (!$this->apiKey) {
                Log::error("SMS_SERVICE_ERROR: FAST2SMS API key is missing. Please set SMS_API_KEY in environment variables.");
                return false;
            }

            try {
                $response = Http::withHeaders([
                    'authorization' => $this->apiKey,
                ])->post('https://www.fast2sms.com/dev/bulkV2', [
                    'variables_values' => $otp,
                    'route' => 'otp',
                    'numbers' => $tenDigitMobile,
                ]);

                if ($response->successful() && ($response->json('return') === true || $response->json('status_code') === 200)) {
                    return true;
                }

                Log::error("FAST2SMS_ERROR: " . $response->body());
                return false;
            } catch (Throwable $e) {
                Log::error("FAST2SMS_EXCEPTION: " . $e->getMessage());
                return false;
            }
        }

        // 3. MSG91 Provider
        if ($this->provider === 'msg91') {
            if (!$this->apiKey) {
                Log::error("SMS_SERVICE_ERROR: MSG91 auth key is missing. Please set SMS_API_KEY in environment variables.");
                return false;
            }

            try {
                $payload = [
                    'mobile' => '91' . $tenDigitMobile,
                    'otp' => $otp,
                ];
                if ($this->templateId) {
                    $payload['template_id'] = $this->templateId;
                }

                $response = Http::withHeaders([
                    'authkey' => $this->apiKey,
                ])->post('https://api.msg91.com/api/v5/otp', $payload);

                if ($response->successful()) {
                    return true;
                }

                Log::error("MSG91_ERROR: " . $response->body());
                return false;
            } catch (Throwable $e) {
                Log::error("MSG91_EXCEPTION: " . $e->getMessage());
                return false;
            }
        }

        // 4. 2Factor.in Provider
        if ($this->provider === '2factor' || $this->provider === 'twofactor') {
            if (!$this->apiKey) {
                Log::error("SMS_SERVICE_ERROR: 2Factor API key is missing.");
                return false;
            }

            try {
                $url = "https://2factor.in/API/V1/{$this->apiKey}/SMS/+91{$tenDigitMobile}/{$otp}";
                $response = Http::get($url);

                if ($response->successful() && $response->json('Status') === 'Success') {
                    return true;
                }

                Log::error("2FACTOR_ERROR: " . $response->body());
                return false;
            } catch (Throwable $e) {
                Log::error("2FACTOR_EXCEPTION: " . $e->getMessage());
                return false;
            }
        }

        // 5. Development / Fallback Log Mode (Never logged in production)
        if (in_array($this->provider, ['log', 'array', 'testing', 'local', ''])) {
            if (!app()->environment('production')) {
                Log::info("SMS_OTP_DISPATCH (DEV_MODE)", [
                    'provider' => $this->provider,
                    'mobile' => "+91{$tenDigitMobile}",
                    'purpose' => $purpose,
                ]);
            }
            return true;
        }

        Log::warning("SMS_SERVICE_UNKNOWN_PROVIDER: Provider [{$this->provider}] not configured.");
        return true;
    }
}
