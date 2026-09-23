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
        if (!Schema::hasTable('registration_verifications')) {
            Schema::create('registration_verifications', function (Blueprint $table) {
                $table->id();
                $table->string('registration_id', 64)->unique();
                $table->string('name');
                $table->string('email');
                $table->string('mobile');
                $table->string('password_hash');
                $table->string('otp_hash');
                $table->timestamp('expires_at');
                $table->integer('attempts')->default(0);
                $table->integer('max_attempts')->default(5);
                $table->timestamp('last_sent_at')->nullable();
                $table->timestamp('verified_at')->nullable();
                $table->timestamps();

                $table->index(['email', 'mobile']);
                $table->index('expires_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('registration_verifications');
    }
};
