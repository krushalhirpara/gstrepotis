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
        Schema::create('pricing_enquiries', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('contact_number', 30);
            $table->string('email', 191)->index();
            $table->text('message');
            $table->string('selected_plan', 50)->index();
            $table->string('status', 30)->default('new')->index();
            $table->timestamps();

            // Compound index for status and created_at sorting/filtering
            $table->index(['status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pricing_enquiries');
    }
};
