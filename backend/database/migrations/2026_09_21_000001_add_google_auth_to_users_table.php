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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'google_id')) {
                $table->string('google_id')->nullable()->unique()->after('email');
            }
            if (!Schema::hasColumn('users', 'avatar')) {
                $table->text('avatar')->nullable()->after('google_id');
            }
            if (!Schema::hasColumn('users', 'provider')) {
                $table->string('provider', 30)->default('google')->after('avatar');
            }
            if (!Schema::hasColumn('users', 'api_token')) {
                $table->string('api_token', 80)->nullable()->unique()->after('remember_token');
            }
        });

        // Make password nullable for OAuth users
        try {
            Schema::table('users', function (Blueprint $table) {
                $table->string('password')->nullable()->change();
            });
        } catch (\Throwable $e) {
            // Some drivers without doctrine/dbal might ignore nullable change
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('users', 'google_id')) {
                $columns[] = 'google_id';
            }
            if (Schema::hasColumn('users', 'avatar')) {
                $columns[] = 'avatar';
            }
            if (Schema::hasColumn('users', 'provider')) {
                $columns[] = 'provider';
            }
            if (Schema::hasColumn('users', 'api_token')) {
                $columns[] = 'api_token';
            }
            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
