<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GstAuditException extends Model
{
    use HasFactory;

    protected $fillable = [
        'audit_id',
        'record_id',
        'recon_id',
        'rule_code',
        'severity',
        'description',
        'source',
        'record_reference',
        'financial_impact',
        'status',
        'ca_remark',
        'action_taken',
        'resolved_by',
        'resolved_at',
    ];

    protected $casts = [
        'financial_impact' => 'float',
        'resolved_at' => 'datetime',
    ];

    public function audit()
    {
        return $this->belongsTo(GstAudit::class, 'audit_id');
    }

    public function record()
    {
        return $this->belongsTo(GstAuditRecord::class, 'record_id');
    }

    public function reconciliation()
    {
        return $this->belongsTo(GstAuditReconciliation::class, 'recon_id');
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
