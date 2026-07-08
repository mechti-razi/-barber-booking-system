<?php

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BarberSampleDataSeeder extends Seeder
{
    public function run()
    {
        $clientId = 21;
        $barberId = 8;
        $shopId   = 3;

        // ── Services ──────────────────────────────────────────────
        DB::table('services')->where('shop_id', $shopId)->delete();

        $s1 = DB::table('services')->insertGetId([
            'shop_id' => $shopId, 'name' => 'Classic Haircut', 'slug' => 'classic-haircut-' . $shopId,
            'description' => 'Timeless haircut with wash and blow dry.', 'base_price' => 25,
            'duration_minutes' => 30, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $s2 = DB::table('services')->insertGetId([
            'shop_id' => $shopId, 'name' => 'Beard Trim', 'slug' => 'beard-trim-' . $shopId,
            'description' => 'Expert beard shaping and conditioning.', 'base_price' => 15,
            'duration_minutes' => 20, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $s3 = DB::table('services')->insertGetId([
            'shop_id' => $shopId, 'name' => 'Hot Towel Shave', 'slug' => 'hot-towel-shave-' . $shopId,
            'description' => 'Classic straight razor shave.', 'base_price' => 35,
            'duration_minutes' => 45, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);

        // ── Appointments ──────────────────────────────────────────
        DB::table('appointments')->where('barber_id', $barberId)->delete();

        $appointments = [
            [$clientId, $barberId, $s1, $shopId, date('Y-m-d', strtotime('-1 day')),  '09:00:00', 'completed', 25],
            [$clientId, $barberId, $s2, $shopId, date('Y-m-d', strtotime('-2 days')), '10:00:00', 'completed', 15],
            [$clientId, $barberId, $s3, $shopId, date('Y-m-d', strtotime('-4 days')), '11:00:00', 'confirmed', 35],
            [$clientId, $barberId, $s1, $shopId, date('Y-m-d', strtotime('-7 days')), '14:00:00', 'completed', 25],
            [$clientId, $barberId, $s1, $shopId, date('Y-m-d', strtotime('-15 days')),'09:00:00', 'completed', 25],
            [$clientId, $barberId, $s2, $shopId, date('Y-m-d', strtotime('-20 days')),'10:30:00', 'cancelled', 0],
            [$clientId, $barberId, $s3, $shopId, date('Y-m-d', strtotime('-35 days')),'13:00:00', 'completed', 35],
            [$clientId, $barberId, $s1, $shopId, date('Y-m-d', strtotime('+2 days')), '09:00:00', 'pending',   25],
            [$clientId, $barberId, $s2, $shopId, date('Y-m-d', strtotime('+3 days')), '11:00:00', 'confirmed', 15],
        ];

        foreach ($appointments as $a) {
            DB::table('appointments')->insert([
                'user_id'          => $a[0],
                'barber_id'        => $a[1],
                'service_id'       => $a[2],
                'shop_id'          => $a[3],
                'appointment_date' => $a[4],
                'appointment_time' => $a[5],
                'status'           => $a[6],
                'total_price'      => $a[7],
                'is_subscription'  => 0,
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);
        }

        echo "Seeded 3 services and " . count($appointments) . " appointments.\n";
    }
}
