<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GstAuditFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'audit_id',
        'user_id',
        'category',
        'file_type',
        'original_filename',
        'stored_filename',
        'file_size',
        'status',
        'records_count',
        'error_message',
        'metadata',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'records_count' => 'integer',
        'metadata' => 'array',
    ];

    public function audit()
    {
        return $this->belongsTo(GstAudit::class, 'audit_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function records()
    {
        return $this->hasMany(GstAuditRecord::class, 'file_id');
    }
}
