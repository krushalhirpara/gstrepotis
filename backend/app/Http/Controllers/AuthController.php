<?php

namespace App\Http\Controllers;

use App\Models\AuthOtp;
use App\Models\LoginOtpVerification;
use App\Models\OtpVerification;
use App\Models\User;
use App\Mail\OtpVerificationMail;
use App\Services\FirebaseTokenVerifier;
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

    public function __construct(FirebaseTokenVerifier $tokenVerifier)
    {
        $this->tokenVerifier = $tokenVerifier;
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
     * Mask Indian mobile number (e.g., +919876543210 -> +91 ******3210)
     */
    public function maskMobile(string $mobile): string
    {
        $cleanDigits = preg_replace('/\D/', '', $mobile);
        $last4 = substr($cleanDigits, -4);
        return '+91 ******' . $last4;
    }

    /**
     * Format user array response
     */
    public function formatUser(User $user): array
    {
        $provider = $user->auth_provider ?? ($user->provider ?? 'email_password');

        return [
            'id' => $user->id,
            'firebase_uid' => $user->firebase_uid ?? $user->google_id,
            'google_id' => $user->google_id ?? $user->firebase_uid,
            'name' => $user->name,
            'full_name' => $user->name,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'avatar' => $user->avatar,
            'user_type' => $user->user_type ?? 'CA',
            'role' => $user->is_admin ? 'Admin' : ($user->user_type ?? 'User'),
            'is_admin' => (bool) $user->is_admin,
            'status' => $user->status ?? 'active',
            'account_status' => $user->account_status ?? 'active',
            'credits' => $user->credits ?? 50,
            'provider' => $provider,
            'auth_provider' => $provider,
            'created_at' => $user->created_at ? $user->created_at->toIso8601String() : null,
            'last_login_at' => $user->last_login_at ? $user->last_login_at->toIso8601String() : null,
            'email_verified_at' => $user->email_verified_at ? $user->email_verified_at->toIso8601String() : null,
            'mobile_verified_at' => $user->mobile_verified_at ? $user->mobile_verified_at->toIso8601String() : null,
        ];
    }

    /**
     * ====================================================================
     * 1. PRE-SIGNUP VALIDATION API
     * POST /api/auth/signup/validate
     * Checks input rules & uniqueness before frontend starts Firebase SMS OTP
     * ====================================================================
     */
    public function validateSignup(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:100',
            'email' => 'required|email|max:150',
            'mobile' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    if (!$this->normalizeMobile($value)) {
                        $fail('Please enter a valid 10-digit Indian mobile number.');
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

        // Duplicate checks
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

        return response()->json([
            'status' => 'success',
            'message' => 'Validation passed. Proceed to mobile verification.',
            'normalized_mobile' => $normalizedMobile,
        ]);
    }

    /**
     * ====================================================================
     * 2. NORMAL SIGNUP API (WITH FIREBASE PHONE AUTH VERIFICATION)
     * POST /api/auth/signup or POST /api/auth/register
     * Verifies server-side Firebase ID token from Phone Auth & creates user
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
                        $fail('Please enter a valid 10-digit Indian mobile number.');
                    }
                },
            ],
            'password' => 'required|string|min:8|confirmed',
            'id_token' => 'required|string',
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
            'id_token.required' => 'Firebase verification token is required.',
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

        // Verify Firebase Phone ID token server-side
        try {
            $verified = $this->tokenVerifier->verifyIdToken($request->id_token);
        } catch (Throwable $e) {
            Log::warning('SIGNUP_FIREBASE_TOKEN_INVALID: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'code' => 'INVALID_FIREBASE_TOKEN',
                'message' => 'Firebase verification failed: ' . $e->getMessage(),
            ], 422);
        }

        $firebaseUid = $verified['uid'];
        $tokenPhone = $this->normalizeMobile($verified['phone_number'] ?? '');

        // Compare verified Firebase phone_number with submitted mobile number
        if (!$tokenPhone || $tokenPhone !== $normalizedMobile) {
            return response()->json([
                'status' => 'error',
                'code' => 'PHONE_MISMATCH',
                'message' => 'Verified mobile number does not match the submitted mobile number.',
                'errors' => [
                    'mobile' => ['Verified mobile number does not match the submitted mobile number.'],
                ],
            ], 422);
        }

        // Duplicate checks against registered users
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

        if (User::where('firebase_uid', $firebaseUid)->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'This phone number identity is already registered. Please sign in.',
            ], 422);
        }

        // Create Active User Account
        $token = bin2hex(random_bytes(32));

        $user = User::create([
            'name' => trim($request->name),
            'email' => $normalizedEmail,
            'mobile' => $normalizedMobile,
            'password' => Hash::make($request->password),
            'firebase_uid' => $firebaseUid,
            'user_type' => 'CA',
            'role' => 'user',
            'is_admin' => 0,
            'status' => 'active',
            'account_status' => 'active',
            'auth_provider' => 'phone',
            'provider' => 'email_password',
            'credits' => 50,
            'api_token' => $token,
            'mobile_verified_at' => now(),
            'last_login_at' => now(),
        ]);

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
     * 3. NORMAL LOGIN STEP 1
     * POST /api/auth/login
     * If Email -> Sends 6-digit Email OTP via Laravel SMTP
     * If Mobile -> Triggers Mobile Firebase SMS OTP challenge
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
        $isEmail = str_contains($loginInput, '@');

        // Determine whether input is Email or Mobile Number
        if ($isEmail) {
            $normalizedEmail = $this->normalizeEmail($loginInput);
            $user = User::where('email', $normalizedEmail)->first();
        } else {
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

        // -------------------------------------------------------------
        // BRANCH A: User logged in with EMAIL -> 6-digit EMAIL OTP via SMTP
        // -------------------------------------------------------------
        if ($isEmail) {
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
                    'message' => "We couldn't send the email OTP. Please check your email configuration or try again.",
                ], 422);
            }

            $maskedDestination = $this->maskEmail($user->email);

            AuthOtp::create([
                'user_id' => $user->id,
                'challenge_id' => $challengeId,
                'identifier' => $user->email,
                'channel' => 'email',
                'purpose' => 'login',
                'otp_hash' => $otpHash,
                'expires_at' => now()->addMinutes(5),
                'attempts' => 0,
                'max_attempts' => 5,
                'last_sent_at' => now(),
            ]);

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
                'channel' => 'email',
                'challenge_id' => $challengeId,
                'destination_masked' => $maskedDestination,
                'email_masked' => $maskedDestination,
                'expires_in_seconds' => 300,
                'cooldown_seconds' => 60,
                'message' => "We've sent a 6-digit OTP to your registered email.",
            ]);
        }

        // -------------------------------------------------------------
        // BRANCH B: User logged in with MOBILE -> Real Firebase SMS OTP
        // -------------------------------------------------------------
        $userMobile = $this->normalizeMobile($user->mobile) ?: $user->mobile;
        $maskedMobile = $this->maskMobile($userMobile);

        AuthOtp::create([
            'user_id' => $user->id,
            'challenge_id' => $challengeId,
            'identifier' => $userMobile,
            'channel' => 'mobile',
            'purpose' => 'login',
            'otp_hash' => hash('sha256', $challengeId),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'requires_otp' => true,
            'channel' => 'mobile',
            'challenge_id' => $challengeId,
            'mobile' => $userMobile,
            'destination_masked' => $maskedMobile,
            'mobile_masked' => $maskedMobile,
            'expires_in_seconds' => 300,
            'cooldown_seconds' => 60,
            'message' => "We've sent a 6-digit OTP to your registered mobile number.",
        ]);
    }

    /**
     * ====================================================================
     * 4. VERIFY EMAIL LOGIN OTP API
     * POST /api/auth/login/verify-otp or POST /api/auth/login/verify
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

        // Check verification via SHA-256 hash
        $inputOtp = trim($request->otp);
        $inputHash = hash('sha256', $inputOtp);
        $isVerified = ($inputHash === $challenge->otp_hash);

        if (!$isVerified) {
            $remaining = max(0, $challenge->max_attempts - $challenge->attempts);

            if ($remaining === 0) {
                $challenge->delete();
                return response()->json([
                    'status' => 'error',
                    'message' => 'Too many incorrect attempts. Please request a new OTP.',
                ], 422);
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Invalid OTP. Please check and try again.',
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
     * 5. RESEND EMAIL LOGIN OTP API
     * POST /api/auth/login/resend-otp or POST /api/auth/login/resend
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

        // Update challenge with new OTP hash
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
            'message' => 'A new verification code has been sent to your registered email.',
            'cooldown_seconds' => 60,
        ]);
    }

    /**
     * ====================================================================
     * 6. VERIFY MOBILE LOGIN FIREBASE TOKEN API
     * POST /api/auth/login/verify-mobile or POST /api/auth/login/verify-firebase
     * ====================================================================
     */
    public function verifyMobileLoginFirebase(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_token' => 'required|string',
            'mobile' => 'nullable|string',
            'challenge_id' => 'nullable|string',
        ], [
            'id_token.required' => 'Firebase ID token is required.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $verified = $this->tokenVerifier->verifyIdToken($request->id_token);
        } catch (Throwable $e) {
            Log::warning('MOBILE_LOGIN_FIREBASE_TOKEN_INVALID: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'code' => 'INVALID_TOKEN',
                'message' => 'Mobile authentication verification failed: ' . $e->getMessage(),
            ], 401);
        }

        $firebaseUid = $verified['uid'];
        $tokenPhone = $this->normalizeMobile($verified['phone_number'] ?? '');

        if (!$tokenPhone) {
            return response()->json([
                'status' => 'error',
                'message' => 'No verified mobile number present in Firebase token.',
            ], 422);
        }

        // If client submitted mobile, verify it matches
        if ($request->filled('mobile')) {
            $submittedMobile = $this->normalizeMobile($request->mobile);
            if ($submittedMobile && $submittedMobile !== $tokenPhone) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Verified mobile number does not match submitted mobile number.',
                ], 422);
            }
        }

        // Find existing user by verified phone number or challenge
        $user = User::where('mobile', $tokenPhone)
            ->orWhere('mobile', substr($tokenPhone, -10))
            ->orWhere('firebase_uid', $firebaseUid)
            ->first();

        if (!$user && $request->filled('challenge_id')) {
            $challenge = AuthOtp::where('challenge_id', $request->challenge_id)->first();
            if ($challenge) {
                $user = User::find($challenge->user_id);
            }
        }

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'No registered user found for this mobile number. Please sign up.',
            ], 404);
        }

        if ($user->status === 'suspended' || $user->account_status === 'suspended') {
            return response()->json([
                'status' => 'error',
                'code' => 'ACCOUNT_SUSPENDED',
                'message' => 'Your account is suspended. Please contact support.',
            ], 403);
        }

        // Invalidate challenge
        if ($request->filled('challenge_id')) {
            AuthOtp::where('challenge_id', $request->challenge_id)->delete();
        }

        $token = bin2hex(random_bytes(32));
        $user->update([
            'firebase_uid' => $firebaseUid,
            'mobile_verified_at' => $user->mobile_verified_at ?? now(),
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
     * 7. GOOGLE AUTH VERIFY & SIGN-IN / PROFILE INCOMPLETE CHECK
     * POST /api/auth/google or POST /api/auth/google/firebase
     * ====================================================================
     */
    public function loginWithFirebase(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_token' => 'required|string',
        ], [
            'id_token.required' => 'Google verification token is required.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
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

        // Find existing user by Google UID or verified Email
        $user = User::where('firebase_uid', $googleUid)
            ->orWhere('google_id', $googleUid)
            ->orWhere('email', $email)
            ->first();

        // If user already exists AND has a verified mobile number -> Log in directly
        if ($user && $user->mobile && $user->mobile_verified_at) {
            $token = bin2hex(random_bytes(32));
            $user->update([
                'firebase_uid' => $googleUid,
                'google_id' => $googleUid,
                'avatar' => $picture ?: $user->avatar,
                'last_login_at' => now(),
                'api_token' => $token,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Authenticated successfully.',
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $this->formatUser($user),
            ]);
        }

        // Otherwise, new user or missing mobile verification -> Require Profile Completion + Mobile OTP
        return response()->json([
            'status' => 'profile_incomplete',
            'requires_profile_completion' => true,
            'message' => 'Please complete your profile and verify your mobile number.',
            'google_user' => [
                'uid' => $googleUid,
                'email' => $email,
                'name' => $tokenName ?: explode('@', $email)[0],
                'picture' => $picture,
            ],
        ]);
    }

    /**
     * ====================================================================
     * 8. CHECK MOBILE NUMBER AVAILABILITY
     * POST /api/auth/check-mobile
     * ====================================================================
     */
    public function checkMobileAvailability(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'mobile' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    if (!$this->normalizeMobile($value)) {
                        $fail('Please enter a valid 10-digit Indian mobile number.');
                    }
                },
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $normalizedMobile = $this->normalizeMobile($request->mobile);

        if (User::where('mobile', $normalizedMobile)
            ->orWhere('mobile', substr($normalizedMobile, -10))
            ->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'This mobile number is already registered to another account.',
                'errors' => [
                    'mobile' => ['This mobile number is already registered to another account.'],
                ],
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'available' => true,
            'normalized_mobile' => $normalizedMobile,
        ]);
    }

    /**
     * ====================================================================
     * 9. GOOGLE COMPLETE SIGNUP + MOBILE OTP VERIFICATION
     * POST /api/auth/google/complete-signup
     * ====================================================================
     */
    public function completeGoogleSignup(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone_id_token' => 'required|string',
            'google_uid' => 'required|string',
            'name' => 'required|string|min:2|max:100',
            'email' => 'required|email|max:150',
            'mobile' => [
                'required',
                'string',
                function ($attribute, $value, $fail) {
                    if (!$this->normalizeMobile($value)) {
                        $fail('Please enter a valid 10-digit Indian mobile number.');
                    }
                },
            ],
            'avatar' => 'nullable|string',
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

        // Verify Firebase Phone ID token server-side
        try {
            $verified = $this->tokenVerifier->verifyIdToken($request->phone_id_token);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'INVALID_TOKEN',
                'message' => 'Mobile verification token is invalid: ' . $e->getMessage(),
            ], 422);
        }

        $tokenPhone = $this->normalizeMobile($verified['phone_number'] ?? '');
        if (!$tokenPhone || $tokenPhone !== $normalizedMobile) {
            return response()->json([
                'status' => 'error',
                'code' => 'PHONE_MISMATCH',
                'message' => 'Verified mobile number does not match the submitted contact number.',
                'errors' => [
                    'mobile' => ['Verified mobile number does not match the submitted contact number.'],
                ],
            ], 422);
        }

        // Check if mobile is already used by another user
        $existingMobileUser = User::where('mobile', $normalizedMobile)
            ->orWhere('mobile', substr($normalizedMobile, -10))
            ->first();

        if ($existingMobileUser && $existingMobileUser->email !== $normalizedEmail) {
            return response()->json([
                'status' => 'error',
                'message' => 'This mobile number is already registered to another account.',
                'errors' => [
                    'mobile' => ['This mobile number is already registered to another account.'],
                ],
            ], 422);
        }

        // Find existing user or create
        $user = User::where('email', $normalizedEmail)
            ->orWhere('firebase_uid', $request->google_uid)
            ->orWhere('google_id', $request->google_uid)
            ->first();

        $token = bin2hex(random_bytes(32));

        if (!$user) {
            $user = User::create([
                'name' => trim($request->name),
                'email' => $normalizedEmail,
                'mobile' => $normalizedMobile,
                'firebase_uid' => $request->google_uid,
                'google_id' => $request->google_uid,
                'avatar' => $request->avatar,
                'auth_provider' => 'google',
                'provider' => 'google',
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
        } else {
            $user->update([
                'name' => trim($request->name),
                'mobile' => $normalizedMobile,
                'firebase_uid' => $request->google_uid,
                'google_id' => $request->google_uid,
                'avatar' => $request->avatar ?: $user->avatar,
                'auth_provider' => 'google',
                'provider' => 'google',
                'status' => 'active',
                'account_status' => 'active',
                'mobile_verified_at' => now(),
                'email_verified_at' => $user->email_verified_at ?? now(),
                'api_token' => $token,
                'last_login_at' => now(),
            ]);
        }

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
     * 10. FORGOT PASSWORD REQUEST & RESET (EMAIL-BASED ONLY VIA SMTP)
     * ====================================================================
     */
    public function forgotPasswordRequest(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'login' => 'required|string',
        ], [
            'login.required' => 'Please enter your registered email address or mobile number.',
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

        // Generic safe response to prevent user enumeration
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
     * 11. AUTHENTICATED USER & PROFILE
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
     * 12. USER LOGOUT
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
}
