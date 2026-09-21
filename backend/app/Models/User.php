<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'google_id',
        'avatar',
        'provider',
        'api_token',
        'password',
        'mobile',
        'user_type',
        'is_admin',
        'credits',
        'status',
        'account_status',
        'email_verified_at',
        'mobile_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'api_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'mobile_verified_at' => 'datetime',
        'is_admin' => 'boolean',
        'credits' => 'integer',
    ];

    public function otpVerifications()
    {
        return $this->hasMany(OtpVerification::class);
    }

    public function clients()
    {
        return $this->hasMany(Client::class);
    }
}
