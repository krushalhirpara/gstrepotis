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
        if (!Schema::hasTable('login_otp_verifications')) {
            Schema::create('login_otp_verifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('challenge_id', 64)->unique();
                $table->string('otp_hash');
                $table->timestamp('expires_at');
                $table->integer('attempts')->default(0);
                $table->integer('max_attempts')->default(5);
                $table->timestamp('last_sent_at')->nullable();
                $table->timestamp('verified_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'challenge_id']);
                $table->index('expires_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('login_otp_verifications');
    }
};
