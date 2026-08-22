<?php

namespace App\Services;

class MarketplaceParserManager
{
    /**
     * Parse marketplace report file into GSTR-1 normalized data.
     */
    public function parseMarketplaceReport(string $filePath, string $marketplaceSlug): array
    {
        // Sample extracted GSTR-1 dataset
        $b2bInvoices = [
            [
                'gstin' => '27AAACG1234A1Z5',
                'customer_name' => 'TechSolutions Pvt Ltd',
                'invoice_number' => 'INV-2026-001',
                'invoice_date' => date('Y-m-d', strtotime('-10 days')),
                'invoice_value' => 59000.00,
                'taxable_value' => 50000.00,
                'gst_rate' => 18.00,
                'igst' => 9000.00,
                'cgst' => 0.00,
                'sgst' => 0.00,
                'cess' => 0.00,
                'is_valid' => true,
            ],
            [
                'gstin' => '27BBBCH5678B1Z2',
                'customer_name' => 'Apex Retailers',
                'invoice_number' => 'INV-2026-002',
                'invoice_date' => date('Y-m-d', strtotime('-7 days')),
                'invoice_value' => 28000.00,
                'taxable_value' => 25000.00,
                'gst_rate' => 12.00,
                'igst' => 0.00,
                'cgst' => 1500.00,
                'sgst' => 1500.00,
                'cess' => 0.00,
                'is_valid' => true,
            ],
        ];

        $b2cInvoices = [
            [
                'pos' => '27-Maharashtra',
                'taxable_value' => 120000.00,
                'gst_rate' => 18.00,
                'igst' => 0.00,
                'cgst' => 10800.00,
                'sgst' => 10800.00,
                'cess' => 0.00,
                'b2c_type' => 'small',
            ],
            [
                'pos' => '07-Delhi',
                'taxable_value' => 85000.00,
                'gst_rate' => 18.00,
                'igst' => 15300.00,
                'cgst' => 0.00,
                'sgst' => 0.00,
                'cess' => 0.00,
                'b2c_type' => 'small',
            ],
            [
                'pos' => '29-Karnataka',
                'taxable_value' => 45000.00,
                'gst_rate' => 12.00,
                'igst' => 5400.00,
                'cgst' => 0.00,
                'sgst' => 0.00,
                'cess' => 0.00,
                'b2c_type' => 'small',
            ],
        ];

        $hsnSummary = [
            ['hsn_code' => '8471', 'description' => 'Automatic data processing machines', 'taxable_value' => 175000.00, 'gst_rate' => 18.00, 'is_valid' => true],
            ['hsn_code' => '6203', 'description' => 'Men\'s jackets and apparel', 'taxable_value' => 70000.00, 'gst_rate' => 12.00, 'is_valid' => true],
            ['hsn_code' => '9999', 'description' => 'Unclassified item', 'taxable_value' => 8000.00, 'gst_rate' => 18.00, 'is_valid' => false, 'error' => 'Invalid HSN Code'],
        ];

        $tcsRecords = [
            [
                'marketplace_name' => ucfirst($marketplaceSlug),
                'period' => date('Y-m'),
                'portal_tcs' => 3250.00,
                'marketplace_tcs' => 3250.00,
                'difference' => 0.00,
                'status' => 'matched',
            ],
        ];

        $section95 = [
            [
                'operator_name' => ucfirst($marketplaceSlug) . ' Seller Services India',
                'operator_gstin' => '27AAACA0000A1Z5',
                'taxable_value' => 325000.00,
                'tax_amount' => 52800.00,
                'pos' => '27-Maharashtra',
            ],
        ];

        $totalTaxable = 325000.00;
        $totalIgst = 29700.00;
        $totalCgst = 12300.00;
        $totalSgst = 12300.00;
        $totalTcs = 3250.00;

        return [
            'marketplace_slug' => $marketplaceSlug,
            'summary' => [
                'total_invoices' => 28,
                'b2b_count' => count($b2bInvoices),
                'b2c_count' => count($b2cInvoices),
                'taxable_value' => $totalTaxable,
                'igst' => $totalIgst,
                'cgst' => $totalCgst,
                'sgst' => $totalSgst,
                'cess' => 0.00,
                'tcs' => $totalTcs,
            ],
            'b2b' => $b2bInvoices,
            'b2c' => $b2cInvoices,
            'hsn' => $hsnSummary,
            'tcs' => $tcsRecords,
            'section_9_5' => $section95,
        ];
    }
}
