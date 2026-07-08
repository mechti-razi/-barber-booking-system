<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The first barber per shop (lowest id) is the owner.
     * Every other barber in that shop is an employee.
     */
    public function up(): void
    {
        // Find the first (earliest) barber per shop — those are the owners
        $ownerIds = DB::table('barbers')
            ->select(DB::raw('MIN(id) as id'))
            ->groupBy('shop_id')
            ->pluck('id')
            ->toArray();

        // Set everyone to employee first, then flip owners
        DB::table('barbers')->update(['is_owner' => false]);
        DB::table('barbers')->whereIn('id', $ownerIds)->update(['is_owner' => true]);
    }

    public function down(): void
    {
        // Revert: mark all as owners
        DB::table('barbers')->update(['is_owner' => true]);
    }
};
