<?php

namespace App\Http\Controllers;

use App\Services\MarketplaceParserManager;
use App\Services\ValidationService;
use App\Services\TallyXmlService;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EcommerceGstr1Controller extends Controller
{
    protected MarketplaceParserManager $parserManager;
    protected ValidationService $validator;
    protected TallyXmlService $tallyService;
    protected ReportService $reportService;

    public function __construct(
        MarketplaceParserManager $parserManager,
        ValidationService $validator,
        TallyXmlService $tallyService,
        ReportService $reportService
    ) {
        $this->parserManager = $parserManager;
        $this->validator = $validator;
        $this->tallyService = $tallyService;
        $this->reportService = $reportService;
    }

    public function getMarketplaces()
    {
        $marketplaces = DB::table('marketplaces')->where('status', 'active')->get();
        return response()->json(['marketplaces' => $marketplaces]);
    }

    public function processReport(Request $request)
    {
        $request->validate([
            'marketplace_slug' => 'required|string',
        ]);

        $slug = $request->input('marketplace_slug');

        try {
            $parsed = $this->parserManager->parseMarketplaceReport('sample_report.csv', $slug);

            // Run validations on B2B GSTINs and HSNs
            foreach ($parsed['b2b'] as &$inv) {
                $val = $this->validator->validateGstin($inv['gstin']);
                $inv['is_valid'] = $val['is_valid'];
                $inv['validation_errors'] = $val['error'];
            }

            return response()->json([
                'status' => 'success',
                'report_id' => rand(100, 999),
                'marketplace' => ucfirst($slug),
                'summary' => $parsed['summary'],
                'b2b' => $parsed['b2b'],
                'b2c' => $parsed['b2c'],
                'hsn' => $parsed['hsn'],
                'tcs' => $parsed['tcs'],
                'section_9_5' => $parsed['section_9_5'],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function exportGstr1Json(Request $request)
    {
        $reportData = $request->all();
        $json = $this->reportService->generateGstr1Json($reportData);

        return response()->json($json)
            ->header('Content-Type', 'application/json')
            ->header('Content-Disposition', 'attachment; filename="GSTR1_Ready_Report.json"');
    }

    public function exportGstr1TallyXml(Request $request)
    {
        $b2bInvoices = $request->input('b2b', []);
        $xmlContent = $this->tallyService->generateGstr1SalesXml($b2bInvoices);

        return response($xmlContent, 200, [
            'Content-Type' => 'application/xml',
            'Content-Disposition' => 'attachment; filename="GSTR1_Sales_Tally.xml"',
        ]);
    }
}
