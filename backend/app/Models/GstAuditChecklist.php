<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GstAuditChecklist extends Model
{
    use HasFactory;

    protected $fillable = [
        'audit_id',
        'category',
        'item_code',
        'description',
        'status',
        'ca_remarks',
        'updated_by',
    ];

    public function audit()
    {
        return $this->belongsTo(GstAudit::class, 'audit_id');
    }

    public function updatedByUser()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
