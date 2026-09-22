<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\GstAudit;
use App\Models\GstAuditChecklist;
use App\Models\GstAuditException;
use App\Models\GstAuditFile;
use App\Models\GstAuditRecord;
use App\Models\GstAuditWorkingPaper;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GstAuditTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected User $otherUser;
    protected Client $client;
    protected string $token = 'test_token_ca_1234567890';
    protected string $otherToken = 'test_token_ca_9876543210';

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->user = User::factory()->create([
            'email' => 'ca.user@example.com',
            'api_token' => $this->token,
            'status' => 'active',
            'account_status' => 'active',
        ]);

        $this->otherUser = User::factory()->create([
            'email' => 'other.ca@example.com',
            'api_token' => $this->otherToken,
            'status' => 'active',
            'account_status' => 'active',
        ]);

        $this->client = Client::create([
            'user_id' => $this->user->id,
            'trade_name' => 'Apex Technologies LLP',
            'party_name' => 'Apex Technologies',
            'gstin' => '27AABCA1234F1Z5',
            'pan' => 'AABCA1234F',
            'state' => 'Maharashtra',
            'state_code' => '27',
            'filing_frequency' => 'monthly',
            'status' => 'active',
        ]);
    }

    public function test_unauthenticated_request_is_rejected()
    {
        $response = $this->getJson('/api/gst-audits');
        $response->assertStatus(401);
    }

    public function test_create_audit_successfully()
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson('/api/gst-audits', [
                'client_id' => $this->client->id,
                'financial_year' => '2024-25',
                'assessment_year' => '2025-26',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'client_id' => $this->client->id,
                    'gstin' => '27AABCA1234F1Z5',
                    'financial_year' => '2024-25',
                ],
            ]);

        $this->assertDatabaseHas('gst_audits', [
            'client_id' => $this->client->id,
            'gstin' => '27AABCA1234F1Z5',
            'financial_year' => '2024-25',
        ]);

        // Verify checklist was initialized
        $auditId = $response->json('data.id');
        $this->assertGreaterThan(10, GstAuditChecklist::where('audit_id', $auditId)->count());
    }

    public function test_cannot_create_audit_for_another_users_client_idor_prevention()
    {
        // Try creating audit using other user's client
        $response = $this->withHeader('Authorization', "Bearer {$this->otherToken}")
            ->postJson('/api/gst-audits', [
                'client_id' => $this->client->id,
                'financial_year' => '2024-25',
            ]);

        $response->assertStatus(403);
    }

    public function test_cannot_access_another_users_audit_hub()
    {
        $audit = GstAudit::create([
            'user_id' => $this->user->id,
            'client_id' => $this->client->id,
            'gstin' => $this->client->gstin,
            'financial_year' => '2024-25',
            'audit_name' => 'Audit 1',
            'status' => 'data_pending',
        ]);

        // otherUser attempts to read this audit
        $response = $this->withHeader('Authorization', "Bearer {$this->otherToken}")
            ->getJson("/api/gst-audits/{$audit->id}");

        $response->assertStatus(404);
    }

    public function test_upload_and_parse_gstr1_json()
    {
        $audit = GstAudit::create([
            'user_id' => $this->user->id,
            'client_id' => $this->client->id,
            'gstin' => $this->client->gstin,
            'financial_year' => '2024-25',
            'audit_name' => 'Apex Tech FY24-25 Audit',
            'status' => 'data_pending',
        ]);

        $gstr1Data = [
            'gstin' => '27AABCA1234F1Z5',
            'fp' => '042024',
            'b2b' => [
                [
                    'ctin' => '27BBBBB1234B1Z2',
                    'cmn' => ['trade_nam' => 'Global Retailers Ltd'],
                    'inv' => [
                        [
                            'inum' => 'INV-2024-001',
                            'idt' => '15-04-2024',
                            'val' => 118000.00,
                            'pos' => '27',
                            'rchrg' => 'N',
                            'itms' => [
                                [
                                    'num' => 1,
                                    'itm_det' => [
                                        'rt' => 18,
                                        'txval' => 100000.00,
                                        'camt' => 9000.00,
                                        'samt' => 9000.00,
                                        'csamt' => 0.00,
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $file = UploadedFile::fake()->createWithContent('gstr1_april.json', json_encode($gstr1Data));

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson("/api/gst-audits/{$audit->id}/files", [
                'file' => $file,
                'category' => 'gstr1',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'category' => 'gstr1',
                    'status' => 'parsed',
                    'records_count' => 1,
                ],
            ]);

        $this->assertDatabaseHas('gst_audit_records', [
            'audit_id' => $audit->id,
            'invoice_number' => 'INV-2024-001',
            'counterparty_gstin' => '27BBBBB1234B1Z2',
            'taxable_value' => 100000.00,
            'cgst' => 9000.00,
            'sgst' => 9000.00,
        ]);
    }

    public function test_upload_and_parse_purchase_register_csv()
    {
        $audit = GstAudit::create([
            'user_id' => $this->user->id,
            'client_id' => $this->client->id,
            'gstin' => $this->client->gstin,
            'financial_year' => '2024-25',
            'audit_name' => 'Apex Tech FY24-25 Audit',
            'status' => 'data_pending',
        ]);

        $csvContent = "Invoice No,Invoice Date,Supplier GSTIN,Supplier Name,Taxable Value,CGST,SGST,IGST,Total Value\n"
                    . "PR-101,2024-04-10,27ABCDE1234F1Z5,Tech Supplies Ltd,50000,4500,4500,0,59000\n"
                    . "PR-102,2024-04-12,24XYZAB5678C1D2,Gujarat Logistics,20000,0,0,3600,23600\n";

        $file = UploadedFile::fake()->createWithContent('purchases_april.csv', $csvContent);

        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson("/api/gst-audits/{$audit->id}/files", [
                'file' => $file,
                'category' => 'purchase_register',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'category' => 'purchase_register',
                    'status' => 'parsed',
                    'records_count' => 2,
                ],
            ]);

        $this->assertDatabaseHas('gst_audit_records', [
            'audit_id' => $audit->id,
            'invoice_number' => 'PR-101',
            'counterparty_gstin' => '27ABCDE1234F1Z5',
            'taxable_value' => 50000.00,
        ]);
    }

    public function test_reconciliation_and_rule_engine_execution()
    {
        $audit = GstAudit::create([
            'user_id' => $this->user->id,
            'client_id' => $this->client->id,
            'gstin' => $this->client->gstin,
            'financial_year' => '2024-25',
            'audit_name' => 'Apex Tech FY24-25 Audit',
            'status' => 'data_pending',
        ]);

        $file = GstAuditFile::create([
            'audit_id' => $audit->id,
            'user_id' => $this->user->id,
            'category' => 'gstr1',
            'file_type' => 'json',
            'original_filename' => 'gstr1.json',
            'stored_filename' => 'path/test.json',
            'file_size' => 100,
            'status' => 'parsed',
            'records_count' => 3,
        ]);

        // 1. Sales Register Record
        GstAuditRecord::create([
            'audit_id' => $audit->id,
            'file_id' => $file->id,
            'record_type' => 'sales',
            'invoice_number' => 'INV-MATCH-01',
            'invoice_date' => '2024-04-10',
            'counterparty_gstin' => '27BBBBB1234B1Z2',
            'counterparty_name' => 'Buyer One',
            'taxable_value' => 100000,
            'cgst' => 9000,
            'sgst' => 9000,
            'igst' => 0,
            'total_value' => 118000,
            'source' => 'Sales Register',
        ]);

        // 2. GSTR-1 matching record
        GstAuditRecord::create([
            'audit_id' => $audit->id,
            'file_id' => $file->id,
            'record_type' => 'gstr1_b2b',
            'invoice_number' => 'INV-MATCH-01',
            'invoice_date' => '2024-04-10',
            'counterparty_gstin' => '27BBBBB1234B1Z2',
            'counterparty_name' => 'Buyer One',
            'taxable_value' => 100000,
            'cgst' => 9000,
            'sgst' => 9000,
            'igst' => 0,
            'total_value' => 118000,
            'source' => 'GSTR-1 Portal',
        ]);

        // 3. Duplicate Invoice in Sales Register to trigger INV-001 rule
        GstAuditRecord::create([
            'audit_id' => $audit->id,
            'file_id' => $file->id,
            'record_type' => 'sales',
            'invoice_number' => 'INV-DUP-01',
            'invoice_date' => '2024-04-15',
            'counterparty_gstin' => '27CCCCC1234C1Z3',
            'taxable_value' => 50000,
            'cgst' => 4500,
            'sgst' => 4500,
            'total_value' => 59000,
            'source' => 'Sales Register',
        ]);
        GstAuditRecord::create([
            'audit_id' => $audit->id,
            'file_id' => $file->id,
            'record_type' => 'sales',
            'invoice_number' => 'INV-DUP-01',
            'invoice_date' => '2024-04-15',
            'counterparty_gstin' => '27CCCCC1234C1Z3',
            'taxable_value' => 50000,
            'cgst' => 4500,
            'sgst' => 4500,
            'total_value' => 59000,
            'source' => 'Sales Register',
        ]);

        // Run processing
        $response = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson("/api/gst-audits/{$audit->id}/process");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        // Verify reconciliation generated
        $this->assertDatabaseHas('gst_audit_reconciliations', [
            'audit_id' => $audit->id,
            'recon_type' => 'gstr1_vs_books',
            'match_status' => 'Matched',
        ]);

        // Verify INV-001 exception detected for duplicate invoice
        $this->assertDatabaseHas('gst_audit_exceptions', [
            'audit_id' => $audit->id,
            'rule_code' => 'INV-001',
            'record_reference' => 'Inv #INV-DUP-01',
            'severity' => 'High',
        ]);
    }

    public function test_exception_update_and_bulk_update()
    {
        $audit = GstAudit::create([
            'user_id' => $this->user->id,
            'client_id' => $this->client->id,
            'gstin' => $this->client->gstin,
            'financial_year' => '2024-25',
            'audit_name' => 'Apex Tech FY24-25 Audit',
            'status' => 'review_required',
        ]);

        $ex1 = GstAuditException::create([
            'audit_id' => $audit->id,
            'rule_code' => 'INV-001',
            'severity' => 'Critical',
            'status' => 'Open',
            'source' => 'Sales Register',
            'record_reference' => 'Invoice #INV-001',
            'financial_impact' => 50000,
            'description' => 'Duplicate Invoice',
        ]);

        $ex2 = GstAuditException::create([
            'audit_id' => $audit->id,
            'rule_code' => 'INV-003',
            'severity' => 'High',
            'status' => 'Open',
            'source' => 'Sales Register',
            'record_reference' => 'Invoice #INV-002',
            'financial_impact' => 20000,
            'description' => 'Invalid GSTIN format',
        ]);

        // 1. Single update
        $resSingle = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->patchJson("/api/gst-audits/{$audit->id}/exceptions/{$ex1->id}", [
                'status' => 'Under Review',
                'ca_remark' => 'Client verified this is a corrected reissue.',
                'action_taken' => 'Requested credit note entry',
            ]);

        $resSingle->assertStatus(200);
        $this->assertDatabaseHas('gst_audit_exceptions', [
            'id' => $ex1->id,
            'status' => 'Under Review',
            'ca_remark' => 'Client verified this is a corrected reissue.',
        ]);

        // 2. Bulk update
        $resBulk = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson("/api/gst-audits/{$audit->id}/exceptions/bulk", [
                'exception_ids' => [$ex1->id, $ex2->id],
                'status' => 'Resolved',
                'ca_remark' => 'Resolved after CA review.',
            ]);

        $resBulk->assertStatus(200);
        $this->assertEquals(2, GstAuditException::where('audit_id', $audit->id)->where('status', 'Resolved')->count());
    }

    public function test_checklist_and_working_papers()
    {
        $audit = GstAudit::create([
            'user_id' => $this->user->id,
            'client_id' => $this->client->id,
            'gstin' => $this->client->gstin,
            'financial_year' => '2024-25',
            'audit_name' => 'Apex Tech FY24-25 Audit',
            'status' => 'review_required',
        ]);

        $item = GstAuditChecklist::create([
            'audit_id' => $audit->id,
            'category' => 'ITC',
            'item_code' => 'CHK-ITC-01',
            'description' => 'Reconcile GSTR-2B available ITC with GSTR-3B.',
            'status' => 'Pending',
        ]);

        // Update checklist item
        $resChecklist = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->patchJson("/api/gst-audits/{$audit->id}/checklist/{$item->id}", [
                'status' => 'Completed',
                'ca_remarks' => 'Verified with April to March 2B summaries.',
            ]);

        $resChecklist->assertStatus(200);
        $this->assertDatabaseHas('gst_audit_checklists', [
            'id' => $item->id,
            'status' => 'Completed',
        ]);

        // Working Paper Store
        $resWp = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->postJson("/api/gst-audits/{$audit->id}/working-papers", [
                'section' => 'ITC Verification',
                'title' => 'Review of Section 17(5) Blocked Credits',
                'observation' => 'Found motor vehicle repair invoices where ITC was initially claimed.',
                'conclusion' => 'Client agreed to reverse Rs 18,000 in next month GSTR-3B.',
            ]);

        $resWp->assertStatus(201);
        $wpId = $resWp->json('data.id');

        $this->assertDatabaseHas('gst_audit_working_papers', [
            'id' => $wpId,
            'audit_id' => $audit->id,
            'section' => 'ITC Verification',
        ]);

        // Working Paper Delete (Soft delete)
        $resDel = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->deleteJson("/api/gst-audits/{$audit->id}/working-papers/{$wpId}");

        $resDel->assertStatus(200);
        $this->assertSoftDeleted('gst_audit_working_papers', ['id' => $wpId]);
    }

    public function test_report_summary_and_csv_export()
    {
        $audit = GstAudit::create([
            'user_id' => $this->user->id,
            'client_id' => $this->client->id,
            'gstin' => $this->client->gstin,
            'financial_year' => '2024-25',
            'audit_name' => 'Apex Tech FY24-25 Audit',
            'status' => 'review_required',
        ]);

        GstAuditException::create([
            'audit_id' => $audit->id,
            'rule_code' => 'GST-R1-001',
            'severity' => 'High',
            'status' => 'Open',
            'source' => 'GSTR-1 vs Books',
            'record_reference' => 'Invoice #INV-EXP-99',
            'financial_impact' => 45000,
            'description' => 'Invoice in Sales Register missing in GSTR-1',
        ]);

        // Report Summary JSON
        $resReport = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->getJson("/api/gst-audits/{$audit->id}/report");

        $resReport->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'audit',
                    'client',
                    'outward_supplies',
                    'inward_supplies',
                    'reconciliations',
                    'exceptions',
                    'disclaimer',
                ],
            ]);

        // CSV Export
        $resCsv = $this->withHeader('Authorization', "Bearer {$this->token}")
            ->get("/api/gst-audits/{$audit->id}/export/csv");

        $resCsv->assertStatus(200);
        $this->assertStringContainsString('GST-R1-001', $resCsv->getContent());
        $this->assertStringContainsString('INV-EXP-99', $resCsv->getContent());
    }
}
