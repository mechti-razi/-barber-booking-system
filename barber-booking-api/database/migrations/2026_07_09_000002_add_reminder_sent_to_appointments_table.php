<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->boolean('reminder_24h_sent')->default(false)->after('notes');
            $table->boolean('reminder_1h_sent')->default(false)->after('reminder_24h_sent');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['reminder_24h_sent', 'reminder_1h_sent']);
        });
    }
};
