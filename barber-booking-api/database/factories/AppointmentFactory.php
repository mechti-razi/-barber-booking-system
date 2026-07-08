<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\Barber;
use App\Models\Service;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Appointment>
 */
class AppointmentFactory extends Factory
{
    protected $model = Appointment::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $status = fake()->randomElement(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']);
        $isCancelled = $status === 'cancelled';
        
        return [
            'user_id' => User::factory()->client(),
            'shop_id' => Shop::factory(),
            'barber_id' => Barber::factory(),
            'service_id' => Service::factory(),
            'appointment_date' => fake()->dateTimeBetween('-1 month', '+2 weeks')->format('Y-m-d'),
            'appointment_time' => fake()->randomElement([
                '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
                '16:00', '16:30', '17:00', '17:30'
            ]),
            'duration_minutes' => fake()->randomElement([30, 45, 60]),
            'status' => $status,
            'total_price' => fake()->randomFloat(2, 15, 65),
            'notes' => fake()->optional(0.3)->sentence(),
            'cancellation_reason' => $isCancelled ? fake()->sentence() : null,
            'cancelled_at' => $isCancelled ? now()->subDays(fake()->numberBetween(1, 5)) : null,
        ];
    }
}
