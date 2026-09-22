<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\GstAudit;
use App\Models\GstAuditChecklist;
use App\Models\GstAuditException;
use App\Models\GstAuditFile;
use App\Models\GstAuditRecord;
use App\Models\GstAuditReconciliation;
use App\Models\GstAuditWorkingPaper;
use App\Services\Audit\AuditReportService;
use App\Services\Audit\AuditRuleEngine;
use App\Services\Audit\ExceptionService;
use App\Services\Audit\GSTDataNormalizer;
use App\Services\Audit\ReconciliationEngine;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class GstAuditController extends Controller
{
    protected GSTDataNormalizer $normalizer;
    protected ReconciliationEngine $reconEngine;
    protected AuditRuleEngine $ruleEngine;
    protected ExceptionService $exceptionService;
    protected AuditReportService $reportService;

    public function __construct(
        GSTDataNormalizer $normalizer,
        ReconciliationEngine $reconEngine,
        AuditRuleEngine $ruleEngine,
        ExceptionService $exceptionService,
        AuditReportService $reportService
    ) {
        $this->normalizer = $normalizer;
        $this->reconEngine = $reconEngine;
        $this->ruleEngine = $ruleEngine;
        $this->exceptionService = $exceptionService;
        $this->reportService = $reportService;
    }

    /**
     * Resolve authenticated user safely
     */
    protected function getUser(Request $request)
    {
        return $request->user();
    }

    /**
     * Find audit ensuring strict user ownership (prevents IDOR)
     */
    protected function findUserAudit(int $userId, int $auditId): ?GstAudit
    {
        return GstAudit::where('user_id', $userId)->with('client')->find($auditId);
    }

    /**
     * GET /api/gst-audits
     * Dashboard view: Audits list with metrics
     */
    public function index(Request $request)
    {
        $user = $this->getUser($request);
        $userId = $user->id;

        $query = GstAudit::where('user_id', $userId)->with('client');

        // Search by Client Trade Name, Party Name, GSTIN, Audit Name
        if ($search = trim($request->input('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('audit_name', 'like', "%{$search}%")
                  ->orWhere('gstin', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('trade_name', 'like', "%{$search}%")
                         ->orWhere('party_name', 'like', "%{$search}%");
                  });
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($fy = $request->input('financial_year')) {
            $query->where('financial_year', $fy);
        }

        $perPage = intval($request->input('per_page', 15));
        $audits = $query->orderBy('id', 'desc')->paginate($perPage);

        // Aggregate Dashboard Metrics for this user from database
        $userAuditIds = GstAudit::where('user_id', $userId)->pluck('id');

        $metrics = [
            'total_clients' => Client::where('user_id', $userId)->count(),
            'active_audits' => GstAudit::where('user_id', $userId)->whereIn('status', ['in_progress', 'review_required', 'processing'])->count(),
            'completed_audits' => GstAudit::where('user_id', $userId)->where('status', 'completed')->count(),
            'pending_data' => GstAudit::where('user_id', $userId)->whereIn('status', ['draft', 'data_pending'])->count(),
            'critical_exceptions' => GstAuditException::whereIn('audit_id', $userAuditIds)->where('status', 'Open')->where('severity', 'Critical')->count(),
            'warning_exceptions' => GstAuditException::whereIn('audit_id', $userAuditIds)->where('status', 'Open')->whereIn('severity', ['High', 'Medium'])->count(),
            'reconciled_records' => GstAuditReconciliation::whereIn('audit_id', $userAuditIds)->where('match_status', 'Matched')->count(),
            'unreconciled_records' => GstAuditReconciliation::whereIn('audit_id', $userAuditIds)->whereIn('match_status', ['Mismatch', 'Missing in Source', 'Missing in Target', 'Missing in 2B', 'Amount Mismatch'])->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $audits->items(),
            'total' => $audits->total(),
            'per_page' => $audits->perPage(),
            'current_page' => $audits->currentPage(),
            'last_page' => $audits->lastPage(),
            'metrics' => $metrics,
        ]);
    }

    /**
     * POST /api/gst-audits
     * Create new audit entity
     */
    public function store(Request $request)
    {
        $user = $this->getUser($request);

        $validator = Validator::make($request->all(), [
            'client_id' => 'required|integer',
            'financial_year' => 'required|string|max:10',
            'assessment_year' => 'nullable|string|max:10',
            'audit_name' => 'nullable|string|max:150',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Verify Client belongs to this user (IDOR prevention)
        $client = Client::where('user_id', $user->id)->find($request->client_id);
        if (!$client) {
            return response()->json([
                'message' => 'Client not found or you do not have permission to access this client.',
            ], 403);
        }

        $fy = trim($request->financial_year);
        $auditName = trim($request->audit_name ?: "GST Audit — {$client->trade_name} ({$fy})");

        $audit = GstAudit::create([
            'user_id' => $user->id,
            'client_id' => $client->id,
            'gstin' => $client->gstin,
            'financial_year' => $fy,
            'assessment_year' => $request->assessment_year,
            'audit_name' => $auditName,
            'status' => 'data_pending',
            'data_quality_score' => 0,
            'started_at' => now(),
            'created_by' => $user->id,
        ]);

        // Initialize standard 15-category CA audit checklist
        $this->initializeChecklist($audit->id);

        return response()->json([
            'status' => 'success',
            'message' => "GST Audit workspace created for {$client->trade_name}.",
            'data' => $audit->load('client'),
        ], 201);
    }

    /**
     * GET /api/gst-audits/{id}
     * Audit Hub Overview
     */
    public function show(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        // Summary counts
        $filesCount = GstAuditFile::where('audit_id', $audit->id)->count();
        $recordsCount = GstAuditRecord::where('audit_id', $audit->id)->count();
        $reconciliationsCount = GstAuditReconciliation::where('audit_id', $audit->id)->count();
        $exceptionsCount = GstAuditException::where('audit_id', $audit->id)->count();
        $openExceptionsCount = GstAuditException::where('audit_id', $audit->id)->where('status', 'Open')->count();
        $workingPapersCount = GstAuditWorkingPaper::where('audit_id', $audit->id)->count();

        return response()->json([
            'status' => 'success',
            'data' => $audit,
            'counts' => [
                'files' => $filesCount,
                'records' => $recordsCount,
                'reconciliations' => $reconciliationsCount,
                'exceptions' => $exceptionsCount,
                'open_exceptions' => $openExceptionsCount,
                'working_papers' => $workingPapersCount,
            ],
        ]);
    }

    /**
     * PUT /api/gst-audits/{id}
     * Update audit status or details
     */
    public function update(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'audit_name' => 'nullable|string|max:150',
            'status' => 'nullable|in:draft,data_pending,processing,review_required,in_progress,completed',
            'assessment_year' => 'nullable|string|max:10',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $updates = [];
        if ($request->has('audit_name')) $updates['audit_name'] = trim($request->audit_name);
        if ($request->has('assessment_year')) $updates['assessment_year'] = trim($request->assessment_year);
        if ($request->has('status')) {
            $updates['status'] = $request->status;
            if ($request->status === 'completed' && !$audit->completed_at) {
                $updates['completed_at'] = now();
            }
        }
        $updates['updated_by'] = $user->id;

        $audit->update($updates);

        return response()->json([
            'status' => 'success',
            'message' => 'Audit workspace updated.',
            'data' => $audit->fresh('client'),
        ]);
    }

    /**
     * DELETE /api/gst-audits/{id}
     */
    public function destroy(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $audit->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Audit workspace deleted successfully.',
        ]);
    }

    /**
     * POST /api/gst-audits/{id}/files
     * Upload GST returns or accounting records
     */
    public function uploadFile(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:25600', // 25MB max
            'category' => 'required|string|in:gstr1,gstr2b,gstr3b,gstr9,sales_register,purchase_register,general_ledger,e_way_bill,other',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $uploadedFile = $request->file('file');
        $origName = $uploadedFile->getClientOriginalName();
        $ext = strtolower($uploadedFile->getClientOriginalExtension());
        $fileSize = $uploadedFile->getSize();

        // Allowed extensions
        if (!in_array($ext, ['json', 'csv', 'txt', 'xlsx', 'xls', 'pdf'])) {
            return response()->json([
                'message' => "Unsupported file type '.{$ext}'. Please upload JSON, CSV, Excel (XLSX), or PDF.",
            ], 422);
        }

        // Store file securely under user-scoped and audit-scoped directory
        $storageDir = "audit_files/{$user->id}/{$audit->id}";
        $storedFilename = $uploadedFile->store($storageDir);

        $auditFile = GstAuditFile::create([
            'audit_id' => $audit->id,
            'user_id' => $user->id,
            'category' => $request->category,
            'file_type' => $ext,
            'original_filename' => $origName,
            'stored_filename' => $storedFilename,
            'file_size' => $fileSize,
            'status' => 'processing',
        ]);

        // Attempt normalization and record persistence
        try {
            $parsedRecords = $this->normalizer->normalizeFile($auditFile);

            if (!empty($parsedRecords)) {
                $now = now();
                $recordsToInsert = array_map(function ($r) use ($now) {
                    if (isset($r['raw_data']) && is_array($r['raw_data'])) {
                        $r['raw_data'] = json_encode($r['raw_data']);
                    }
                    $r['created_at'] = $now;
                    $r['updated_at'] = $now;
                    return $r;
                }, $parsedRecords);

                // Batch insert normalized records
                foreach (array_chunk($recordsToInsert, 250) as $chunk) {
                    GstAuditRecord::insert($chunk);
                }
            }

            $auditFile->update([
                'status' => 'parsed',
                'records_count' => count($parsedRecords),
            ]);

            // Re-evaluate Data Quality
            $this->normalizer->evaluateDataQuality($audit->id);

            // Update audit status to processing or review_required
            $audit->update(['status' => 'processing']);

            return response()->json([
                'status' => 'success',
                'message' => "File '{$origName}' uploaded and normalized successfully with " . count($parsedRecords) . " records.",
                'data' => $auditFile,
            ], 201);
        } catch (Exception $e) {
            Log::warning("File parsing failed for {$origName}: " . $e->getMessage());

            $auditFile->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'warning',
                'message' => "Unable to reliably extract this document ({$e->getMessage()}). Please verify the file or upload the supported format.",
                'data' => $auditFile,
            ], 422);
        }
    }

    /**
     * GET /api/gst-audits/{id}/files
     */
    public function listFiles(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $files = GstAuditFile::where('audit_id', $audit->id)->orderBy('id', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $files,
        ]);
    }

    /**
     * DELETE /api/gst-audits/{id}/files/{fileId}
     */
    public function deleteFile(Request $request, $id, $fileId)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $file = GstAuditFile::where('audit_id', $audit->id)->find($fileId);
        if (!$file) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        // Delete records associated with file
        GstAuditRecord::where('file_id', $file->id)->delete();
        Storage::delete($file->stored_filename);
        $file->delete();

        // Re-evaluate data quality
        $this->normalizer->evaluateDataQuality($audit->id);

        return response()->json([
            'status' => 'success',
            'message' => 'File and associated records removed.',
        ]);
    }

    /**
     * POST /api/gst-audits/{id}/process
     * Run complete Data Quality check, Multi-Level Reconciliation, and Rule Engine
     */
    public function processAudit(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        // 1. Data Quality Evaluation
        $quality = $this->normalizer->evaluateDataQuality($audit->id);

        // 2. Reconciliation Engine (GSTR-1 vs Books, GSTR-2B vs Purchases, GSTR-1 vs GSTR-3B)
        $reconciliations = $this->reconEngine->runAll($audit);

        // 3. Rule Engine Execution (INV, GST, ITC, RCM, HSN rules)
        $exceptions = $this->ruleEngine->evaluateRules($audit);

        $audit->update([
            'status' => ($exceptions['total_exceptions_generated'] > 0) ? 'review_required' : 'completed',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Reconciliation and rule-based checks completed successfully.',
            'summary' => [
                'data_quality' => $quality,
                'reconciliations' => $reconciliations,
                'exceptions' => $exceptions,
            ],
        ]);
    }

    /**
     * GET /api/gst-audits/{id}/summary
     */
    public function getSummary(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $reportData = $this->reportService->generateReportData($audit);

        return response()->json([
            'status' => 'success',
            'data' => $reportData,
        ]);
    }

    /**
     * GET /api/gst-audits/{id}/reconciliation
     */
    public function getReconciliations(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $query = GstAuditReconciliation::where('audit_id', $audit->id)
            ->with(['sourceRecord', 'targetRecord']);

        if ($type = $request->input('recon_type')) {
            $query->where('recon_type', $type);
        }

        if ($status = $request->input('match_status')) {
            $query->where('match_status', $status);
        }

        if ($search = trim($request->input('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('sourceRecord', function ($sq) use ($search) {
                    $sq->where('invoice_number', 'like', "%{$search}%")
                       ->orWhere('counterparty_gstin', 'like', "%{$search}%")
                       ->orWhere('counterparty_name', 'like', "%{$search}%");
                })->orWhereHas('targetRecord', function ($tq) use ($search) {
                    $tq->where('invoice_number', 'like', "%{$search}%")
                       ->orWhere('counterparty_gstin', 'like', "%{$search}%")
                       ->orWhere('counterparty_name', 'like', "%{$search}%");
                });
            });
        }

        $perPage = intval($request->input('per_page', 20));
        $recons = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $recons->items(),
            'total' => $recons->total(),
            'per_page' => $recons->perPage(),
            'current_page' => $recons->currentPage(),
            'last_page' => $recons->lastPage(),
        ]);
    }

    /**
     * GET /api/gst-audits/{id}/itc
     * ITC specific analysis
     */
    public function getItcAnalysis(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $purchases = GstAuditRecord::where('audit_id', $audit->id)->where('record_type', 'purchase')->get();
        $gstr2b = GstAuditRecord::where('audit_id', $audit->id)->where('record_type', 'gstr2b_b2b')->get();
        $recons = GstAuditReconciliation::where('audit_id', $audit->id)->where('recon_type', 'gstr2b_vs_purchase')->get();

        $booksItc = $purchases->sum(fn($r) => $r->igst + $r->cgst + $r->sgst + $r->cess);
        $gstr2bItc = $gstr2b->sum(fn($r) => $r->igst + $r->cgst + $r->sgst + $r->cess);
        $matchedItc = $recons->where('match_status', 'Matched')->sum(fn($r) => $r->sourceRecord ? ($r->sourceRecord->igst + $r->sourceRecord->cgst + $r->sourceRecord->sgst + $r->sourceRecord->cess) : 0);
        $missingIn2bItc = $recons->where('match_status', 'Missing in 2B')->sum(fn($r) => $r->sourceRecord ? ($r->sourceRecord->igst + $r->sourceRecord->cgst + $r->sourceRecord->sgst + $r->sourceRecord->cess) : 0);
        $unclaimed2bItc = $recons->where('match_status', 'Missing in Books')->sum(fn($r) => $r->targetRecord ? ($r->targetRecord->igst + $r->targetRecord->cgst + $r->targetRecord->sgst + $r->targetRecord->cess) : 0);

        return response()->json([
            'status' => 'success',
            'data' => [
                'books_itc' => round($booksItc, 2),
                'gstr2b_itc' => round($gstr2bItc, 2),
                'matched_itc' => round($matchedItc, 2),
                'missing_in_2b_itc' => round($missingIn2bItc, 2),
                'unclaimed_2b_itc' => round($unclaimed2bItc, 2),
                'difference' => round($booksItc - $gstr2bItc, 2),
                'records_count' => [
                    'purchases' => count($purchases),
                    'gstr2b' => count($gstr2b),
                    'matched' => $recons->where('match_status', 'Matched')->count(),
                    'missing_in_2b' => $recons->where('match_status', 'Missing in 2B')->count(),
                    'missing_in_books' => $recons->where('match_status', 'Missing in Books')->count(),
                    'mismatch' => $recons->where('match_status', 'Amount Mismatch')->count(),
                ],
            ],
        ]);
    }

    /**
     * GET /api/gst-audits/{id}/exceptions
     */
    public function getExceptions(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $filters = $request->only(['severity', 'status', 'rule_code', 'source', 'search', 'per_page']);
        $exceptions = $this->exceptionService->getExceptions($audit, $filters);
        $summary = $this->exceptionService->getSummary($audit);

        return response()->json([
            'status' => 'success',
            'data' => $exceptions->items(),
            'total' => $exceptions->total(),
            'per_page' => $exceptions->perPage(),
            'current_page' => $exceptions->currentPage(),
            'last_page' => $exceptions->lastPage(),
            'summary' => $summary,
        ]);
    }

    /**
     * PATCH /api/gst-audits/{id}/exceptions/{exceptionId}
     * Update CA remark and status for an exception
     */
    public function updateException(Request $request, $id, $exceptionId)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $exception = GstAuditException::where('audit_id', $audit->id)->find($exceptionId);
        if (!$exception) {
            return response()->json(['message' => 'Exception record not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'nullable|in:Open,Under Review,Resolved,Ignored,Needs Client Clarification',
            'ca_remark' => 'nullable|string|max:1000',
            'action_taken' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $updated = $this->exceptionService->updateException($exception, $request->all(), $user->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Exception updated successfully.',
            'data' => $updated,
        ]);
    }

    /**
     * POST /api/gst-audits/{id}/exceptions/bulk
     */
    public function bulkUpdateExceptions(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'exception_ids' => 'required|array',
            'exception_ids.*' => 'integer',
            'status' => 'nullable|in:Open,Under Review,Resolved,Ignored,Needs Client Clarification',
            'ca_remark' => 'nullable|string|max:1000',
            'action_taken' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $count = $this->exceptionService->bulkUpdate($audit, $request->exception_ids, $request->all(), $user->id);

        return response()->json([
            'status' => 'success',
            'message' => "{$count} exceptions updated.",
        ]);
    }

    /**
     * GET /api/gst-audits/{id}/checklist
     */
    public function getChecklist(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $items = GstAuditChecklist::where('audit_id', $audit->id)->get();

        return response()->json([
            'status' => 'success',
            'data' => $items,
        ]);
    }

    /**
     * PATCH /api/gst-audits/{id}/checklist/{itemId}
     */
    public function updateChecklistItem(Request $request, $id, $itemId)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $item = GstAuditChecklist::where('audit_id', $audit->id)->find($itemId);
        if (!$item) {
            return response()->json(['message' => 'Checklist item not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'nullable|in:Pending,Completed,Not Applicable,Needs Review',
            'ca_remarks' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $updates = [];
        if ($request->has('status')) $updates['status'] = $request->status;
        if ($request->has('ca_remarks')) $updates['ca_remarks'] = trim($request->ca_remarks);
        $updates['updated_by'] = $user->id;

        $item->update($updates);

        return response()->json([
            'status' => 'success',
            'message' => 'Checklist item updated.',
            'data' => $item,
        ]);
    }

    /**
     * GET /api/gst-audits/{id}/working-papers
     */
    public function getWorkingPapers(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $papers = GstAuditWorkingPaper::where('audit_id', $audit->id)
            ->with('user:id,name,email')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $papers,
        ]);
    }

    /**
     * POST /api/gst-audits/{id}/working-papers
     */
    public function storeWorkingPaper(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'section' => 'required|string|max:50',
            'title' => 'required|string|max:150',
            'observation' => 'nullable|string',
            'explanation' => 'nullable|string',
            'management_response' => 'nullable|string',
            'conclusion' => 'nullable|string',
            'follow_up_action' => 'nullable|string',
            'reviewer_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $paper = GstAuditWorkingPaper::create([
            'audit_id' => $audit->id,
            'user_id' => $user->id,
            'section' => trim($request->section),
            'title' => trim($request->title),
            'observation' => $request->observation,
            'explanation' => $request->explanation,
            'management_response' => $request->management_response,
            'conclusion' => $request->conclusion,
            'follow_up_action' => $request->follow_up_action,
            'reviewer_notes' => $request->reviewer_notes,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Working paper entry created.',
            'data' => $paper->load('user:id,name,email'),
        ], 201);
    }

    /**
     * DELETE /api/gst-audits/{id}/working-papers/{wpId}
     */
    public function deleteWorkingPaper(Request $request, $id, $wpId)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $paper = GstAuditWorkingPaper::where('audit_id', $audit->id)->find($wpId);
        if (!$paper) {
            return response()->json(['message' => 'Working paper not found.'], 404);
        }

        $paper->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Working paper removed.',
        ]);
    }

    /**
     * GET /api/gst-audits/{id}/report
     */
    public function getReport(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $data = $this->reportService->generateReportData($audit);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * GET /api/gst-audits/{id}/export/csv
     */
    public function exportCsv(Request $request, $id)
    {
        $user = $this->getUser($request);
        $audit = $this->findUserAudit($user->id, $id);

        if (!$audit) {
            return response()->json(['message' => 'Audit workspace not found or access denied.'], 404);
        }

        $csv = $this->reportService->generateCsvExport($audit);
        $filename = "GST_Audit_{$audit->gstin}_{$audit->financial_year}_Exceptions.csv";

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Initialize standard 15-category checklist
     */
    protected function initializeChecklist(int $auditId): void
    {
        $categories = [
            'GST Registration' => [
                ['CHK-REG-01', 'Verify active GST registration status on portal and principal place of business.'],
                ['CHK-REG-02', 'Verify addition of all additional places of business (godowns/branches).'],
            ],
            'Sales' => [
                ['CHK-SAL-01', 'Reconcile turnover reported in Audited Financial Statements with Sales Register.'],
                ['CHK-SAL-02', 'Verify zero-rated supplies (exports/SEZ) with shipping bills/FIRC and LUT compliance.'],
                ['CHK-SAL-03', 'Review exempt and non-GST supplies for correct reporting in GSTR-1 and GSTR-3B.'],
            ],
            'Purchases' => [
                ['CHK-PUR-01', 'Reconcile purchase register total with audited trial balance expense heads.'],
                ['CHK-PUR-02', 'Verify 180-day payment rule compliance under second proviso to Section 16(2).'],
            ],
            'ITC' => [
                ['CHK-ITC-01', 'Reconcile GSTR-2B available ITC with ITC claimed in GSTR-3B Table 4.'],
                ['CHK-ITC-02', 'Verify reversal of ineligible ITC under Section 17(5) (blocked credits/personal use).'],
                ['CHK-ITC-03', 'Review common credit reversals under Rule 42 and Rule 43 for exempt supplies.'],
            ],
            'GSTR-1' => [
                ['CHK-G1-01', 'Reconcile outward tax liability between GSTR-1 and books of accounts.'],
                ['CHK-G1-02', 'Verify B2B supplies reporting with correct recipient GSTINs and Place of Supply.'],
            ],
            'GSTR-3B' => [
                ['CHK-G3-01', 'Reconcile monthly tax liability between GSTR-1 and GSTR-3B Table 3.1.'],
                ['CHK-G3-02', 'Verify payment of interest on delayed tax discharge under Section 50.'],
            ],
            'GSTR-2B' => [
                ['CHK-G2-01', 'Identify invoices in purchase register not appearing in GSTR-2B.'],
                ['CHK-G2-02', 'Follow up with non-compliant suppliers for GSTR-1 filing.'],
            ],
            'RCM' => [
                ['CHK-RCM-01', 'Review GTA, legal services, and director remuneration for RCM liability discharge.'],
                ['CHK-RCM-02', 'Verify ITC eligibility on RCM taxes paid in cash in the subsequent month.'],
            ],
            'Credit Notes' => [
                ['CHK-CN-01', 'Verify credit notes comply with Section 34(2) timeline (30th November cutoff).'],
                ['CHK-CN-02', 'Confirm corresponding reduction of output tax and ITC reversals by buyers.'],
            ],
            'Debit Notes' => [
                ['CHK-DN-01', 'Verify tax payment on supplementary invoices/debit notes.'],
            ],
            'E-commerce' => [
                ['CHK-ECO-01', 'Reconcile marketplace sales reports (Amazon/Flipkart/Meesho) with TCS Table in 2B.'],
                ['CHK-ECO-02', 'Verify Section 9(5) restaurant/transport supplies handled by operators.'],
            ],
            'HSN/SAC' => [
                ['CHK-HSN-01', 'Verify mandatory 4-digit / 6-digit HSN reporting compliance based on AATO.'],
                ['CHK-HSN-02', 'Check applicable GST rate consistency for top traded HSN codes.'],
            ],
            'Reconciliation' => [
                ['CHK-REC-01', 'Review all unresolved material differences between books and portal returns.'],
            ],
            'Documents' => [
                ['CHK-DOC-01', 'Confirm sequential invoice numbering and Rule 46 mandatory particulars.'],
                ['CHK-DOC-02', 'Inspect e-invoicing compliance (IRN/QR code) if turnover exceeds threshold.'],
            ],
            'Final Review' => [
                ['CHK-FIN-01', 'Review overall tax exposure and draft management observation memorandum.'],
                ['CHK-FIN-02', 'Partner/CA final sign-off on analytical audit working papers.'],
            ],
        ];

        $records = [];
        foreach ($categories as $cat => $items) {
            foreach ($items as $item) {
                $records[] = [
                    'audit_id' => $auditId,
                    'category' => $cat,
                    'item_code' => $item[0],
                    'description' => $item[1],
                    'status' => 'Pending',
                    'ca_remarks' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        GstAuditChecklist::insert($records);
    }
}
