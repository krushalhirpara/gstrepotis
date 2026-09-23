<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RegistrationVerification extends Model
{
    use HasFactory;

    protected $table = 'registration_verifications';

    protected $fillable = [
        'registration_id',
        'name',
        'email',
        'mobile',
        'password_hash',
        'otp_hash',
        'expires_at',
        'attempts',
        'max_attempts',
        'last_sent_at',
        'verified_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'last_sent_at' => 'datetime',
        'verified_at' => 'datetime',
        'attempts' => 'integer',
        'max_attempts' => 'integer',
    ];

    protected $hidden = [
        'password_hash',
        'otp_hash',
    ];
}
