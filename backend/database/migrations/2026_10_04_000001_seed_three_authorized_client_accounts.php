<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $accounts = [
            [
                'email' => 'ca.narendrabhai@gmail.com',
                'name' => 'CA Narendra Patel',
                'password' => Hash::make('Narendra@2026!'),
                'mobile' => '+919825000001',
                'user_type' => 'CA',
                'is_admin' => false,
                'status' => 'active',
                'account_status' => 'active',
                'credits' => 5000,
                'email_verified_at' => now(),
                'mobile_verified_at' => now(),
            ],
            [
                'email' => 'ca.umeshbhai@gmail.com',
                'name' => 'CA Umesh Patel',
                'password' => Hash::make('Umesh@2026!'),
                'mobile' => '+919825000002',
                'user_type' => 'CA',
                'is_admin' => false,
                'status' => 'active',
                'account_status' => 'active',
                'credits' => 5000,
                'email_verified_at' => now(),
                'mobile_verified_at' => now(),
            ],
            [
                'email' => 'ca.test@gmail.com',
                'name' => 'CA Test Account',
                'password' => Hash::make('Test@2026!'),
                'mobile' => '+919825000003',
                'user_type' => 'CA',
                'is_admin' => false,
                'status' => 'active',
                'account_status' => 'active',
                'credits' => 5000,
                'email_verified_at' => now(),
                'mobile_verified_at' => now(),
            ],
        ];

        foreach ($accounts as $account) {
            User::updateOrCreate(
                ['email' => $account['email']],
                $account
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Safe down migration: retain users or set inactive
    }
};
