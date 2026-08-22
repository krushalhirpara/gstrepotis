<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Users table modifications
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'mobile')) {
                $table->string('mobile')->nullable()->after('email');
            }
            if (!Schema::hasColumn('users', 'user_type')) {
                $table->string('user_type')->default('CA')->after('mobile'); // CA, Accountant, Tax Professional, Seller, Business, Other
            }
            if (!Schema::hasColumn('users', 'is_admin')) {
                $table->boolean('is_admin')->default(false)->after('user_type');
            }
            if (!Schema::hasColumn('users', 'credits')) {
                $table->integer('credits')->default(50)->after('is_admin');
            }
            if (!Schema::hasColumn('users', 'status')) {
                $table->string('status')->default('active')->after('credits');
            }
        });

        // Banks table
        Schema::create('banks', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('logo')->nullable();
            $table->string('status')->default('active'); // active, inactive
            $table->string('parser_type')->default('pdf_standard');
            $table->timestamps();
        });

        // Bank Statements table
        Schema::create('bank_statements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('bank_id')->nullable()->constrained()->onDelete('set null');
            $table->string('original_filename');
            $table->string('stored_filename');
            $table->integer('file_size');
            $table->boolean('password_protected')->default(false);
            $table->string('processing_status')->default('pending'); // pending, processing, completed, failed
            $table->integer('total_transactions')->default(0);
            $table->decimal('total_debit', 15, 2)->default(0);
            $table->decimal('total_credit', 15, 2)->default(0);
            $table->text('error_message')->nullable();
            $table->timestamps();
        });

        // Bank Transactions table
        Schema::create('bank_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('statement_id')->constrained('bank_statements')->onDelete('cascade');
            $table->date('transaction_date');
            $table->date('value_date')->nullable();
            $table->text('narration');
            $table->string('reference_number')->nullable();
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->default(0);
            $table->string('transaction_type')->default('general'); // transfer, cheque, pos, interest, fee
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        // Marketplaces table
        Schema::create('marketplaces', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('logo')->nullable();
            $table->json('supported_file_types');
            $table->string('status')->default('active');
            $table->string('parser_class');
            $table->timestamps();
        });

        // Marketplace Files
        Schema::create('marketplace_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('marketplace_id')->constrained()->onDelete('cascade');
            $table->string('filename');
            $table->integer('file_size');
            $table->string('status')->default('completed');
            $table->integer('total_sales_count')->default(0);
            $table->decimal('total_taxable_value', 15, 2)->default(0);
            $table->decimal('total_tax_amount', 15, 2)->default(0);
            $table->timestamps();
        });

        // GSTR1 Reports
        Schema::create('gstr1_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('marketplace_file_id')->nullable()->constrained('marketplace_files')->onDelete('cascade');
            $table->string('period'); // e.g., 2026-08
            $table->integer('total_invoices')->default(0);
            $table->decimal('taxable_value', 15, 2)->default(0);
            $table->decimal('igst', 15, 2)->default(0);
            $table->decimal('cgst', 15, 2)->default(0);
            $table->decimal('sgst', 15, 2)->default(0);
            $table->decimal('cess', 15, 2)->default(0);
            $table->decimal('tcs_amount', 15, 2)->default(0);
            $table->timestamps();
        });

        // GSTR1 B2B
        Schema::create('gstr1_b2b', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('gstr1_reports')->onDelete('cascade');
            $table->string('gstin');
            $table->string('customer_name');
            $table->string('invoice_number');
            $table->date('invoice_date');
            $table->decimal('invoice_value', 15, 2);
            $table->decimal('taxable_value', 15, 2);
            $table->decimal('gst_rate', 5, 2);
            $table->decimal('igst', 15, 2)->default(0);
            $table->decimal('cgst', 15, 2)->default(0);
            $table->decimal('sgst', 15, 2)->default(0);
            $table->decimal('cess', 15, 2)->default(0);
            $table->boolean('is_valid')->default(true);
            $table->text('validation_errors')->nullable();
            $table->timestamps();
        });

        // GSTR1 B2C
        Schema::create('gstr1_b2c', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('gstr1_reports')->onDelete('cascade');
            $table->string('pos'); // Place of Supply state code
            $table->decimal('taxable_value', 15, 2);
            $table->decimal('gst_rate', 5, 2);
            $table->decimal('igst', 15, 2)->default(0);
            $table->decimal('cgst', 15, 2)->default(0);
            $table->decimal('sgst', 15, 2)->default(0);
            $table->decimal('cess', 15, 2)->default(0);
            $table->string('b2c_type')->default('small'); // small or large
            $table->timestamps();
        });

        // HSN Master Table
        Schema::create('hsn_master', function (Blueprint $table) {
            $table->id();
            $table->string('hsn_code')->unique();
            $table->text('description');
            $table->decimal('gst_rate', 5, 2);
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        // GST Rules Table
        Schema::create('gst_rules', function (Blueprint $table) {
            $table->id();
            $table->string('rule_name');
            $table->string('category');
            $table->json('conditions');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // TCS Records Table
        Schema::create('tcs_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('gstr1_reports')->onDelete('cascade');
            $table->string('marketplace_name');
            $table->string('period');
            $table->decimal('portal_tcs', 15, 2)->default(0);
            $table->decimal('marketplace_tcs', 15, 2)->default(0);
            $table->decimal('difference', 15, 2)->default(0);
            $table->string('status')->default('matched'); // matched, mismatch, missing
            $table->timestamps();
        });

        // Section 9(5) Table
        Schema::create('section_9_5', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('gstr1_reports')->onDelete('cascade');
            $table->string('operator_name');
            $table->string('operator_gstin');
            $table->decimal('taxable_value', 15, 2);
            $table->decimal('tax_amount', 15, 2);
            $table->string('pos');
            $table->timestamps();
        });

        // Plans Table
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->decimal('price_monthly', 10, 2);
            $table->decimal('price_yearly', 10, 2);
            $table->integer('bank_statement_limit');
            $table->integer('ecommerce_report_limit');
            $table->boolean('bulk_upload_enabled')->default(false);
            $table->json('features');
            $table->timestamps();
        });

        // Subscriptions Table
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('plan_id')->constrained()->onDelete('cascade');
            $table->string('status')->default('active'); // active, cancelled, expired
            $table->timestamp('current_period_start');
            $table->timestamp('current_period_end');
            $table->string('razorpay_subscription_id')->nullable();
            $table->timestamps();
        });

        // Payments Table
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('subscription_id')->nullable()->constrained()->onDelete('set null');
            $table->string('razorpay_payment_id')->nullable();
            $table->string('razorpay_order_id')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('status')->default('success'); // success, failed, pending
            $table->string('payment_method')->default('card');
            $table->timestamps();
        });

        // Audit Logs Table
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('action');
            $table->string('module');
            $table->string('record_id')->nullable();
            $table->string('ip_address')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('plans');
        Schema::dropIfExists('section_9_5');
        Schema::dropIfExists('tcs_records');
        Schema::dropIfExists('gst_rules');
        Schema::dropIfExists('hsn_master');
        Schema::dropIfExists('gstr1_b2c');
        Schema::dropIfExists('gstr1_b2b');
        Schema::dropIfExists('gstr1_reports');
        Schema::dropIfExists('marketplace_files');
        Schema::dropIfExists('marketplaces');
        Schema::dropIfExists('bank_transactions');
        Schema::dropIfExists('bank_statements');
        Schema::dropIfExists('banks');
    }
};
