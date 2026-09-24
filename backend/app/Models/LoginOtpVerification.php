<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoginOtpVerification extends Model
{
    use HasFactory;

    protected $table = 'login_otp_verifications';

    protected $fillable = [
        'user_id',
        'challenge_id',
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

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
