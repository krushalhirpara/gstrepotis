<?php

namespace App\Services\Parsers;

abstract class BaseBankParser
{
    abstract public function parse(string $rawText): array;

    /**
     * Common line tokenizer & multi-page continuation parser
     */
    protected function parseLines(string $rawText): array
    {
        $lines = explode("\n", str_replace("\r", "", $rawText));
        $transactions = [];
        $currentTx = null;

        // Regex pattern for dates (e.g., 01/08/2026, 01-08-2026, 01 AUG 2026, 2026-08-01)
        $dateRegex = '/^(\d{2}[\/\.-]\d{2}[\/\.-]\d{4}|\d{4}[\/\.-]\d{2}[\/\.-]\d{2}|\d{2}\s+[A-Za-z]{3}\s+\d{4})/';

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (empty($trimmed)) continue;

            // Skip page headers, column headers, page numbers, and footers
            if ($this->isHeaderOrFooter($trimmed)) {
                continue;
            }

            if (preg_match($dateRegex, $trimmed)) {
                // If previous transaction exists, validate and push
                if ($currentTx) {
                    $transactions[] = $this->finalizeTransaction($currentTx);
                }
                $currentTx = $this->parseRowLine($trimmed);
            } else if ($currentTx) {
                // Continuation line: Merge wrapped narration text
                $currentTx['narration'] .= ' ' . $trimmed;
            }
        }

        if ($currentTx) {
            $transactions[] = $this->finalizeTransaction($currentTx);
        }

        return array_filter($transactions);
    }

    protected function isHeaderOrFooter(string $line): bool
    {
        $lower = strtolower($line);
        $headerKeywords = [
            'transaction date', 'value date', 'narration', 'description', 'chq/ref no',
            'debit (dr)', 'credit (cr)', 'balance', 'statement of account', 'page ',
            'account number', 'opening balance', 'closing balance', 'continued on next page',
            'generated on', 'registered office', 'gstin'
        ];

        foreach ($headerKeywords as $kw) {
            if (str_contains($lower, $kw)) {
                return true;
            }
        }
        return false;
    }

    protected function parseRowLine(string $line): array
    {
        $tokens = preg_split('/\s{2,}/', $line);
        $date = $tokens[0] ?? date('Y-m-d');
        
        // Normalize date to YYYY-MM-DD
        $formattedDate = date('Y-m-d', strtotime(str_replace('/', '-', $date)) ?: time());

        // Extract numbers (amounts and balance)
        preg_match_all('/[\d,]+\.\d{2}/', $line, $amountMatches);
        $amounts = array_map(fn($v) => (float) str_replace(',', '', $v), $amountMatches[0] ?? []);

        $debit = 0.0;
        $credit = 0.0;
        $balance = 0.0;

        if (count($amounts) >= 3) {
            $debit = $amounts[0];
            $credit = $amounts[1];
            $balance = $amounts[2];
        } else if (count($amounts) === 2) {
            // Either (Debit, Balance) or (Credit, Balance)
            if (str_contains(strtolower($line), 'cr') || str_contains(strtolower($line), 'by')) {
                $credit = $amounts[0];
            } else {
                $debit = $amounts[0];
            }
            $balance = $amounts[1];
        } else if (count($amounts) === 1) {
            $balance = $amounts[0];
        }

        // Extract reference number
        preg_match('/(UPI\/\d+|NEFT\/\w+|IMPS\/\w+|REF\d+|\d{6,})/', $line, $refMatch);
        $refNo = $refMatch[0] ?? ('REF' . rand(100000, 999999));

        return [
            'transaction_date' => $formattedDate,
            'value_date' => $formattedDate,
            'narration' => trim($line),
            'reference_number' => $refNo,
            'debit' => $debit,
            'credit' => $credit,
            'balance' => $balance,
        ];
    }

    protected function finalizeTransaction(array $tx): array
    {
        // Clean narration
        $tx['narration'] = preg_replace('/\s+/', ' ', trim($tx['narration']));
        return $tx;
    }
}
