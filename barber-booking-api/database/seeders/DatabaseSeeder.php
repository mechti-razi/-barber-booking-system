<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Shop;
use App\Models\Barber;
use App\Models\Service;
use App\Models\WorkingSchedule;
use App\Models\Appointment;
use App\Models\Review;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Default Static Accounts
        // Admin
        $admin = User::factory()->admin()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'phone' => '1234567890',
        ]);

        // Client
        $defaultClient = User::factory()->client()->create([
            'name' => 'Client User',
            'email' => 'client@example.com',
            'phone' => '0987654321',
        ]);

        // 2. Create 3 Shops
        $shops = Shop::factory(3)->create();

        // 3. Keep track of all barbers and services created
        $allBarbers = [];
        $servicesByShop = [];

        // For first shop, ensure there's a static barber@example.com account
        $isFirstShop = true;

        foreach ($shops as $shop) {
            // Seed 5 services for each shop
            $services = Service::factory(5)->create([
                'shop_id' => $shop->id,
            ]);
            $servicesByShop[$shop->id] = $services;

            // Seed 2 barbers for each shop
            for ($i = 1; $i <= 2; $i++) {
                if ($isFirstShop && $i === 1) {
                    $barberUser = User::factory()->barber($shop->id)->create([
                        'name' => 'Barber User',
                        'email' => 'barber@example.com',
                        'phone' => '5555555555',
                    ]);
                    $isFirstShop = false;
                } else {
                    $barberUser = User::factory()->barber($shop->id)->create();
                }

                $barber = Barber::factory()->create([
                    'user_id' => $barberUser->id,
                    'shop_id' => $shop->id,
                ]);

                $allBarbers[] = $barber;

                // Attach services to the barber
                foreach ($services as $service) {
                    $barber->services()->attach($service->id, [
                        'price' => $service->base_price + fake()->randomElement([-2.00, 0.00, 2.00, 5.00]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                // Create working schedules (Monday - Friday)
                for ($day = 1; $day <= 5; $day++) {
                    WorkingSchedule::create([
                        'barber_id' => $barber->id,
                        'day_of_week' => $day,
                        'start_time' => '09:00:00',
                        'end_time' => '18:00:00',
                        'break_start_time' => '13:00:00',
                        'break_end_time' => '14:00:00',
                        'is_available' => true,
                    ]);
                }
            }
        }

        // 4. Create 10 additional client users
        $clients = User::factory(10)->client()->create();
        $allClients = $clients->concat([$defaultClient]);

        // 5. Create appointments & reviews
        foreach ($allClients as $client) {
            // Give each client 2-3 appointments
            $numAppointments = fake()->numberBetween(2, 3);
            for ($a = 0; $a < $numAppointments; $a++) {
                $barber = fake()->randomElement($allBarbers);
                $shopId = $barber->shop_id;
                
                // Select a service from the same shop
                $shopServices = $servicesByShop[$shopId];
                $service = fake()->randomElement($shopServices);

                // Get price from pivot
                $pivotPrice = $barber->services()->where('service_id', $service->id)->first()?->pivot?->price ?? $service->base_price;

                $appointment = Appointment::factory()->create([
                    'user_id' => $client->id,
                    'shop_id' => $shopId,
                    'barber_id' => $barber->id,
                    'service_id' => $service->id,
                    'total_price' => $pivotPrice,
                ]);

                // Create a review if the appointment is completed
                if ($appointment->status === 'completed') {
                    Review::factory()->create([
                        'user_id' => $client->id,
                        'barber_id' => $barber->id,
                        'appointment_id' => $appointment->id,
                    ]);
                }
            }
        }
    }
}
