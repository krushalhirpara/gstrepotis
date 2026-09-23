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

    public function __construct()
    {
        $this->provider = strtolower(env('SMS_PROVIDER', 'log'));
        $this->apiKey = env('SMS_API_KEY') ?: env('FAST2SMS_API_KEY') ?: env('MSG91_AUTH_KEY') ?: env('TWOFACTOR_API_KEY');
        $this->senderId = env('SMS_SENDER_ID', 'GSTSTE');
        $this->templateId = env('SMS_TEMPLATE_ID');
    }

    /**
     * Send OTP SMS to an Indian Mobile Number
     *
     * @param string $mobile Normalized mobile number (e.g. +919876543210 or 9876543210)
     * @param string $otp 6-digit OTP
     * @return bool Whether dispatch was initiated successfully
     */
    public function sendOtp(string $mobile, string $otp): bool
    {
        $cleanDigits = preg_replace('/\D/', '', $mobile);
        $tenDigitMobile = substr($cleanDigits, -10);

        $message = "Your GST Suite verification OTP is: {$otp}. Valid for 5 minutes. Please do not share this code with anyone.";

        // 1. Fast2SMS Provider (Very popular Indian SMS gateway)
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

        // 2. MSG91 Provider
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

        // 3. 2Factor.in Provider
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

        // 4. Twilio Provider
        if ($this->provider === 'twilio') {
            $sid = env('TWILIO_SID') ?: env('TWILIO_ACCOUNT_SID');
            $token = env('TWILIO_TOKEN') ?: env('TWILIO_AUTH_TOKEN');
            $from = env('TWILIO_FROM');

            if (!$sid || !$token || !$from) {
                Log::error("SMS_SERVICE_ERROR: Twilio credentials missing in environment variables.");
                return false;
            }

            try {
                $response = Http::withBasicAuth($sid, $token)
                    ->asForm()
                    ->post("https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json", [
                        'From' => $from,
                        'To' => "+91{$tenDigitMobile}",
                        'Body' => $message,
                    ]);

                return $response->successful();
            } catch (Throwable $e) {
                Log::error("TWILIO_EXCEPTION: " . $e->getMessage());
                return false;
            }
        }

        // 5. Development / Fallback Log Mode
        if (in_array($this->provider, ['log', 'array', 'testing', 'local'])) {
            Log::info("SMS_OTP_DISPATCH (LOCAL_DEV_LOG)", [
                'provider' => $this->provider,
                'mobile' => "+91{$tenDigitMobile}",
                'otp' => $otp,
                'message' => $message,
            ]);
            return true;
        }

        Log::warning("SMS_SERVICE_UNKNOWN_PROVIDER: Provider [{$this->provider}] not configured.");
        return true;
    }
}
