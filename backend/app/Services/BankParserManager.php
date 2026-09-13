<?php

namespace App\Services;

use App\Services\Parsers\HDFCBankParser;
use App\Services\Parsers\SBIBankParser;
use App\Services\Parsers\KotakBankParser;
use App\Services\Parsers\ICICIBankParser;
use App\Services\Parsers\AxisBankParser;
use App\Services\Parsers\BOBBankParser;
use App\Services\Parsers\GenericBankParser;
use Illuminate\Support\Facades\Log;

class BankParserManager
{
    protected PdfTextExtractor $textExtractor;

    public function __construct(PdfTextExtractor $textExtractor)
    {
        $this->textExtractor = $textExtractor;
    }

    /**
     * Parse a Bank Statement PDF file dynamically across all pages without mock data fallback.
     */
    public function parseStatement(string $filePath, ?string $bankCode = 'AUTO', ?string $password = null): array
    {
        if (!file_exists($filePath) || filesize($filePath) === 0) {
            throw new \Exception('Uploaded PDF file does not exist or is 0 bytes.');
        }

        $pdfData = $this->textExtractor->extractPdfData($filePath, $password);

        if (!empty($pdfData['is_encrypted']) && empty($password)) {
            throw new \Exception('This PDF statement is password protected. Please enter the password.');
        }

        if (!empty($pdfData['is_scanned'])) {
            return [
                'status' => 'scanned_pdf',
                'message' => 'This PDF appears to be scanned. OCR processing is required.',
                'page_count' => $pdfData['page_count'] ?? 1,
                'total_transactions' => 0,
                'total_debit' => 0.00,
                'total_credit' => 0.00,
                'transactions' => [],
            ];
        }

        $rawText = $pdfData['text'] ?? '';
        $detectedBank = ($bankCode === 'AUTO' || empty($bankCode))
            ? $this->autoDetectBank($filePath, $rawText)
            : strtoupper($bankCode);

        $parser = match ($detectedBank) {
            'HDFC' => new HDFCBankParser(),
            'SBI' => new SBIBankParser(),
            'ICICI' => new ICICIBankParser(),
            'AXIS' => new AxisBankParser(),
            'KOTAK', 'KOTAK MAHINDRA BANK' => new KotakBankParser(),
            'BOB', 'BANK OF BARODA' => new BOBBankParser(),
            default => new GenericBankParser(),
        };

        $extractedTransactions = $parser->parse($pdfData);

        if (empty($extractedTransactions)) {
            return [
                'status' => 'no_transactions',
                'message' => 'No bank transactions could be reliably extracted from this PDF.',
                'bank_code' => $detectedBank,
                'page_count' => $pdfData['page_count'] ?? 1,
                'total_transactions' => 0,
                'total_debit' => 0.00,
                'total_credit' => 0.00,
                'transactions' => [],
            ];
        }

        // Metrics computation
        $totalDebit = (float) array_sum(array_column($extractedTransactions, 'debit'));
        $totalCredit = (float) array_sum(array_column($extractedTransactions, 'credit'));
        $warningsCount = count(array_filter($extractedTransactions, fn($t) => !empty($t['has_warning'])));
        $totalRows = count($extractedTransactions);

        $openingBalance = $extractedTransactions[0]['balance'] > 0
            ? round($extractedTransactions[0]['balance'] - $extractedTransactions[0]['credit'] + $extractedTransactions[0]['debit'], 2)
            : 0.00;
        $closingBalance = $extractedTransactions[$totalRows - 1]['balance'] ?? 0.00;

        $dates = array_filter(array_column($extractedTransactions, 'transaction_date'));
        sort($dates);
        $dateRange = (!empty($dates)) ? ($dates[0] . ' to ' . end($dates)) : 'N/A';

        return [
            'status' => 'success',
            'bank_code' => $detectedBank,
            'page_count' => $pdfData['page_count'] ?? 1,
            'quality_metrics' => [
                'total_transactions' => $totalRows,
                'valid_rows' => $totalRows - $warningsCount,
                'warnings_count' => $warningsCount,
                'errors_count' => 0,
                'duplicates_count' => 0,
                'opening_balance' => $openingBalance,
                'total_debit' => round($totalDebit, 2),
                'total_credit' => round($totalCredit, 2),
                'closing_balance' => round($closingBalance, 2),
                'date_range' => $dateRange,
            ],
            'total_transactions' => $totalRows,
            'total_debit' => round($totalDebit, 2),
            'total_credit' => round($totalCredit, 2),
            'transactions' => array_values($extractedTransactions),
        ];
    }

    private function autoDetectBank(string $filePath, string $rawText): string
    {
        $combined = strtolower($filePath . ' ' . $rawText);

        if (str_contains($combined, 'hdfc')) return 'HDFC';
        if (str_contains($combined, 'state bank of india') || str_contains($combined, ' sbi ') || str_contains($combined, 'sbi.co.in')) return 'SBI';
        if (str_contains($combined, 'icici')) return 'ICICI';
        if (str_contains($combined, 'axis bank') || str_contains($combined, 'utib')) return 'AXIS';
        if (str_contains($combined, 'kotak')) return 'KOTAK';
        if (str_contains($combined, 'bank of baroda') || str_contains($combined, 'barb')) return 'BOB';

        return 'GENERIC';
    }
}
