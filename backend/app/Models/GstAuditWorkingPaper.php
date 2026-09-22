<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GstAuditWorkingPaper extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'audit_id',
        'user_id',
        'section',
        'title',
        'observation',
        'explanation',
        'management_response',
        'conclusion',
        'follow_up_action',
        'reviewer_notes',
        'attachments',
    ];

    protected $casts = [
        'attachments' => 'array',
    ];

    public function audit()
    {
        return $this->belongsTo(GstAudit::class, 'audit_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
