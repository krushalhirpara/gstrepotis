<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GstAuditReconciliation extends Model
{
    use HasFactory;

    protected $fillable = [
        'audit_id',
        'recon_type',
        'source_record_id',
        'target_record_id',
        'match_status',
        'match_type',
        'difference_taxable',
        'difference_igst',
        'difference_cgst',
        'difference_sgst',
        'difference_cess',
        'confidence',
        'reason',
        'ca_action',
        'ca_remarks',
        'resolved_by',
        'resolved_at',
    ];

    protected $casts = [
        'difference_taxable' => 'float',
        'difference_igst' => 'float',
        'difference_cgst' => 'float',
        'difference_sgst' => 'float',
        'difference_cess' => 'float',
        'confidence' => 'integer',
        'resolved_at' => 'datetime',
    ];

    public function audit()
    {
        return $this->belongsTo(GstAudit::class, 'audit_id');
    }

    public function sourceRecord()
    {
        return $this->belongsTo(GstAuditRecord::class, 'source_record_id');
    }

    public function targetRecord()
    {
        return $this->belongsTo(GstAuditRecord::class, 'target_record_id');
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
