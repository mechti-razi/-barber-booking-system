<?php

namespace Database\Factories;

use App\Models\Barber;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Barber>
 */
class BarberFactory extends Factory
{
    protected $model = Barber::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->barber(),
            'shop_id' => Shop::factory(),
            'specialization' => fake()->randomElement(['Haircuts & Beard', 'Classic Shaving', 'Modern Haircuts', 'Hair Coloring & Styling', 'Kid\'s Cuts']),
            'experience_years' => fake()->numberBetween(1, 15),
            'rating' => fake()->randomFloat(2, 3.5, 5.0),
            'bio' => fake()->paragraph(2),
            'is_active' => true,
        ];
    }
}
