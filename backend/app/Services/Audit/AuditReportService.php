<?php

namespace App\Services\Audit;

use App\Models\GstAudit;
use App\Models\GstAuditException;
use App\Models\GstAuditRecord;
use App\Models\GstAuditReconciliation;
use App\Models\GstAuditChecklist;
use App\Models\GstAuditWorkingPaper;

class AuditReportService
{
    /**
     * Compile complete structured audit dossier report data
     */
    public function generateReportData(GstAudit $audit): array
    {
        $client = $audit->client;
        $records = GstAuditRecord::where('audit_id', $audit->id)->get();
        $recons = GstAuditReconciliation::where('audit_id', $audit->id)->get();
        $exceptions = GstAuditException::where('audit_id', $audit->id)->get();
        $checklists = GstAuditChecklist::where('audit_id', $audit->id)->get();
        $workingPapers = GstAuditWorkingPaper::where('audit_id', $audit->id)->get();

        // 1. Sales & Outward Supplies
        $salesRecords = $records->where('record_type', 'sales');
        $gstr1Records = $records->whereIn('record_type', ['gstr1_b2b', 'gstr1_cdnr']);
        $totalSalesTaxable = $salesRecords->sum('taxable_value');
        $totalSalesTax = $salesRecords->sum(fn($r) => $r->igst + $r->cgst + $r->sgst + $r->cess);
        $totalSalesVal = $salesRecords->sum('total_value');

        $totalGstr1Taxable = $gstr1Records->sum('taxable_value');
        $totalGstr1Tax = $gstr1Records->sum(fn($r) => $r->igst + $r->cgst + $r->sgst + $r->cess);

        // 2. Purchases & Inward Supplies
        $purchaseRecords = $records->where('record_type', 'purchase');
        $gstr2bRecords = $records->where('record_type', 'gstr2b_b2b');
        $totalPurchaseTaxable = $purchaseRecords->sum('taxable_value');
        $totalPurchaseTax = $purchaseRecords->sum(fn($r) => $r->igst + $r->cgst + $r->sgst + $r->cess);

        $total2bTaxable = $gstr2bRecords->sum('taxable_value');
        $total2bTax = $gstr2bRecords->sum(fn($r) => $r->igst + $r->cgst + $r->sgst + $r->cess);

        // 3. Reconciliations overview
        $reconSummary = [
            'gstr1_vs_books' => [
                'total' => $recons->where('recon_type', 'gstr1_vs_books')->count(),
                'matched' => $recons->where('recon_type', 'gstr1_vs_books')->where('match_status', 'Matched')->count(),
                'mismatch' => $recons->where('recon_type', 'gstr1_vs_books')->where('match_status', 'Mismatch')->count(),
                'missing_in_portal' => $recons->where('recon_type', 'gstr1_vs_books')->where('match_status', 'Missing in Target')->count(),
                'missing_in_books' => $recons->where('recon_type', 'gstr1_vs_books')->where('match_status', 'Missing in Source')->count(),
            ],
            'gstr2b_vs_purchase' => [
                'total' => $recons->where('recon_type', 'gstr2b_vs_purchase')->count(),
                'matched' => $recons->where('recon_type', 'gstr2b_vs_purchase')->where('match_status', 'Matched')->count(),
                'mismatch' => $recons->where('recon_type', 'gstr2b_vs_purchase')->where('match_status', 'Amount Mismatch')->count(),
                'missing_in_2b' => $recons->where('recon_type', 'gstr2b_vs_purchase')->where('match_status', 'Missing in 2B')->count(),
                'missing_in_books' => $recons->where('recon_type', 'gstr2b_vs_purchase')->where('match_status', 'Missing in Books')->count(),
            ],
        ];

        // 4. Exceptions Breakdown
        $exceptionSummary = [
            'total' => $exceptions->count(),
            'open' => $exceptions->where('status', 'Open')->count(),
            'resolved' => $exceptions->where('status', 'Resolved')->count(),
            'critical' => $exceptions->where('severity', 'Critical')->count(),
            'high' => $exceptions->where('severity', 'High')->count(),
            'medium' => $exceptions->where('severity', 'Medium')->count(),
            'low' => $exceptions->where('severity', 'Low')->count(),
            'total_financial_impact' => round($exceptions->sum('financial_impact'), 2),
        ];

        // 5. Checklist completion rate
        $checklistTotal = $checklists->count();
        $checklistCompleted = $checklists->where('status', 'Completed')->count();
        $checklistPercentage = $checklistTotal > 0 ? round(($checklistCompleted / $checklistTotal) * 100) : 0;

        return [
            'audit' => [
                'id' => $audit->id,
                'audit_name' => $audit->audit_name,
                'status' => $audit->status,
                'financial_year' => $audit->financial_year,
                'data_quality_score' => $audit->data_quality_score,
                'started_at' => $audit->started_at?->format('Y-m-d H:i'),
                'completed_at' => $audit->completed_at?->format('Y-m-d H:i'),
                'created_at' => $audit->created_at->format('Y-m-d H:i'),
            ],
            'client' => [
                'trade_name' => $client->trade_name,
                'party_name' => $client->party_name,
                'gstin' => $audit->gstin,
                'pan' => $client->pan,
                'state' => $client->state,
                'filing_frequency' => $client->filing_frequency,
            ],
            'outward_supplies' => [
                'books_taxable' => round($totalSalesTaxable, 2),
                'books_tax' => round($totalSalesTax, 2),
                'books_total' => round($totalSalesVal, 2),
                'gstr1_taxable' => round($totalGstr1Taxable, 2),
                'gstr1_tax' => round($totalGstr1Tax, 2),
                'taxable_difference' => round($totalSalesTaxable - $totalGstr1Taxable, 2),
                'tax_difference' => round($totalSalesTax - $totalGstr1Tax, 2),
            ],
            'inward_supplies' => [
                'purchase_taxable' => round($totalPurchaseTaxable, 2),
                'purchase_tax' => round($totalPurchaseTax, 2),
                'gstr2b_taxable' => round($total2bTaxable, 2),
                'gstr2b_tax' => round($total2bTax, 2),
                'taxable_difference' => round($totalPurchaseTaxable - $total2bTaxable, 2),
                'tax_difference' => round($totalPurchaseTax - $total2bTax, 2),
            ],
            'reconciliations' => $reconSummary,
            'exceptions' => $exceptionSummary,
            'exception_items' => $exceptions->take(50)->map(fn($e) => [
                'rule_code' => $e->rule_code,
                'severity' => $e->severity,
                'source' => $e->source,
                'reference' => $e->record_reference,
                'description' => $e->description,
                'financial_impact' => $e->financial_impact,
                'status' => $e->status,
                'ca_remark' => $e->ca_remark,
            ]),
            'checklist_progress' => [
                'total' => $checklistTotal,
                'completed' => $checklistCompleted,
                'percentage' => $checklistPercentage,
            ],
            'working_papers' => $workingPapers->map(fn($w) => [
                'section' => $w->section,
                'title' => $w->title,
                'observation' => $w->observation,
                'conclusion' => $w->conclusion,
                'follow_up' => $w->follow_up_action,
            ]),
            'disclaimer' => 'System-generated analytical findings for professional review. This document does not constitute a statutory audit opinion under Section 35(5) or Section 44 of the CGST Act, 2017. All findings should be reviewed and corroborated by a qualified Chartered Accountant / Tax Professional with original supporting documentation.',
        ];
    }

    /**
     * Generate CSV content for audit exceptions and reconciliations
     */
    public function generateCsvExport(GstAudit $audit): string
    {
        $exceptions = GstAuditException::where('audit_id', $audit->id)->get();

        $output = fopen('php://temp', 'r+');
        fputcsv($output, ['Rule Code', 'Severity', 'Source', 'Reference', 'Description', 'Financial Impact (INR)', 'Status', 'CA Remark', 'Action Taken']);

        foreach ($exceptions as $e) {
            fputcsv($output, [
                $e->rule_code,
                $e->severity,
                $e->source,
                $e->record_reference,
                $e->description,
                $e->financial_impact,
                $e->status,
                $e->ca_remark,
                $e->action_taken,
            ]);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return $csv;
    }
}
