<?php

namespace Database\Factories;

use App\Models\Barber;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Review>
 */
class ReviewFactory extends Factory
{
    protected $model = Review::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->client(),
            'barber_id' => Barber::factory(),
            'appointment_id' => null,
            'rating' => fake()->numberBetween(3, 5),
            'comment' => fake()->randomElement([
                'Great haircut! Will definitely come back.',
                'Very professional and friendly.',
                'The best beard trim I\'ve ever had.',
                'Clean shop and good music. Highly recommend!',
                'A bit busy, but the haircut was perfect.',
                'Excellent attention to detail.',
                'Amazing service, very happy with my new look!',
                'Super friendly staff and very skilled.',
            ]),
        ];
    }
}
