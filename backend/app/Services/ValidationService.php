<?php

namespace App\Services;

use App\Models\HsnMaster;

class ValidationService
{
    /**
     * Validate GSTIN format using Indian GSTIN regex pattern.
     * Pattern: 2 digits state code + 10 chars PAN + 1 entity num + Z + 1 check digit.
     */
    public function validateGstin(?string $gstin): array
    {
        if (empty($gstin)) {
            return ['is_valid' => false, 'error' => 'GSTIN is missing'];
        }

        $gstin = strtoupper(trim($gstin));
        $pattern = '/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/';

        if (!preg_match($pattern, $gstin)) {
            return ['is_valid' => false, 'error' => 'Invalid GSTIN format'];
        }

        return ['is_valid' => true, 'error' => null];
    }

    /**
     * Validate HSN Code against database or standard GST rate tables.
     */
    public function validateHsn(string $hsnCode, float $providedRate): array
    {
        $hsnCode = trim($hsnCode);
        $master = HsnMaster::where('hsn_code', $hsnCode)->first();

        if (!$master) {
            return [
                'is_valid' => false,
                'status' => 'missing',
                'expected_rate' => null,
                'error' => "HSN Code {$hsnCode} not found in HSN Master",
            ];
        }

        if (abs($master->gst_rate - $providedRate) > 0.01) {
            return [
                'is_valid' => false,
                'status' => 'mismatch',
                'expected_rate' => $master->gst_rate,
                'error' => "Rate mismatch: provided {$providedRate}%, HSN Master expects {$master->gst_rate}%",
            ];
        }

        return [
            'is_valid' => true,
            'status' => 'valid',
            'expected_rate' => $master->gst_rate,
            'error' => null,
        ];
    }

    /**
     * Reconcile TCS between Marketplace sales report and GST Portal filing.
     */
    public function reconcileTcs(float $marketplaceTcs, float $portalTcs): array
    {
        $difference = round($marketplaceTcs - $portalTcs, 2);

        if (abs($difference) < 0.01) {
            $status = 'matched';
        } elseif ($portalTcs <= 0) {
            $status = 'missing';
        } else {
            $status = 'mismatch';
        }

        return [
            'marketplace_tcs' => $marketplaceTcs,
            'portal_tcs' => $portalTcs,
            'difference' => $difference,
            'status' => $status,
        ];
    }

    /**
     * Detect duplicate invoice numbers within a batch.
     */
    public function findDuplicateInvoices(array $invoices): array
    {
        $seen = [];
        $duplicates = [];

        foreach ($invoices as $index => $inv) {
            $num = strtoupper(trim($inv['invoice_number']));
            if (isset($seen[$num])) {
                $duplicates[] = [
                    'invoice_number' => $num,
                    'first_row' => $seen[$num],
                    'duplicate_row' => $index + 1,
                ];
            } else {
                $seen[$num] = $index + 1;
            }
        }

        return $duplicates;
    }
}
