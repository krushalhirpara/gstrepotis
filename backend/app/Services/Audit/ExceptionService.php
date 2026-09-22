<?php

namespace App\Services\Audit;

use App\Models\GstAudit;
use App\Models\GstAuditException;
use Illuminate\Pagination\LengthAwarePaginator;

class ExceptionService
{
    /**
     * Get filtered, paginated exceptions for an audit
     */
    public function getExceptions(GstAudit $audit, array $filters = []): LengthAwarePaginator
    {
        $query = GstAuditException::where('audit_id', $audit->id)
            ->with(['record', 'reconciliation']);

        if (!empty($filters['severity'])) {
            $query->where('severity', $filters['severity']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['rule_code'])) {
            $query->where('rule_code', $filters['rule_code']);
        }

        if (!empty($filters['source'])) {
            $query->where('source', 'like', "%{$filters['source']}%");
        }

        if (!empty($filters['search'])) {
            $s = trim($filters['search']);
            $query->where(function ($q) use ($s) {
                $q->where('description', 'like', "%{$s}%")
                  ->orWhere('record_reference', 'like', "%{$s}%")
                  ->orWhere('rule_code', 'like', "%{$s}%")
                  ->orWhere('ca_remark', 'like', "%{$s}%");
            });
        }

        $perPage = intval($filters['per_page'] ?? 25);
        return $query->orderByRaw("FIELD(severity, 'Critical', 'High', 'Medium', 'Low', 'Info')")
                     ->orderBy('id', 'desc')
                     ->paginate($perPage);
    }

    /**
     * Update an exception with CA review findings
     */
    public function updateException(GstAuditException $exception, array $data, ?int $userId = null): GstAuditException
    {
        $updates = [];

        if (isset($data['status'])) {
            $updates['status'] = $data['status'];
            if (in_array($data['status'], ['Resolved', 'Ignored'])) {
                $updates['resolved_by'] = $userId;
                $updates['resolved_at'] = now();
            } else {
                $updates['resolved_by'] = null;
                $updates['resolved_at'] = null;
            }
        }

        if (isset($data['ca_remark'])) {
            $updates['ca_remark'] = trim($data['ca_remark']);
        }

        if (isset($data['action_taken'])) {
            $updates['action_taken'] = trim($data['action_taken']);
        }

        $exception->update($updates);
        return $exception;
    }

    /**
     * Bulk update multiple exceptions
     */
    public function bulkUpdate(GstAudit $audit, array $exceptionIds, array $data, ?int $userId = null): int
    {
        $query = GstAuditException::where('audit_id', $audit->id)
            ->whereIn('id', $exceptionIds);

        $updates = [];
        if (isset($data['status'])) {
            $updates['status'] = $data['status'];
            if (in_array($data['status'], ['Resolved', 'Ignored'])) {
                $updates['resolved_by'] = $userId;
                $updates['resolved_at'] = now();
            }
        }
        if (isset($data['ca_remark'])) {
            $updates['ca_remark'] = trim($data['ca_remark']);
        }
        if (isset($data['action_taken'])) {
            $updates['action_taken'] = trim($data['action_taken']);
        }

        return $query->update($updates);
    }

    /**
     * Exception summary counters
     */
    public function getSummary(GstAudit $audit): array
    {
        $all = GstAuditException::where('audit_id', $audit->id)->get();

        return [
            'total' => $all->count(),
            'open' => $all->where('status', 'Open')->count(),
            'under_review' => $all->where('status', 'Under Review')->count(),
            'resolved' => $all->where('status', 'Resolved')->count(),
            'ignored' => $all->where('status', 'Ignored')->count(),
            'needs_clarification' => $all->where('status', 'Needs Client Clarification')->count(),
            'critical' => $all->where('severity', 'Critical')->count(),
            'high' => $all->where('severity', 'High')->count(),
            'medium' => $all->where('severity', 'Medium')->count(),
            'low' => $all->where('severity', 'Low')->count(),
            'total_financial_impact' => round($all->sum('financial_impact'), 2),
        ];
    }
}
