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
     * Authenticate or Register via Firebase Google Authentication
     * POST /api/auth/google
     */
    public function loginWithFirebase(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_token' => 'required|string',
        ], [
            'id_token.required' => 'Firebase ID token is required.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
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
        $name = trim($verified['name'] ?? '');
        $picture = $verified['picture'] ?? null;

        if (empty($email)) {
            return response()->json([
                'status' => 'error',
                'message' => 'No verified email address found on Google profile.',
            ], 422);
        }

        // 1. Attempt to find user by Google UID first
        $user = User::where('google_id', $googleUid)->first();

        // 2. If not found by google_id, safely match existing user by verified email
        if (!$user) {
            $user = User::where('email', $email)->first();

            if ($user) {
                // Link Google identity to existing account
                $user->update([
                    'google_id' => $googleUid,
                    'avatar' => $picture ?: $user->avatar,
                    'provider' => 'google',
                    'email_verified_at' => $user->email_verified_at ?? now(),
                    'account_status' => 'active',
                ]);
            }
        } else {
            // Update profile avatar / name if needed
            $updates = [];
            if ($picture && $user->avatar !== $picture) {
                $updates['avatar'] = $picture;
            }
            if ($user->account_status !== 'active') {
                $updates['account_status'] = 'active';
            }
            if (!empty($updates)) {
                $user->update($updates);
            }
        }

        // 3. If user does not exist at all, create a new account
        if (!$user) {
            try {
                $user = User::create([
                    'name' => $name ?: explode('@', $email)[0],
                    'email' => $email,
                    'google_id' => $googleUid,
                    'avatar' => $picture,
                    'provider' => 'google',
                    'user_type' => 'CA',
                    'credits' => 50,
                    'status' => 'active',
                    'account_status' => 'active',
                    'email_verified_at' => now(),
                ]);
            } catch (Throwable $dbError) {
                // In case of race conditions
                $user = User::where('email', $email)->orWhere('google_id', $googleUid)->first();
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
                'avatar' => $user->avatar,
                'mobile' => $user->mobile,
                'user_type' => $user->user_type,
                'credits' => $user->credits,
                'is_admin' => (bool) $user->is_admin,
                'provider' => $user->provider ?? 'google',
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
     * GET /api/auth/user & GET /api/auth/profile
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
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'mobile' => $user->mobile,
                'user_type' => $user->user_type,
                'credits' => $user->credits,
                'is_admin' => (bool) $user->is_admin,
                'provider' => $user->provider ?? 'google',
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
