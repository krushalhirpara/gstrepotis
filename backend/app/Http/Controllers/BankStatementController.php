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
        $request->validate([
            'bank_code' => 'nullable|string',
            'password' => 'nullable|string',
            'file' => 'nullable|file|mimes:pdf',
        ]);

        $bankCode = $request->input('bank_code', 'AUTO');
        $password = $request->input('password');
        $filePath = '';

        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->getRealPath();
        } else if ($request->hasFile('statement')) {
            $filePath = $request->file('statement')->getRealPath();
        } else {
            $filePath = storage_path('app/sample_statement.pdf');
        }

        try {
            $parsed = $this->parserManager->parseStatement($filePath, $bankCode, $password);

            $bankName = DB::table('banks')->where('code', $bankCode)->value('name') ?? (str_contains(strtolower($bankCode), 'bank') ? $bankCode : $bankCode . ' Bank');

            return response()->json([
                'status' => 'success',
                'statement_id' => rand(1000, 9999),
                'bank_name' => $bankName,
                'bank_code' => $parsed['bank_code'],
                'total_transactions' => $parsed['total_transactions'],
                'total_debit' => $parsed['total_debit'],
                'total_credit' => $parsed['total_credit'],
                'transactions' => $parsed['transactions'],
            ]);
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
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="Bank_Transactions_Export.csv"',
        ]);
    }

    public function exportTallyXml(Request $request)
    {
        $bankName = $request->input('bank_name', 'HDFC Bank');
        $transactions = $request->input('transactions', []);
        $xmlContent = $this->tallyService->generateBankStatementXml($bankName, $transactions);

        return response($xmlContent, 200, [
            'Content-Type' => 'application/xml',
            'Content-Disposition' => 'attachment; filename="Bank_Transactions_Tally.xml"',
        ]);
    }
}
