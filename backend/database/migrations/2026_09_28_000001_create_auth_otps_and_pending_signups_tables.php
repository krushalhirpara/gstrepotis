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
        // 1. Dedicated Unified Auth OTP Table
        if (!Schema::hasTable('auth_otps')) {
            Schema::create('auth_otps', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
                $table->string('challenge_id', 64)->nullable()->unique();
                $table->string('identifier', 191)->index();
                $table->string('channel', 20)->default('email'); // 'email', 'sms'
                $table->string('purpose', 50)->default('login'); // 'login', 'signup', 'password_reset'
                $table->string('otp_hash', 128);
                $table->timestamp('expires_at')->index();
                $table->integer('attempts')->default(0);
                $table->integer('max_attempts')->default(5);
                $table->timestamp('last_sent_at')->nullable();
                $table->timestamp('verified_at')->nullable();
                $table->timestamps();

                $table->index(['identifier', 'purpose']);
                $table->index(['channel', 'purpose']);
            });
        }

        // 2. Pending Signups Table (Temporary secure storage for dual OTP signup flow)
        if (!Schema::hasTable('pending_signups')) {
            Schema::create('pending_signups', function (Blueprint $table) {
                $table->id();
                $table->string('signup_token', 64)->unique();
                $table->string('name', 150);
                $table->string('email', 150)->index();
                $table->string('mobile', 30)->index();
                $table->string('password_hash');
                $table->string('email_otp_hash', 128);
                $table->string('mobile_otp_hash', 128)->nullable();
                $table->timestamp('email_expires_at');
                $table->timestamp('mobile_expires_at')->nullable();
                $table->integer('email_attempts')->default(0);
                $table->integer('mobile_attempts')->default(0);
                $table->integer('max_attempts')->default(5);
                $table->timestamp('email_last_sent_at')->nullable();
                $table->timestamp('mobile_last_sent_at')->nullable();
                $table->timestamp('email_verified_at')->nullable();
                $table->timestamp('mobile_verified_at')->nullable();
                $table->timestamps();

                $table->index(['email', 'mobile']);
                $table->index('email_expires_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pending_signups');
        Schema::dropIfExists('auth_otps');
    }
};
