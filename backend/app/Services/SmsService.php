<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class SmsService
{
    protected string $provider;
    protected ?string $apiKey;
    protected ?string $senderId;

    public function __construct()
    {
        $this->provider = env('SMS_PROVIDER', 'log');
        $this->apiKey = env('SMS_API_KEY');
        $this->senderId = env('SMS_SENDER_ID', 'GSTSTE');
    }

    public function sendOtp(string $mobile, string $otp): bool
    {
        $message = "Your GST Suite verification code is: {$otp}. Valid for 10 minutes. Do not share this OTP with anyone.";

        Log::info("SMS_OTP_DISPATCH", [
            'provider' => $this->provider,
            'mobile' => $mobile,
            'otp' => $otp,
            'message' => $message,
        ]);

        if ($this->provider === 'msg91') {
            if (!$this->apiKey) {
                Log::error("SMS_SERVICE_ERROR: SMS_API_KEY is missing for msg91 provider.");
                return false;
            }
            try {
                $response = Http::withHeaders([
                    'authkey' => $this->apiKey,
                ])->post('https://api.msg91.com/api/v5/otp', [
                    'template_id' => env('SMS_TEMPLATE_ID'),
                    'mobile' => '91' . preg_replace('/[^0-9]/', '', $mobile),
                    'otp' => $otp,
                ]);
                return $response->successful();
            } catch (\Exception $e) {
                Log::error("SMS_SERVICE_ERROR: " . $e->getMessage());
                return false;
            }
        }

        if (in_array($this->provider, ['log', 'array'])) {
            return true;
        }

        return false;
    }
}
