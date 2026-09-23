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
            if (!Schema::hasColumn('users', 'firebase_uid')) {
                $table->string('firebase_uid', 128)->nullable()->unique()->after('email');
            }
            if (!Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('updated_at');
            }
        });

        // Backfill firebase_uid with google_id for existing records if available
        try {
            if (Schema::hasColumn('users', 'google_id') && Schema::hasColumn('users', 'firebase_uid')) {
                DB::table('users')
                    ->whereNotNull('google_id')
                    ->whereNull('firebase_uid')
                    ->update([
                        'firebase_uid' => DB::raw('google_id'),
                    ]);
            }
        } catch (\Throwable $e) {
            // Ignore if DB expression syntax differs
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('users', 'firebase_uid')) {
                $columns[] = 'firebase_uid';
            }
            if (Schema::hasColumn('users', 'last_login_at')) {
                $columns[] = 'last_login_at';
            }
            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
