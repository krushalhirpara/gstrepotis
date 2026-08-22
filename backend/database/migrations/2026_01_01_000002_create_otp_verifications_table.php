<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'email_verified_at')) {
                $table->timestamp('email_verified_at')->nullable()->after('email');
            }
            if (!Schema::hasColumn('users', 'mobile_verified_at')) {
                $table->timestamp('mobile_verified_at')->nullable()->after('mobile');
            }
            if (!Schema::hasColumn('users', 'account_status')) {
                $table->string('account_status')->default('pending_verification')->after('status');
                // pending_verification, email_verified, mobile_verified, active, suspended
            }
        });

        Schema::create('otp_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('channel'); // email, mobile
            $table->string('destination'); // email address or mobile number
            $table->string('otp_hash');
            $table->timestamp('expires_at');
            $table->integer('attempts')->default(0);
            $table->integer('max_attempts')->default(5);
            $table->timestamp('last_sent_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otp_verifications');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['email_verified_at', 'mobile_verified_at', 'account_status']);
        });
    }
};
