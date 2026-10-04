<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FileManagerController extends Controller
{
    protected function getUserId(Request $request): int
    {
        $user = $request->user();
        if (!$user) {
            $token = $request->bearerToken();
            if ($token) {
                $user = \App\Models\User::where('api_token', $token)->first();
            }
        }

        if (!$user) {
            abort(response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated.',
            ], 401));
        }

        return $user->id;
    }

    public function getFiles(Request $request)
    {
        $filter = $request->query('filter', 'all');
        $userId = $this->getUserId($request);
        
        $bankFiles = DB::table('bank_statements')
            ->where('user_id', $userId)
            ->select('id', 'original_filename as filename', DB::raw("'Bank Statement' as module"), 'processing_status as status', 'created_at as uploaded', 'updated_at as processed', 'total_transactions as records_count', 'file_size', 'error_message as error')
            ->get();

        $ecommerceFiles = DB::table('marketplace_files')
            ->where('user_id', $userId)
            ->select('id', 'filename', DB::raw("'E-Commerce GSTR-1' as module"), 'status', 'created_at as uploaded', 'updated_at as processed', 'total_sales_count as records_count', 'file_size', DB::raw("null as error"))
            ->get();

        $allFiles = $bankFiles->concat($ecommerceFiles)->map(function($f) {
            $f->uploaded = date('Y-m-d H:i', strtotime($f->uploaded));
            $f->processed = date('Y-m-d H:i', strtotime($f->processed));
            $f->file_size = round($f->file_size / 1024, 1) . ' KB';
            return (array) $f;
        })->sortByDesc('uploaded')->values()->toArray();

        if ($filter === 'bank') {
            $allFiles = array_filter($allFiles, fn($f) => $f['module'] === 'Bank Statement');
        } elseif ($filter === 'ecommerce') {
            $allFiles = array_filter($allFiles, fn($f) => $f['module'] === 'E-Commerce GSTR-1');
        } elseif ($filter === 'failed') {
            $allFiles = array_filter($allFiles, fn($f) => $f['status'] === 'failed');
        }

        return response()->json(['files' => array_values($allFiles)]);
    }

    public function deleteFile(Request $request, $id)
    {
        $userId = $this->getUserId($request);

        $bankDeleted = DB::table('bank_statements')->where('id', $id)->where('user_id', $userId)->delete();
        $marketDeleted = DB::table('marketplace_files')->where('id', $id)->where('user_id', $userId)->delete();

        if (!$bankDeleted && !$marketDeleted) {
            return response()->json([
                'status' => 'error',
                'message' => 'File not found or access denied.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => "File #{$id} deleted successfully.",
        ]);
    }
}
