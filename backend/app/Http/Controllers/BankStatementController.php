<?php

namespace App\Http\Controllers;

use App\Services\BankParserManager;
use App\Services\TallyXmlService;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BankStatementController extends Controller
{
    protected BankParserManager $parserManager;
    protected TallyXmlService $tallyService;
    protected ReportService $reportService;

    public function __construct(
        BankParserManager $parserManager,
        TallyXmlService $tallyService,
        ReportService $reportService
    ) {
        $this->parserManager = $parserManager;
        $this->tallyService = $tallyService;
        $this->reportService = $reportService;
    }

    public function getBanks()
    {
        $banks = DB::table('banks')->where('status', 'active')->get();
        return response()->json(['banks' => $banks]);
    }

    public function processStatement(Request $request)
    {
        @set_time_limit(120);

        $request->validate([
            'bank_code' => 'nullable|string',
            'password' => 'nullable|string',
            'file' => 'nullable|file',
        ]);

        $bankCode = $request->input('bank_code', 'AUTO');
        $password = $request->input('password');

        if (!$request->hasFile('file') && !$request->hasFile('statement')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Please select a valid PDF bank statement file to upload.',
            ], 422);
        }

        $file = $request->hasFile('file') ? $request->file('file') : $request->file('statement');
        $ext = strtolower($file->getClientOriginalExtension());
        if ($ext !== 'pdf' && !str_contains(strtolower($file->getClientMimeType()), 'pdf')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid file format. Only PDF bank statement files are supported.',
            ], 422);
        }

        $filePath = $file->getRealPath();
        $filename = $file->getClientOriginalName();
        $fileSize = $file->getSize();

        try {
            $parsed = $this->parserManager->parseStatement($filePath, $bankCode, $password);

            $bankName = DB::table('banks')->where('code', $bankCode)->value('name')
                ?? (str_contains(strtolower($bankCode), 'bank') ? $bankCode : $bankCode . ' Bank');
            
            $bank = DB::table('banks')->where('code', $bankCode)->first();
            $bankId = $bank ? $bank->id : null;

            $statementId = DB::table('bank_statements')->insertGetId([
                'user_id' => $request->user() ? $request->user()->id : 1,
                'bank_id' => $bankId,
                'original_filename' => $filename,
                'stored_filename' => 'temp/' . $filename,
                'file_size' => $fileSize,
                'password_protected' => !empty($password),
                'processing_status' => $parsed['status'] ?? 'completed',
                'total_transactions' => $parsed['total_transactions'] ?? 0,
                'total_debit' => $parsed['total_debit'] ?? 0.00,
                'total_credit' => $parsed['total_credit'] ?? 0.00,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json(array_merge([
                'statement_id' => $statementId,
                'bank_name' => $bankName,
                'filename' => $filename,
                'file_size' => $fileSize,
            ], $parsed));
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function exportCsv(Request $request)
    {
        $transactions = $request->input('transactions', []);
        $csvContent = $this->reportService->generateBankCsv($transactions);

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="Bank_Transactions_Export.csv"',
        ]);
    }

    public function exportExcel(Request $request)
    {
        $transactions = $request->input('transactions', []);
        $csvContent = $this->reportService->generateBankCsv($transactions);

        return response($csvContent, 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="Bank_Transactions_Export.xls"',
        ]);
    }

    public function exportTallyXml(Request $request)
    {
        $bankName = $request->input('bank_name', 'HDFC Bank');
        $transactions = $request->input('transactions', []);
        $xmlContent = $this->tallyService->generateBankStatementXml($bankName, $transactions);

        return response($xmlContent, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="Bank_Transactions_Tally.xml"',
        ]);
    }
}
