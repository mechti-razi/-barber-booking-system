<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            // VARCHAR(255) is too small for Base64-encoded images.
            // LONGTEXT supports up to 4 GB — more than enough for any logo.
            $table->longText('logo_url')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->string('logo_url')->nullable()->change();
        });
    }
};
