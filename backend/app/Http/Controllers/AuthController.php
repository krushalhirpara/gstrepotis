<?php

namespace App\Http\Controllers;

use App\Models\AuthOtp;
use App\Models\LoginOtpVerification;
use App\Models\OtpVerification;
use App\Models\PendingSignup;
use App\Models\User;
use App\Mail\OtpVerificationMail;
use App\Services\FirebaseTokenVerifier;
use App\Services\SmsService;
use App\Services\TwilioVerifyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;

class AuthController extends Controller
{
    protected FirebaseTokenVerifier $tokenVerifier;
    protected SmsService $smsService;
    protected TwilioVerifyService $twilioVerify;

    public function __construct(
        FirebaseTokenVerifier $tokenVerifier,
        SmsService $smsService,
        TwilioVerifyService $twilioVerify
    ) {
        $this->tokenVerifier = $tokenVerifier;
        $this->smsService = $smsService;
        $this->twilioVerify = $twilioVerify;
    }

    /**
     * Normalize email: trim and convert to lowercase
     */
    public function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    /**
     * Validate and normalize Indian mobile number to canonical +91XXXXXXXXXX E.164 format.
     */
    public function normalizeMobile(?string $mobile): ?string
    {
        if ($mobile === null || trim($mobile) === '') {
            return null;
        }

        // Remove whitespace, dashes, brackets, dots
        $cleaned = preg_replace('/[\s\-\(\)\.]/', '', trim($mobile));

        // Format 1: +91XXXXXXXXXX
        if (preg_match('/^\+91([6-9]\d{9})$/', $cleaned, $matches)) {
            return '+91' . $matches[1];
        }

        // Format 2: 91XXXXXXXXXX (without leading plus)
        if (preg_match('/^91([6-9]\d{9})$/', $cleaned, $matches)) {
            return '+91' . $matches[1];
        }

        // Format 3: 0XXXXXXXXXX (leading 0)
        if (preg_match('/^0([6-9]\d{9})$/', $cleaned, $matches)) {
            return '+91' . $matches[1];
        }

        // Format 4: 10-digit Indian number (starts with 6, 7, 8, 9)
        if (preg_match('/^([6-9]\d{9})$/', $cleaned, $matches)) {
            return '+91' . $matches[1];
        }

        return null;
    }

    /**
     * Mask email address (e.g., krushal@example.com -> k***@example.com)
     */
    public function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        $name = $parts[0] ?? 'user';
        $domain = $parts[1] ?? 'example.com';

        if (strlen($name) <= 1) {
            $maskedName = $name . '***';
        } else {
            $maskedName = substr($name, 0, 1) . '***';
        }

        return $maskedName . '@' . $domain;
    }

    /**
     * Mask Indian mobile number (e.g., +919876543210 -> ******3210)
     */
    public function maskMobile(string $mobile): string
    {
        $cleanDigits = preg_replace('/\D/', '', $mobile);
        $last4 = substr($cleanDigits, -4);
        return '******' . $last4;
    }

    /**
     * Format user array response
     */
    protected function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'avatar' => $user->avatar,
            'user_type' => $user->user_type ?? 'CA',
            'role' => $user->is_admin ? 'Admin' : ($user->user_type ?? 'User'),
            'is_admin' => (bool) $user->is_admin,
            'status' => $user->status ?? 'active',
            'account_status' => $user->account_status ?? 'active',
            'credits' => $user->credits ?? 50,
            'provider' => $user->provider ?? 'password',
            'created_at' => $user->created_at ? $user->created_at->toIso8601String() : null,
            'last_login_at' => $user->last_login_at ? $user->last_login_at->toIso8601String() : null,
            'email_verified_at' => $user->email_verified_at ? $user->email_verified_at->toIso8601String() : null,
            'mobile_verified_at' => $user->mobile_verified_at ? $user->mobile_verified_at->toIso8601String() : null,
        ];
    }

    /**
     * ====================================================================
     * 1. SIGNUP STEP 1: Full Name, Email, Mobile, Password -> Dual OTP Dispatch
     * POST /api/auth/signup or POST /api/auth/register
     * ====================================================================
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:100',
            'email' => 'required|email|max:150',
            'mobile' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    if (!$this->normalizeMobile($value)) {
                        $fail('Please enter a valid 10-digit mobile number.');
                    }
                },
            ],
            'password' => 'required|string|min:8|confirmed',
        ], [
            'name.required' => 'Please enter your full name.',
            'name.min' => 'Name must be at least 2 characters.',
            'name.max' => 'Name must not exceed 100 characters.',
            'email.required' => 'Please enter your email address.',
            'email.email' => 'Please enter a valid email address.',
            'mobile.required' => 'Please enter your mobile number.',
            'password.required' => 'Please create a password.',
            'password.min' => 'Password must be at least 8 characters.',
            'password.confirmed' => 'Passwords do not match.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $normalizedEmail = $this->normalizeEmail($request->email);
        $normalizedMobile = $this->normalizeMobile($request->mobile);

        // Duplicate checks against existing registered users
        if (User::where('email', $normalizedEmail)->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'An account with this email already exists. Please login.',
                'errors' => [
                    'email' => ['An account with this email already exists. Please login.'],
                ],
            ], 422);
        }

        if (User::where('mobile', $normalizedMobile)
            ->orWhere('mobile', substr($normalizedMobile, -10))
            ->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'An account with this mobile number already exists. Please login.',
                'errors' => [
                    'mobile' => ['An account with this mobile number already exists. Please login.'],
                ],
            ], 422);
        }

        // Clean up previous unverified pending signups for this email or mobile
        PendingSignup::where('email', $normalizedEmail)
            ->orWhere('mobile', $normalizedMobile)
            ->delete();

        // 1. Generate & send Email OTP to submitted email address
        $emailOtp = (string) random_int(100000, 999999);
        $emailOtpHash = hash('sha256', $emailOtp);

        try {
            Mail::to($normalizedEmail)->send(new OtpVerificationMail($emailOtp, trim($request->name), 'signup'));
        } catch (\Throwable $e) {
            Log::error("SIGNUP_EMAIL_OTP_DISPATCH_FAILURE: " . $e->getMessage(), [
                'email' => $normalizedEmail,
            ]);

            return response()->json([
                'status' => 'error',
                'code' => 'EMAIL_OTP_SEND_FAILED',
                'message' => "We couldn't send the email OTP. Please try again.",
            ], 422);
        }

        // 2. Start Mobile OTP Verification via Twilio Verify v2 (or configured SMS abstraction)
        $mobileOtpHash = 'twilio_verify';
        $useTwilioVerify = $this->twilioVerify->isEnabled();

        if ($useTwilioVerify) {
            $twilioResult = $this->twilioVerify->sendVerification($normalizedMobile);

            if (!$twilioResult['success']) {
                return response()->json([
                    'status' => 'error',
                    'code' => 'MOBILE_OTP_SEND_FAILED',
                    'message' => $twilioResult['message'] ?? "We couldn't send the mobile OTP. Please try again.",
                ], 422);
            }
        } else {
            // Local / Development / Fallback SMS provider
            $localMobileOtp = (string) random_int(100000, 999999);
            $mobileOtpHash = hash('sha256', $localMobileOtp);

            $smsSuccess = $this->smsService->sendOtp($normalizedMobile, $localMobileOtp, 'signup');
            if (!$smsSuccess) {
                return response()->json([
                    'status' => 'error',
                    'code' => 'MOBILE_OTP_SEND_FAILED',
                    'message' => "We couldn't send the mobile OTP. Please try again.",
                ], 422);
            }
        }

        $passwordHash = Hash::make($request->password);
        $signupToken = (string) Str::uuid();

        // Persist pending registration record
        PendingSignup::create([
            'signup_token' => $signupToken,
            'name' => trim($request->name),
            'email' => $normalizedEmail,
            'mobile' => $normalizedMobile,
            'password_hash' => $passwordHash,
            'email_otp_hash' => $emailOtpHash,
            'mobile_otp_hash' => $mobileOtpHash,
            'email_expires_at' => now()->addMinutes(5),
            'mobile_expires_at' => now()->addMinutes(5),
            'email_attempts' => 0,
            'mobile_attempts' => 0,
            'max_attempts' => 5,
            'email_last_sent_at' => now(),
            'mobile_last_sent_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'requires_verification' => true,
            'signup_token' => $signupToken,
            'email_masked' => $this->maskEmail($normalizedEmail),
            'mobile_masked' => $this->maskMobile($normalizedMobile),
            'expires_in_seconds' => 300,
            'cooldown_seconds' => 60,
            'message' => "Verification codes have been sent to your email and mobile number.",
        ], 200);
    }

    /**
     * ====================================================================
     * 2. SIGNUP STEP 2: Verify Dual OTPs & Activate User Account
     * POST /api/auth/signup/verify or POST /api/auth/register/verify
     * ====================================================================
     */
    public function verifySignup(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'signup_token' => 'required|string',
            'email_otp' => 'required|string|size:6',
            'mobile_otp' => 'required|string|size:6',
        ], [
            'signup_token.required' => 'Registration session token is required.',
            'email_otp.required' => 'Please enter the 6-digit email verification code.',
            'email_otp.size' => 'Email verification code must be exactly 6 digits.',
            'mobile_otp.required' => 'Please enter the 6-digit mobile verification code.',
            'mobile_otp.size' => 'Mobile verification code must be exactly 6 digits.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $pending = PendingSignup::where('signup_token', $request->signup_token)->first();

        if (!$pending) {
            return response()->json([
                'status' => 'error',
                'message' => 'Registration session expired or invalid. Please sign up again.',
            ], 404);
        }

        // Check if max attempts reached
        if ($pending->email_attempts >= $pending->max_attempts || $pending->mobile_attempts >= $pending->max_attempts) {
            $pending->delete();
            return response()->json([
                'status' => 'error',
                'message' => 'Too many incorrect attempts. Please request a new OTP.',
            ], 422);
        }

        // Check expiry (5 minutes)
        if ($pending->email_expires_at->isPast() && $pending->mobile_expires_at->isPast()) {
            $pending->delete();
            return response()->json([
                'status' => 'error',
                'message' => 'This OTP has expired. Please request a new OTP.',
            ], 422);
        }

        if ($pending->email_expires_at->isPast()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Email OTP has expired. Please request a new OTP.',
            ], 422);
        }

        if ($pending->mobile_expires_at->isPast()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Mobile OTP has expired. Please request a new OTP.',
            ], 422);
        }

        // 1. Verify Email OTP Hash
        $emailOtpInput = trim($request->email_otp);
        $emailMatches = (hash('sha256', $emailOtpInput) === $pending->email_otp_hash);

        // 2. Verify Mobile OTP via Twilio Verify Check (or local hash fallback)
        $mobileOtpInput = trim($request->mobile_otp);
        $mobileMatches = false;
        $mobileErrorMsg = null;

        if ($pending->mobile_otp_hash === 'twilio_verify' || $this->twilioVerify->isEnabled()) {
            $check = $this->twilioVerify->checkVerification($pending->mobile, $mobileOtpInput);

            if ($check['approved']) {
                $mobileMatches = true;
            } elseif (!empty($check['fallback_to_local'])) {
                // If Twilio is not active, fallback to hash match
                $mobileMatches = (hash('sha256', $mobileOtpInput) === $pending->mobile_otp_hash);
            } else {
                $mobileMatches = false;
                $mobileErrorMsg = $check['message'] ?? 'Invalid mobile OTP. Please check and try again.';
            }
        } else {
            $mobileMatches = (hash('sha256', $mobileOtpInput) === $pending->mobile_otp_hash);
        }

        // If either fails, do NOT activate account
        if (!$emailMatches || !$mobileMatches) {
            if (!$emailMatches) {
                $pending->increment('email_attempts');
            }
            if (!$mobileMatches) {
                $pending->increment('mobile_attempts');
            }

            if (!$emailMatches && !$mobileMatches) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Invalid email and mobile verification codes. Please check and try again.',
                ], 422);
            }

            if (!$emailMatches) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Invalid email OTP. Please check and try again.',
                ], 422);
            }

            if (!$mobileMatches) {
                return response()->json([
                    'status' => 'error',
                    'message' => $mobileErrorMsg ?: 'Invalid mobile OTP. Please check and try again.',
                ], 422);
            }
        }

        // Ensure email and mobile are still unique in users table
        if (User::where('email', $pending->email)->exists() || User::where('mobile', $pending->mobile)->exists()) {
            $pending->delete();
            return response()->json([
                'status' => 'error',
                'message' => 'An account with these details has already been created. Please login.',
            ], 422);
        }

        // BOTH OTPs ARE VERIFIED -> Create active user account
        $token = bin2hex(random_bytes(32));

        $user = User::create([
            'name' => $pending->name,
            'email' => $pending->email,
            'mobile' => $pending->mobile,
            'password' => $pending->password_hash,
            'user_type' => 'CA',
            'role' => 'user',
            'is_admin' => 0,
            'status' => 'active',
            'account_status' => 'active',
            'credits' => 50,
            'api_token' => $token,
            'email_verified_at' => now(),
            'mobile_verified_at' => now(),
            'last_login_at' => now(),
        ]);

        // Invalidate pending signup
        $pending->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Account created and verified successfully.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->formatUser($user),
        ], 201);
    }

    /**
     * ====================================================================
     * 3. RESEND SIGNUP EMAIL OTP
     * POST /api/auth/signup/resend-email-otp
     * ====================================================================
     */
    public function resendSignupEmailOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'signup_token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Registration token is required.',
            ], 422);
        }

        $pending = PendingSignup::where('signup_token', $request->signup_token)->first();

        if (!$pending) {
            return response()->json([
                'status' => 'error',
                'message' => 'Registration session expired. Please sign up again.',
            ], 404);
        }

        // 60-second cooldown enforcement
        if ($pending->email_last_sent_at && $pending->email_last_sent_at->addSeconds(60)->isFuture()) {
            $secondsRemaining = $pending->email_last_sent_at->addSeconds(60)->diffInSeconds(now());
            return response()->json([
                'status' => 'error',
                'message' => 'Please wait before requesting another OTP.',
                'cooldown_seconds' => $secondsRemaining,
            ], 429);
        }

        $newEmailOtp = (string) random_int(100000, 999999);
        $newOtpHash = hash('sha256', $newEmailOtp);

        try {
            Mail::to($pending->email)->send(new OtpVerificationMail($newEmailOtp, $pending->name, 'signup'));
        } catch (\Throwable $e) {
            Log::error("SIGNUP_EMAIL_OTP_RESEND_FAILURE: " . $e->getMessage(), ['email' => $pending->email]);

            return response()->json([
                'status' => 'error',
                'code' => 'EMAIL_OTP_SEND_FAILED',
                'message' => "We couldn't send the email OTP. Please try again.",
            ], 422);
        }

        $pending->update([
            'email_otp_hash' => $newOtpHash,
            'email_expires_at' => now()->addMinutes(5),
            'email_attempts' => 0,
            'email_last_sent_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'New verification code sent to your email.',
            'cooldown_seconds' => 60,
        ]);
    }

    /**
     * ====================================================================
     * 4. RESEND SIGNUP MOBILE OTP
     * POST /api/auth/signup/resend-mobile-otp
     * ====================================================================
     */
    public function resendSignupMobileOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'signup_token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Registration token is required.',
            ], 422);
        }

        $pending = PendingSignup::where('signup_token', $request->signup_token)->first();

        if (!$pending) {
            return response()->json([
                'status' => 'error',
                'message' => 'Registration session expired. Please sign up again.',
            ], 404);
        }

        // 60-second cooldown enforcement
        if ($pending->mobile_last_sent_at && $pending->mobile_last_sent_at->addSeconds(60)->isFuture()) {
            $secondsRemaining = $pending->mobile_last_sent_at->addSeconds(60)->diffInSeconds(now());
            return response()->json([
                'status' => 'error',
                'message' => 'Please wait before requesting another OTP.',
                'cooldown_seconds' => $secondsRemaining,
            ], 429);
        }

        if ($this->twilioVerify->isEnabled()) {
            $twilioResult = $this->twilioVerify->sendVerification($pending->mobile);

            if (!$twilioResult['success']) {
                return response()->json([
                    'status' => 'error',
                    'code' => 'MOBILE_OTP_SEND_FAILED',
                    'message' => $twilioResult['message'] ?? "We couldn't send the mobile OTP. Please try again.",
                ], 422);
            }

            $pending->update([
                'mobile_otp_hash' => 'twilio_verify',
                'mobile_expires_at' => now()->addMinutes(5),
                'mobile_attempts' => 0,
                'mobile_last_sent_at' => now(),
            ]);
        } else {
            $newMobileOtp = (string) random_int(100000, 999999);
            $newOtpHash = hash('sha256', $newMobileOtp);

            $sent = $this->smsService->sendOtp($pending->mobile, $newMobileOtp, 'signup');
            if (!$sent) {
                return response()->json([
                    'status' => 'error',
                    'code' => 'MOBILE_OTP_SEND_FAILED',
                    'message' => "We couldn't send the mobile OTP. Please try again.",
                ], 422);
            }

            $pending->update([
                'mobile_otp_hash' => $newOtpHash,
                'mobile_expires_at' => now()->addMinutes(5),
                'mobile_attempts' => 0,
                'mobile_last_sent_at' => now(),
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'New verification code sent to your mobile number.',
            'cooldown_seconds' => 60,
        ]);
    }

    /**
     * ====================================================================
     * 5. LOGIN STEP 1: Email / Mobile + Password -> Targeted OTP Routing
     * POST /api/auth/login
     * If user logs in with Email -> Send OTP ONLY to registered Email
     * If user logs in with Mobile -> Send OTP ONLY to registered Mobile via Twilio Verify
     * ====================================================================
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'login' => 'required|string',
            'password' => 'required|string',
        ], [
            'login.required' => 'Please enter your Email ID or Mobile Number.',
            'password.required' => 'Please enter your password.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $loginInput = trim($request->login);
        $user = null;
        $channel = 'email'; // 'email' or 'sms'

        // Determine whether input is Email or Mobile Number
        if (str_contains($loginInput, '@')) {
            $channel = 'email';
            $normalizedEmail = $this->normalizeEmail($loginInput);
            $user = User::where('email', $normalizedEmail)->first();
        } else {
            $channel = 'sms';
            $normalizedMobile = $this->normalizeMobile($loginInput);
            if ($normalizedMobile) {
                $user = User::where('mobile', $normalizedMobile)
                    ->orWhere('mobile', substr($normalizedMobile, -10))
                    ->first();
            } else {
                $user = User::where('mobile', $loginInput)
                    ->orWhere('email', strtolower($loginInput))
                    ->first();
            }
        }

        // Verify password using Hash::check()
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid email/mobile or password.',
            ], 401);
        }

        // Verify account status
        if ($user->status === 'suspended' || $user->account_status === 'suspended') {
            return response()->json([
                'status' => 'error',
                'code' => 'ACCOUNT_SUSPENDED',
                'message' => 'Your account is currently suspended. Please contact support.',
            ], 403);
        }

        // Invalidate previous unverified login challenges for this user
        AuthOtp::where('user_id', $user->id)
            ->where('purpose', 'login')
            ->whereNull('verified_at')
            ->delete();

        LoginOtpVerification::where('user_id', $user->id)
            ->whereNull('verified_at')
            ->delete();

        $challengeId = (string) Str::uuid();

        $channel = 'email';
        $otp = (string) random_int(100000, 999999);
        $otpHash = hash('sha256', $otp);

        try {
            Mail::to($user->email)->send(new OtpVerificationMail($otp, $user->name, 'login'));
        } catch (\Throwable $e) {
            Log::error("EMAIL_OTP_DELIVERY_FAILURE: " . $e->getMessage(), [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);

            return response()->json([
                'status' => 'error',
                'code' => 'EMAIL_OTP_SEND_FAILED',
                'message' => "We couldn't send the email OTP. Please try again.",
            ], 422);
        }

        $maskedDestination = $this->maskEmail($user->email);
        $message = "We've sent a 6-digit OTP to your registered email.";

        // Save challenge in auth_otps table (valid for 5 minutes)
        AuthOtp::create([
            'user_id' => $user->id,
            'challenge_id' => $challengeId,
            'identifier' => ($channel === 'email' ? $user->email : ($user->mobile ?: $user->email)),
            'channel' => $channel,
            'purpose' => 'login',
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        // Keep legacy table synced
        LoginOtpVerification::create([
            'user_id' => $user->id,
            'challenge_id' => $challengeId,
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'requires_otp' => true,
            'challenge_id' => $challengeId,
            'channel' => $channel,
            'destination_masked' => $maskedDestination,
            'email_masked' => $maskedDestination, // backward compatibility
            'expires_in_seconds' => 300,
            'cooldown_seconds' => 60,
            'message' => $message,
        ]);
    }

    /**
     * ====================================================================
     * 6. VERIFY LOGIN OTP API
     * POST /api/auth/login/verify-otp
     * ====================================================================
     */
    public function verifyLoginOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'challenge_id' => 'required|string',
            'otp' => 'required|string|size:6',
        ], [
            'challenge_id.required' => 'Challenge ID is required.',
            'otp.required' => 'Please enter the 6-digit verification code.',
            'otp.size' => 'Verification code must be exactly 6 digits.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $challenge = AuthOtp::where('challenge_id', $request->challenge_id)
            ->where('purpose', 'login')
            ->whereNull('verified_at')
            ->first();

        // Fallback check to legacy table if not found
        if (!$challenge) {
            $legacy = LoginOtpVerification::where('challenge_id', $request->challenge_id)
                ->whereNull('verified_at')
                ->first();
            if ($legacy) {
                $challenge = $legacy;
            }
        }

        if (!$challenge) {
            return response()->json([
                'status' => 'error',
                'message' => 'No active login verification session found. Please sign in again.',
            ], 404);
        }

        // Check expiration (5 minutes)
        if ($challenge->expires_at->isPast()) {
            $challenge->delete();
            return response()->json([
                'status' => 'error',
                'message' => 'This OTP has expired. Please request a new OTP.',
            ], 422);
        }

        // Check attempt limit (5 attempts)
        if ($challenge->attempts >= $challenge->max_attempts) {
            $challenge->delete();
            return response()->json([
                'status' => 'error',
                'message' => 'Too many incorrect attempts. Please request a new OTP.',
            ], 422);
        }

        $challenge->increment('attempts');

        // Check verification (Twilio Verify or local hash)
        $inputOtp = trim($request->otp);
        $isVerified = false;
        $errorMsg = null;

        if (($challenge->channel ?? '') === 'sms' && ($challenge->otp_hash === 'twilio_verify' || $this->twilioVerify->isEnabled())) {
            $check = $this->twilioVerify->checkVerification($challenge->identifier, $inputOtp);

            if ($check['approved']) {
                $isVerified = true;
            } elseif (!empty($check['fallback_to_local'])) {
                $isVerified = (hash('sha256', $inputOtp) === $challenge->otp_hash);
            } else {
                $isVerified = false;
                $errorMsg = $check['message'] ?? 'Invalid OTP. Please check and try again.';
            }
        } else {
            $inputHash = hash('sha256', $inputOtp);
            $isVerified = ($inputHash === $challenge->otp_hash);
        }

        if (!$isVerified) {
            $remaining = max($challenge->max_attempts - $challenge->attempts, 0);
            if ($remaining === 0) {
                $challenge->delete();
                return response()->json([
                    'status' => 'error',
                    'message' => 'Too many incorrect attempts. Please request a new OTP.',
                ], 422);
            }

            return response()->json([
                'status' => 'error',
                'message' => $errorMsg ?: 'Invalid OTP. Please check and try again.',
                'attempts_remaining' => $remaining,
            ], 422);
        }

        // Mark OTP as verified & invalidate the challenge records
        $challenge->update(['verified_at' => now()]);
        $challenge->delete();

        LoginOtpVerification::where('challenge_id', $request->challenge_id)->delete();

        // Generate authenticated session / token
        $user = User::findOrFail($challenge->user_id);
        $token = bin2hex(random_bytes(32));

        $user->update([
            'api_token' => $token,
            'last_login_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Login successful.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * ====================================================================
     * 7. RESEND LOGIN OTP API
     * POST /api/auth/login/resend-otp
     * ====================================================================
     */
    public function resendLoginOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'challenge_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Challenge ID is required.',
            ], 422);
        }

        $challenge = AuthOtp::where('challenge_id', $request->challenge_id)
            ->where('purpose', 'login')
            ->whereNull('verified_at')
            ->first();

        if (!$challenge) {
            $legacy = LoginOtpVerification::where('challenge_id', $request->challenge_id)
                ->whereNull('verified_at')
                ->first();
            if ($legacy) {
                $challenge = $legacy;
            }
        }

        if (!$challenge) {
            return response()->json([
                'status' => 'error',
                'message' => 'Login verification session expired. Please sign in again.',
            ], 404);
        }

        // 60-second cooldown enforcement
        if ($challenge->last_sent_at && $challenge->last_sent_at->addSeconds(60)->isFuture()) {
            $secondsRemaining = $challenge->last_sent_at->addSeconds(60)->diffInSeconds(now());
            return response()->json([
                'status' => 'error',
                'message' => 'Please wait before requesting another OTP.',
                'cooldown_seconds' => $secondsRemaining,
            ], 429);
        }

        $user = User::findOrFail($challenge->user_id);
        $otp = (string) random_int(100000, 999999);
        $otpHash = hash('sha256', $otp);

        try {
            Mail::to($user->email)->send(new OtpVerificationMail($otp, $user->name, 'login'));
        } catch (\Throwable $e) {
            Log::error("EMAIL_OTP_RESEND_FAILURE: " . $e->getMessage(), [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);

            return response()->json([
                'status' => 'error',
                'code' => 'EMAIL_OTP_SEND_FAILED',
                'message' => "We couldn't send the email OTP. Please try again.",
            ], 422);
        }
        $msg = 'A new verification code has been sent to your registered email.';

        // Update challenge with new OTP hash, resetting expiry and attempts
        $challenge->update([
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'last_sent_at' => now(),
        ]);

        LoginOtpVerification::where('challenge_id', $request->challenge_id)->update([
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'last_sent_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => $msg,
            'cooldown_seconds' => 60,
        ]);
    }

    /**
     * ====================================================================
     * 8. FORGOT PASSWORD FLOW (EMAIL-BASED VERIFICATION)
     * POST /api/auth/forgot-password/request
     * POST /api/auth/forgot-password/reset
     * ====================================================================
     */
    public function forgotPasswordRequest(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'login' => 'required|string',
        ], [
            'login.required' => 'Please enter your registered Email ID or Mobile Number.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $loginInput = trim($request->login);
        $user = null;

        if (str_contains($loginInput, '@')) {
            $user = User::where('email', $this->normalizeEmail($loginInput))->first();
        } else {
            $normalizedMobile = $this->normalizeMobile($loginInput);
            if ($normalizedMobile) {
                $user = User::where('mobile', $normalizedMobile)
                    ->orWhere('mobile', substr($normalizedMobile, -10))
                    ->first();
            }
        }

        if (!$user) {
            return response()->json([
                'status' => 'success',
                'message' => 'If an account exists with these details, a verification code has been dispatched to your registered email.',
                'destination_masked' => 'your registered email',
            ]);
        }

        $otp = (string) random_int(100000, 999999);
        $otpHash = hash('sha256', $otp);

        // Delete older unverified OTPs for this user
        OtpVerification::where('user_id', $user->id)->delete();
        AuthOtp::where('user_id', $user->id)->where('purpose', 'password_reset')->delete();

        // Save in OtpVerification and AuthOtp
        OtpVerification::create([
            'user_id' => $user->id,
            'channel' => 'email',
            'destination' => $user->email,
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        AuthOtp::create([
            'user_id' => $user->id,
            'identifier' => $user->email,
            'channel' => 'email',
            'purpose' => 'password_reset',
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        try {
            Mail::to($user->email)->send(new OtpVerificationMail($otp, $user->name, 'password_reset'));
        } catch (\Throwable $e) {
            Log::error("FORGOT_PASSWORD_EMAIL_FAILURE: " . $e->getMessage(), ['user_id' => $user->id]);
            return response()->json([
                'status' => 'error',
                'message' => 'Unable to send verification code. Please try again.',
            ], 500);
        }

        $maskedEmail = $this->maskEmail($user->email);

        return response()->json([
            'status' => 'success',
            'message' => 'Verification code sent to your registered email.',
            'destination_masked' => $maskedEmail,
        ]);
    }

    public function forgotPasswordReset(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'login' => 'required|string',
            'otp' => 'required|string|size:6',
            'password' => 'required|string|min:8|confirmed',
        ], [
            'login.required' => 'Login identifier is required.',
            'otp.required' => 'Please enter the 6-digit verification code.',
            'otp.size' => 'OTP must be 6 digits.',
            'password.required' => 'Please enter your new password.',
            'password.min' => 'Password must be at least 8 characters.',
            'password.confirmed' => 'Passwords do not match.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $loginInput = trim($request->login);
        $user = null;

        if (str_contains($loginInput, '@')) {
            $user = User::where('email', $this->normalizeEmail($loginInput))->first();
        } else {
            $normalizedMobile = $this->normalizeMobile($loginInput);
            if ($normalizedMobile) {
                $user = User::where('mobile', $normalizedMobile)
                    ->orWhere('mobile', substr($normalizedMobile, -10))
                    ->first();
            }
        }

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'No account found with this identifier.',
            ], 404);
        }

        $verification = OtpVerification::where('user_id', $user->id)
            ->whereNull('verified_at')
            ->latest()
            ->first();

        if (!$verification || $verification->expires_at->isPast()) {
            return response()->json([
                'status' => 'error',
                'message' => 'This verification code has expired. Please request a new code.',
            ], 422);
        }

        if ($verification->attempts >= $verification->max_attempts) {
            $verification->delete();
            return response()->json([
                'status' => 'error',
                'message' => 'Too many attempts. Please request a new verification code.',
            ], 422);
        }

        $verification->increment('attempts');

        if (hash('sha256', trim($request->otp)) !== $verification->otp_hash) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid verification code.',
            ], 422);
        }

        // Update password
        $user->update([
            'password' => Hash::make($request->password),
            'last_login_at' => now(),
        ]);

        $verification->delete();
        AuthOtp::where('user_id', $user->id)->where('purpose', 'password_reset')->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Password reset successfully. You can now login with your new password.',
        ]);
    }

    /**
     * ====================================================================
     * 9. AUTHENTICATED USER & PROFILE
     * ====================================================================
     */
    protected function resolveUser(Request $request): ?User
    {
        $token = $request->bearerToken();
        if ($token) {
            $user = User::where('api_token', $token)->first();
            if ($user) {
                return $user;
            }
        }
        return $request->user();
    }

    public function user(Request $request)
    {
        $user = $this->resolveUser($request);

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $data = $this->formatUser($user);
        $data['user'] = $this->formatUser($user);

        return response()->json($data);
    }

    public function profile(Request $request)
    {
        return $this->user($request);
    }

    public function completeProfile(Request $request)
    {
        $user = $this->resolveUser($request);

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:100',
            'mobile' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $normalizedMobile = $this->normalizeMobile($request->mobile);
        if (!$normalizedMobile) {
            return response()->json(['message' => 'Validation failed', 'errors' => ['mobile' => ['Please enter a valid 10-digit mobile number.']]], 422);
        }

        $user->update([
            'name' => trim($request->name),
            'mobile' => $normalizedMobile,
            'mobile_verified_at' => $user->mobile_verified_at ?? now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully.',
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * ====================================================================
     * 10. USER LOGOUT
     * POST /api/auth/logout
     * ====================================================================
     */
    public function logout(Request $request)
    {
        $token = $request->bearerToken();
        if ($token) {
            User::where('api_token', $token)->update(['api_token' => null]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Signed out successfully.',
        ]);
    }

    /**
     * Firebase Google Auth (Kept for backend legacy compatibility, not in UI)
     */
    public function loginWithFirebase(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $verified = $this->tokenVerifier->verifyIdToken($request->id_token);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'INVALID_TOKEN',
                'message' => 'Google authentication failed: ' . $e->getMessage(),
            ], 401);
        }

        $googleUid = $verified['uid'];
        $email = $this->normalizeEmail($verified['email'] ?? '');
        $tokenName = trim($verified['name'] ?? '');
        $picture = $verified['picture'] ?? null;

        if (empty($email)) {
            return response()->json([
                'status' => 'error',
                'message' => 'No verified email address found on Google profile.',
            ], 422);
        }

        $user = User::where('firebase_uid', $googleUid)
            ->orWhere('google_id', $googleUid)
            ->orWhere('email', $email)
            ->first();

        if (!$user) {
            $user = User::create([
                'name' => $tokenName ?: explode('@', $email)[0],
                'email' => $email,
                'firebase_uid' => $googleUid,
                'google_id' => $googleUid,
                'avatar' => $picture,
                'provider' => 'google',
                'user_type' => 'CA',
                'credits' => 50,
                'status' => 'active',
                'account_status' => 'active',
                'email_verified_at' => now(),
                'last_login_at' => now(),
            ]);
        } else {
            $user->update([
                'firebase_uid' => $googleUid,
                'last_login_at' => now(),
                'avatar' => $picture ?: $user->avatar,
            ]);
        }

        $token = bin2hex(random_bytes(32));
        $user->update(['api_token' => $token]);

        return response()->json([
            'status' => 'success',
            'message' => 'Authenticated successfully.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->formatUser($user),
        ]);
    }
}
