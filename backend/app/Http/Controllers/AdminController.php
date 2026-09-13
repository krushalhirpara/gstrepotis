<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\HsnMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    public function getMetrics()
    {
        $totalUsers = DB::table('users')->where('is_admin', 0)->count();
        $activeUsers = DB::table('users')->where('is_admin', 0)->where('status', 'active')->count();
        $trialUsers = DB::table('users')->where('is_admin', 0)->where('credits', '<=', 50)->count();

        $filesProcessed = DB::table('bank_statements')->where('processing_status', 'completed')->count() +
                          DB::table('marketplace_files')->where('status', 'completed')->count();

        $processingFailures = DB::table('bank_statements')->where('processing_status', 'failed')->count() +
                              DB::table('marketplace_files')->where('status', 'failed')->count();

        $activeSubs = DB::table('users')->where('is_admin', 0)->where('credits', '>', 50)->count();
        $revenue = $activeSubs * 999;

        return response()->json([
            'metrics' => [
                'total_users' => $totalUsers,
                'active_users' => $activeUsers,
                'trial_users' => $trialUsers,
                'total_revenue' => '₹' . number_format($revenue),
                'files_processed' => $filesProcessed,
                'processing_failures' => $processingFailures,
                'active_subscriptions' => $activeSubs,
            ],
        ]);
    }

    public function getUsers()
    {
        $users = DB::table('users')->select('id', 'name', 'email', 'mobile', 'user_type', 'is_admin', 'credits', 'status', 'created_at')->get();
        return response()->json(['users' => $users]);
    }

    public function toggleUserStatus(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $user->status = ($user->status === 'active') ? 'suspended' : 'active';
        $user->save();

        return response()->json([
            'message' => "User {$user->name} status updated to {$user->status}.",
            'user' => $user,
        ]);
    }

    public function getBanks()
    {
        $banks = DB::table('banks')->get();
        return response()->json(['banks' => $banks]);
    }

    public function addBank(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'code' => 'required|string|unique:banks',
            'parser_type' => 'required|string',
        ]);

        $id = DB::table('banks')->insertGetId([
            'name' => $request->name,
            'code' => strtoupper($request->code),
            'parser_type' => $request->parser_type,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Bank added successfully', 'id' => $id]);
    }

    public function getMarketplaces()
    {
        $marketplaces = DB::table('marketplaces')->get();
        return response()->json(['marketplaces' => $marketplaces]);
    }

    public function getHsnMaster()
    {
        $hsnList = DB::table('hsn_master')->get();
        return response()->json(['hsn_master' => $hsnList]);
    }

    public function addHsn(Request $request)
    {
        $request->validate([
            'hsn_code' => 'required|string|unique:hsn_master',
            'description' => 'required|string',
            'gst_rate' => 'required|numeric',
        ]);

        $id = DB::table('hsn_master')->insertGetId([
            'hsn_code' => $request->hsn_code,
            'description' => $request->description,
            'gst_rate' => $request->gst_rate,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'HSN Code added to Master successfully', 'id' => $id]);
    }

    public function getAuditLogs()
    {
        $logs = [
            [
                'id' => 101,
                'user' => 'Rajesh Sharma (CA)',
                'action' => 'File Uploaded',
                'module' => 'Bank Statement',
                'record' => 'HDFC_Statement_Q3.pdf',
                'ip' => '103.21.124.8',
                'timestamp' => date('Y-m-d H:i:s', strtotime('-15 mins')),
            ],
            [
                'id' => 102,
                'user' => 'Admin User',
                'action' => 'Bank Added',
                'module' => 'Bank Master',
                'record' => 'IDFC First Bank',
                'ip' => '103.21.124.1',
                'timestamp' => date('Y-m-d H:i:s', strtotime('-1 hour')),
            ],
            [
                'id' => 103,
                'user' => 'Priya Mehta (Tax Pro)',
                'action' => 'Report Generated',
                'module' => 'GSTR-1 JSON',
                'record' => 'Report_Aug_2026.json',
                'ip' => '49.36.192.42',
                'timestamp' => date('Y-m-d H:i:s', strtotime('-3 hours')),
            ],
        ];

        return response()->json(['audit_logs' => $logs]);
    }
}
