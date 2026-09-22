<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. GST Audits Table
        Schema::create('gst_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')->constrained()->onDelete('cascade');
            $table->string('gstin', 15);
            $table->string('financial_year', 10); // e.g. 2024-25
            $table->string('assessment_year', 10)->nullable(); // e.g. 2025-26
            $table->string('audit_name');
            $table->string('status')->default('draft'); // draft, data_pending, processing, review_required, in_progress, completed
            $table->decimal('data_quality_score', 5, 2)->default(0); // 0.00 to 100.00
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'client_id']);
            $table->index(['user_id', 'status']);
            $table->index(['gstin', 'financial_year']);
        });

        // 2. GST Audit Uploaded Files
        Schema::create('gst_audit_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_id')->constrained('gst_audits')->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('category'); // gstr1, gstr2b, gstr3b, gstr9, sales_register, purchase_register, general_ledger, e_way_bill, other
            $table->string('file_type', 10); // json, xlsx, csv, pdf
            $table->string('original_filename');
            $table->string('stored_filename');
            $table->unsignedBigInteger('file_size');
            $table->string('status')->default('uploaded'); // uploaded, processing, parsed, failed
            $table->unsignedInteger('records_count')->default(0);
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['audit_id', 'category']);
        });

        // 3. Normalized GST Audit Records
        Schema::create('gst_audit_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_id')->constrained('gst_audits')->onDelete('cascade');
            $table->foreignId('file_id')->nullable()->constrained('gst_audit_files')->onDelete('set null');
            $table->string('record_type'); // sales, purchase, gstr1_b2b, gstr1_b2c, gstr1_cdnr, gstr2b_b2b, gstr2b_cdnr, gstr3b_summary, ledger
            $table->string('period', 10)->nullable(); // e.g. 2024-04
            $table->string('invoice_number', 50)->nullable();
            $table->date('invoice_date')->nullable();
            $table->string('counterparty_gstin', 15)->nullable();
            $table->string('counterparty_name')->nullable();
            $table->string('place_of_supply', 5)->nullable();
            $table->string('supply_type', 20)->default('taxable'); // taxable, zero_rated, nil, exempted, non_gst
            $table->decimal('taxable_value', 15, 2)->default(0);
            $table->decimal('igst', 15, 2)->default(0);
            $table->decimal('cgst', 15, 2)->default(0);
            $table->decimal('sgst', 15, 2)->default(0);
            $table->decimal('cess', 15, 2)->default(0);
            $table->decimal('total_value', 15, 2)->default(0);
            $table->string('hsn_sac', 20)->nullable();
            $table->boolean('itc_eligible')->default(true);
            $table->boolean('itc_available')->default(true);
            $table->boolean('reverse_charge')->default(false);
            $table->string('document_type', 10)->default('INV'); // INV, CRN, DBN
            $table->json('raw_data')->nullable();
            $table->json('validation_errors')->nullable();
            $table->timestamps();

            $table->index(['audit_id', 'record_type']);
            $table->index(['audit_id', 'invoice_number']);
            $table->index(['audit_id', 'counterparty_gstin']);
            $table->index(['audit_id', 'period']);
        });

        // 4. GST Audit Reconciliations Table
        Schema::create('gst_audit_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_id')->constrained('gst_audits')->onDelete('cascade');
            $table->string('recon_type', 30); // gstr1_vs_books, gstr2b_vs_purchase, gstr1_vs_gstr3b, itc_summary, rcm
            $table->foreignId('source_record_id')->nullable()->constrained('gst_audit_records')->onDelete('cascade');
            $table->foreignId('target_record_id')->nullable()->constrained('gst_audit_records')->onDelete('cascade');
            $table->string('match_status', 30); // Matched, Partial Match, Mismatch, Missing in Source, Missing in Target, Duplicate, Review Required
            $table->string('match_type', 50)->nullable(); // exact_invoice_gstin_amount, invoice_gstin_date, amount_tolerance, manual
            $table->decimal('difference_taxable', 15, 2)->default(0);
            $table->decimal('difference_igst', 15, 2)->default(0);
            $table->decimal('difference_cgst', 15, 2)->default(0);
            $table->decimal('difference_sgst', 15, 2)->default(0);
            $table->decimal('difference_cess', 15, 2)->default(0);
            $table->unsignedTinyInteger('confidence')->default(100); // 0 - 100
            $table->text('reason')->nullable();
            $table->string('ca_action')->nullable();
            $table->text('ca_remarks')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['audit_id', 'recon_type']);
            $table->index(['audit_id', 'match_status']);
        });

        // 5. GST Audit Exceptions Table
        Schema::create('gst_audit_exceptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_id')->constrained('gst_audits')->onDelete('cascade');
            $table->foreignId('record_id')->nullable()->constrained('gst_audit_records')->onDelete('cascade');
            $table->foreignId('recon_id')->nullable()->constrained('gst_audit_reconciliations')->onDelete('cascade');
            $table->string('rule_code', 30); // e.g. GST-R1-001, GST-2B-001, ITC-001, RCM-001, INV-001, HSN-001
            $table->string('severity', 15); // Critical, High, Medium, Low, Info
            $table->text('description');
            $table->string('source', 50); // e.g. Books, GSTR-1, GSTR-2B, GSTR-3B
            $table->string('record_reference')->nullable(); // e.g. Inv #INV-1024
            $table->decimal('financial_impact', 15, 2)->default(0);
            $table->string('status', 30)->default('Open'); // Open, Under Review, Resolved, Ignored, Needs Client Clarification
            $table->text('ca_remark')->nullable();
            $table->string('action_taken')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['audit_id', 'rule_code']);
            $table->index(['audit_id', 'severity']);
            $table->index(['audit_id', 'status']);
        });

        // 6. GST Audit Checklist Table
        Schema::create('gst_audit_checklists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_id')->constrained('gst_audits')->onDelete('cascade');
            $table->string('category', 50); // GST Registration, Sales, Purchases, ITC, GSTR-1, GSTR-3B, GSTR-2B, RCM, etc.
            $table->string('item_code', 30);
            $table->text('description');
            $table->string('status', 20)->default('Pending'); // Pending, Completed, Not Applicable, Needs Review
            $table->text('ca_remarks')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index(['audit_id', 'category']);
        });

        // 7. CA Working Papers Table
        Schema::create('gst_audit_working_papers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('audit_id')->constrained('gst_audits')->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('section', 50); // General, Outward Supplies, Input Tax Credit, Reverse Charge, Returns Reconciliation, Final Opinion
            $table->string('title');
            $table->text('observation')->nullable();
            $table->text('explanation')->nullable();
            $table->text('management_response')->nullable();
            $table->text('conclusion')->nullable();
            $table->text('follow_up_action')->nullable();
            $table->text('reviewer_notes')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['audit_id', 'section']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gst_audit_working_papers');
        Schema::dropIfExists('gst_audit_checklists');
        Schema::dropIfExists('gst_audit_exceptions');
        Schema::dropIfExists('gst_audit_reconciliations');
        Schema::dropIfExists('gst_audit_records');
        Schema::dropIfExists('gst_audit_files');
        Schema::dropIfExists('gst_audits');
    }
};
