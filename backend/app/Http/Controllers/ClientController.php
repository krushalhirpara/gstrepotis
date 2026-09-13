<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ClientController extends Controller
{
    /**
     * Resolve the authenticated user ID safely
     */
    protected function getUserId(Request $request): int
    {
        return $request->user()?->id ?? 1;
    }

    /**
     * GET /api/clients
     * Fetch user-isolated clients with pagination, search & filters
     */
    public function index(Request $request)
    {
        $userId = $this->getUserId($request);
        $query = Client::where('user_id', $userId);

        // Search across Trade Name, Party Name, GSTIN, PAN, Mobile, Email
        if ($search = trim($request->input('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('trade_name', 'like', "%{$search}%")
                  ->orWhere('party_name', 'like', "%{$search}%")
                  ->orWhere('gstin', 'like', "%{$search}%")
                  ->orWhere('pan', 'like', "%{$search}%")
                  ->orWhere('mobile', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Status Filter (active / inactive)
        if ($status = $request->input('status')) {
            if (in_array($status, ['active', 'inactive'])) {
                $query->where('status', $status);
            }
        }

        // Filing Frequency Filter (monthly / quarterly)
        if ($frequency = $request->input('filing_frequency')) {
            if (in_array($frequency, ['monthly', 'quarterly'])) {
                $query->where('filing_frequency', $frequency);
            }
        }

        // State Filter
        if ($state = $request->input('state')) {
            $query->where('state', $state);
        }

        // Summary metrics computed efficiently for user
        $summary = [
            'total_clients' => Client::where('user_id', $userId)->count(),
            'active_clients' => Client::where('user_id', $userId)->where('status', 'active')->count(),
            'monthly_filers' => Client::where('user_id', $userId)->where('filing_frequency', 'monthly')->count(),
            'quarterly_filers' => Client::where('user_id', $userId)->where('filing_frequency', 'quarterly')->count(),
        ];

        $perPage = min(max((int) $request->input('per_page', 25), 5), 250);
        $clients = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $clients->items(),
            'total' => $clients->total(),
            'per_page' => $clients->perPage(),
            'current_page' => $clients->currentPage(),
            'last_page' => $clients->lastPage(),
            'summary' => $summary,
        ]);
    }

    /**
     * POST /api/clients
     * Create a new client for the authenticated user
     */
    public function store(Request $request)
    {
        $userId = $this->getUserId($request);

        $validator = Validator::make($request->all(), [
            'trade_name' => 'required|string|max:150',
            'party_name' => 'required|string|max:150',
            'gstin' => [
                'required',
                'string',
                'size:15',
                'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i',
            ],
            'pan' => 'nullable|string|size:10|regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i',
            'mobile' => 'nullable|string|max:15',
            'email' => 'nullable|email|max:150',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'state_code' => 'nullable|string|max:5',
            'pincode' => 'nullable|string|max:10',
            'filing_frequency' => 'nullable|in:monthly,quarterly',
            'status' => 'nullable|in:active,inactive',
        ], [
            'trade_name.required' => 'Trade Name is required.',
            'party_name.required' => 'Party / Legal Name is required.',
            'gstin.required' => 'GSTIN is required.',
            'gstin.size' => 'GSTIN must be exactly 15 characters long.',
            'gstin.regex' => 'Please enter a valid 15-digit GSTIN format.',
            'pan.regex' => 'Please enter a valid 10-digit PAN format (e.g. ABCDE1234F).',
            'email.email' => 'Please enter a valid email address.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $gstin = strtoupper(trim($request->gstin));

        // Check duplicate GSTIN for THIS user
        if (Client::where('user_id', $userId)->where('gstin', $gstin)->exists()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => [
                    'gstin' => ['This GSTIN is already added to your client list.'],
                ],
            ], 422);
        }

        // Derive PAN from GSTIN if not explicitly provided (Chars 3-12 of GSTIN)
        $pan = $request->pan ? strtoupper(trim($request->pan)) : substr($gstin, 2, 10);
        $stateCode = $request->state_code ? trim($request->state_code) : substr($gstin, 0, 2);

        $client = Client::create([
            'user_id' => $userId,
            'trade_name' => trim($request->trade_name),
            'party_name' => trim($request->party_name),
            'gstin' => $gstin,
            'pan' => $pan,
            'mobile' => $request->mobile ? trim($request->mobile) : null,
            'email' => $request->email ? strtolower(trim($request->email)) : null,
            'address' => $request->address ? trim($request->address) : null,
            'city' => $request->city ? trim($request->city) : null,
            'state' => $request->state ? trim($request->state) : null,
            'state_code' => $stateCode,
            'pincode' => $request->pincode ? trim($request->pincode) : null,
            'filing_frequency' => $request->filing_frequency ?? 'monthly',
            'status' => $request->status ?? 'active',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Client created successfully.',
            'data' => $client,
        ], 201);
    }

    /**
     * GET /api/clients/{id}
     * View single client (Enforces strict user-level authorization)
     */
    public function show(Request $request, $id)
    {
        $userId = $this->getUserId($request);
        $client = Client::where('user_id', $userId)->find($id);

        if (!$client) {
            return response()->json([
                'message' => 'Client record not found or access denied.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $client,
        ]);
    }

    /**
     * PUT/PATCH /api/clients/{id}
     * Update client details (Enforces strict user-level authorization)
     */
    public function update(Request $request, $id)
    {
        $userId = $this->getUserId($request);
        $client = Client::where('user_id', $userId)->find($id);

        if (!$client) {
            return response()->json([
                'message' => 'Client record not found or access denied.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'trade_name' => 'required|string|max:150',
            'party_name' => 'required|string|max:150',
            'gstin' => [
                'required',
                'string',
                'size:15',
                'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i',
            ],
            'pan' => 'nullable|string|size:10|regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i',
            'mobile' => 'nullable|string|max:15',
            'email' => 'nullable|email|max:150',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'state_code' => 'nullable|string|max:5',
            'pincode' => 'nullable|string|max:10',
            'filing_frequency' => 'nullable|in:monthly,quarterly',
            'status' => 'nullable|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $gstin = strtoupper(trim($request->gstin));

        // Check duplicate GSTIN ignoring current client ID
        if (Client::where('user_id', $userId)->where('gstin', $gstin)->where('id', '!=', $id)->exists()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => [
                    'gstin' => ['This GSTIN is already registered to another client in your list.'],
                ],
            ], 422);
        }

        $pan = $request->pan ? strtoupper(trim($request->pan)) : substr($gstin, 2, 10);
        $stateCode = $request->state_code ? trim($request->state_code) : substr($gstin, 0, 2);

        $client->update([
            'trade_name' => trim($request->trade_name),
            'party_name' => trim($request->party_name),
            'gstin' => $gstin,
            'pan' => $pan,
            'mobile' => $request->mobile ? trim($request->mobile) : null,
            'email' => $request->email ? strtolower(trim($request->email)) : null,
            'address' => $request->address ? trim($request->address) : null,
            'city' => $request->city ? trim($request->city) : null,
            'state' => $request->state ? trim($request->state) : null,
            'state_code' => $stateCode,
            'pincode' => $request->pincode ? trim($request->pincode) : null,
            'filing_frequency' => $request->filing_frequency ?? $client->filing_frequency,
            'status' => $request->status ?? $client->status,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Client details updated successfully.',
            'data' => $client,
        ]);
    }

    /**
     * DELETE /api/clients/{id}
     * Soft delete client record
     */
    public function destroy(Request $request, $id)
    {
        $userId = $this->getUserId($request);
        $client = Client::where('user_id', $userId)->find($id);

        if (!$client) {
            return response()->json([
                'message' => 'Client record not found or access denied.',
            ], 404);
        }

        $clientName = $client->trade_name;
        $client->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Client '{$clientName}' removed successfully.",
        ]);
    }

    /**
     * POST /api/clients/bulk-upload
     * Bulk client import via CSV / TXT / Excel data parsing
     */
    public function bulkUpload(Request $request)
    {
        $userId = $this->getUserId($request);

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:10240', // Max 10MB
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'File upload validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $file = $request->file('file');
        $path = $file->getRealPath();
        
        $rows = [];
        if (($handle = fopen($path, 'r')) !== false) {
            // Read CSV header
            $header = fgetcsv($handle, 2000, ',');
            while (($data = fgetcsv($handle, 2000, ',')) !== false) {
                if (count($data) >= 3 && !empty(trim($data[0]))) {
                    $rows[] = $data;
                }
            }
            fclose($handle);
        }

        if (empty($rows)) {
            return response()->json([
                'message' => 'No valid data rows found in the uploaded file.',
            ], 422);
        }

        $insertedCount = 0;
        $invalidCount = 0;
        $duplicateCount = 0;
        $errors = [];
        $existingGstins = Client::where('user_id', $userId)->pluck('gstin')->toArray();

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2; // Accounting for 1-based indexing + header row
            $tradeName = trim($row[0] ?? '');
            $partyName = trim($row[1] ?? $tradeName);
            $gstin = strtoupper(trim($row[2] ?? ''));
            $pan = strtoupper(trim($row[3] ?? ''));
            $mobile = trim($row[4] ?? '');
            $email = strtolower(trim($row[5] ?? ''));
            $state = trim($row[6] ?? '');
            $frequency = strtolower(trim($row[7] ?? 'monthly'));

            if (empty($tradeName)) {
                $invalidCount++;
                $errors[] = "Row {$rowNum}: Missing Trade Name.";
                continue;
            }

            if (!preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i', $gstin)) {
                $invalidCount++;
                $errors[] = "Row {$rowNum}: Invalid GSTIN format ('{$gstin}').";
                continue;
            }

            if (in_array($gstin, $existingGstins)) {
                $duplicateCount++;
                $errors[] = "Row {$rowNum}: GSTIN '{$gstin}' already exists in your client list.";
                continue;
            }

            if (empty($pan) && strlen($gstin) === 15) {
                $pan = substr($gstin, 2, 10);
            }

            Client::create([
                'user_id' => $userId,
                'trade_name' => $tradeName,
                'party_name' => $partyName,
                'gstin' => $gstin,
                'pan' => $pan,
                'mobile' => $mobile ?: null,
                'email' => $email ?: null,
                'state' => $state ?: null,
                'state_code' => substr($gstin, 0, 2),
                'filing_frequency' => in_array($frequency, ['monthly', 'quarterly']) ? $frequency : 'monthly',
                'status' => 'active',
            ]);

            $existingGstins[] = $gstin;
            $insertedCount++;
        }

        return response()->json([
            'status' => 'success',
            'message' => "Bulk import completed: {$insertedCount} clients imported successfully.",
            'summary' => [
                'total_records' => count($rows),
                'inserted_count' => $insertedCount,
                'invalid_count' => $invalidCount,
                'duplicate_count' => $duplicateCount,
            ],
            'import_errors' => array_slice($errors, 0, 10), // Return top 10 error notes
        ]);
    }
}
