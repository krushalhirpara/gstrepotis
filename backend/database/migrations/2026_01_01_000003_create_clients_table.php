<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('trade_name');
            $table->string('party_name');
            $table->string('gstin');
            $table->string('pan', 10)->nullable();
            $table->string('mobile')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('state_code', 5)->nullable();
            $table->string('pincode', 10)->nullable();
            $table->string('filing_frequency')->default('monthly'); // monthly, quarterly
            $table->string('status')->default('active'); // active, inactive
            $table->timestamps();
            $table->softDeletes();

            // Indexes for fast user-isolated queries and duplicate GSTIN prevention
            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'filing_frequency']);
            $table->index(['user_id', 'gstin']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
