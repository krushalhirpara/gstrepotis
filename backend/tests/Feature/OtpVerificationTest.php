<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\OtpVerification;
use App\Services\OtpService;
use App\Services\SmsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Mail\OtpVerificationMail;

class OtpVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected OtpService $otpService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->otpService = app(OtpService::class);
    }

    public function test_generates_a_secure_6_digit_otp_and_stores_only_sha256_hash()
    {
        Mail::fake();

        $user = User::create([
            'name' => 'Test User',
            'email' => 'testuser@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('Secret123!'),
            'account_status' => 'pending_verification',
        ]);

        $res = $this->otpService->createAndSendOtp($user, 'email', $user->email);

        $this->assertTrue($res['success']);
        
        $otpRecord = OtpVerification::where('user_id', $user->id)->first();
        $this->assertNotNull($otpRecord);
        $this->assertEquals(64, strlen($otpRecord->otp_hash)); // SHA-256 length is 64 hex chars
        $this->assertEquals(10, round(now()->diffInMinutes($otpRecord->expires_at)));
        $this->assertEquals(0, $otpRecord->attempts);

        // Verify Mailable sent with 6 digit string
        Mail::assertSent(OtpVerificationMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email) && preg_match('/^\d{6}$/', $mail->otp);
        });
    }

    public function test_enforces_a_30_second_resend_cooldown()
    {
        Mail::fake();

        $user = User::create([
            'name' => 'Cooldown User',
            'email' => 'cooldown@example.com',
            'mobile' => '+919876543211',
            'password' => Hash::make('Secret123!'),
            'account_status' => 'pending_verification',
        ]);

        // First OTP request
        $res1 = $this->otpService->createAndSendOtp($user, 'email', $user->email);
        $this->assertTrue($res1['success']);

        // Second immediate OTP request should be blocked by cooldown
        $res2 = $this->otpService->createAndSendOtp($user, 'email', $user->email);
        $this->assertFalse($res2['success']);
        $this->assertStringContainsString('Please wait', $res2['message']);
    }

    public function test_invalidates_previous_unverified_otps_when_new_otp_is_generated()
    {
        Mail::fake();

        $user = User::create([
            'name' => 'Invalidate User',
            'email' => 'invalidate@example.com',
            'mobile' => '+919876543212',
            'password' => Hash::make('Secret123!'),
            'account_status' => 'pending_verification',
        ]);

        $res1 = $this->otpService->createAndSendOtp($user, 'email', $user->email);
        $firstRecordId = OtpVerification::where('user_id', $user->id)->latest()->first()->id;

        // Simulate 31 seconds later to bypass cooldown
        $this->travel(31)->seconds();

        $res2 = $this->otpService->createAndSendOtp($user, 'email', $user->email);
        $this->assertTrue($res2['success']);

        // First record should be deleted/invalidated
        $this->assertDatabaseMissing('otp_verifications', ['id' => $firstRecordId]);
        $this->assertEquals(1, OtpVerification::where('user_id', $user->id)->count());
    }

    public function test_verifies_otp_server_side_and_advances_account_status()
    {
        Mail::fake();

        $user = User::create([
            'name' => 'Verify User',
            'email' => 'verify@example.com',
            'mobile' => '+919876543213',
            'password' => Hash::make('Secret123!'),
            'account_status' => 'pending_verification',
        ]);

        // Send Email OTP
        $this->otpService->createAndSendOtp($user, 'email', $user->email);

        // Get sent OTP code from Mail fake
        $sentOtp = null;
        Mail::assertSent(OtpVerificationMail::class, function ($mail) use (&$sentOtp) {
            $sentOtp = $mail->otp;
            return true;
        });

        $this->assertNotNull($sentOtp);

        // Verify Email OTP via API endpoint
        $response = $this->postJson('/api/auth/verify-email-otp', [
            'user_id' => $user->id,
            'otp' => $sentOtp,
        ]);

        $response->assertStatus(200);
        $user->refresh();

        // Account status must advance to email_verified
        $this->assertEquals('email_verified', $user->account_status);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_limits_verification_attempts_to_max_5()
    {
        Mail::fake();

        $user = User::create([
            'name' => 'Attempts User',
            'email' => 'attempts@example.com',
            'mobile' => '+919876543214',
            'password' => Hash::make('Secret123!'),
            'account_status' => 'pending_verification',
        ]);

        $this->otpService->createAndSendOtp($user, 'email', $user->email);

        // Enter wrong OTP 5 times
        for ($i = 1; $i <= 4; $i++) {
            $res = $this->otpService->verifyOtp($user, 'email', '000000');
            $this->assertFalse($res['success']);
            $this->assertStringContainsString('attempts remaining', $res['message']);
        }

        // 5th failed attempt should lock/delete OTP session
        $res5 = $this->otpService->verifyOtp($user, 'email', '000000');
        $this->assertFalse($res5['success']);
        $this->assertStringContainsString('Too many incorrect attempts', $res5['message']);

        $this->assertEquals(0, OtpVerification::where('user_id', $user->id)->count());
    }

    public function test_rejects_expired_otps_after_10_minutes()
    {
        Mail::fake();

        $user = User::create([
            'name' => 'Expired User',
            'email' => 'expired@example.com',
            'mobile' => '+919876543215',
            'password' => Hash::make('Secret123!'),
            'account_status' => 'pending_verification',
        ]);

        $this->otpService->createAndSendOtp($user, 'email', $user->email);

        $sentOtp = null;
        Mail::assertSent(OtpVerificationMail::class, function ($mail) use (&$sentOtp) {
            $sentOtp = $mail->otp;
            return true;
        });

        // Travel 11 minutes into the future
        $this->travel(11)->minutes();

        $res = $this->otpService->verifyOtp($user, 'email', $sentOtp);
        $this->assertFalse($res['success']);
        $this->assertStringContainsString('expired', $res['message']);
    }

    public function test_completes_full_account_verification_flow_from_pending_to_active()
    {
        Mail::fake();

        // 1. Signup
        $signupRes = $this->postJson('/api/auth/register', [
            'name' => 'Full Flow User',
            'email' => 'fullflow@example.com',
            'mobile' => '+919876543216',
            'user_type' => 'CA',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'terms' => true,
        ]);

        $signupRes->assertStatus(201);
        $userId = $signupRes->json('user_id');

        $user = User::findOrFail($userId);
        $this->assertEquals('pending_verification', $user->account_status);

        // Get Email OTP
        $emailOtp = null;
        Mail::assertSent(OtpVerificationMail::class, function ($mail) use (&$emailOtp) {
            $emailOtp = $mail->otp;
            return true;
        });

        // 2. Verify Email OTP
        $emailVerifyRes = $this->postJson('/api/auth/verify-email-otp', [
            'user_id' => $userId,
            'otp' => $emailOtp,
        ]);

        $emailVerifyRes->assertStatus(200);
        $user->refresh();
        $this->assertEquals('email_verified', $user->account_status);

        // Create Mobile OTP
        $this->travel(31)->seconds();
        $this->otpService->createAndSendOtp($user, 'mobile', $user->mobile);

        $mobileOtpRecord = OtpVerification::where('user_id', $user->id)->where('channel', 'mobile')->first();
        $this->assertNotNull($mobileOtpRecord);

        // Verify Mobile OTP directly with valid hash test
        $mobileOtp = '654321';
        $mobileOtpRecord->update(['otp_hash' => hash('sha256', $mobileOtp)]);

        // 3. Verify Mobile OTP
        $mobileVerifyRes = $this->postJson('/api/auth/verify-mobile-otp', [
            'user_id' => $userId,
            'otp' => $mobileOtp,
        ]);

        $mobileVerifyRes->assertStatus(200);
        $user->refresh();
        $this->assertEquals('active', $user->account_status);
        $this->assertNotNull($user->mobile_verified_at);
    }
}
