<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Use raw SQL — works on all MySQL/MariaDB versions without doctrine/dbal
        DB::statement('ALTER TABLE shops MODIFY COLUMN logo_url LONGTEXT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE shops MODIFY COLUMN logo_url VARCHAR(255) NULL');
    }
};
