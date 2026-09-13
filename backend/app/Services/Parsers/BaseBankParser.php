<?php

namespace App\Services\Parsers;

abstract class BaseBankParser implements BankParserInterface
{
    /**
     * Parse structured PDF data array into normalized transactions.
     */
    public function parse(array $pdfData): array
    {
        $rawText = $pdfData['text'] ?? '';
        $lines = $pdfData['lines'] ?? explode("\n", str_replace("\r", "", $rawText));
        $tableRows = $pdfData['table_rows'] ?? [];

        // 1. Primary: Try table row parser if structured table extracted
        if (!empty($tableRows) && count($tableRows) > 1) {
            $parsedFromTables = $this->parseStructuredTableRows($tableRows);
            if (count($parsedFromTables) >= 1) {
                return $this->validateAndReconcile($parsedFromTables);
            }
        }

        // 2. Secondary: Text line tokenizer & multi-page continuation parser
        $parsedFromLines = $this->parseLinesArray($lines, $rawText);
        return $this->validateAndReconcile($parsedFromLines);
    }

    /**
     * Legacy parse helper accepting plain text string.
     */
    public function parseTextString(string $rawText): array
    {
        return $this->parse(['text' => $rawText, 'lines' => explode("\n", str_replace("\r", "", $rawText))]);
    }

    /**
     * Structured table rows parser (extracted by pdfplumber / table engine)
     */
    protected function parseStructuredTableRows(array $tableRows): array
    {
        $transactions = [];
        $headerIndices = [];

        foreach ($tableRows as $rowIndex => $row) {
            $cleanRow = array_map('trim', $row);
            $nonEmpty = array_filter($cleanRow);
            if (empty($nonEmpty)) continue;

            $rowString = implode(' ', $cleanRow);

            // Skip page header / column title rows
            if ($this->isHeaderOrFooter($rowString)) {
                if (empty($headerIndices)) {
                    $headerIndices = $this->mapColumnHeaderIndices($cleanRow);
                }
                continue;
            }

            $tx = $this->parseRowFromCellArray($cleanRow, $headerIndices);
            if ($tx && $this->isValidTransaction($tx)) {
                $transactions[] = $tx;
            }
        }

        return $transactions;
    }

    /**
     * Parse line array with multi-line narration continuation support
     */
    protected function parseLinesArray(array $lines, string $fullText): array
    {
        $transactions = [];
        $currentTx = null;

        // Comprehensive Date regex (Indian & ISO formats: 01/08/2026, 01-08-2026, 01-Aug-2026, 2026-08-01, 01 Aug 2026)
        $dateRegex = '/^(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,}\s+\d{2,4}|\d{1,2}[\/\.-][A-Za-z]{3,}[\/\.-]\d{2,4})/';

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (empty($trimmed)) continue;

            if ($this->isHeaderOrFooter($trimmed)) {
                continue;
            }

            if (preg_match($dateRegex, $trimmed)) {
                if ($currentTx && $this->isValidTransaction($currentTx)) {
                    $transactions[] = $this->finalizeTransaction($currentTx);
                }
                $currentTx = $this->parseRowLine($trimmed);
            } else if ($currentTx) {
                // Multi-line continuation: Merge wrapped narration line
                $currentTx['narration'] .= ' ' . $trimmed;
                $currentTx['raw_narration'] .= ' | ' . $trimmed;
            }
        }

        if ($currentTx && $this->isValidTransaction($currentTx)) {
            $transactions[] = $this->finalizeTransaction($currentTx);
        }

        if (count($transactions) < 2) {
            $fallbackTxs = $this->parseInlineBlocks($fullText);
            if (count($fallbackTxs) > count($transactions)) {
                return $fallbackTxs;
            }
        }

        return array_values($transactions);
    }

    protected function isHeaderOrFooter(string $line): bool
    {
        $lower = strtolower($line);
        $headerKeywords = [
            'transaction date', 'value date', 'narration', 'description', 'chq/ref no',
            'debit (dr)', 'credit (cr)', 'balance', 'statement of account', 'page ',
            'account number', 'account no', 'opening balance', 'closing balance',
            'continued on next page', 'generated on', 'registered office', 'gstin',
            'ifsc code', 'micr code', 'customer id', 'branch address'
        ];

        foreach ($headerKeywords as $kw) {
            if (str_contains($lower, $kw) && !preg_match('/\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}/', $line)) {
                return true;
            }
        }
        return false;
    }

    protected function isValidTransaction(array $tx): bool
    {
        return ($tx['debit'] > 0 || $tx['credit'] > 0 || $tx['balance'] > 0 || !empty($tx['narration']));
    }

    protected function parseRowLine(string $line): array
    {
        preg_match('/^(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,}\s+\d{2,4}|\d{1,2}[\/\.-][A-Za-z]{3,}[\/\.-]\d{2,4})/', $line, $dateMatch);
        $rawDate = $dateMatch[0] ?? date('Y-m-d');
        $formattedDate = $this->normalizeDate($rawDate);

        // Extract amounts handling Indian comma formatting (e.g., 1,25,000.00, 1,250.00, 500.00)
        preg_match_all('/(?:\b|\s|₹)([\d,]+\.\d{2})(?:\b|\s)/', $line, $amountMatches);
        $amounts = array_map(fn($v) => (float) str_replace(',', '', trim($v)), $amountMatches[1] ?? []);

        $debit = 0.0;
        $credit = 0.0;
        $balance = 0.0;

        if (count($amounts) >= 3) {
            $debit = $amounts[0];
            $credit = $amounts[1];
            $balance = $amounts[2];
        } else if (count($amounts) === 2) {
            if (preg_match('/(\bCR\b|\bCr\b|BY|Deposit|Transfer In)/i', $line)) {
                $credit = $amounts[0];
            } else {
                $debit = $amounts[0];
            }
            $balance = $amounts[1];
        } else if (count($amounts) === 1) {
            if (preg_match('/(\bCR\b|\bCr\b|BY|Deposit|Transfer In)/i', $line)) {
                $credit = $amounts[0];
            } else {
                $debit = $amounts[0];
            }
        }

        preg_match('/(UPI\/\w+\/[\w\/]+|NEFT\/\w+|IMPS\/\w+|RTGS\/\w+|CHQ\s*\d+|REF\w+|\b\d{8,}\b)/i', $line, $refMatch);
        $refNo = $refMatch[0] ?? '';

        return [
            'transaction_date' => $formattedDate,
            'value_date' => $formattedDate,
            'narration' => trim($line),
            'reference_number' => $refNo,
            'debit' => $debit,
            'credit' => $credit,
            'balance' => $balance,
            'raw_date' => $rawDate,
            'raw_narration' => trim($line),
            'raw_amount' => $debit > 0 ? $debit : $credit,
            'raw_balance' => $balance,
            'has_warning' => false,
            'warning_message' => null,
        ];
    }

    protected function mapColumnHeaderIndices(array $headerCells): array
    {
        $map = [
            'date' => -1,
            'value_date' => -1,
            'narration' => -1,
            'reference' => -1,
            'debit' => -1,
            'credit' => -1,
            'balance' => -1,
        ];

        foreach ($headerCells as $idx => $cell) {
            $c = strtolower(trim($cell));
            if (str_contains($c, 'txn date') || str_contains($c, 'tran date') || str_contains($c, 'date')) {
                if ($map['date'] === -1) $map['date'] = $idx;
            }
            if (str_contains($c, 'value date')) $map['value_date'] = $idx;
            if (str_contains($c, 'narration') || str_contains($c, 'particular') || str_contains($c, 'description') || str_contains($c, 'remarks')) $map['narration'] = $idx;
            if (str_contains($c, 'chq') || str_contains($c, 'ref') || str_contains($c, 'cheque')) $map['reference'] = $idx;
            if (str_contains($c, 'debit') || str_contains($c, 'withdrawal') || str_contains($c, 'dr')) $map['debit'] = $idx;
            if (str_contains($c, 'credit') || str_contains($c, 'deposit') || str_contains($c, 'cr')) $map['credit'] = $idx;
            if (str_contains($c, 'balance') || str_contains($c, 'closing bal') || str_contains($c, 'bal')) $map['balance'] = $idx;
        }

        return $map;
    }

    protected function parseRowFromCellArray(array $cells, array $indices): array
    {
        $dateCell = $indices['date'] >= 0 ? ($cells[$indices['date']] ?? '') : '';
        $valueDateCell = $indices['value_date'] >= 0 ? ($cells[$indices['value_date']] ?? '') : $dateCell;
        $narrationCell = $indices['narration'] >= 0 ? ($cells[$indices['narration']] ?? '') : '';
        $refCell = $indices['reference'] >= 0 ? ($cells[$indices['reference']] ?? '') : '';
        $debitCell = $indices['debit'] >= 0 ? ($cells[$indices['debit']] ?? '0') : '0';
        $creditCell = $indices['credit'] >= 0 ? ($cells[$indices['credit']] ?? '0') : '0';
        $balanceCell = $indices['balance'] >= 0 ? ($cells[$indices['balance']] ?? '0') : '0';

        // Fallback search if cell mapping was index mismatch
        if (empty($dateCell)) {
            foreach ($cells as $c) {
                if (preg_match('/\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}/', $c)) {
                    $dateCell = $c;
                    break;
                }
            }
        }

        if (empty($narrationCell)) {
            $narrationCell = implode(' ', $cells);
        }

        $formattedDate = $this->normalizeDate($dateCell);
        $debit = (float) str_replace(',', '', preg_replace('/[^\d\.]/', '', $debitCell));
        $credit = (float) str_replace(',', '', preg_replace('/[^\d\.]/', '', $creditCell));
        $balance = (float) str_replace(',', '', preg_replace('/[^\d\.]/', '', $balanceCell));

        return [
            'transaction_date' => $formattedDate,
            'value_date' => $this->normalizeDate($valueDateCell ?: $dateCell),
            'narration' => trim($narrationCell),
            'reference_number' => trim($refCell),
            'debit' => $debit,
            'credit' => $credit,
            'balance' => $balance,
            'raw_date' => $dateCell,
            'raw_narration' => $narrationCell,
            'raw_amount' => $debit > 0 ? $debit : $credit,
            'raw_balance' => $balanceCell,
            'has_warning' => false,
            'warning_message' => null,
        ];
    }

    protected function parseInlineBlocks(string $rawText): array
    {
        $transactions = [];
        preg_match_all('/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})(.*?)([\d,]+\.\d{2})/s', $rawText, $matches, PREG_SET_ORDER);

        foreach ($matches as $m) {
            $date = $this->normalizeDate($m[1]);
            $narration = trim($m[2]);
            $amount = (float) str_replace(',', '', $m[3]);
            $isCr = (bool) preg_match('/(\bCR\b|\bCr\b|BY|Deposit)/i', $narration);

            if ($amount > 0) {
                $transactions[] = [
                    'transaction_date' => $date,
                    'value_date' => $date,
                    'narration' => preg_replace('/\s+/', ' ', $narration),
                    'reference_number' => '',
                    'debit' => $isCr ? 0.0 : $amount,
                    'credit' => $isCr ? $amount : 0.0,
                    'balance' => 0.0,
                    'raw_date' => $m[1],
                    'raw_narration' => $narration,
                    'raw_amount' => $amount,
                    'raw_balance' => 0,
                    'has_warning' => false,
                    'warning_message' => null,
                ];
            }
        }

        return $transactions;
    }

    protected function normalizeDate(string $rawDate): string
    {
        $trimmed = trim($rawDate);
        if (empty($trimmed)) return date('Y-m-d');

        $clean = str_replace(['/', '.'], '-', $trimmed);
        $time = strtotime($clean);
        if ($time !== false && $time > 0) {
            return date('Y-m-d', $time);
        }
        return date('Y-m-d');
    }

    /**
     * Mathematical running balance reconciliation & warning detection
     */
    protected function validateAndReconcile(array $transactions): array
    {
        $count = count($transactions);
        if ($count === 0) return [];

        for ($i = 0; $i < $count; $i++) {
            $tx = &$transactions[$i];
            $tx['id'] = $i + 1;
            $warnings = [];

            // Check missing reference number
            if (empty($tx['reference_number'])) {
                preg_match('/(UPI\/\w+\/[\w\/]+|NEFT\/\w+|IMPS\/\w+|CHQ\s*\d+|\b\d{8,}\b)/i', $tx['narration'], $refMatch);
                if (!empty($refMatch[0])) {
                    $tx['reference_number'] = $refMatch[0];
                }
            }

            // Check running balance reconciliation if previous balance and current balance present
            if ($i > 0 && $tx['balance'] > 0 && $transactions[$i - 1]['balance'] > 0) {
                $prevBal = $transactions[$i - 1]['balance'];
                $expectedBal = round($prevBal + $tx['credit'] - $tx['debit'], 2);
                $actualBal = round($tx['balance'], 2);

                if (abs($expectedBal - $actualBal) > 0.05) {
                    $warnings[] = "Balance mismatch on row " . ($i + 1) . " (Expected ₹{$expectedBal}, Extracted ₹{$actualBal})";
                }
            }

            if (!empty($warnings)) {
                $tx['has_warning'] = true;
                $tx['warning_message'] = implode('; ', $warnings);
            } else {
                $tx['has_warning'] = false;
                $tx['warning_message'] = null;
            }
        }

        return $transactions;
    }

    protected function finalizeTransaction(array $tx): array
    {
        $tx['narration'] = preg_replace('/\s+/', ' ', trim($tx['narration']));
        return $tx;
    }
}
