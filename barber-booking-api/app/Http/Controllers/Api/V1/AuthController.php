<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
            'role' => 'required|in:client,barber,admin',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => bcrypt($request->password),
            'phone' => $request->phone,
            'role' => $request->role,
        ]);

        $token = $user->createToken('Personal Access Token')->accessToken;

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Login user and create token.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (Auth::attempt($request->only('email', 'password'))) {
            $user = Auth::user();

            // Block inactive barbers from logging in
            if ($user->role === 'barber') {
                $barberProfile = $user->barber;

                if (!$barberProfile || !$barberProfile->is_active) {
                    Auth::logout();

                    // Distinguish between expired subscription and manual deactivation
                    if (
                        $barberProfile &&
                        $barberProfile->subscription_expiry_date &&
                        now()->parse($barberProfile->subscription_expiry_date)->isPast()
                    ) {
                        return response()->json([
                            'error'   => 'subscription_expired',
                            'message' => 'Your subscription has expired (expired on ' . \Carbon\Carbon::parse($barberProfile->subscription_expiry_date)->format('M d, Y') . '). Please renew your subscription to regain access.',
                        ], 403);
                    }

                    return response()->json([
                        'error'   => 'account_deactivated',
                        'message' => 'Your account has been deactivated by the administrator. Please contact support to resolve this.',
                    ], 403);
                }
            }

            $token = $user->createToken('Personal Access Token')->accessToken;

            // Include barber profile (with is_owner) for barber users
            $barberProfile = null;
            if ($user->role === 'barber') {
                $barberProfile = \App\Models\Barber::where('user_id', $user->id)
                    ->select(['id', 'shop_id', 'is_owner', 'is_active', 'specialization', 'rating'])
                    ->first();
            }

            return response()->json([
                'message' => 'Login successful',
                'user' => $user,
                'barber_profile' => $barberProfile,
                'token' => $token,
            ], 200);
        }

        return response()->json(['error' => 'Unauthorized'], 401);
    }

    /**
     * Get the authenticated user.
     */
    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * Logout user (revoke token).
     */
    public function logout(Request $request)
    {
        $request->user()->token()->revoke();

        return response()->json(['message' => 'Successfully logged out']);
    }

    /**
     * Change user password.
     */
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|same:new_password_confirmation',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'The current password you entered is incorrect.'], 422);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        return response()->json(['message' => 'Password changed successfully.']);
    }
}
