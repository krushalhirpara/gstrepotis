<?php

namespace App\Http\Controllers;

use App\Models\RegistrationVerification;
use App\Models\OtpVerification;
use App\Models\User;
use App\Services\FirebaseTokenVerifier;
use App\Services\SmsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;

class AuthController extends Controller
{
    protected FirebaseTokenVerifier $tokenVerifier;
    protected SmsService $smsService;

    public function __construct(FirebaseTokenVerifier $tokenVerifier, SmsService $smsService)
    {
        $this->tokenVerifier = $tokenVerifier;
        $this->smsService = $smsService;
    }

    /**
     * Normalize email: trim and convert to lowercase
     */
    protected function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    /**
     * Validate and normalize Indian mobile number to canonical +91XXXXXXXXXX format.
     *
     * @param string|null $mobile
     * @return string|null Normalized mobile or null if invalid
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
     * Step 1: Request Signup Mobile OTP
     * POST /api/auth/register/request-otp
     */
    public function requestRegistrationOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:100',
            'email' => 'required|email|max:150',
            'mobile' => 'required|string',
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
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $normalizedEmail = $this->normalizeEmail($request->email);
        $normalizedMobile = $this->normalizeMobile($request->mobile);

        if (!$normalizedMobile) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => [
                    'mobile' => ['Please enter a valid 10-digit mobile number.'],
                ],
            ], 422);
        }

        // Duplicate checks against users table
        if (User::where('email', $normalizedEmail)->exists()) {
            return response()->json([
                'message' => 'An account with this email already exists. Please login.',
                'errors' => [
                    'email' => ['An account with this email already exists. Please login.'],
                ],
            ], 422);
        }

        if (User::where('mobile', $normalizedMobile)->exists()) {
            return response()->json([
                'message' => 'An account with this mobile number already exists. Please login.',
                'errors' => [
                    'mobile' => ['An account with this mobile number already exists. Please login.'],
                ],
            ], 422);
        }

        // Generate cryptographically secure 6-digit OTP server-side
        $otp = (string) random_int(100000, 999999);
        $otpHash = hash('sha256', $otp);
        $passwordHash = Hash::make($request->password);
        $registrationId = (string) Str::uuid();

        // Dispatch SMS OTP via SmsService
        $sent = $this->smsService->sendOtp($normalizedMobile, $otp);
        if (!$sent) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unable to send OTP SMS to your mobile number. Please try again or check number.',
            ], 500);
        }

        // Clean any older temporary registrations for this email/mobile
        RegistrationVerification::where('email', $normalizedEmail)
            ->orWhere('mobile', $normalizedMobile)
            ->delete();

        // Store pre-registration data temporarily with 5-minute expiry
        RegistrationVerification::create([
            'registration_id' => $registrationId,
            'name' => trim($request->name),
            'email' => $normalizedEmail,
            'mobile' => $normalizedMobile,
            'password_hash' => $passwordHash,
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        $tenDigit = substr($normalizedMobile, -10);
        $maskedMobile = '+91 ' . substr($tenDigit, 0, 5) . ' ' . substr($tenDigit, 5);

        return response()->json([
            'status' => 'success',
            'message' => 'OTP has been sent to your mobile number.',
            'registration_id' => $registrationId,
            'mobile_masked' => $maskedMobile,
            'expires_in_seconds' => 300,
            'cooldown_seconds' => 30,
        ]);
    }

    /**
     * Step 2: Verify Mobile OTP & Create User Account
     * POST /api/auth/register/verify-otp
     */
    public function verifyRegistrationOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'registration_id' => 'required|string',
            'otp' => 'required|string|size:6',
        ], [
            'registration_id.required' => 'Registration session ID is required.',
            'otp.required' => 'Please enter the 6-digit OTP.',
            'otp.size' => 'OTP must be exactly 6 digits.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $reg = RegistrationVerification::where('registration_id', $request->registration_id)
            ->whereNull('verified_at')
            ->first();

        if (!$reg) {
            return response()->json([
                'status' => 'error',
                'message' => 'No active registration verification session found. Please register again.',
            ], 404);
        }

        // Check expiration
        if ($reg->expires_at->isPast()) {
            return response()->json([
                'status' => 'error',
                'message' => 'This OTP has expired. Please request a new OTP.',
            ], 422);
        }

        // Check attempts
        if ($reg->attempts >= $reg->max_attempts) {
            $reg->delete();
            return response()->json([
                'status' => 'error',
                'message' => 'Too many attempts. Please request a new OTP.',
            ], 422);
        }

        $reg->increment('attempts');

        // Check hash
        $inputHash = hash('sha256', trim($request->otp));
        if ($inputHash !== $reg->otp_hash) {
            $remaining = max($reg->max_attempts - $reg->attempts, 0);
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid OTP. Please try again.',
                'attempts_remaining' => $remaining,
            ], 422);
        }

        // Mark verified & create user account
        $reg->update(['verified_at' => now()]);

        // Safety check duplicate
        $existing = User::where('email', $reg->email)->orWhere('mobile', $reg->mobile)->first();
        if ($existing) {
            $token = bin2hex(random_bytes(32));
            $existing->update([
                'password' => $reg->password_hash,
                'mobile_verified_at' => now(),
                'api_token' => $token,
                'last_login_at' => now(),
            ]);
            $user = $existing;
        } else {
            $token = bin2hex(random_bytes(32));
            $user = User::create([
                'name' => $reg->name,
                'email' => $reg->email,
                'mobile' => $reg->mobile,
                'password' => $reg->password_hash,
                'user_type' => 'CA',
                'credits' => 50,
                'status' => 'active',
                'account_status' => 'active',
                'email_verified_at' => now(),
                'mobile_verified_at' => now(),
                'api_token' => $token,
                'last_login_at' => now(),
            ]);
        }

        // Cleanup temporary record
        $reg->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Account created and verified successfully.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile' => $user->mobile,
                'user_type' => $user->user_type ?? 'CA',
                'role' => $user->is_admin ? 'Admin' : ($user->user_type ?? 'User'),
                'is_admin' => (bool) $user->is_admin,
                'status' => $user->status ?? 'active',
                'credits' => $user->credits ?? 50,
                'created_at' => $user->created_at ? $user->created_at->toIso8601String() : null,
                'last_login_at' => $user->last_login_at ? $user->last_login_at->toIso8601String() : null,
            ],
        ]);
    }

    /**
     * Resend Signup Mobile OTP
     * POST /api/auth/register/resend-otp
     */
    public function resendRegistrationOtp(Request $request)
    {
        $request->validate([
            'registration_id' => 'required|string',
        ]);

        $reg = RegistrationVerification::where('registration_id', $request->registration_id)
            ->whereNull('verified_at')
            ->first();

        if (!$reg) {
            return response()->json([
                'status' => 'error',
                'message' => 'Registration session expired. Please register again.',
            ], 404);
        }

        // 30s Cooldown check
        if ($reg->last_sent_at && $reg->last_sent_at->addSeconds(30)->isFuture()) {
            $secondsRemaining = $reg->last_sent_at->addSeconds(30)->diffInSeconds(now());
            return response()->json([
                'status' => 'error',
                'message' => "Please wait {$secondsRemaining} seconds before requesting a new OTP.",
                'cooldown_seconds' => $secondsRemaining,
            ], 429);
        }

        $otp = (string) random_int(100000, 999999);
        $otpHash = hash('sha256', $otp);

        $sent = $this->smsService->sendOtp($reg->mobile, $otp);
        if (!$sent) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unable to send OTP SMS. Please try again.',
            ], 500);
        }

        $reg->update([
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'last_sent_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'New OTP has been sent to your mobile number.',
            'cooldown_seconds' => 30,
        ]);
    }

    /**
     * Traditional Login: Email or Mobile + Password
     * POST /api/auth/login
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
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $loginInput = trim($request->login);
        $user = null;

        // Check if input is an email
        if (str_contains($loginInput, '@')) {
            $normalizedEmail = $this->normalizeEmail($loginInput);
            $user = User::where('email', $normalizedEmail)->first();
        } else {
            // Check if input is a mobile number
            $normalizedMobile = $this->normalizeMobile($loginInput);
            if ($normalizedMobile) {
                $user = User::where('mobile', $normalizedMobile)
                    ->orWhere('mobile', substr($normalizedMobile, -10))
                    ->first();
            } else {
                // Fallback direct match
                $user = User::where('mobile', $loginInput)->orWhere('email', strtolower($loginInput))->first();
            }
        }

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid email/mobile or password.',
            ], 401);
        }

        if ($user->status === 'suspended' || $user->account_status === 'suspended') {
            return response()->json([
                'status' => 'error',
                'code' => 'ACCOUNT_SUSPENDED',
                'message' => 'Your account is currently suspended. Please contact support.',
            ], 403);
        }

        // Generate session access token
        $token = bin2hex(random_bytes(32));
        $user->update([
            'api_token' => $token,
            'last_login_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Authenticated successfully.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile' => $user->mobile,
                'avatar' => $user->avatar,
                'user_type' => $user->user_type ?? 'CA',
                'role' => $user->is_admin ? 'Admin' : ($user->user_type ?? 'User'),
                'is_admin' => (bool) $user->is_admin,
                'status' => $user->status ?? 'active',
                'credits' => $user->credits ?? 50,
                'provider' => $user->provider ?? 'password',
                'created_at' => $user->created_at ? $user->created_at->toIso8601String() : null,
                'last_login_at' => $user->last_login_at ? $user->last_login_at->toIso8601String() : null,
            ],
        ]);
    }

    /**
     * Forgot Password Step 1: Request Password Reset OTP
     * POST /api/auth/forgot-password/request
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
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $loginInput = trim($request->login);
        $user = null;
        $channel = 'mobile';

        if (str_contains($loginInput, '@')) {
            $channel = 'email';
            $user = User::where('email', $this->normalizeEmail($loginInput))->first();
        } else {
            $normalizedMobile = $this->normalizeMobile($loginInput);
            if ($normalizedMobile) {
                $user = User::where('mobile', $normalizedMobile)->first();
            }
        }

        if (!$user) {
            // Return generic message for privacy
            return response()->json([
                'status' => 'success',
                'message' => 'If an account exists with these details, a verification code has been dispatched.',
                'destination_masked' => 'your registered contact',
            ]);
        }

        $otp = (string) random_int(100000, 999999);
        $otpHash = hash('sha256', $otp);

        // Delete older unverified OTPs for this user
        OtpVerification::where('user_id', $user->id)->delete();

        OtpVerification::create([
            'user_id' => $user->id,
            'channel' => $channel,
            'destination' => $channel === 'email' ? $user->email : $user->mobile,
            'otp_hash' => $otpHash,
            'expires_at' => now()->addMinutes(10),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        if ($user->mobile) {
            $this->smsService->sendOtp($user->mobile, $otp);
        }

        $destination = $user->mobile ?: $user->email;
        $masked = preg_replace('/(\d{2})\d{6}(\d{2})/', '$1******$2', $destination);

        return response()->json([
            'status' => 'success',
            'message' => 'Verification code sent to your registered contact.',
            'destination_masked' => $masked,
        ]);
    }

    /**
     * Forgot Password Step 2: Verify OTP & Set New Password
     * POST /api/auth/forgot-password/reset
     */
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
                $user = User::where('mobile', $normalizedMobile)->first();
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
                'message' => 'Verification code has expired. Please request a new one.',
            ], 422);
        }

        if ($verification->attempts >= $verification->max_attempts) {
            $verification->delete();
            return response()->json([
                'status' => 'error',
                'message' => 'Too many failed attempts. Please request a new code.',
            ], 422);
        }

        $verification->increment('attempts');

        if (hash('sha256', trim($request->otp)) !== $verification->otp_hash) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid verification code. Please try again.',
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
     * Firebase Google Auth (Kept for compatibility)
     * POST /api/auth/google
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
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile' => $user->mobile,
                'avatar' => $user->avatar,
                'user_type' => $user->user_type ?? 'CA',
                'role' => $user->is_admin ? 'Admin' : ($user->user_type ?? 'User'),
                'is_admin' => (bool) $user->is_admin,
                'status' => $user->status ?? 'active',
                'credits' => $user->credits ?? 50,
                'provider' => $user->provider ?? 'google',
                'created_at' => $user->created_at ? $user->created_at->toIso8601String() : null,
                'last_login_at' => $user->last_login_at ? $user->last_login_at->toIso8601String() : null,
            ],
        ]);
    }

    /**
     * Resolve the current authenticated user from Bearer Token
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

    /**
     * Get Authenticated User Profile
     * GET /api/auth/user, GET /api/auth/profile, GET /api/user/profile
     */
    public function user(Request $request)
    {
        $user = $this->resolveUser($request);

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'avatar' => $user->avatar,
            'role' => $user->is_admin ? 'Admin' : ($user->user_type ?? 'User'),
            'user_type' => $user->user_type ?? 'CA',
            'status' => $user->status ?? 'active',
            'credits' => $user->credits ?? 50,
            'is_admin' => (bool) $user->is_admin,
            'provider' => $user->provider ?? 'password',
            'created_at' => $user->created_at ? $user->created_at->toIso8601String() : null,
            'last_login_at' => $user->last_login_at ? $user->last_login_at->toIso8601String() : null,
            'mobile_verified_at' => $user->mobile_verified_at ? $user->mobile_verified_at->toIso8601String() : null,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'mobile' => $user->mobile,
                'user_type' => $user->user_type ?? 'CA',
                'role' => $user->is_admin ? 'Admin' : ($user->user_type ?? 'User'),
                'status' => $user->status ?? 'active',
                'credits' => $user->credits ?? 50,
                'is_admin' => (bool) $user->is_admin,
                'provider' => $user->provider ?? 'password',
                'created_at' => $user->created_at ? $user->created_at->toIso8601String() : null,
                'last_login_at' => $user->last_login_at ? $user->last_login_at->toIso8601String() : null,
                'mobile_verified_at' => $user->mobile_verified_at ? $user->mobile_verified_at->toIso8601String() : null,
            ],
        ]);
    }

    /**
     * Alias for GET /api/auth/profile
     */
    public function profile(Request $request)
    {
        return $this->user($request);
    }

    /**
     * Complete/Update Profile
     */
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
            'user' => $user,
        ]);
    }

    /**
     * User Logout
     * POST /api/auth/logout
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
