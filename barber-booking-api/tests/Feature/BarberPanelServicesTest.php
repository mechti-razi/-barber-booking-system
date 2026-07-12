<?php

namespace Tests\Feature;

use App\Models\Barber;
use App\Models\Shop;
use App\Models\User;
use App\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BarberPanelServicesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    public function test_barber_can_get_shop_services(): void
    {
        $shop = Shop::factory()->create();
        $user = User::factory()->create(['role' => 'barber']);
        $barber = Barber::factory()->create([
            'user_id' => $user->id,
            'shop_id' => $shop->id,
            'is_owner' => true,
        ]);

        $service1 = Service::factory()->create(['shop_id' => $shop->id, 'name' => 'Haircut A']);
        $service2 = Service::factory()->create(['shop_id' => $shop->id, 'name' => 'Haircut B']);
        
        // Another shop's service
        $otherShop = Shop::factory()->create();
        $otherService = Service::factory()->create(['shop_id' => $otherShop->id]);

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/v1/barber-panel/services');

        $response->assertStatus(200);
        $response->assertJsonCount(2);
        $response->assertJsonFragment(['name' => 'Haircut A']);
        $response->assertJsonFragment(['name' => 'Haircut B']);
        $response->assertJsonMissing(['id' => $otherService->id]);
    }

    public function test_barber_can_create_service_in_their_shop(): void
    {
        $shop = Shop::factory()->create();
        $user = User::factory()->create(['role' => 'barber']);
        $barber = Barber::factory()->create([
            'user_id' => $user->id,
            'shop_id' => $shop->id,
            'is_owner' => true,
        ]);

        $response = $this->actingAs($user, 'api')
            ->postJson('/api/v1/barber-panel/services', [
                'name' => 'Super Beard Trim',
                'description' => 'Top notch service',
                'base_price' => 600,
                'duration_minutes' => 25,
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('service.name', 'Super Beard Trim');

        $this->assertDatabaseHas('services', [
            'shop_id' => $shop->id,
            'name' => 'Super Beard Trim',
            'base_price' => 600,
        ]);

        // Verify it was attached to the barber
        $this->assertDatabaseHas('service_barber', [
            'barber_id' => $barber->id,
            'price' => 600,
        ]);
    }

    public function test_barber_can_update_service(): void
    {
        $shop = Shop::factory()->create();
        $user = User::factory()->create(['role' => 'barber']);
        $barber = Barber::factory()->create([
            'user_id' => $user->id,
            'shop_id' => $shop->id,
            'is_owner' => true,
        ]);

        $service = Service::factory()->create(['shop_id' => $shop->id, 'name' => 'Old Name', 'base_price' => 300]);

        $response = $this->actingAs($user, 'api')
            ->putJson("/api/v1/barber-panel/services/{$service->id}", [
                'name' => 'New Name',
                'base_price' => 450,
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('services', [
            'id' => $service->id,
            'name' => 'New Name',
            'base_price' => 450,
        ]);
    }

    public function test_barber_can_delete_service(): void
    {
        $shop = Shop::factory()->create();
        $user = User::factory()->create(['role' => 'barber']);
        $barber = Barber::factory()->create([
            'user_id' => $user->id,
            'shop_id' => $shop->id,
            'is_owner' => true,
        ]);

        $service = Service::factory()->create(['shop_id' => $shop->id]);
        $barber->services()->attach($service->id, ['price' => $service->base_price]);

        $response = $this->actingAs($user, 'api')
            ->deleteJson("/api/v1/barber-panel/services/{$service->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('services', ['id' => $service->id]);
        $this->assertDatabaseMissing('service_barber', [
            'service_id' => $service->id,
            'barber_id' => $barber->id,
        ]);
    }

    public function test_barber_can_toggle_service_status(): void
    {
        $shop = Shop::factory()->create();
        $user = User::factory()->create(['role' => 'barber']);
        $barber = Barber::factory()->create([
            'user_id' => $user->id,
            'shop_id' => $shop->id,
            'is_owner' => true,
        ]);

        $service = Service::factory()->create(['shop_id' => $shop->id, 'is_active' => true]);

        $response = $this->actingAs($user, 'api')
            ->patchJson("/api/v1/barber-panel/services/{$service->id}/toggle");

        $response->assertStatus(200);
        $response->assertJsonPath('is_active', false);
        $this->assertDatabaseHas('services', [
            'id' => $service->id,
            'is_active' => false,
        ]);
    }
}
