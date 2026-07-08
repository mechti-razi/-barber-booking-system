<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBarberIsActive
{
    /**
     * Reject barbers whose profile has been deactivated by an admin.
     * This guards against users who still hold a valid Passport token
     * after their account was disabled.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->role === 'barber') {
            $barber = $user->barber;

            if (!$barber || !$barber->is_active) {
                // Distinguish between expired subscription and manual deactivation
                if (
                    $barber &&
                    $barber->subscription_expiry_date &&
                    now()->parse($barber->subscription_expiry_date)->isPast()
                ) {
                    return response()->json([
                        'error'   => 'subscription_expired',
                        'message' => 'Your subscription has expired (expired on ' . \Carbon\Carbon::parse($barber->subscription_expiry_date)->format('M d, Y') . '). Please renew your subscription to regain access.',
                    ], 403);
                }

                return response()->json([
                    'error'   => 'account_deactivated',
                    'message' => 'Your account has been deactivated by the administrator. Please contact support to resolve this.',
                ], 403);
            }
        }

        return $next($request);
    }
}
