<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GstAudit extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'client_id',
        'gstin',
        'financial_year',
        'assessment_year',
        'audit_name',
        'status',
        'data_quality_score',
        'started_at',
        'completed_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'data_quality_score' => 'float',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function files()
    {
        return $this->hasMany(GstAuditFile::class, 'audit_id');
    }

    public function records()
    {
        return $this->hasMany(GstAuditRecord::class, 'audit_id');
    }

    public function reconciliations()
    {
        return $this->hasMany(GstAuditReconciliation::class, 'audit_id');
    }

    public function exceptions()
    {
        return $this->hasMany(GstAuditException::class, 'audit_id');
    }

    public function checklist()
    {
        return $this->hasMany(GstAuditChecklist::class, 'audit_id');
    }

    public function workingPapers()
    {
        return $this->hasMany(GstAuditWorkingPaper::class, 'audit_id');
    }
}
