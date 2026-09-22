<?php

namespace App\Services\Audit;

use App\Models\GstAudit;
use App\Models\GstAuditRecord;
use App\Models\GstAuditReconciliation;
use Illuminate\Support\Facades\DB;

class ReconciliationEngine
{
    /**
     * Run all reconciliation workflows for an audit
     */
    public function runAll(GstAudit $audit): array
    {
        // Clear previous automated reconciliations for this audit
        GstAuditReconciliation::where('audit_id', $audit->id)
            ->whereNull('resolved_by')
            ->delete();

        $gstr1VsBooks = $this->reconcileGstr1VsBooks($audit);
        $gstr2bVsPurchases = $this->reconcileGstr2bVsPurchases($audit);
        $gstr1VsGstr3b = $this->reconcileGstr1VsGstr3b($audit);

        return [
            'gstr1_vs_books' => $gstr1VsBooks,
            'gstr2b_vs_purchases' => $gstr2bVsPurchases,
            'gstr1_vs_gstr3b' => $gstr1VsGstr3b,
        ];
    }

    /**
     * Reconcile GSTR-1 Outward Supplies vs Sales Register (Books)
     */
    public function reconcileGstr1VsBooks(GstAudit $audit): array
    {
        $booksRecords = GstAuditRecord::where('audit_id', $audit->id)
            ->where('record_type', 'sales')
            ->get();

        $gstr1Records = GstAuditRecord::where('audit_id', $audit->id)
            ->whereIn('record_type', ['gstr1_b2b', 'gstr1_cdnr'])
            ->get();

        $matchedCount = 0;
        $mismatchCount = 0;
        $missingInPortalCount = 0;
        $missingInBooksCount = 0;

        $gstr1MatchedIds = [];

        // 1. Iterate Books records and match against GSTR-1
        foreach ($booksRecords as $bRec) {
            $bInv = strtoupper(trim($bRec->invoice_number));
            $bGstin = strtoupper(trim($bRec->counterparty_gstin ?: ''));

            // Match priority 1: exact GSTIN + Invoice Number
            $matchingGstr1 = $gstr1Records->first(function ($gRec) use ($bInv, $bGstin, $gstr1MatchedIds) {
                if (in_array($gRec->id, $gstr1MatchedIds)) return false;
                $gInv = strtoupper(trim($gRec->invoice_number));
                $gGstin = strtoupper(trim($gRec->counterparty_gstin ?: ''));
                return ($gInv === $bInv && (!$bGstin || $gGstin === $bGstin));
            });

            if ($matchingGstr1) {
                $gstr1MatchedIds[] = $matchingGstr1->id;

                $diffTaxable = round($bRec->taxable_value - $matchingGstr1->taxable_value, 2);
                $diffIgst = round($bRec->igst - $matchingGstr1->igst, 2);
                $diffCgst = round($bRec->cgst - $matchingGstr1->cgst, 2);
                $diffSgst = round($bRec->sgst - $matchingGstr1->sgst, 2);
                $diffCess = round($bRec->cess - $matchingGstr1->cess, 2);

                $hasAmountDiff = (abs($diffTaxable) > 1.0 || abs($diffIgst) > 1.0 || abs($diffCgst) > 1.0 || abs($diffSgst) > 1.0);

                if (!$hasAmountDiff) {
                    $status = 'Matched';
                    $matchType = 'exact_invoice_gstin_amount';
                    $confidence = 100;
                    $reason = 'Exact match across Invoice No, GSTIN and tax amounts.';
                    $matchedCount++;
                } else {
                    $status = 'Mismatch';
                    $matchType = 'amount_tolerance';
                    $confidence = 85;
                    $reason = "Taxable value or tax amount differs between Books (Taxable: {$bRec->taxable_value}) and GSTR-1 (Taxable: {$matchingGstr1->taxable_value}).";
                    $mismatchCount++;
                }

                GstAuditReconciliation::create([
                    'audit_id' => $audit->id,
                    'recon_type' => 'gstr1_vs_books',
                    'source_record_id' => $bRec->id,
                    'target_record_id' => $matchingGstr1->id,
                    'match_status' => $status,
                    'match_type' => $matchType,
                    'difference_taxable' => $diffTaxable,
                    'difference_igst' => $diffIgst,
                    'difference_cgst' => $diffCgst,
                    'difference_sgst' => $diffSgst,
                    'difference_cess' => $diffCess,
                    'confidence' => $confidence,
                    'reason' => $reason,
                ]);
            } else {
                // In Books, missing in GSTR-1
                $missingInPortalCount++;
                GstAuditReconciliation::create([
                    'audit_id' => $audit->id,
                    'recon_type' => 'gstr1_vs_books',
                    'source_record_id' => $bRec->id,
                    'target_record_id' => null,
                    'match_status' => 'Missing in Target',
                    'match_type' => null,
                    'difference_taxable' => $bRec->taxable_value,
                    'difference_igst' => $bRec->igst,
                    'difference_cgst' => $bRec->cgst,
                    'difference_sgst' => $bRec->sgst,
                    'difference_cess' => $bRec->cess,
                    'confidence' => 100,
                    'reason' => "Invoice #{$bRec->invoice_number} recorded in Sales Register is missing in GSTR-1.",
                ]);
            }
        }

        // 2. Unmatched GSTR-1 records (in GSTR-1, missing in Books)
        foreach ($gstr1Records as $gRec) {
            if (!in_array($gRec->id, $gstr1MatchedIds)) {
                $missingInBooksCount++;
                GstAuditReconciliation::create([
                    'audit_id' => $audit->id,
                    'recon_type' => 'gstr1_vs_books',
                    'source_record_id' => null,
                    'target_record_id' => $gRec->id,
                    'match_status' => 'Missing in Source',
                    'match_type' => null,
                    'difference_taxable' => -$gRec->taxable_value,
                    'difference_igst' => -$gRec->igst,
                    'difference_cgst' => -$gRec->cgst,
                    'difference_sgst' => -$gRec->sgst,
                    'difference_cess' => -$gRec->cess,
                    'confidence' => 100,
                    'reason' => "Invoice #{$gRec->invoice_number} filed in GSTR-1 is missing from Sales Register books.",
                ]);
            }
        }

        return [
            'total_books' => count($booksRecords),
            'total_gstr1' => count($gstr1Records),
            'matched' => $matchedCount,
            'mismatch' => $mismatchCount,
            'missing_in_gstr1' => $missingInPortalCount,
            'missing_in_books' => $missingInBooksCount,
        ];
    }

    /**
     * Reconcile GSTR-2B Auto-Drafted ITC vs Purchase Register (Books)
     */
    public function reconcileGstr2bVsPurchases(GstAudit $audit): array
    {
        $purchases = GstAuditRecord::where('audit_id', $audit->id)
            ->where('record_type', 'purchase')
            ->get();

        $gstr2bRecords = GstAuditRecord::where('audit_id', $audit->id)
            ->where('record_type', 'gstr2b_b2b')
            ->get();

        $matchedCount = 0;
        $mismatchCount = 0;
        $missingIn2bCount = 0;
        $missingInBooksCount = 0;

        $gstr2bMatchedIds = [];

        foreach ($purchases as $pRec) {
            $pInv = strtoupper(trim($pRec->invoice_number));
            $pGstin = strtoupper(trim($pRec->counterparty_gstin ?: ''));

            // Match Supplier GSTIN + Invoice Number
            $matching2b = $gstr2bRecords->first(function ($gRec) use ($pInv, $pGstin, $gstr2bMatchedIds) {
                if (in_array($gRec->id, $gstr2bMatchedIds)) return false;
                $gInv = strtoupper(trim($gRec->invoice_number));
                $gGstin = strtoupper(trim($gRec->counterparty_gstin ?: ''));
                return ($gInv === $pInv && (!$pGstin || $gGstin === $pGstin));
            });

            if ($matching2b) {
                $gstr2bMatchedIds[] = $matching2b->id;

                $diffTaxable = round($pRec->taxable_value - $matching2b->taxable_value, 2);
                $diffIgst = round($pRec->igst - $matching2b->igst, 2);
                $diffCgst = round($pRec->cgst - $matching2b->cgst, 2);
                $diffSgst = round($pRec->sgst - $matching2b->sgst, 2);
                $diffCess = round($pRec->cess - $matching2b->cess, 2);

                $hasAmountDiff = (abs($diffTaxable) > 1.0 || abs($diffIgst) > 1.0 || abs($diffCgst) > 1.0 || abs($diffSgst) > 1.0);

                if (!$hasAmountDiff) {
                    $status = 'Matched';
                    $reason = 'ITC Matched: Supplier invoice is auto-populated in GSTR-2B with matching tax.';
                    $matchedCount++;
                } else {
                    $status = 'Amount Mismatch';
                    $reason = "ITC Variance: Purchase book shows Taxable {$pRec->taxable_value} vs GSTR-2B Taxable {$matching2b->taxable_value}.";
                    $mismatchCount++;
                }

                GstAuditReconciliation::create([
                    'audit_id' => $audit->id,
                    'recon_type' => 'gstr2b_vs_purchase',
                    'source_record_id' => $pRec->id,
                    'target_record_id' => $matching2b->id,
                    'match_status' => $status,
                    'match_type' => 'exact_invoice_gstin_amount',
                    'difference_taxable' => $diffTaxable,
                    'difference_igst' => $diffIgst,
                    'difference_cgst' => $diffCgst,
                    'difference_sgst' => $diffSgst,
                    'difference_cess' => $diffCess,
                    'confidence' => 95,
                    'reason' => $reason,
                ]);
            } else {
                // In Purchases, missing in GSTR-2B
                $missingIn2bCount++;
                GstAuditReconciliation::create([
                    'audit_id' => $audit->id,
                    'recon_type' => 'gstr2b_vs_purchase',
                    'source_record_id' => $pRec->id,
                    'target_record_id' => null,
                    'match_status' => 'Missing in 2B',
                    'match_type' => null,
                    'difference_taxable' => $pRec->taxable_value,
                    'difference_igst' => $pRec->igst,
                    'difference_cgst' => $pRec->cgst,
                    'difference_sgst' => $pRec->sgst,
                    'difference_cess' => $pRec->cess,
                    'confidence' => 100,
                    'reason' => "Purchase invoice #{$pRec->invoice_number} from supplier {$pRec->counterparty_gstin} is recorded in books but not reflected in GSTR-2B. Requires review (supplier may not have filed GSTR-1).",
                ]);
            }
        }

        // Unclaimed 2B Credits (in 2B, not recorded in Purchase Register)
        foreach ($gstr2bRecords as $gRec) {
            if (!in_array($gRec->id, $gstr2bMatchedIds)) {
                $missingInBooksCount++;
                GstAuditReconciliation::create([
                    'audit_id' => $audit->id,
                    'recon_type' => 'gstr2b_vs_purchase',
                    'source_record_id' => null,
                    'target_record_id' => $gRec->id,
                    'match_status' => 'Missing in Books',
                    'match_type' => null,
                    'difference_taxable' => -$gRec->taxable_value,
                    'difference_igst' => -$gRec->igst,
                    'difference_cgst' => -$gRec->cgst,
                    'difference_sgst' => -$gRec->sgst,
                    'difference_cess' => -$gRec->cess,
                    'confidence' => 100,
                    'reason' => "ITC available in GSTR-2B from supplier {$gRec->counterparty_gstin} (Inv #{$gRec->invoice_number}) is not recorded in Purchase Register.",
                ]);
            }
        }

        return [
            'total_purchases' => count($purchases),
            'total_gstr2b' => count($gstr2bRecords),
            'matched' => $matchedCount,
            'mismatch' => $mismatchCount,
            'missing_in_2b' => $missingIn2bCount,
            'missing_in_books' => $missingInBooksCount,
        ];
    }

    /**
     * Reconcile GSTR-1 Outward Tax vs GSTR-3B Tax Paid Table 3.1
     */
    public function reconcileGstr1VsGstr3b(GstAudit $audit): array
    {
        $gstr1Records = GstAuditRecord::where('audit_id', $audit->id)
            ->whereIn('record_type', ['gstr1_b2b', 'gstr1_cdnr'])
            ->get();

        $gstr3bRecords = GstAuditRecord::where('audit_id', $audit->id)
            ->where('record_type', 'gstr3b_summary')
            ->get();

        $gstr1Taxable = $gstr1Records->sum('taxable_value');
        $gstr1Igst = $gstr1Records->sum('igst');
        $gstr1Cgst = $gstr1Records->sum('cgst');
        $gstr1Sgst = $gstr1Records->sum('sgst');
        $gstr1Cess = $gstr1Records->sum('cess');

        $gstr3bTaxable = $gstr3bRecords->sum('taxable_value');
        $gstr3bIgst = $gstr3bRecords->sum('igst');
        $gstr3bCgst = $gstr3bRecords->sum('cgst');
        $gstr3bSgst = $gstr3bRecords->sum('sgst');
        $gstr3bCess = $gstr3bRecords->sum('cess');

        $diffTaxable = round($gstr1Taxable - $gstr3bTaxable, 2);
        $diffIgst = round($gstr1Igst - $gstr3bIgst, 2);
        $diffCgst = round($gstr1Cgst - $gstr3bCgst, 2);
        $diffSgst = round($gstr1Sgst - $gstr3bSgst, 2);
        $diffCess = round($gstr1Cess - $gstr3bCess, 2);

        $hasDiff = (abs($diffTaxable) > 10.0 || abs($diffIgst) > 10.0 || abs($diffCgst) > 10.0 || abs($diffSgst) > 10.0);

        $status = $hasDiff ? 'Mismatch' : 'Matched';
        $reason = $hasDiff
            ? "Outward liability variance detected between GSTR-1 (Taxable: {$gstr1Taxable}) and GSTR-3B Table 3.1 (Taxable: {$gstr3bTaxable})."
            : 'Outward tax liability in GSTR-1 reconciles with GSTR-3B Table 3.1.';

        GstAuditReconciliation::create([
            'audit_id' => $audit->id,
            'recon_type' => 'gstr1_vs_gstr3b',
            'source_record_id' => null,
            'target_record_id' => null,
            'match_status' => $status,
            'match_type' => 'aggregate_comparison',
            'difference_taxable' => $diffTaxable,
            'difference_igst' => $diffIgst,
            'difference_cgst' => $diffCgst,
            'difference_sgst' => $diffSgst,
            'difference_cess' => $diffCess,
            'confidence' => 100,
            'reason' => $reason,
        ]);

        return [
            'gstr1_totals' => [
                'taxable' => $gstr1Taxable,
                'igst' => $gstr1Igst,
                'cgst' => $gstr1Cgst,
                'sgst' => $gstr1Sgst,
                'cess' => $gstr1Cess,
            ],
            'gstr3b_totals' => [
                'taxable' => $gstr3bTaxable,
                'igst' => $gstr3bIgst,
                'cgst' => $gstr3bCgst,
                'sgst' => $gstr3bSgst,
                'cess' => $gstr3bCess,
            ],
            'differences' => [
                'taxable' => $diffTaxable,
                'igst' => $diffIgst,
                'cgst' => $diffCgst,
                'sgst' => $diffSgst,
                'cess' => $diffCess,
            ],
            'status' => $status,
        ];
    }
}
