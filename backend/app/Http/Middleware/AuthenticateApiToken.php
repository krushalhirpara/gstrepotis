<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    /**
     * Handle an incoming request by validating the Bearer api_token.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (empty($token)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated. Authorization bearer token is missing.',
            ], 401);
        }

        $user = User::where('api_token', $token)->first();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated. Invalid or expired session token.',
            ], 401);
        }

        if ($user->status === 'inactive' || $user->account_status === 'suspended') {
            return response()->json([
                'status' => 'error',
                'message' => 'Your account has been deactivated. Please contact support.',
            ], 403);
        }

        // Bind user to request
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
