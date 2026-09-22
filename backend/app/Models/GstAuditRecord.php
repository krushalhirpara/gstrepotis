<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GstAuditRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'audit_id',
        'file_id',
        'record_type',
        'period',
        'invoice_number',
        'invoice_date',
        'counterparty_gstin',
        'counterparty_name',
        'place_of_supply',
        'supply_type',
        'taxable_value',
        'igst',
        'cgst',
        'sgst',
        'cess',
        'total_value',
        'hsn_sac',
        'itc_eligible',
        'itc_available',
        'reverse_charge',
        'document_type',
        'raw_data',
        'validation_errors',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'taxable_value' => 'float',
        'igst' => 'float',
        'cgst' => 'float',
        'sgst' => 'float',
        'cess' => 'float',
        'total_value' => 'float',
        'itc_eligible' => 'boolean',
        'itc_available' => 'boolean',
        'reverse_charge' => 'boolean',
        'raw_data' => 'array',
        'validation_errors' => 'array',
    ];

    public function audit()
    {
        return $this->belongsTo(GstAudit::class, 'audit_id');
    }

    public function file()
    {
        return $this->belongsTo(GstAuditFile::class, 'file_id');
    }

    public function sourceReconciliations()
    {
        return $this->hasMany(GstAuditReconciliation::class, 'source_record_id');
    }

    public function targetReconciliations()
    {
        return $this->hasMany(GstAuditReconciliation::class, 'target_record_id');
    }

    public function exceptions()
    {
        return $this->hasMany(GstAuditException::class, 'record_id');
    }
}
