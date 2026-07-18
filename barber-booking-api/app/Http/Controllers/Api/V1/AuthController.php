<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\ResetPasswordMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use App\Models\User;
use Carbon\Carbon;

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

        return response()->json([
            'error'   => 'invalid_credentials',
            'message' => 'The email or password you entered is incorrect. Please try again.',
        ], 401);
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

    /**
     * Send password reset link to the user's email.
     */
    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error'   => 'validation_error',
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        // Always respond with success to prevent email enumeration
        if (!$user) {
            return response()->json([
                'message' => 'If this email exists in our system, a password reset link has been sent.',
            ]);
        }

        // Delete any existing tokens for this email
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        // Generate a secure random token
        $token = Str::random(64);

        // Store hashed token in the database
        DB::table('password_reset_tokens')->insert([
            'email'      => $request->email,
            'token'      => Hash::make($token),
            'created_at' => Carbon::now(),
        ]);

        // Build reset URL pointing to the Angular frontend
        $origin = $request->header('Origin');
        $frontendUrls = array_filter(array_map('trim', explode(',', env('FRONTEND_URL', 'http://localhost:4200'))));
        $frontendUrl = 'http://localhost:4200';
        if ($origin && in_array($origin, $frontendUrls)) {
            $frontendUrl = $origin;
        } elseif (!empty($frontendUrls)) {
            $frontendUrl = $frontendUrls[0];
        }

        $resetUrl    = $frontendUrl . '/auth/reset-password?token=' . urlencode($token) . '&email=' . urlencode($request->email);

        // Send the reset email
        Mail::to($user->email)->send(new ResetPasswordMail($resetUrl, $user->name));

        return response()->json([
            'message' => 'If this email exists in our system, a password reset link has been sent.',
        ]);
    }

    /**
     * Reset the user's password using a valid token.
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token'                 => 'required|string',
            'email'                 => 'required|email',
            'password'              => 'required|string|min:8',
            'password_confirmation' => 'required|same:password',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error'   => 'validation_error',
                'errors'  => $validator->errors(),
                'message' => $validator->errors()->first(),
            ], 422);
        }

        // Find the token record
        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record) {
            return response()->json([
                'error'   => 'invalid_token',
                'message' => 'This password reset link is invalid or has already been used.',
            ], 400);
        }

        // Check if the token is expired (60 minutes)
        if (Carbon::parse($record->created_at)->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json([
                'error'   => 'token_expired',
                'message' => 'This password reset link has expired. Please request a new one.',
            ], 400);
        }

        // Verify the hashed token
        if (!Hash::check($request->token, $record->token)) {
            return response()->json([
                'error'   => 'invalid_token',
                'message' => 'This password reset link is invalid or has already been used.',
            ], 400);
        }

        // Find the user and update the password
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'error'   => 'user_not_found',
                'message' => 'No user was found with this email address.',
            ], 404);
        }

        $user->update(['password' => Hash::make($request->password)]);

        // Revoke all existing tokens to force re-login
        $user->tokens()->each(fn ($token) => $token->revoke());

        // Delete the used reset token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'message' => 'Your password has been reset successfully. You can now log in with your new password.',
        ]);
    }
}
