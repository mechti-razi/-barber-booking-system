<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('barbers', function (Blueprint $table) {
            $table->boolean('is_owner')->default(false)->after('is_active');
        });

        // All existing barbers self-registered → mark them as owners
        \Illuminate\Support\Facades\DB::table('barbers')->update(['is_owner' => true]);
    }

    public function down(): void
    {
        Schema::table('barbers', function (Blueprint $table) {
            $table->dropColumn('is_owner');
        });
    }
};
