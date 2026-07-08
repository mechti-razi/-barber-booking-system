<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('barbers', function (Blueprint $table) {
            $table->string('subscription_type')->nullable()->after('bio'); // e.g., 'monthly', 'quarterly', 'yearly'
            $table->date('subscription_expiry_date')->nullable()->after('subscription_type');
            $table->index('subscription_expiry_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('barbers', function (Blueprint $table) {
            $table->dropColumn(['subscription_type', 'subscription_expiry_date']);
        });
    }
};