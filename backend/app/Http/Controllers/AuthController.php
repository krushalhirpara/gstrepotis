<?php

namespace App\Http\Controllers;

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
     * Validate and normalize Indian mobile number to canonical +91XXXXXXXXXX format.
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
     * Mask email address (e.g., krushal@gmail.com -> k***@gmail.com)
     */
    public function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        $name = $parts[0] ?? 'user';
        $domain = $parts[1] ?? 'gmail.com';

        if (strlen($name) <= 1) {
            $maskedName = $name . '***';
        } else {
            $maskedName = substr($name, 0, 1) . '***';
        }

        return $maskedName . '@' . $domain;
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
     * 1. SIGNUP FLOW (OPTION 1: Email + Password Direct Registration)
     * POST /api/auth/register or POST /api/auth/signup
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

        // Duplicate checks against users table
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

        // Hash password securely with Bcrypt
        $passwordHash = Hash::make($request->password);
        $token = bin2hex(random_bytes(32));

        // Create user in MySQL
        $user = User::create([
            'name' => trim($request->name),
            'email' => $normalizedEmail,
            'mobile' => $normalizedMobile,
            'password' => $passwordHash,
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

        return response()->json([
            'status' => 'success',
            'message' => 'Account created successfully.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->formatUser($user),
        ], 201);
    }

    /**
     * ====================================================================
     * 2. LOGIN STEP 1: Email / Mobile + Password -> EMAIL OTP DISPATCH
     * POST /api/auth/login
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

        // Determine whether input is Email or Mobile Number
        if (str_contains($loginInput, '@')) {
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

        // CRITICAL: DO NOT log the user in yet. Issue Pending OTP Challenge.
        // Generate cryptographically secure 6-digit server-side OTP
        $otp = (string) random_int(100000, 999999);
        $otpHash = hash('sha256', $otp);
        $challengeId = (string) Str::uuid();

        // Invalidate previous unverified login challenges for this user
        LoginOtpVerification::where('user_id', $user->id)
            ->whereNull('verified_at')
            ->delete();

        // Save challenge in login_otp_verifications table (valid for 5 minutes)
        LoginOtpVerification::create([
            'user_id' => $user->id,
            'challenge_id' => $challengeId,
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        // Send OTP to user's REGISTERED EMAIL ADDRESS
        try {
            Mail::to($user->email)->send(new OtpVerificationMail($otp, $user->name));
        } catch (\Throwable $e) {
            Log::error("EMAIL_OTP_DELIVERY_FAILURE: " . $e->getMessage(), [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Unable to send verification code. Please try again.',
            ], 500);
        }

        $maskedEmail = $this->maskEmail($user->email);

        return response()->json([
            'status' => 'success',
            'requires_otp' => true,
            'challenge_id' => $challengeId,
            'email_masked' => $maskedEmail,
            'expires_in_seconds' => 300,
            'cooldown_seconds' => 30,
            'message' => 'A 6-digit verification code has been sent to your registered email.',
        ]);
    }

    /**
     * ====================================================================
     * 3. VERIFY LOGIN OTP API
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

        $challenge = LoginOtpVerification::where('challenge_id', $request->challenge_id)
            ->whereNull('verified_at')
            ->first();

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
                'message' => 'This verification code has expired. Please request a new code.',
            ], 422);
        }

        // Check attempt limit (5 attempts)
        if ($challenge->attempts >= $challenge->max_attempts) {
            $challenge->delete();
            return response()->json([
                'status' => 'error',
                'message' => 'Too many attempts. Please request a new verification code.',
            ], 422);
        }

        $challenge->increment('attempts');

        // Verify OTP hash
        $inputHash = hash('sha256', trim($request->otp));
        if ($inputHash !== $challenge->otp_hash) {
            $remaining = max($challenge->max_attempts - $challenge->attempts, 0);
            if ($remaining === 0) {
                $challenge->delete();
                return response()->json([
                    'status' => 'error',
                    'message' => 'Too many attempts. Please request a new verification code.',
                ], 422);
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Invalid verification code.',
                'attempts_remaining' => $remaining,
            ], 422);
        }

        // Mark OTP as verified & invalidate the challenge record
        $challenge->update(['verified_at' => now()]);
        $challenge->delete();

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
     * 4. RESEND LOGIN OTP API
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

        $challenge = LoginOtpVerification::where('challenge_id', $request->challenge_id)
            ->whereNull('verified_at')
            ->first();

        if (!$challenge) {
            return response()->json([
                'status' => 'error',
                'message' => 'Login verification session expired. Please sign in again.',
            ], 404);
        }

        // 30-second cooldown enforcement
        if ($challenge->last_sent_at && $challenge->last_sent_at->addSeconds(30)->isFuture()) {
            $secondsRemaining = $challenge->last_sent_at->addSeconds(30)->diffInSeconds(now());
            return response()->json([
                'status' => 'error',
                'message' => 'Please wait before requesting another code.',
                'cooldown_seconds' => $secondsRemaining,
            ], 429);
        }

        $user = User::findOrFail($challenge->user_id);
        $otp = (string) random_int(100000, 999999);
        $otpHash = hash('sha256', $otp);

        try {
            Mail::to($user->email)->send(new OtpVerificationMail($otp, $user->name));
        } catch (\Throwable $e) {
            Log::error("EMAIL_OTP_RESEND_FAILURE: " . $e->getMessage(), [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Unable to send verification code. Please try again.',
            ], 500);
        }

        // Update challenge with new OTP hash, resetting expiry and attempts
        $challenge->update([
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'last_sent_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'New verification code has been sent to your registered email.',
            'cooldown_seconds' => 30,
        ]);
    }

    /**
     * ====================================================================
     * 5. FORGOT PASSWORD FLOW (EMAIL-BASED VERIFICATION)
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

        try {
            Mail::to($user->email)->send(new OtpVerificationMail($otp, $user->name));
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

        return response()->json([
            'status' => 'success',
            'message' => 'Password reset successfully. You can now login with your new password.',
        ]);
    }

    /**
     * ====================================================================
     * 6. AUTHENTICATED USER & PROFILE
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
     * 7. USER LOGOUT
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
