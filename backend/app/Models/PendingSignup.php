<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PendingSignup extends Model
{
    use HasFactory;

    protected $table = 'pending_signups';

    protected $fillable = [
        'signup_token',
        'name',
        'email',
        'mobile',
        'password_hash',
        'email_otp_hash',
        'mobile_otp_hash',
        'email_expires_at',
        'mobile_expires_at',
        'email_attempts',
        'mobile_attempts',
        'max_attempts',
        'email_last_sent_at',
        'mobile_last_sent_at',
        'email_verified_at',
        'mobile_verified_at',
    ];

    protected $casts = [
        'email_expires_at' => 'datetime',
        'mobile_expires_at' => 'datetime',
        'email_last_sent_at' => 'datetime',
        'mobile_last_sent_at' => 'datetime',
        'email_verified_at' => 'datetime',
        'mobile_verified_at' => 'datetime',
        'email_attempts' => 'integer',
        'mobile_attempts' => 'integer',
        'max_attempts' => 'integer',
    ];

    protected $hidden = [
        'password_hash',
        'email_otp_hash',
        'mobile_otp_hash',
    ];
}
