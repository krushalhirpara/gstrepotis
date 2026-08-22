<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FileManagerController extends Controller
{
    public function getFiles(Request $request)
    {
        $filter = $request->query('filter', 'all');

        $sampleFiles = [
            [
                'id' => 1,
                'filename' => 'HDFC_Statement_Q3_2026.pdf',
                'module' => 'Bank Statement',
                'status' => 'completed',
                'uploaded' => date('Y-m-d H:i', strtotime('-2 days')),
                'processed' => date('Y-m-d H:i', strtotime('-2 days +5 mins')),
                'records_count' => 142,
                'file_size' => '1.2 MB',
            ],
            [
                'id' => 2,
                'filename' => 'Amazon_Sales_Aug2026.csv',
                'module' => 'E-Commerce GSTR-1',
                'status' => 'completed',
                'uploaded' => date('Y-m-d H:i', strtotime('-3 days')),
                'processed' => date('Y-m-d H:i', strtotime('-3 days +2 mins')),
                'records_count' => 840,
                'file_size' => '4.8 MB',
            ],
            [
                'id' => 3,
                'filename' => 'SBI_Statement_July2026.pdf',
                'module' => 'Bank Statement',
                'status' => 'completed',
                'uploaded' => date('Y-m-d H:i', strtotime('-5 days')),
                'processed' => date('Y-m-d H:i', strtotime('-5 days +3 mins')),
                'records_count' => 88,
                'file_size' => '850 KB',
            ],
            [
                'id' => 4,
                'filename' => 'Meesho_Vendor_Payouts.csv',
                'module' => 'E-Commerce GSTR-1',
                'status' => 'failed',
                'uploaded' => date('Y-m-d H:i', strtotime('-6 days')),
                'processed' => date('Y-m-d H:i', strtotime('-6 days +1 min')),
                'records_count' => 0,
                'file_size' => '320 KB',
                'error' => 'Invalid column headers in Meesho statement file.',
            ],
        ];

        if ($filter === 'bank') {
            $sampleFiles = array_filter($sampleFiles, fn($f) => $f['module'] === 'Bank Statement');
        } elseif ($filter === 'ecommerce') {
            $sampleFiles = array_filter($sampleFiles, fn($f) => $f['module'] === 'E-Commerce GSTR-1');
        } elseif ($filter === 'failed') {
            $sampleFiles = array_filter($sampleFiles, fn($f) => $f['status'] === 'failed');
        }

        return response()->json(['files' => array_values($sampleFiles)]);
    }

    public function deleteFile($id)
    {
        return response()->json(['message' => "File #{$id} deleted successfully."]);
    }
}
