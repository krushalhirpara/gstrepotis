<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\FirebaseTokenVerifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
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
     * Authenticate or Register via Firebase Google Authentication
     * POST /api/auth/google
     */
    public function loginWithFirebase(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_token' => 'required|string',
            'name' => 'nullable|string|min:2|max:100',
            'mobile' => 'nullable|string',
        ], [
            'id_token.required' => 'Firebase ID token is required.',
            'name.min' => 'Full Name must be at least 2 characters.',
            'name.max' => 'Full Name must not exceed 100 characters.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Mobile validation if provided
        $normalizedMobile = null;
        if ($request->filled('mobile')) {
            $normalizedMobile = $this->normalizeMobile($request->mobile);
            if (!$normalizedMobile) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => [
                        'mobile' => ['Enter a valid 10 digit Indian mobile number.'],
                    ],
                ], 422);
            }
        }

        try {
            // Verify token server-side via Google's public certificates
            $verified = $this->tokenVerifier->verifyIdToken($request->id_token);
        } catch (Throwable $e) {
            Log::warning('Firebase Google Auth token verification failed: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'code' => 'INVALID_TOKEN',
                'message' => 'Google authentication failed: ' . $e->getMessage(),
            ], 401);
        }

        $googleUid = $verified['uid'];
        $email = $this->normalizeEmail($verified['email'] ?? '');
        $tokenName = trim($verified['name'] ?? '');
        $submittedName = $request->filled('name') ? trim($request->name) : null;
        $finalName = $submittedName ?: ($tokenName ?: explode('@', $email)[0]);
        $picture = $verified['picture'] ?? null;

        if (empty($email)) {
            return response()->json([
                'status' => 'error',
                'message' => 'No verified email address found on Google profile.',
            ], 422);
        }

        // 1. Attempt to find user by Firebase UID / Google UID first
        $user = User::where('firebase_uid', $googleUid)
            ->orWhere('google_id', $googleUid)
            ->first();

        // 2. If not found by UID, safely match existing user by verified email
        if (!$user) {
            $user = User::where('email', $email)->first();

            if ($user) {
                // Link Google identity to existing account
                $updates = [
                    'firebase_uid' => $googleUid,
                    'google_id' => $googleUid,
                    'avatar' => $picture ?: $user->avatar,
                    'provider' => 'google',
                    'email_verified_at' => $user->email_verified_at ?? now(),
                    'account_status' => 'active',
                    'last_login_at' => now(),
                ];

                if ($submittedName && empty($user->name)) {
                    $updates['name'] = $submittedName;
                }
                if ($normalizedMobile && empty($user->mobile)) {
                    $updates['mobile'] = $normalizedMobile;
                }

                $user->update($updates);
            }
        } else {
            // Update profile fields & last login
            $updates = [
                'last_login_at' => now(),
            ];

            if (empty($user->firebase_uid)) {
                $updates['firebase_uid'] = $googleUid;
            }
            if ($picture && $user->avatar !== $picture) {
                $updates['avatar'] = $picture;
            }
            if ($user->account_status !== 'active') {
                $updates['account_status'] = 'active';
            }
            if ($submittedName && ($user->name === 'User' || empty($user->name))) {
                $updates['name'] = $submittedName;
            }
            if ($normalizedMobile && empty($user->mobile)) {
                $updates['mobile'] = $normalizedMobile;
            }

            $user->update($updates);
        }

        // 3. If user does not exist at all, create a new account
        if (!$user) {
            try {
                $user = User::create([
                    'name' => $finalName,
                    'email' => $email,
                    'firebase_uid' => $googleUid,
                    'google_id' => $googleUid,
                    'mobile' => $normalizedMobile,
                    'avatar' => $picture,
                    'provider' => 'google',
                    'user_type' => 'CA',
                    'credits' => 50,
                    'status' => 'active',
                    'account_status' => 'active',
                    'email_verified_at' => now(),
                    'last_login_at' => now(),
                ]);
            } catch (Throwable $dbError) {
                // In case of race conditions
                $user = User::where('email', $email)
                    ->orWhere('firebase_uid', $googleUid)
                    ->orWhere('google_id', $googleUid)
                    ->first();

                if (!$user) {
                    Log::error('Firebase Google Auth user creation error: ' . $dbError->getMessage());
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Could not create user account. Please try again.',
                    ], 500);
                }
            }
        }

        // 4. Check if account has been suspended by administration
        if ($user->status === 'suspended' || $user->account_status === 'suspended') {
            return response()->json([
                'status' => 'error',
                'code' => 'ACCOUNT_SUSPENDED',
                'message' => 'Your account is currently suspended. Please contact support.',
            ], 403);
        }

        // 5. Generate secure session access token
        $token = bin2hex(random_bytes(32));
        $user->update([
            'api_token' => $token,
            'last_login_at' => now(),
        ]);

        $requiresProfileCompletion = empty($user->mobile);

        return response()->json([
            'status' => 'success',
            'message' => 'Authenticated successfully.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'requires_profile_completion' => $requiresProfileCompletion,
            'user' => [
                'id' => $user->id,
                'firebase_uid' => $user->firebase_uid ?? $user->google_id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'mobile' => $user->mobile,
                'user_type' => $user->user_type ?? 'CA',
                'role' => $user->is_admin ? 'admin' : ($user->user_type ?? 'user'),
                'status' => $user->status ?? 'active',
                'credits' => $user->credits,
                'is_admin' => (bool) $user->is_admin,
                'provider' => $user->provider ?? 'google',
                'last_login_at' => $user->last_login_at ? $user->last_login_at->toIso8601String() : null,
                'created_at' => $user->created_at ? $user->created_at->toIso8601String() : null,
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
            'firebase_uid' => $user->firebase_uid ?? $user->google_id,
            'name' => $user->name,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'avatar' => $user->avatar,
            'role' => $user->is_admin ? 'admin' : ($user->user_type ?? 'user'),
            'user_type' => $user->user_type ?? 'CA',
            'status' => $user->status ?? 'active',
            'credits' => $user->credits,
            'is_admin' => (bool) $user->is_admin,
            'provider' => $user->provider ?? 'google',
            'created_at' => $user->created_at ? $user->created_at->toIso8601String() : null,
            'last_login_at' => $user->last_login_at ? $user->last_login_at->toIso8601String() : null,
            'user' => [
                'id' => $user->id,
                'firebase_uid' => $user->firebase_uid ?? $user->google_id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'mobile' => $user->mobile,
                'user_type' => $user->user_type ?? 'CA',
                'role' => $user->is_admin ? 'admin' : ($user->user_type ?? 'user'),
                'status' => $user->status ?? 'active',
                'credits' => $user->credits,
                'is_admin' => (bool) $user->is_admin,
                'provider' => $user->provider ?? 'google',
                'created_at' => $user->created_at ? $user->created_at->toIso8601String() : null,
                'last_login_at' => $user->last_login_at ? $user->last_login_at->toIso8601String() : null,
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
     * Complete or Update User Profile (Full Name & Mobile Number)
     * POST /api/user/complete-profile
     */
    public function completeProfile(Request $request)
    {
        $user = $this->resolveUser($request);

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:100',
            'mobile' => 'required|string',
        ], [
            'name.required' => 'Full Name is required.',
            'name.min' => 'Full Name must be at least 2 characters.',
            'name.max' => 'Full Name must not exceed 100 characters.',
            'mobile.required' => 'Mobile number is required.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $normalizedMobile = $this->normalizeMobile($request->mobile);
        if (!$normalizedMobile) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => [
                    'mobile' => ['Enter a valid 10 digit Indian mobile number.'],
                ],
            ], 422);
        }

        $user->update([
            'name' => trim($request->name),
            'mobile' => $normalizedMobile,
            'mobile_verified_at' => $user->mobile_verified_at ?? now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Profile completed successfully.',
            'requires_profile_completion' => false,
            'user' => [
                'id' => $user->id,
                'firebase_uid' => $user->firebase_uid ?? $user->google_id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile' => $user->mobile,
                'avatar' => $user->avatar,
                'user_type' => $user->user_type ?? 'CA',
                'role' => $user->is_admin ? 'admin' : ($user->user_type ?? 'user'),
                'status' => $user->status ?? 'active',
                'credits' => $user->credits,
                'is_admin' => (bool) $user->is_admin,
                'provider' => $user->provider ?? 'google',
                'created_at' => $user->created_at ? $user->created_at->toIso8601String() : null,
                'last_login_at' => $user->last_login_at ? $user->last_login_at->toIso8601String() : null,
            ],
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
