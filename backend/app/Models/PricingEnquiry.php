<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PricingEnquiry extends Model
{
    use HasFactory;

    protected $table = 'pricing_enquiries';

    protected $fillable = [
        'first_name',
        'last_name',
        'contact_number',
        'email',
        'message',
        'selected_plan',
        'status',
    ];

    /**
     * Allowed plan values
     */
    public const ALLOWED_PLANS = [
        'Free Trial',
        'Professional',
        'Business',
        'Enterprise',
    ];

    /**
     * Allowed status values
     */
    public const STATUS_NEW = 'new';
    public const STATUS_CONTACTED = 'contacted';
    public const STATUS_IN_DISCUSSION = 'in_discussion';
    public const STATUS_CONVERTED = 'converted';
    public const STATUS_CLOSED = 'closed';

    public const ALLOWED_STATUSES = [
        self::STATUS_NEW,
        self::STATUS_CONTACTED,
        self::STATUS_IN_DISCUSSION,
        self::STATUS_CONVERTED,
        self::STATUS_CLOSED,
    ];

    /**
     * Normalize plan name from slug or text
     */
    public static function normalizePlan(?string $rawPlan): ?string
    {
        if (empty($rawPlan)) {
            return null;
        }

        $cleaned = strtolower(trim(str_replace(['-', '_'], ' ', $rawPlan)));

        return match ($cleaned) {
            'free trial', 'freetrial', 'free' => 'Free Trial',
            'professional', 'pro' => 'Professional',
            'business', 'biz' => 'Business',
            'enterprise', 'ent' => 'Enterprise',
            default => null,
        };
    }

    /**
     * Full name accessor
     */
    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
