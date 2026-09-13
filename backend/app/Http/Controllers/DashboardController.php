<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function getSummary(Request $request)
    {
        $user = $request->user() ?? \App\Models\User::where('email', 'demo@gstsuite.com')->first();
        $userId = $user ? $user->id : 1;

        $totalBankFiles = DB::table('bank_statements')->where('user_id', $userId)->count();
        $totalEcommerceFiles = DB::table('marketplace_files')->where('user_id', $userId)->count();
        $totalFiles = $totalBankFiles + $totalEcommerceFiles;

        $processedFiles = DB::table('bank_statements')->where('user_id', $userId)->where('processing_status', 'completed')->count() +
                          DB::table('marketplace_files')->where('user_id', $userId)->where('status', 'completed')->count();

        $failedFiles = DB::table('bank_statements')->where('user_id', $userId)->where('processing_status', 'failed')->count();

        $bankFiles = DB::table('bank_statements')
            ->where('user_id', $userId)
            ->select('id', 'original_filename as filename', DB::raw("'Bank Converter' as module"), 'processing_status as status', 'created_at as date', 'total_transactions as transactions_count')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $ecommerceFiles = DB::table('marketplace_files')
            ->where('user_id', $userId)
            ->select('id', 'filename', DB::raw("'E-Commerce GSTR-1' as module"), 'status', 'created_at as date', 'total_sales_count as transactions_count')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $recentActivity = $bankFiles->concat($ecommerceFiles)->sortByDesc('date')->take(5)->values()->map(function ($item) {
            $item->date = date('Y-m-d H:i', strtotime($item->date));
            return (array) $item;
        })->toArray();

        return response()->json([
            'widgets' => [
                'total_files' => $totalFiles,
                'processed_files' => $processedFiles,
                'successful_files' => $processedFiles,
                'failed_files' => $failedFiles,
                'remaining_credits' => $user ? $user->credits : 150,
                'current_plan' => 'Professional',
            ],
            'recent_activity' => $recentActivity,
        ]);
    }
}
