<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'auth_provider')) {
                $table->string('auth_provider', 50)->default('email_password')->after('provider');
            }
        });

        // Sync existing records
        try {
            if (Schema::hasColumn('users', 'auth_provider') && Schema::hasColumn('users', 'provider')) {
                DB::table('users')
                    ->whereNull('auth_provider')
                    ->orWhere('auth_provider', '')
                    ->update([
                        'auth_provider' => DB::raw("CASE 
                            WHEN provider = 'google' THEN 'google'
                            WHEN provider = 'phone' THEN 'phone'
                            ELSE 'email_password'
                        END")
                    ]);
            }
        } catch (\Throwable $e) {
            // Ignore if DB dialect differences occur
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'auth_provider')) {
                $table->dropColumn('auth_provider');
            }
        });
    }
};
