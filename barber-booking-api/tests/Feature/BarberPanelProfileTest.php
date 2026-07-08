<?php

namespace Tests\Feature;

use App\Models\Barber;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class BarberPanelProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_barber_can_get_profile(): void
    {
        $shop = Shop::factory()->create(['name' => 'Gold Cuts']);
        $user = User::factory()->create(['role' => 'barber', 'name' => 'Dreadlocks Master', 'phone' => '+123456789']);
        $barber = Barber::factory()->create([
            'user_id' => $user->id,
            'shop_id' => $shop->id,
            'specialization' => 'Haircut & Styling',
            'experience_years' => 5,
            'bio' => 'Experienced barber',
            'rating' => 4.9,
        ]);

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/v1/barber-panel/profile');

        $response->assertStatus(200);
        $response->assertJson([
            'name' => 'Dreadlocks Master',
            'email' => $user->email,
            'phone' => '+123456789',
            'specialization' => 'Haircut & Styling',
            'experience_years' => 5,
            'bio' => 'Experienced barber',
            'rating' => 4.9,
            'shop' => [
                'name' => 'Gold Cuts',
            ]
        ]);
    }

    public function test_barber_can_update_profile(): void
    {
        $shop = Shop::factory()->create(['name' => 'Gold Cuts']);
        $user = User::factory()->create(['role' => 'barber', 'name' => 'Dreadlocks Master', 'phone' => '+123456789']);
        $barber = Barber::factory()->create([
            'user_id' => $user->id,
            'shop_id' => $shop->id,
            'specialization' => 'Haircut & Styling',
            'experience_years' => 5,
            'bio' => 'Experienced barber',
        ]);

        $response = $this->actingAs($user, 'api')
            ->putJson('/api/v1/barber-panel/profile', [
                'name' => 'New Awesome Name',
                'phone' => '+987654321',
                'specialization' => 'Beard Grooming',
                'experience_years' => 7,
                'bio' => 'Updated bio text',
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('name', 'New Awesome Name');
        $response->assertJsonPath('specialization', 'Beard Grooming');
        $response->assertJsonPath('experience_years', 7);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Awesome Name',
            'phone' => '+987654321',
        ]);

        $this->assertDatabaseHas('barbers', [
            'id' => $barber->id,
            'specialization' => 'Beard Grooming',
            'experience_years' => 7,
            'bio' => 'Updated bio text',
        ]);
    }

    public function test_user_can_change_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('oldpassword123'),
        ]);

        $response = $this->actingAs($user, 'api')
            ->putJson('/api/v1/auth/change-password', [
                'current_password' => 'oldpassword123',
                'new_password' => 'newsecurepassword',
                'new_password_confirmation' => 'newsecurepassword',
            ]);

        $response->assertStatus(200);
        $response->assertJson(['message' => 'Password changed successfully.']);

        $user->refresh();
        $this->assertTrue(Hash::check('newsecurepassword', $user->password));
    }

    public function test_user_cannot_change_password_with_wrong_current_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('oldpassword123'),
        ]);

        $response = $this->actingAs($user, 'api')
            ->putJson('/api/v1/auth/change-password', [
                'current_password' => 'wrongcurrentpassword',
                'new_password' => 'newsecurepassword',
                'new_password_confirmation' => 'newsecurepassword',
            ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'The current password you entered is incorrect.');
    }
}
