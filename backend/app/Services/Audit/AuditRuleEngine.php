<?php

namespace App\Services\Audit;

use App\Models\GstAudit;
use App\Models\GstAuditException;
use App\Models\GstAuditRecord;
use App\Models\GstAuditReconciliation;

class AuditRuleEngine
{
    /**
     * Run all rule checks for an audit and generate actionable exceptions
     */
    public function evaluateRules(GstAudit $audit): array
    {
        // Clear previous open/unresolved exceptions
        GstAuditException::where('audit_id', $audit->id)
            ->where('status', 'Open')
            ->delete();

        $exceptionsCount = 0;

        // 1. Invoice Level Checks on All Records
        $records = GstAuditRecord::where('audit_id', $audit->id)->get();
        $seenInvoices = [];

        foreach ($records as $rec) {
            $invNum = trim($rec->invoice_number ?: '');
            $partyGstin = strtoupper(trim($rec->counterparty_gstin ?: ''));

            // Rule INV-001: Duplicate invoice number
            if (!empty($invNum)) {
                $dupKey = "{$rec->record_type}|{$partyGstin}|{$invNum}";
                if (isset($seenInvoices[$dupKey])) {
                    $exceptionsCount++;
                    GstAuditException::create([
                        'audit_id' => $audit->id,
                        'record_id' => $rec->id,
                        'rule_code' => 'INV-001',
                        'severity' => 'High',
                        'description' => "Duplicate invoice number '{$invNum}' detected in {$rec->record_type} records.",
                        'source' => $rec->record_type,
                        'record_reference' => "Inv #{$invNum}",
                        'financial_impact' => $rec->total_value,
                        'status' => 'Open',
                    ]);
                } else {
                    $seenInvoices[$dupKey] = true;
                }
            }

            // Rule INV-002: Missing or Future Date
            if (empty($rec->invoice_date)) {
                $exceptionsCount++;
                GstAuditException::create([
                    'audit_id' => $audit->id,
                    'record_id' => $rec->id,
                    'rule_code' => 'INV-002',
                    'severity' => 'Medium',
                    'description' => "Invoice #{$invNum} has missing or unparseable invoice date.",
                    'source' => $rec->record_type,
                    'record_reference' => "Inv #{$invNum}",
                    'financial_impact' => 0,
                    'status' => 'Open',
                ]);
            } elseif ($rec->invoice_date > now()->addDays(2)) {
                $exceptionsCount++;
                GstAuditException::create([
                    'audit_id' => $audit->id,
                    'record_id' => $rec->id,
                    'rule_code' => 'INV-002',
                    'severity' => 'High',
                    'description' => "Invoice #{$invNum} contains a future date ({$rec->invoice_date->format('Y-m-d')}).",
                    'source' => $rec->record_type,
                    'record_reference' => "Inv #{$invNum}",
                    'financial_impact' => $rec->total_value,
                    'status' => 'Open',
                ]);
            }

            // Rule INV-003: Invalid GSTIN format
            if (!empty($partyGstin) && !preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i', $partyGstin)) {
                $exceptionsCount++;
                GstAuditException::create([
                    'audit_id' => $audit->id,
                    'record_id' => $rec->id,
                    'rule_code' => 'INV-003',
                    'severity' => 'Medium',
                    'description' => "Counterparty GSTIN '{$partyGstin}' on invoice #{$invNum} does not match standard 15-character statutory format.",
                    'source' => $rec->record_type,
                    'record_reference' => "Inv #{$invNum}",
                    'financial_impact' => $rec->taxable_value,
                    'status' => 'Open',
                ]);
            }

            // Rule INV-004: Tax Calculation Anomaly
            $taxSum = round($rec->igst + $rec->cgst + $rec->sgst + $rec->cess, 2);
            if ($rec->taxable_value > 0 && $taxSum > 0) {
                $calculatedTotal = round($rec->taxable_value + $taxSum, 2);
                if (abs($rec->total_value - $calculatedTotal) > 5.0) {
                    $exceptionsCount++;
                    GstAuditException::create([
                        'audit_id' => $audit->id,
                        'record_id' => $rec->id,
                        'rule_code' => 'INV-004',
                        'severity' => 'Medium',
                        'description' => "Invoice total ({$rec->total_value}) differs from Taxable + Taxes ({$calculatedTotal}) by more than rounding tolerance.",
                        'source' => $rec->record_type,
                        'record_reference' => "Inv #{$invNum}",
                        'financial_impact' => abs($rec->total_value - $calculatedTotal),
                        'status' => 'Open',
                    ]);
                }
            }

            // Rule HSN-001: Missing HSN on substantial B2B invoices
            if ($rec->taxable_value > 50000 && empty($rec->hsn_sac) && in_array($rec->record_type, ['sales', 'gstr1_b2b'])) {
                $exceptionsCount++;
                GstAuditException::create([
                    'audit_id' => $audit->id,
                    'record_id' => $rec->id,
                    'rule_code' => 'HSN-001',
                    'severity' => 'Low',
                    'description' => "B2B Outward invoice #{$invNum} exceeds Rs. 50,000 but HSN/SAC code is not provided.",
                    'source' => $rec->record_type,
                    'record_reference' => "Inv #{$invNum}",
                    'financial_impact' => 0,
                    'status' => 'Open',
                ]);
            }

            // Rule RCM-001: Purchase marked as RCM
            if ($rec->record_type === 'purchase' && $rec->reverse_charge) {
                $exceptionsCount++;
                GstAuditException::create([
                    'audit_id' => $audit->id,
                    'record_id' => $rec->id,
                    'rule_code' => 'RCM-001',
                    'severity' => 'Medium',
                    'description' => "Purchase invoice #{$invNum} is flagged as Reverse Charge (RCM). Verify corresponding tax payment in GSTR-3B Table 3.1(d).",
                    'source' => 'purchase',
                    'record_reference' => "Inv #{$invNum}",
                    'financial_impact' => $taxSum,
                    'status' => 'Open',
                ]);
            }
        }

        // 2. Reconciliation Level Checks (Reconciliations Table)
        $recons = GstAuditReconciliation::where('audit_id', $audit->id)->get();

        foreach ($recons as $recon) {
            // Rule GST-R1-001: Books Invoice Missing in GSTR-1
            if ($recon->recon_type === 'gstr1_vs_books' && $recon->match_status === 'Missing in Target') {
                $exceptionsCount++;
                GstAuditException::create([
                    'audit_id' => $audit->id,
                    'recon_id' => $recon->id,
                    'record_id' => $recon->source_record_id,
                    'rule_code' => 'GST-R1-001',
                    'severity' => 'Critical',
                    'description' => "Sales invoice recorded in Books is missing from GSTR-1. Risk of tax under-reporting.",
                    'source' => 'Sales Register',
                    'record_reference' => $recon->sourceRecord ? "Inv #{$recon->sourceRecord->invoice_number}" : null,
                    'financial_impact' => $recon->difference_taxable,
                    'status' => 'Open',
                ]);
            }

            // Rule GST-R1-002: GSTR-1 Invoice Missing in Books
            if ($recon->recon_type === 'gstr1_vs_books' && $recon->match_status === 'Missing in Source') {
                $exceptionsCount++;
                GstAuditException::create([
                    'audit_id' => $audit->id,
                    'recon_id' => $recon->id,
                    'record_id' => $recon->target_record_id,
                    'rule_code' => 'GST-R1-002',
                    'severity' => 'High',
                    'description' => "Invoice reported in GSTR-1 is not recorded in Sales Register. Possible accounting omission or duplicate portal filing.",
                    'source' => 'GSTR-1',
                    'record_reference' => $recon->targetRecord ? "Inv #{$recon->targetRecord->invoice_number}" : null,
                    'financial_impact' => abs($recon->difference_taxable),
                    'status' => 'Open',
                ]);
            }

            // Rule GST-2B-001: Purchase in Books Missing in GSTR-2B (ITC Risk)
            if ($recon->recon_type === 'gstr2b_vs_purchase' && $recon->match_status === 'Missing in 2B') {
                $exceptionsCount++;
                $taxImpact = ($recon->sourceRecord ? ($recon->sourceRecord->igst + $recon->sourceRecord->cgst + $recon->sourceRecord->sgst + $recon->sourceRecord->cess) : 0);
                GstAuditException::create([
                    'audit_id' => $audit->id,
                    'recon_id' => $recon->id,
                    'record_id' => $recon->source_record_id,
                    'rule_code' => 'GST-2B-001',
                    'severity' => 'High',
                    'description' => "Purchase invoice in books has no matching entry in GSTR-2B. Supplier may not have filed GSTR-1. Requires review before claiming ITC under Section 16(2)(aa).",
                    'source' => 'Purchase Register',
                    'record_reference' => $recon->sourceRecord ? "Inv #{$recon->sourceRecord->invoice_number}" : null,
                    'financial_impact' => $taxImpact,
                    'status' => 'Open',
                ]);
            }

            // Rule GST-2B-002: Tax Amount Mismatch on ITC
            if ($recon->recon_type === 'gstr2b_vs_purchase' && $recon->match_status === 'Amount Mismatch') {
                $exceptionsCount++;
                GstAuditException::create([
                    'audit_id' => $audit->id,
                    'recon_id' => $recon->id,
                    'record_id' => $recon->source_record_id,
                    'rule_code' => 'GST-2B-002',
                    'severity' => 'Medium',
                    'description' => "Taxable value or tax difference between Purchase Register and GSTR-2B auto-drafted statement.",
                    'source' => 'GSTR-2B vs Purchase',
                    'record_reference' => $recon->sourceRecord ? "Inv #{$recon->sourceRecord->invoice_number}" : null,
                    'financial_impact' => abs($recon->difference_taxable),
                    'status' => 'Open',
                ]);
            }

            // Rule GST-R3B-001: GSTR-1 vs GSTR-3B Outward Tax Variance
            if ($recon->recon_type === 'gstr1_vs_gstr3b' && $recon->match_status === 'Mismatch') {
                $exceptionsCount++;
                GstAuditException::create([
                    'audit_id' => $audit->id,
                    'recon_id' => $recon->id,
                    'rule_code' => 'GST-R3B-001',
                    'severity' => 'Critical',
                    'description' => "Aggregate outward tax liability differs between GSTR-1 and GSTR-3B Table 3.1. Tax difference: IGST {$recon->difference_igst}, CGST {$recon->difference_cgst}, SGST {$recon->difference_sgst}.",
                    'source' => 'GSTR-1 vs GSTR-3B',
                    'record_reference' => 'Aggregate Annual/Quarterly',
                    'financial_impact' => abs($recon->difference_taxable),
                    'status' => 'Open',
                ]);
            }
        }

        return [
            'total_exceptions_generated' => $exceptionsCount,
            'critical_count' => GstAuditException::where('audit_id', $audit->id)->where('severity', 'Critical')->count(),
            'high_count' => GstAuditException::where('audit_id', $audit->id)->where('severity', 'High')->count(),
            'medium_count' => GstAuditException::where('audit_id', $audit->id)->where('severity', 'Medium')->count(),
            'low_count' => GstAuditException::where('audit_id', $audit->id)->where('severity', 'Low')->count(),
        ];
    }
}
