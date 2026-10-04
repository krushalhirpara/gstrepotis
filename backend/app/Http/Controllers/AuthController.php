<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Normalize email: trim and convert to lowercase
     */
    public function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    /**
     * Format user array response (Strictly excluding password and sensitive tokens)
     */
    public function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
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
            'credits' => $user->credits ?? 5000,
            'created_at' => $user->created_at ? $user->created_at->toIso8601String() : null,
            'last_login_at' => $user->last_login_at ? $user->last_login_at->toIso8601String() : null,
            'email_verified_at' => $user->email_verified_at ? $user->email_verified_at->toIso8601String() : null,
            'mobile_verified_at' => $user->mobile_verified_at ? $user->mobile_verified_at->toIso8601String() : null,
        ];
    }

    /**
     * ====================================================================
     * PRIVATE CLIENT AUTHENTICATION
     * POST /api/auth/login
     * Server-side secure authentication using Laravel's Hash::check()
     * ====================================================================
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required_without:login|nullable|string',
            'login' => 'required_without:email|nullable|string',
            'password' => 'required|string',
        ], [
            'email.required_without' => 'Please enter your registered email / user ID.',
            'login.required_without' => 'Please enter your registered email / user ID.',
            'password.required' => 'Please enter your password.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $inputIdentifier = trim($request->input('email') ?: $request->input('login'));
        $normalizedEmail = $this->normalizeEmail($inputIdentifier);

        // Find user by email or mobile
        $user = User::where('email', $normalizedEmail)
            ->orWhere('email', $inputIdentifier)
            ->orWhere('mobile', $inputIdentifier)
            ->first();

        // Secure password verification with Hash::check()
        if (!$user || !Hash::check($request->input('password'), $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid email or password.',
            ], 401);
        }

        // Check account status
        if ($user->status === 'inactive' || $user->status === 'suspended' || $user->account_status === 'suspended') {
            return response()->json([
                'status' => 'error',
                'code' => 'ACCOUNT_INACTIVE',
                'message' => 'Your account is inactive or suspended. Please contact support.',
            ], 403);
        }

        // Generate secure 64-char hex session token
        $token = bin2hex(random_bytes(32));

        $user->api_token = $token;
        $user->last_login_at = now();
        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Authentication successful.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->formatUser($user),
        ], 200);
    }

    /**
     * ====================================================================
     * LOGOUT
     * POST /api/auth/logout
     * Invalidate the current session token
     * ====================================================================
     */
    public function logout(Request $request)
    {
        $token = $request->bearerToken();
        if ($token) {
            $user = User::where('api_token', $token)->first();
            if ($user) {
                $user->api_token = null;
                $user->save();
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * ====================================================================
     * AUTHENTICATED USER / PROFILE
     * GET /api/auth/user, GET /api/user/profile
     * ====================================================================
     */
    public function user(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            $token = $request->bearerToken();
            if ($token) {
                $user = User::where('api_token', $token)->first();
            }
        }

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return response()->json([
            'status' => 'success',
            'user' => $this->formatUser($user),
        ]);
    }

    public function profile(Request $request)
    {
        return $this->user($request);
    }

    /**
     * Update user profile
     */
    public function completeProfile(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            $token = $request->bearerToken();
            if ($token) {
                $user = User::where('api_token', $token)->first();
            }
        }

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|min:2|max:100',
            'mobile' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($request->filled('name')) {
            $user->name = trim($request->name);
        }
        if ($request->filled('mobile')) {
            $user->mobile = trim($request->mobile);
        }
        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully.',
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * Legacy disabled endpoints return 403 Forbidden
     */
    public function disabledEndpoint()
    {
        return response()->json([
            'status' => 'error',
            'code' => 'ENDPOINT_DISABLED',
            'message' => 'Public registration and OTP verification have been replaced with authorized client login.',
        ], 403);
    }

    public function validateSignup() { return $this->disabledEndpoint(); }
    public function register() { return $this->disabledEndpoint(); }
    public function verifyLoginOtp() { return $this->disabledEndpoint(); }
    public function resendLoginOtp() { return $this->disabledEndpoint(); }
    public function verifyMobileLoginFirebase() { return $this->disabledEndpoint(); }
    public function loginWithFirebase() { return $this->disabledEndpoint(); }
    public function checkMobileAvailability() { return $this->disabledEndpoint(); }
    public function completeGoogleSignup() { return $this->disabledEndpoint(); }
    public function forgotPasswordRequest() { return $this->disabledEndpoint(); }
    public function forgotPasswordReset() { return $this->disabledEndpoint(); }
}
