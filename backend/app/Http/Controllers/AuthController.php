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
     * Register New User (Pending Verification)
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:100',
            'email' => 'required|email|max:255|unique:users,email',
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
            'email.unique' => 'An account with this email address already exists.',
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

        // Normalize mobile number format
        $cleanMobile = preg_replace('/[^0-9]/', '', $request->mobile);
        if (strlen($cleanMobile) === 12 && str_starts_with($cleanMobile, '91')) {
            $cleanMobile = '+' . $cleanMobile;
        } else if (strlen($cleanMobile) === 10) {
            $cleanMobile = '+91' . $cleanMobile;
        }

        // Check if normalized mobile already exists
        if (User::where('mobile', $cleanMobile)->exists()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => [
                    'mobile' => ['An account with this mobile number already exists.'],
                ],
            ], 422);
        }

        // Create user with pending_verification status
        $user = User::create([
            'name' => trim($request->name),
            'email' => strtolower(trim($request->email)),
            'mobile' => $cleanMobile,
            'user_type' => $request->user_type ?? 'CA',
            'password' => Hash::make($request->password),
            'credits' => 50,
            'status' => 'active',
            'account_status' => 'pending_verification',
        ]);

        // Generate & Dispatch Email OTP
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
            'message' => 'Account created. Please verify your email code to continue.',
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

        // Generate & Send Mobile OTP
        $mobileOtpRes = $this->otpService->createAndSendOtp($user, 'mobile', $user->mobile);

        return response()->json([
            'status' => 'success',
            'message' => 'Email verified. Please enter the verification code sent to your mobile.',
            'user_id' => $user->id,
            'account_status' => $user->account_status,
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
            $newEmail = strtolower(trim($request->new_email));
            if (User::where('email', $newEmail)->where('id', '!=', $user->id)->exists()) {
                return response()->json(['message' => 'This email is already in use by another account.'], 422);
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
            $cleanMobile = preg_replace('/[^0-9]/', '', $request->new_mobile);
            if (strlen($cleanMobile) === 10) $cleanMobile = '+91' . $cleanMobile;
            if (User::where('mobile', $cleanMobile)->where('id', '!=', $user->id)->exists()) {
                return response()->json(['message' => 'This mobile number is already registered.'], 422);
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

        $email = strtolower(trim($request->email));
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

            // Dispatch OTP if needed
            $otpRes = $this->otpService->createAndSendOtp($user, $nextChannel, $destination);

            return response()->json([
                'message' => 'Your account verification is incomplete.',
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

        $user = User::where('email', strtolower(trim($request->email)))->first();

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
