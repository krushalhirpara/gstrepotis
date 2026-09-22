<?php

namespace App\Services\Audit;

use App\Models\GstAudit;
use App\Models\GstAuditFile;
use App\Models\GstAuditRecord;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GSTDataNormalizer
{
    /**
     * Parse and normalize an uploaded file based on its category
     */
    public function normalizeFile(GstAuditFile $file): array
    {
        $category = $file->category;
        
        $filePath = null;
        if (Storage::disk('local')->exists($file->stored_filename)) {
            $filePath = Storage::disk('local')->path($file->stored_filename);
        } elseif (Storage::exists($file->stored_filename)) {
            $filePath = Storage::path($file->stored_filename);
        } elseif (file_exists(storage_path('app/' . $file->stored_filename))) {
            $filePath = storage_path('app/' . $file->stored_filename);
        } elseif (file_exists(storage_path('app/public/' . $file->stored_filename))) {
            $filePath = storage_path('app/public/' . $file->stored_filename);
        }

        if (!$filePath || !file_exists($filePath)) {
            throw new Exception("Uploaded file does not exist on disk: {$file->original_filename}");
        }

        $extension = strtolower(pathinfo($file->original_filename, PATHINFO_EXTENSION));

        $records = [];
        if ($extension === 'json') {
            $jsonContent = file_get_contents($filePath);
            $data = json_decode($jsonContent, true);
            if (!is_array($data)) {
                throw new Exception("Invalid JSON format in file: {$file->original_filename}");
            }
            $records = $this->parseJsonByCategory($category, $data, $file->audit_id, $file->id);
        } elseif ($extension === 'csv' || $extension === 'txt') {
            $records = $this->parseCsvByCategory($category, $filePath, $file->audit_id, $file->id);
        } else {
            // For Excel / other formats, attempt CSV parsing if plain text or basic row parser
            $records = $this->parseCsvByCategory($category, $filePath, $file->audit_id, $file->id);
        }

        return $records;
    }

    /**
     * Parse GST Portal JSON exports
     */
    public function parseJsonByCategory(string $category, array $data, int $auditId, int $fileId): array
    {
        $normalized = [];

        switch ($category) {
            case 'gstr1':
                // Official GST Portal GSTR-1 structure
                $fp = $data['fp'] ?? null; // e.g. 042024

                // Table 4: B2B Invoices
                if (!empty($data['b2b']) && is_array($data['b2b'])) {
                    foreach ($data['b2b'] as $party) {
                        $ctin = strtoupper(trim($party['ctin'] ?? ''));
                        foreach ($party['inv'] ?? [] as $inv) {
                            $invNum = trim($inv['inum'] ?? '');
                            $invDate = $this->formatDate($inv['idt'] ?? null);
                            $val = floatval($inv['val'] ?? 0);
                            $pos = trim($inv['pos'] ?? '');
                            $rchrg = ($inv['rchrg'] ?? 'N') === 'Y';

                            $taxable = 0; $igst = 0; $cgst = 0; $sgst = 0; $cess = 0;
                            foreach ($inv['itms'] ?? [] as $itm) {
                                $det = $itm['itm_det'] ?? $itm;
                                $taxable += floatval($det['txval'] ?? 0);
                                $igst += floatval($det['iamt'] ?? 0);
                                $cgst += floatval($det['camt'] ?? 0);
                                $sgst += floatval($det['samt'] ?? 0);
                                $cess += floatval($det['csamt'] ?? 0);
                            }

                            $normalized[] = [
                                'audit_id' => $auditId,
                                'file_id' => $fileId,
                                'record_type' => 'gstr1_b2b',
                                'period' => $fp,
                                'invoice_number' => $invNum,
                                'invoice_date' => $invDate,
                                'counterparty_gstin' => $ctin,
                                'counterparty_name' => $party['trade_name'] ?? $party['cname'] ?? null,
                                'place_of_supply' => $pos,
                                'supply_type' => 'taxable',
                                'taxable_value' => round($taxable, 2),
                                'igst' => round($igst, 2),
                                'cgst' => round($cgst, 2),
                                'sgst' => round($sgst, 2),
                                'cess' => round($cess, 2),
                                'total_value' => round($val ?: ($taxable + $igst + $cgst + $sgst + $cess), 2),
                                'reverse_charge' => $rchrg,
                                'document_type' => 'INV',
                                'raw_data' => $inv,
                            ];
                        }
                    }
                }

                // Table 9B: Credit / Debit Notes (CDNR)
                if (!empty($data['cdnr']) && is_array($data['cdnr'])) {
                    foreach ($data['cdnr'] as $party) {
                        $ctin = strtoupper(trim($party['ctin'] ?? ''));
                        foreach ($party['nt'] ?? [] as $note) {
                            $ntNum = trim($note['nt_num'] ?? '');
                            $ntDt = $this->formatDate($note['nt_dt'] ?? null);
                            $val = floatval($note['val'] ?? 0);
                            $ntType = strtoupper(trim($note['ntty'] ?? 'C')) === 'C' ? 'CRN' : 'DBN';

                            $taxable = 0; $igst = 0; $cgst = 0; $sgst = 0; $cess = 0;
                            foreach ($note['itms'] ?? [] as $itm) {
                                $det = $itm['itm_det'] ?? $itm;
                                $taxable += floatval($det['txval'] ?? 0);
                                $igst += floatval($det['iamt'] ?? 0);
                                $cgst += floatval($det['camt'] ?? 0);
                                $sgst += floatval($det['samt'] ?? 0);
                                $cess += floatval($det['csamt'] ?? 0);
                            }

                            $normalized[] = [
                                'audit_id' => $auditId,
                                'file_id' => $fileId,
                                'record_type' => 'gstr1_cdnr',
                                'period' => $fp,
                                'invoice_number' => $ntNum,
                                'invoice_date' => $ntDt,
                                'counterparty_gstin' => $ctin,
                                'counterparty_name' => $party['cname'] ?? null,
                                'place_of_supply' => trim($note['pos'] ?? ''),
                                'supply_type' => 'taxable',
                                'taxable_value' => round($taxable, 2),
                                'igst' => round($igst, 2),
                                'cgst' => round($cgst, 2),
                                'sgst' => round($sgst, 2),
                                'cess' => round($cess, 2),
                                'total_value' => round($val, 2),
                                'reverse_charge' => ($note['rchrg'] ?? 'N') === 'Y',
                                'document_type' => $ntType,
                                'raw_data' => $note,
                            ];
                        }
                    }
                }
                break;

            case 'gstr2b':
                // Official GST Portal GSTR-2B JSON structure
                $docdata = $data['data']['docdata'] ?? $data['docdata'] ?? $data;
                $fp = $data['data']['fp'] ?? $data['fp'] ?? null;

                // B2B Section
                $b2bList = $docdata['b2b'] ?? [];
                foreach ($b2bList as $supplier) {
                    $ctin = strtoupper(trim($supplier['ctin'] ?? ''));
                    $tradeName = $supplier['trdnm'] ?? $supplier['legal_name'] ?? null;

                    foreach ($supplier['inv'] ?? [] as $inv) {
                        $inum = trim($inv['inum'] ?? '');
                        $idt = $this->formatDate($inv['dt'] ?? $inv['idt'] ?? null);
                        $val = floatval($inv['val'] ?? 0);
                        $pos = trim($inv['pos'] ?? '');
                        $rev = ($inv['rev'] ?? 'N') === 'Y';
                        $itcavl = strtoupper(trim($inv['itcavl'] ?? 'Y')) === 'Y';

                        $taxable = floatval($inv['txval'] ?? 0);
                        $igst = floatval($inv['igst'] ?? 0);
                        $cgst = floatval($inv['cgst'] ?? 0);
                        $sgst = floatval($inv['sgst'] ?? 0);
                        $cess = floatval($inv['cess'] ?? 0);

                        // If item details exist inside items array
                        if (empty($taxable) && !empty($inv['items'])) {
                            foreach ($inv['items'] as $itm) {
                                $taxable += floatval($itm['txval'] ?? 0);
                                $igst += floatval($itm['igst'] ?? 0);
                                $cgst += floatval($itm['cgst'] ?? 0);
                                $sgst += floatval($itm['sgst'] ?? 0);
                                $cess += floatval($itm['cess'] ?? 0);
                            }
                        }

                        $normalized[] = [
                            'audit_id' => $auditId,
                            'file_id' => $fileId,
                            'record_type' => 'gstr2b_b2b',
                            'period' => $fp,
                            'invoice_number' => $inum,
                            'invoice_date' => $idt,
                            'counterparty_gstin' => $ctin,
                            'counterparty_name' => $tradeName,
                            'place_of_supply' => $pos,
                            'supply_type' => 'taxable',
                            'taxable_value' => round($taxable, 2),
                            'igst' => round($igst, 2),
                            'cgst' => round($cgst, 2),
                            'sgst' => round($sgst, 2),
                            'cess' => round($cess, 2),
                            'total_value' => round($val ?: ($taxable + $igst + $cgst + $sgst + $cess), 2),
                            'itc_eligible' => $itcavl,
                            'itc_available' => $itcavl,
                            'reverse_charge' => $rev,
                            'document_type' => 'INV',
                            'raw_data' => $inv,
                        ];
                    }
                }
                break;

            case 'gstr3b':
                // Official GSTR-3B summary JSON
                $fp = $data['fp'] ?? $data['ret_period'] ?? 'Annual';
                $sec = $data['sec_sum'] ?? $data;

                // 3.1 Outward Taxable Supplies
                $txval = floatval($sec['tx_py']['txval'] ?? $sec['outward_taxable_value'] ?? 0);
                $iamt = floatval($sec['tx_py']['iamt'] ?? $sec['igst'] ?? 0);
                $camt = floatval($sec['tx_py']['camt'] ?? $sec['cgst'] ?? 0);
                $samt = floatval($sec['tx_py']['samt'] ?? $sec['sgst'] ?? 0);
                $csamt = floatval($sec['tx_py']['csamt'] ?? $sec['cess'] ?? 0);

                // Table 4 ITC Claimed
                $itcIgst = floatval($sec['itc_elg']['itc_net']['iamt'] ?? $sec['itc_claimed_igst'] ?? 0);
                $itcCgst = floatval($sec['itc_elg']['itc_net']['camt'] ?? $sec['itc_claimed_cgst'] ?? 0);
                $itcSgst = floatval($sec['itc_elg']['itc_net']['samt'] ?? $sec['itc_claimed_sgst'] ?? 0);
                $itcCess = floatval($sec['itc_elg']['itc_net']['csamt'] ?? $sec['itc_claimed_cess'] ?? 0);

                $normalized[] = [
                    'audit_id' => $auditId,
                    'file_id' => $fileId,
                    'record_type' => 'gstr3b_summary',
                    'period' => $fp,
                    'invoice_number' => "3B-{$fp}",
                    'invoice_date' => null,
                    'counterparty_gstin' => null,
                    'counterparty_name' => 'GSTR-3B Consolidated Return',
                    'taxable_value' => round($txval, 2),
                    'igst' => round($iamt, 2),
                    'cgst' => round($camt, 2),
                    'sgst' => round($samt, 2),
                    'cess' => round($csamt, 2),
                    'total_value' => round($txval + $iamt + $camt + $samt + $csamt, 2),
                    'raw_data' => [
                        'outward' => ['txval' => $txval, 'iamt' => $iamt, 'camt' => $camt, 'samt' => $samt, 'csamt' => $csamt],
                        'itc' => ['igst' => $itcIgst, 'cgst' => $itcCgst, 'sgst' => $itcSgst, 'cess' => $itcCess],
                    ],
                ];
                break;
        }

        return $normalized;
    }

    /**
     * Parse CSV registers with header auto-detection
     */
    public function parseCsvByCategory(string $category, string $filePath, int $auditId, int $fileId): array
    {
        $normalized = [];
        if (!file_exists($filePath) || ($handle = fopen($filePath, 'r')) === false) {
            return [];
        }

        // Detect BOM and read headers
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $rawHeader = fgetcsv($handle, 4000, ',');
        if (!$rawHeader) {
            fclose($handle);
            return [];
        }

        // Map column names flexibly
        $colMap = $this->detectHeaderColumns($rawHeader);

        $recordType = ($category === 'sales_register') ? 'sales' : 'purchase';

        while (($row = fgetcsv($handle, 4000, ',')) !== false) {
            if (empty(array_filter($row))) {
                continue;
            }

            $invNum = $this->getColumnValue($row, $colMap, 'invoice_number');
            if (empty($invNum)) {
                continue;
            }

            $invDate = $this->formatDate($this->getColumnValue($row, $colMap, 'invoice_date'));
            $gstin = strtoupper(trim($this->getColumnValue($row, $colMap, 'gstin')));
            $partyName = trim($this->getColumnValue($row, $colMap, 'party_name'));
            $pos = trim($this->getColumnValue($row, $colMap, 'pos'));
            $hsn = trim($this->getColumnValue($row, $colMap, 'hsn'));

            $taxable = floatval(preg_replace('/[^0-9.-]/', '', $this->getColumnValue($row, $colMap, 'taxable_value') ?: '0'));
            $igst = floatval(preg_replace('/[^0-9.-]/', '', $this->getColumnValue($row, $colMap, 'igst') ?: '0'));
            $cgst = floatval(preg_replace('/[^0-9.-]/', '', $this->getColumnValue($row, $colMap, 'cgst') ?: '0'));
            $sgst = floatval(preg_replace('/[^0-9.-]/', '', $this->getColumnValue($row, $colMap, 'sgst') ?: '0'));
            $cess = floatval(preg_replace('/[^0-9.-]/', '', $this->getColumnValue($row, $colMap, 'cess') ?: '0'));
            $total = floatval(preg_replace('/[^0-9.-]/', '', $this->getColumnValue($row, $colMap, 'total_value') ?: '0'));

            if ($total <= 0 && $taxable > 0) {
                $total = $taxable + $igst + $cgst + $sgst + $cess;
            }

            $docType = 'INV';
            $docRaw = strtoupper($this->getColumnValue($row, $colMap, 'doc_type') ?: '');
            if (str_contains($docRaw, 'CREDIT') || str_contains($docRaw, 'CRN')) {
                $docType = 'CRN';
            } elseif (str_contains($docRaw, 'DEBIT') || str_contains($docRaw, 'DBN')) {
                $docType = 'DBN';
            }

            $rcmRaw = strtoupper($this->getColumnValue($row, $colMap, 'reverse_charge') ?: '');
            $isRcm = ($rcmRaw === 'Y' || $rcmRaw === 'YES' || $rcmRaw === 'TRUE' || $rcmRaw === '1');

            $normalized[] = [
                'audit_id' => $auditId,
                'file_id' => $fileId,
                'record_type' => $recordType,
                'period' => $invDate ? substr($invDate, 0, 7) : null,
                'invoice_number' => $invNum,
                'invoice_date' => $invDate,
                'counterparty_gstin' => $gstin ?: null,
                'counterparty_name' => $partyName ?: null,
                'place_of_supply' => $pos ?: null,
                'supply_type' => 'taxable',
                'taxable_value' => round($taxable, 2),
                'igst' => round($igst, 2),
                'cgst' => round($cgst, 2),
                'sgst' => round($sgst, 2),
                'cess' => round($cess, 2),
                'total_value' => round($total, 2),
                'hsn_sac' => $hsn ?: null,
                'itc_eligible' => true,
                'itc_available' => true,
                'reverse_charge' => $isRcm,
                'document_type' => $docType,
                'raw_data' => $row,
            ];
        }

        fclose($handle);
        return $normalized;
    }

    /**
     * Map arbitrary CSV column headers to canonical names
     */
    protected function detectHeaderColumns(array $headers): array
    {
        $map = [];
        foreach ($headers as $idx => $h) {
            $hClean = strtolower(trim(preg_replace('/[^a-zA-Z0-9]/', '', $h)));

            if (in_array($hClean, ['invoicenumber', 'invoiceno', 'invno', 'billno', 'docno', 'voucherno', 'inum'])) {
                $map['invoice_number'] = $idx;
            } elseif (in_array($hClean, ['invoicedate', 'invdate', 'date', 'billdate', 'docdate', 'idt', 'dt'])) {
                $map['invoice_date'] = $idx;
            } elseif (in_array($hClean, ['gstin', 'gstinunum', 'customergstin', 'suppliergstin', 'partygstin', 'ctin'])) {
                $map['gstin'] = $idx;
            } elseif (in_array($hClean, ['partyname', 'customername', 'suppliername', 'name', 'trdnm', 'legalname'])) {
                $map['party_name'] = $idx;
            } elseif (in_array($hClean, ['taxablevalue', 'taxableamount', 'taxableamt', 'txval', 'taxable'])) {
                $map['taxable_value'] = $idx;
            } elseif (in_array($hClean, ['igst', 'igstamount', 'iamt', 'integratedtax'])) {
                $map['igst'] = $idx;
            } elseif (in_array($hClean, ['cgst', 'cgstamount', 'camt', 'centraltax'])) {
                $map['cgst'] = $idx;
            } elseif (in_array($hClean, ['sgst', 'sgstamount', 'samt', 'statetax', 'utgst'])) {
                $map['sgst'] = $idx;
            } elseif (in_array($hClean, ['cess', 'cessamount', 'csamt'])) {
                $map['cess'] = $idx;
            } elseif (in_array($hClean, ['totalvalue', 'totalamount', 'invvalue', 'invoicevalue', 'netamount', 'total', 'val'])) {
                $map['total_value'] = $idx;
            } elseif (in_array($hClean, ['pos', 'placeofsupply', 'statecode'])) {
                $map['pos'] = $idx;
            } elseif (in_array($hClean, ['hsn', 'sac', 'hsncode', 'hsnsac'])) {
                $map['hsn'] = $idx;
            } elseif (in_array($hClean, ['doctype', 'documenttype', 'vouchertype', 'type'])) {
                $map['doc_type'] = $idx;
            } elseif (in_array($hClean, ['rcm', 'reversecharge', 'rev', 'rchrg'])) {
                $map['reverse_charge'] = $idx;
            }
        }
        return $map;
    }

    protected function getColumnValue(array $row, array $map, string $key): ?string
    {
        if (isset($map[$key]) && isset($row[$map[$key]])) {
            return trim($row[$map[$key]]);
        }
        return null;
    }

    /**
     * Standardize diverse date strings to YYYY-MM-DD
     */
    public function formatDate(?string $raw): ?string
    {
        if (!$raw) return null;
        $raw = trim($raw);

        // DD-MM-YYYY or DD/MM/YYYY
        if (preg_match('/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/', $raw, $m)) {
            return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
        }

        // YYYY-MM-DD or YYYY/MM/DD
        if (preg_match('/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/', $raw, $m)) {
            return sprintf('%04d-%02d-%02d', $m[1], $m[2], $m[3]);
        }

        // Try strtotime
        $time = strtotime($raw);
        if ($time !== false && $time > 0) {
            return date('Y-m-d', $time);
        }

        return null;
    }

    /**
     * Calculate Data Quality Score (0 to 100%) for an audit based on normalized records
     */
    public function evaluateDataQuality(int $auditId): array
    {
        $records = GstAuditRecord::where('audit_id', $auditId)->get();
        if ($records->isEmpty()) {
            return ['score' => 100.0, 'total_checks' => 0, 'errors' => 0, 'warnings' => 0];
        }

        $totalChecks = 0;
        $penalty = 0;
        $errorsCount = 0;
        $warningsCount = 0;
        $seenInvoices = [];

        foreach ($records as $rec) {
            $valErrors = [];

            // 1. Missing Invoice Number
            $totalChecks++;
            if (empty($rec->invoice_number)) {
                $penalty += 5;
                $errorsCount++;
                $valErrors[] = 'Missing invoice number';
            }

            // 2. Missing or Invalid Date
            $totalChecks++;
            if (empty($rec->invoice_date)) {
                $penalty += 3;
                $warningsCount++;
                $valErrors[] = 'Missing or invalid invoice date';
            } elseif ($rec->invoice_date > now()->addDays(2)) {
                $penalty += 5;
                $errorsCount++;
                $valErrors[] = 'Future dated invoice';
            }

            // 3. GSTIN Format Check (if present)
            if (!empty($rec->counterparty_gstin)) {
                $totalChecks++;
                if (!preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i', $rec->counterparty_gstin)) {
                    $penalty += 4;
                    $warningsCount++;
                    $valErrors[] = 'Invalid counterparty GSTIN format';
                }
            }

            // 4. Tax Math Consistency (IGST + CGST + SGST + Cess vs Taxable Value)
            $totalChecks++;
            $taxSum = round($rec->igst + $rec->cgst + $rec->sgst + $rec->cess, 2);
            if ($rec->taxable_value > 0 && $taxSum > 0) {
                // If CGST > 0, SGST should generally equal CGST within 1 rupee
                if ($rec->cgst > 0 && $rec->sgst > 0 && abs($rec->cgst - $rec->sgst) > 1.0) {
                    $penalty += 2;
                    $warningsCount++;
                    $valErrors[] = 'CGST and SGST mismatch on intra-state supply';
                }
            }

            // 5. Negative values check
            if ($rec->document_type === 'INV' && ($rec->taxable_value < 0 || $rec->total_value < 0)) {
                $penalty += 5;
                $errorsCount++;
                $valErrors[] = 'Negative values in standard tax invoice';
            }

            // 6. Duplicate check in same category
            $key = "{$rec->record_type}|{$rec->counterparty_gstin}|{$rec->invoice_number}";
            if (isset($seenInvoices[$key])) {
                $penalty += 4;
                $warningsCount++;
                $valErrors[] = 'Duplicate invoice number found in batch';
            } else {
                $seenInvoices[$key] = true;
            }

            if (!empty($valErrors)) {
                $rec->update(['validation_errors' => $valErrors]);
            }
        }

        // Calculate final score: Max 100, minimum 0
        $score = max(0, min(100, round(100 - ($penalty / max(1, count($records))), 2)));

        GstAudit::where('id', $auditId)->update(['data_quality_score' => $score]);

        return [
            'score' => $score,
            'total_checks' => $totalChecks,
            'errors' => $errorsCount,
            'warnings' => $warningsCount,
        ];
    }
}
