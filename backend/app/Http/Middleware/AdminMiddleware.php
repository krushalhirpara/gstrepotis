<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * Handle an incoming request for Admin endpoints.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (empty($token)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized. Administrator authentication token is missing.',
            ], 401);
        }

        $user = User::where('api_token', $token)->first();

        if (!$user || (!$user->is_admin && $user->user_type !== 'Admin' && ($user->role ?? '') !== 'admin')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden. Administrator privileges required to access this resource.',
            ], 403);
        }

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
