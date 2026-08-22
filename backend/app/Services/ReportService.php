<?php

namespace App\Services;

class ReportService
{
    /**
     * Generate official GSTR-1 JSON structure.
     */
    public function generateGstr1Json(array $reportData): array
    {
        $b2bSection = [];
        foreach ($reportData['b2b'] ?? [] as $inv) {
            $b2bSection[] = [
                'ctin' => $inv['gstin'],
                'cname' => $inv['customer_name'] ?? 'B2B Customer',
                'inv' => [
                    [
                        'inum' => $inv['invoice_number'],
                        'idt' => date('d-m-Y', strtotime($inv['invoice_date'])),
                        'val' => (float)$inv['invoice_value'],
                        'pos' => substr($inv['gstin'], 0, 2),
                        'rchrg' => 'N',
                        'inv_typ' => 'R',
                        'itms' => [
                            [
                                'num' => 1,
                                'itm_det' => [
                                    'rt' => (float)$inv['gst_rate'],
                                    'txval' => (float)$inv['taxable_value'],
                                    'iamt' => (float)($inv['igst'] ?? 0),
                                    'camt' => (float)($inv['cgst'] ?? 0),
                                    'samt' => (float)($inv['sgst'] ?? 0),
                                    'csamt' => (float)($inv['cess'] ?? 0),
                                ],
                            ],
                        ],
                    ],
                ],
            ];
        }

        $b2csSection = [];
        foreach ($reportData['b2c'] ?? [] as $b2c) {
            $b2csSection[] = [
                'sply_ty' => (substr($b2c['pos'], 0, 2) === '27') ? 'INTRA' : 'INTER',
                'rt' => (float)$b2c['gst_rate'],
                'pos' => $b2c['pos'],
                'txval' => (float)$b2c['taxable_value'],
                'iamt' => (float)($b2c['igst'] ?? 0),
                'camt' => (float)($b2c['cgst'] ?? 0),
                'samt' => (float)($b2c['sgst'] ?? 0),
                'csamt' => (float)($b2c['cess'] ?? 0),
            ];
        }

        return [
            'gstin' => '27AAACG0000A1Z5',
            'fp' => date('mY'),
            'gt' => (float)($reportData['summary']['taxable_value'] ?? 0),
            'cur_gt' => (float)($reportData['summary']['taxable_value'] ?? 0),
            'version' => 'GSTR1-V1.0',
            'hash' => 'hash-simulated',
            'b2b' => $b2bSection,
            'b2cs' => $b2csSection,
            'hsn' => [
                'data' => [
                    [
                        'num' => 1,
                        'hsn_sc' => '8471',
                        'desc' => 'Computer Peripherals & ADP',
                        'uqc' => 'NOS',
                        'qty' => 10,
                        'val' => (float)($reportData['summary']['taxable_value'] ?? 0),
                        'txval' => (float)($reportData['summary']['taxable_value'] ?? 0),
                        'iamt' => (float)($reportData['summary']['igst'] ?? 0),
                    ],
                ],
            ],
        ];
    }

    /**
     * Format bank statement transactions as downloadable CSV string.
     */
    public function generateBankCsv(array $transactions): string
    {
        $output = fopen('php://temp', 'r+');
        fputcsv($output, ['Date', 'Value Date', 'Narration', 'Reference No', 'Debit (Dr)', 'Credit (Cr)', 'Balance']);

        foreach ($transactions as $tx) {
            fputcsv($output, [
                $tx['transaction_date'],
                $tx['value_date'] ?? $tx['transaction_date'],
                $tx['narration'],
                $tx['reference_number'] ?? '',
                $tx['debit'] > 0 ? number_format($tx['debit'], 2, '.', '') : '',
                $tx['credit'] > 0 ? number_format($tx['credit'], 2, '.', '') : '',
                number_format($tx['balance'], 2, '.', ''),
            ]);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);
        return $csv;
    }
}
