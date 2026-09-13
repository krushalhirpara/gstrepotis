<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    protected OtpService $otpService;

    public function __construct(OtpService $otpService)
    {
        $this->otpService = $otpService;
    }

    /**
     * Normalize email: trim and convert to lowercase
     */
    protected function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    /**
     * Normalize Indian mobile number format consistently (+91XXXXXXXXXX)
     */
    protected function normalizeMobile(string $mobile): string
    {
        $cleanDigits = preg_replace('/[^0-9]/', '', $mobile);
        if (strlen($cleanDigits) === 12 && str_starts_with($cleanDigits, '91')) {
            return '+' . $cleanDigits;
        } else if (strlen($cleanDigits) === 10) {
            return '+91' . $cleanDigits;
        }
        return '+' . $cleanDigits;
    }

    /**
     * Register New User (Pending Verification) with Resumable Pending Signup Support
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:100',
            'email' => 'required|email|max:255',
            'mobile' => [
                'required',
                'string',
                'regex:/^(\+91[\-\s]?)?[6-9]\d{9}$/',
            ],
            'user_type' => 'nullable|string',
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                Password::min(8)->letters()->mixedCase()->numbers()->symbols(),
            ],
            'terms' => 'accepted',
        ], [
            'name.required' => 'Full Name is required.',
            'email.required' => 'Email Address is required.',
            'email.email' => 'Please enter a valid email address.',
            'mobile.required' => 'Mobile Number is required.',
            'mobile.regex' => 'Please enter a valid 10-digit Indian mobile number.',
            'password.required' => 'Password is required.',
            'password.min' => 'Password must be at least 8 characters.',
            'password.confirmed' => 'Password confirmation does not match.',
            'terms.accepted' => 'You must accept the terms and conditions to sign up.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Canonical normalization before uniqueness check
        $cleanEmail = $this->normalizeEmail($request->email);
        $cleanMobile = $this->normalizeMobile($request->mobile);

        // Pre-check existing email and mobile in User table
        $existingUserByEmail = User::where('email', $cleanEmail)->first();
        $existingUserByMobile = User::where('mobile', $cleanMobile)->first();

        // CASE A: Both email and mobile match the SAME existing user
        if ($existingUserByEmail && $existingUserByMobile && $existingUserByEmail->id === $existingUserByMobile->id) {
            $user = $existingUserByEmail;

            // If existing user is NOT YET ACTIVE (Unverified / Pending Verification), resume verification flow cleanly
            if ($user->account_status !== 'active') {
                $user->update([
                    'name' => trim($request->name),
                    'password' => Hash::make($request->password),
                    'user_type' => $request->user_type ?? $user->user_type,
                ]);

                $otpRes = $this->otpService->createAndSendOtp($user, 'email', $user->email);

                if (!$otpRes['success']) {
                    return response()->json([
                        'message' => $otpRes['message'],
                        'code' => $otpRes['code'] ?? 'OTP_DELIVERY_FAILED',
                        'delivery_failed' => $otpRes['delivery_failed'] ?? true,
                    ], 422);
                }

                return response()->json([
                    'status' => 'success',
                    'message' => 'Pending account found. A new verification code has been sent to your email.',
                    'user_id' => $user->id,
                    'account_status' => $user->account_status,
                    'masked_destination' => $otpRes['destination_masked'],
                    'step' => '02_email_verification',
                    'resumed' => true,
                ], 200);
            }

            // If account is FULLY ACTIVE & VERIFIED, block duplicate creation
            return response()->json([
                'message' => 'An account with this email and mobile number already exists. Please log in instead.',
                'errors' => [
                    'email' => ['An account with this email address already exists.'],
                    'mobile' => ['An account with this mobile number already exists.'],
                ],
            ], 422);
        }

        // CASE B: Email belongs to a FULLY ACTIVE user
        if ($existingUserByEmail && $existingUserByEmail->account_status === 'active') {
            return response()->json([
                'message' => 'An account with this email address already exists.',
                'errors' => [
                    'email' => ['An account with this email address already exists.'],
                ],
            ], 422);
        }

        // CASE C: Mobile belongs to a FULLY ACTIVE user
        if ($existingUserByMobile && $existingUserByMobile->account_status === 'active') {
            return response()->json([
                'message' => 'An account with this mobile number already exists.',
                'errors' => [
                    'mobile' => ['An account with this mobile number already exists.'],
                ],
            ], 422);
        }

        // CASE D: Email belongs to an UNVERIFIED pending user -> update mobile and resume OTP
        if ($existingUserByEmail && $existingUserByEmail->account_status !== 'active') {
            $user = $existingUserByEmail;
            $user->update([
                'name' => trim($request->name),
                'mobile' => $cleanMobile,
                'password' => Hash::make($request->password),
                'user_type' => $request->user_type ?? $user->user_type,
            ]);

            $otpRes = $this->otpService->createAndSendOtp($user, 'email', $user->email);

            if (!$otpRes['success']) {
                return response()->json([
                    'message' => $otpRes['message'],
                    'code' => $otpRes['code'] ?? 'OTP_DELIVERY_FAILED',
                    'delivery_failed' => $otpRes['delivery_failed'] ?? true,
                ], 422);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Pending account found. A new verification code has been sent to your email.',
                'user_id' => $user->id,
                'account_status' => $user->account_status,
                'masked_destination' => $otpRes['destination_masked'],
                'step' => '02_email_verification',
                'resumed' => true,
            ], 200);
        }

        // CASE E: Completely NEW user -> create pending record with DB race-condition safety
        try {
            $user = User::create([
                'name' => trim($request->name),
                'email' => $cleanEmail,
                'mobile' => $cleanMobile,
                'user_type' => $request->user_type ?? 'CA',
                'password' => Hash::make($request->password),
                'credits' => 2,
                'status' => 'active',
                'account_status' => 'pending_verification',
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            // Re-evaluate in race conditions
            $emailActive = User::where('email', $cleanEmail)->where('account_status', 'active')->exists();
            $mobileActive = User::where('mobile', $cleanMobile)->where('account_status', 'active')->exists();

            if ($emailActive && $mobileActive) {
                return response()->json([
                    'message' => 'An account with this email and mobile number already exists. Please log in instead.',
                    'errors' => [
                        'email' => ['An account with this email address already exists.'],
                        'mobile' => ['An account with this mobile number already exists.'],
                    ],
                ], 422);
            } else if ($emailActive) {
                return response()->json([
                    'message' => 'An account with this email address already exists.',
                    'errors' => [
                        'email' => ['An account with this email address already exists.'],
                    ],
                ], 422);
            } else if ($mobileActive) {
                return response()->json([
                    'message' => 'An account with this mobile number already exists.',
                    'errors' => [
                        'mobile' => ['An account with this mobile number already exists.'],
                    ],
                ], 422);
            }

            return response()->json([
                'message' => 'An account with this email or mobile number already exists.',
            ], 422);
        }

        // Generate & Dispatch Real Email OTP
        $otpRes = $this->otpService->createAndSendOtp($user, 'email', $user->email);

        if (!$otpRes['success']) {
            return response()->json([
                'message' => $otpRes['message'],
                'code' => $otpRes['code'] ?? 'OTP_DELIVERY_FAILED',
                'delivery_failed' => $otpRes['delivery_failed'] ?? true,
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Account created. Please enter the verification code sent to your email.',
            'user_id' => $user->id,
            'account_status' => $user->account_status,
            'masked_destination' => $otpRes['destination_masked'],
            'step' => '02_email_verification',
        ], 201);
    }

    /**
     * Verify Email OTP Code
     */
    public function verifyEmailOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'otp' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $user = User::findOrFail($request->user_id);
        $res = $this->otpService->verifyOtp($user, 'email', $request->otp);

        if (!$res['success']) {
            return response()->json(['message' => $res['message']], 422);
        }

        // Mark Email as Verified
        $user->update([
            'email_verified_at' => now(),
            'account_status' => 'email_verified',
        ]);

        // Attempt mobile OTP dispatch; if SMS fails, remain at email_verified state so user can retry or change mobile number
        $mobileOtpRes = $this->otpService->createAndSendOtp($user, 'mobile', $user->mobile);

        if (!$mobileOtpRes['success']) {
            return response()->json([
                'status' => 'success',
                'message' => 'Email verified successfully. Unable to send mobile code: ' . $mobileOtpRes['message'],
                'user_id' => $user->id,
                'account_status' => 'email_verified',
                'masked_destination' => $this->otpService->maskDestination('mobile', $user->mobile),
                'step' => '03_mobile_verification',
                'sms_delivery_failed' => true,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Email verified. Please enter the verification code sent to your mobile.',
            'user_id' => $user->id,
            'account_status' => 'email_verified',
            'masked_destination' => $mobileOtpRes['destination_masked'] ?? $this->otpService->maskDestination('mobile', $user->mobile),
            'step' => '03_mobile_verification',
        ]);
    }

    /**
     * Resend Email OTP
     */
    public function resendEmailOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $user = User::findOrFail($request->user_id);

        if ($request->new_email && filter_var($request->new_email, FILTER_VALIDATE_EMAIL)) {
            $newEmail = $this->normalizeEmail($request->new_email);
            if (User::where('email', $newEmail)->where('id', '!=', $user->id)->where('account_status', 'active')->exists()) {
                return response()->json(['message' => 'An account with this email address already exists.'], 422);
            }
            $user->update(['email' => $newEmail]);
        }

        $res = $this->otpService->createAndSendOtp($user, 'email', $user->email);

        if (!$res['success']) {
            return response()->json(['message' => $res['message']], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => $res['message'],
            'masked_destination' => $res['destination_masked'],
            'cooldown_seconds' => $res['cooldown_seconds'],
        ]);
    }

    /**
     * Verify Mobile OTP Code
     */
    public function verifyMobileOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'otp' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $user = User::findOrFail($request->user_id);
        $res = $this->otpService->verifyOtp($user, 'mobile', $request->otp);

        if (!$res['success']) {
            return response()->json(['message' => $res['message']], 422);
        }

        // Activate User Account
        $user->update([
            'mobile_verified_at' => now(),
            'account_status' => 'active',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Account successfully verified! You can now sign in.',
            'user_id' => $user->id,
            'account_status' => 'active',
            'step' => '04_account_ready',
        ]);
    }

    /**
     * Resend Mobile OTP
     */
    public function resendMobileOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $user = User::findOrFail($request->user_id);

        if ($request->new_mobile) {
            $cleanMobile = $this->normalizeMobile($request->new_mobile);
            if (User::where('mobile', $cleanMobile)->where('id', '!=', $user->id)->where('account_status', 'active')->exists()) {
                return response()->json(['message' => 'An account with this mobile number already exists.'], 422);
            }
            $user->update(['mobile' => $cleanMobile]);
        }

        $res = $this->otpService->createAndSendOtp($user, 'mobile', $user->mobile);

        if (!$res['success']) {
            return response()->json(['message' => $res['message']], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => $res['message'],
            'masked_destination' => $res['destination_masked'],
            'cooldown_seconds' => $res['cooldown_seconds'],
        ]);
    }

    /**
     * Authenticate User (Sign In)
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ], [
            'email.required' => 'Email Address is required.',
            'email.email' => 'Please enter a valid email address.',
            'password.required' => 'Password is required.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = $this->normalizeEmail($request->email);
        $user = User::where('email', $email)->first();

        // 1. Unregistered User Check
        if (!$user) {
            return response()->json([
                'message' => 'Account not found. Please sign up to continue.',
                'code' => 'ACCOUNT_NOT_FOUND',
            ], 422);
        }

        // 2. Wrong Password Check
        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid email address or password.',
                'code' => 'INVALID_CREDENTIALS',
            ], 422);
        }

        // 3. Suspended Account Check
        if ($user->account_status === 'suspended' || $user->status === 'suspended') {
            return response()->json([
                'message' => 'Your account is currently unavailable. Please contact support.',
                'code' => 'ACCOUNT_SUSPENDED',
            ], 403);
        }

        // 4. Unverified Account Check
        if ($user->account_status !== 'active') {
            $nextChannel = $user->account_status === 'email_verified' ? 'mobile' : 'email';
            $destination = $nextChannel === 'email' ? $user->email : $user->mobile;

            // Attempt OTP dispatch
            $otpRes = $this->otpService->createAndSendOtp($user, $nextChannel, $destination);

            return response()->json([
                'message' => 'Your account email address is not yet verified. Please verify your email to sign in.',
                'code' => 'VERIFICATION_INCOMPLETE',
                'unverified' => true,
                'user_id' => $user->id,
                'account_status' => $user->account_status,
                'next_step' => $nextChannel === 'email' ? '02_email_verification' : '03_mobile_verification',
                'masked_destination' => $otpRes['destination_masked'] ?? $this->otpService->maskDestination($nextChannel, $destination),
            ], 403);
        }

        // Create Secure Authentication Token
        $token = bin2hex(random_bytes(32));

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
                'user_type' => $user->user_type,
                'credits' => $user->credits,
                'is_admin' => $user->is_admin,
            ],
        ]);
    }

    /**
     * Forgot Password
     */
    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $this->normalizeEmail($request->email))->first();

        if ($user) {
            $this->otpService->createAndSendOtp($user, 'email', $user->email);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'If an account exists for this email, password reset instructions have been sent.',
        ]);
    }

    /**
     * User Logout
     */
    public function logout(Request $request)
    {
        return response()->json(['message' => 'Signed out successfully.']);
    }

    /**
     * Get Profile
     */
    public function profile(Request $request)
    {
        return response()->json(['user' => $request->user()]);
    }
}
