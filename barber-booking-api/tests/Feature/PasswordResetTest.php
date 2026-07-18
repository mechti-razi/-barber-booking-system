<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_sends_reset_email_and_stores_token(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'name' => 'John Doe'
        ]);

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'test@example.com'
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'If this email exists in our system, a password reset link has been sent.'
        ]);

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'test@example.com'
        ]);
    }

    public function test_reset_password_succeeds_with_valid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('oldpassword')
        ]);

        // Insert token manually
        $token = 'random-token-12345';
        DB::table('password_reset_tokens')->insert([
            'email' => 'test@example.com',
            'token' => Hash::make($token),
            'created_at' => now()
        ]);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'test@example.com',
            'token' => $token,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123'
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Your password has been reset successfully. You can now log in with your new password.'
        ]);

        $user->refresh();
        $this->assertTrue(Hash::check('newpassword123', $user->password));

        // Ensure token is deleted
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'test@example.com'
        ]);
    }

    public function test_reset_password_fails_with_invalid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('oldpassword')
        ]);

        DB::table('password_reset_tokens')->insert([
            'email' => 'test@example.com',
            'token' => Hash::make('valid-token'),
            'created_at' => now()
        ]);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'test@example.com',
            'token' => 'invalid-token',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123'
        ]);

        $response->assertStatus(400);
        $response->assertJson([
            'error'   => 'invalid_token',
            'message' => 'This password reset link is invalid or has already been used.'
        ]);
    }
}
