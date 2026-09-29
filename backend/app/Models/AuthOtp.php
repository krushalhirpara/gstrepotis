<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuthOtp extends Model
{
    use HasFactory;

    protected $table = 'auth_otps';

    protected $fillable = [
        'user_id',
        'challenge_id',
        'identifier',
        'channel',
        'purpose',
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
        'otp_hash',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
