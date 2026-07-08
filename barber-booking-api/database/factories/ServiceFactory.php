<?php

namespace Database\Factories;

use App\Models\Service;
use App\Models\Shop;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    protected $model = Service::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $services = [
            [
                'name' => 'Classic Haircut',
                'duration_minutes' => 30,
                'base_price' => 25.00,
                'description' => 'A clean and neat classic haircut suited to your style. Includes a wash and simple style.',
            ],
            [
                'name' => 'Beard Trim & Shape',
                'duration_minutes' => 20,
                'base_price' => 15.00,
                'description' => 'Trimming and shaping your beard to perfection with clippers and a hot towel finish.',
            ],
            [
                'name' => 'Hot Towel Shave',
                'duration_minutes' => 40,
                'base_price' => 35.00,
                'description' => 'Traditional straight razor shave with essential oil pre-treatment, hot towels, and soothing balm.',
            ],
            [
                'name' => 'Hair Coloring',
                'duration_minutes' => 60,
                'base_price' => 50.00,
                'description' => 'Professional hair dye or highlight application tailored to cover greys or change your look.',
            ],
            [
                'name' => 'Premium Haircut & Beard Grooming',
                'duration_minutes' => 50,
                'base_price' => 45.00,
                'description' => 'Our signature package. Classic haircut, full beard grooming with hot towel shave, and head massage.',
            ],
            [
                'name' => 'Kids Haircut',
                'duration_minutes' => 25,
                'base_price' => 18.00,
                'description' => 'A quick and friendly haircut experience for children under 12.',
            ],
            [
                'name' => 'Nose & Ear Waxing',
                'duration_minutes' => 15,
                'base_price' => 10.00,
                'description' => 'Quick and clean removal of unwanted nose and ear hair using high-quality wax.',
            ],
        ];

        $service = fake()->randomElement($services);

        return [
            'shop_id' => Shop::factory(),
            'name' => $service['name'],
            'slug' => Str::slug($service['name']) . '-' . fake()->unique()->numberBetween(1, 1000),
            'description' => $service['description'],
            'duration_minutes' => $service['duration_minutes'],
            'base_price' => $service['base_price'],
            'is_active' => true,
        ];
    }
}
