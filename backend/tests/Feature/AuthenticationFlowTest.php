<?php

namespace Tests\Feature;

use App\Models\AuthOtp;
use App\Models\LoginOtpVerification;
use App\Models\OtpVerification;
use App\Models\PendingSignup;
use App\Models\User;
use App\Mail\OtpVerificationMail;
use App\Services\SmsService;
use App\Services\TwilioVerifyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthenticationFlowTest extends TestCase
{
    use RefreshDatabase;

    /**
     * 1. Signup Step 1: Validates required fields, email format, and password confirmation
     */
    public function test_signup_validates_input_fields()
    {
        $response = $this->postJson('/api/auth/signup', [
            'name' => 'A', // too short
            'email' => 'invalid-email',
            'mobile' => '12345', // invalid mobile
            'password' => 'short',
            'password_confirmation' => 'mismatch',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'mobile', 'password']);
    }

    /**
     * 2. Signup Step 1: Rejects duplicate email (case-insensitive)
     */
    public function test_signup_rejects_duplicate_email()
    {
        User::factory()->create([
            'email' => 'existing@example.com',
            'mobile' => '+919876543210',
        ]);

        $response = $this->postJson('/api/auth/signup', [
            'name' => 'Another User',
            'email' => 'EXISTING@example.com',
            'mobile' => '9876543211',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /**
     * 3. Signup Step 1: Rejects duplicate mobile
     */
    public function test_signup_rejects_duplicate_mobile()
    {
        User::factory()->create([
            'email' => 'first@example.com',
            'mobile' => '+919876543210',
        ]);

        $response = $this->postJson('/api/auth/signup', [
            'name' => 'Another User',
            'email' => 'second@example.com',
            'mobile' => '9876543210',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['mobile']);
    }

    /**
     * 4. Signup Step 1: Generates and dispatches Dual OTPs (Email + Mobile) simultaneously
     * Does NOT create active user account immediately.
     */
    public function test_signup_dispatches_dual_otps_simultaneously_and_does_not_activate_user_yet()
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/signup', [
            'name' => 'Krushal Hirpara',
            'email' => 'krushal@example.com',
            'mobile' => '9876543210',
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'requires_verification' => true,
                'email_masked' => 'k***@example.com',
                'mobile_masked' => '******3210',
                'cooldown_seconds' => 60,
            ])
            ->assertJsonStructure(['signup_token', 'email_masked', 'mobile_masked', 'expires_in_seconds', 'cooldown_seconds']);

        // User must NOT be created yet in users table
        $this->assertDatabaseMissing('users', [
            'email' => 'krushal@example.com',
        ]);

        // Pending signup must exist in pending_signups table
        $signupToken = $response->json('signup_token');
        $this->assertDatabaseHas('pending_signups', [
            'signup_token' => $signupToken,
            'email' => 'krushal@example.com',
            'mobile' => '+919876543210',
        ]);

        $pending = PendingSignup::where('signup_token', $signupToken)->first();
        $this->assertNotNull($pending);
        $this->assertNotEmpty($pending->email_otp_hash);
        $this->assertNotEmpty($pending->mobile_otp_hash);

        // Verify Email OTP was dispatched
        Mail::assertSent(OtpVerificationMail::class, function ($mail) {
            return $mail->hasTo('krushal@example.com');
        });
    }

    /**
     * 5. Signup Step 2: Fails when Email OTP is wrong even if Mobile OTP is correct
     */
    public function test_signup_fails_when_email_otp_is_wrong()
    {
        $pending = PendingSignup::create([
            'signup_token' => 'test-signup-token-wrong-email',
            'name' => 'Krushal Hirpara',
            'email' => 'wrongemail@example.com',
            'mobile' => '+919876543210',
            'password_hash' => Hash::make('Password123!'),
            'email_otp_hash' => hash('sha256', '111111'),
            'mobile_otp_hash' => hash('sha256', '222222'),
            'email_expires_at' => now()->addMinutes(5),
            'mobile_expires_at' => now()->addMinutes(5),
            'email_attempts' => 0,
            'mobile_attempts' => 0,
            'max_attempts' => 5,
            'email_last_sent_at' => now(),
            'mobile_last_sent_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/signup/verify', [
            'signup_token' => 'test-signup-token-wrong-email',
            'email_otp' => '999999', // wrong email OTP
            'mobile_otp' => '222222', // correct mobile OTP
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'message' => 'Invalid email OTP. Please check and try again.',
            ]);

        // Account must NOT be created
        $this->assertDatabaseMissing('users', [
            'email' => 'wrongemail@example.com',
        ]);
    }

    /**
     * 6. Signup Step 2: Fails when Mobile OTP is wrong even if Email OTP is correct
     */
    public function test_signup_fails_when_mobile_otp_is_wrong()
    {
        $pending = PendingSignup::create([
            'signup_token' => 'test-signup-token-wrong-mobile',
            'name' => 'Krushal Hirpara',
            'email' => 'wrongmobile@example.com',
            'mobile' => '+919876543210',
            'password_hash' => Hash::make('Password123!'),
            'email_otp_hash' => hash('sha256', '111111'),
            'mobile_otp_hash' => hash('sha256', '222222'),
            'email_expires_at' => now()->addMinutes(5),
            'mobile_expires_at' => now()->addMinutes(5),
            'email_attempts' => 0,
            'mobile_attempts' => 0,
            'max_attempts' => 5,
            'email_last_sent_at' => now(),
            'mobile_last_sent_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/signup/verify', [
            'signup_token' => 'test-signup-token-wrong-mobile',
            'email_otp' => '111111', // correct email OTP
            'mobile_otp' => '999999', // wrong mobile OTP
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'message' => 'Invalid mobile OTP. Please check and try again.',
            ]);

        // Account must NOT be created
        $this->assertDatabaseMissing('users', [
            'email' => 'wrongmobile@example.com',
        ]);
    }

    /**
     * 7. Signup Step 2: Expired OTP is rejected
     */
    public function test_signup_rejects_expired_otps()
    {
        PendingSignup::create([
            'signup_token' => 'test-signup-token-expired',
            'name' => 'Expired User',
            'email' => 'expired@example.com',
            'mobile' => '+919876543210',
            'password_hash' => Hash::make('Password123!'),
            'email_otp_hash' => hash('sha256', '111111'),
            'mobile_otp_hash' => hash('sha256', '222222'),
            'email_expires_at' => now()->subMinute(), // expired
            'mobile_expires_at' => now()->subMinute(),
            'email_attempts' => 0,
            'mobile_attempts' => 0,
            'max_attempts' => 5,
            'email_last_sent_at' => now()->subMinutes(6),
            'mobile_last_sent_at' => now()->subMinutes(6),
        ]);

        $response = $this->postJson('/api/auth/signup/verify', [
            'signup_token' => 'test-signup-token-expired',
            'email_otp' => '111111',
            'mobile_otp' => '222222',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'message' => 'This OTP has expired. Please request a new OTP.',
            ]);
    }

    /**
     * 8. Signup Step 2: Max attempt limit enforced
     */
    public function test_signup_enforces_attempt_limit()
    {
        PendingSignup::create([
            'signup_token' => 'test-signup-token-max-att',
            'name' => 'Max Attempt User',
            'email' => 'maxatt@example.com',
            'mobile' => '+919876543210',
            'password_hash' => Hash::make('Password123!'),
            'email_otp_hash' => hash('sha256', '111111'),
            'mobile_otp_hash' => hash('sha256', '222222'),
            'email_expires_at' => now()->addMinutes(5),
            'mobile_expires_at' => now()->addMinutes(5),
            'email_attempts' => 5, // reached max
            'mobile_attempts' => 0,
            'max_attempts' => 5,
            'email_last_sent_at' => now(),
            'mobile_last_sent_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/signup/verify', [
            'signup_token' => 'test-signup-token-max-att',
            'email_otp' => '111111',
            'mobile_otp' => '222222',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'message' => 'Too many incorrect attempts. Please request a new OTP.',
            ]);
    }

    /**
     * 9. Signup Resend OTPs enforce 60s cooldown
     */
    public function test_signup_resend_enforces_cooldown()
    {
        PendingSignup::create([
            'signup_token' => 'test-signup-token-cd',
            'name' => 'Cooldown User',
            'email' => 'cd@example.com',
            'mobile' => '+919876543210',
            'password_hash' => Hash::make('Password123!'),
            'email_otp_hash' => hash('sha256', '111111'),
            'mobile_otp_hash' => hash('sha256', '222222'),
            'email_expires_at' => now()->addMinutes(5),
            'mobile_expires_at' => now()->addMinutes(5),
            'email_attempts' => 0,
            'mobile_attempts' => 0,
            'max_attempts' => 5,
            'email_last_sent_at' => now()->subSeconds(20), // only 20s passed
            'mobile_last_sent_at' => now()->subSeconds(20),
        ]);

        // Email Resend within cooldown
        $resEmail = $this->postJson('/api/auth/signup/resend-email-otp', [
            'signup_token' => 'test-signup-token-cd',
        ]);
        $resEmail->assertStatus(429)
            ->assertJson([
                'status' => 'error',
                'message' => 'Please wait before requesting another OTP.',
            ]);

        // Mobile Resend within cooldown
        $resMobile = $this->postJson('/api/auth/signup/resend-mobile-otp', [
            'signup_token' => 'test-signup-token-cd',
        ]);
        $resMobile->assertStatus(429)
            ->assertJson([
                'status' => 'error',
                'message' => 'Please wait before requesting another OTP.',
            ]);
    }

    /**
     * 10. Signup Step 2: Successful verification when BOTH OTPs are correct
     * Activates account, creates user in MySQL, and returns access_token.
     */
    public function test_successful_dual_otp_verification_creates_active_user()
    {
        PendingSignup::create([
            'signup_token' => 'test-signup-token-success',
            'name' => 'Krushal Hirpara',
            'email' => 'krushal.success@example.com',
            'mobile' => '+919876543210',
            'password_hash' => Hash::make('ValidSecurePassword123!'),
            'email_otp_hash' => hash('sha256', '654321'),
            'mobile_otp_hash' => hash('sha256', '123456'),
            'email_expires_at' => now()->addMinutes(5),
            'mobile_expires_at' => now()->addMinutes(5),
            'email_attempts' => 0,
            'mobile_attempts' => 0,
            'max_attempts' => 5,
            'email_last_sent_at' => now(),
            'mobile_last_sent_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/signup/verify', [
            'signup_token' => 'test-signup-token-success',
            'email_otp' => '654321',
            'mobile_otp' => '123456',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'message' => 'Account created and verified successfully.',
                'user' => [
                    'name' => 'Krushal Hirpara',
                    'email' => 'krushal.success@example.com',
                    'mobile' => '+919876543210',
                    'status' => 'active',
                    'account_status' => 'active',
                ],
            ])
            ->assertJsonStructure(['access_token', 'token_type', 'user']);

        // User must exist in users table
        $this->assertDatabaseHas('users', [
            'email' => 'krushal.success@example.com',
            'mobile' => '+919876543210',
            'status' => 'active',
        ]);

        $user = User::where('email', 'krushal.success@example.com')->first();
        $this->assertNotNull($user);
        $this->assertTrue(Hash::check('ValidSecurePassword123!', $user->password));
        $this->assertNotNull($user->email_verified_at);
        $this->assertNotNull($user->mobile_verified_at);
        $this->assertNotNull($user->api_token);

        // Pending record must be deleted
        $this->assertDatabaseMissing('pending_signups', [
            'signup_token' => 'test-signup-token-success',
        ]);
    }

    /**
     * 11. Twilio Verify API: Trial Account unverified number returns controlled 422
     */
    public function test_twilio_verify_trial_account_restriction_returns_controlled_422()
    {
        Mail::fake();

        // Fake Twilio Verify API returning 400 with code 21608 (Trial account unverified number)
        Http::fake([
            'https://verify.twilio.com/v2/Services/*/Verifications' => Http::response([
                'code' => 21608,
                'message' => 'The number +918511008884 is unverified. Trial accounts cannot send messages to unverified numbers; verify +918511008884 at twilio.com/user/account/phone-numbers/verified, or purchase a Twilio number to send messages to unverified numbers.',
                'status' => 400,
            ], 400),
        ]);

        // Temporarily mock Twilio credentials in environment & config
        config([
            'services.twilio.account_sid' => 'ACtest',
            'services.twilio.auth_token' => 'AUTHTOKEN',
            'services.twilio.verify_service_sid' => 'VAtest',
            'services.twilio.verify_enabled' => true,
        ]);
        putenv('TWILIO_ACCOUNT_SID=ACtest');
        putenv('TWILIO_AUTH_TOKEN=AUTHTOKEN');
        putenv('TWILIO_VERIFY_SERVICE_SID=VAtest');
        putenv('TWILIO_VERIFY_ENABLED=true');

        $response = $this->postJson('/api/auth/signup', [
            'name' => 'Krushal Test',
            'email' => 'twilio_trial@example.com',
            'mobile' => '8511008884',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'code' => 'MOBILE_OTP_SEND_FAILED',
                'message' => 'SMS verification is temporarily unavailable for this number. Please try again later.',
            ]);

        // Cleanup env & config
        config([
            'services.twilio.account_sid' => null,
            'services.twilio.auth_token' => null,
            'services.twilio.verify_service_sid' => null,
            'services.twilio.verify_enabled' => false,
        ]);
        putenv('TWILIO_ACCOUNT_SID=');
        putenv('TWILIO_AUTH_TOKEN=');
        putenv('TWILIO_VERIFY_SERVICE_SID=');
        putenv('TWILIO_VERIFY_ENABLED=false');
    }

    /**
     * 12. Twilio Verify API: Successful Verification Check creates active user
     */
    public function test_twilio_verify_successful_check_activates_user()
    {
        Mail::fake();

        // Fake Twilio Verify check endpoint returning approved
        Http::fake([
            'https://verify.twilio.com/v2/Services/*/VerificationCheck' => Http::response([
                'sid' => 'VE1234567890',
                'service_sid' => 'VA1234567890',
                'to' => '+918511008884',
                'channel' => 'sms',
                'status' => 'approved',
                'valid' => true,
            ], 200),
        ]);

        config([
            'services.twilio.account_sid' => 'ACtest',
            'services.twilio.auth_token' => 'AUTHTOKEN',
            'services.twilio.verify_service_sid' => 'VAtest',
            'services.twilio.verify_enabled' => true,
        ]);
        putenv('TWILIO_ACCOUNT_SID=ACtest');
        putenv('TWILIO_AUTH_TOKEN=AUTHTOKEN');
        putenv('TWILIO_VERIFY_SERVICE_SID=VAtest');
        putenv('TWILIO_VERIFY_ENABLED=true');

        $pending = PendingSignup::create([
            'signup_token' => 'test-twilio-verify-token',
            'name' => 'Krushal Verify',
            'email' => 'krushal.verify@example.com',
            'mobile' => '+918511008884',
            'password_hash' => Hash::make('Password123!'),
            'email_otp_hash' => hash('sha256', '555777'),
            'mobile_otp_hash' => 'twilio_verify',
            'email_expires_at' => now()->addMinutes(5),
            'mobile_expires_at' => now()->addMinutes(5),
            'email_attempts' => 0,
            'mobile_attempts' => 0,
            'max_attempts' => 5,
            'email_last_sent_at' => now(),
            'mobile_last_sent_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/signup/verify', [
            'signup_token' => 'test-twilio-verify-token',
            'email_otp' => '555777',
            'mobile_otp' => '123456',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'email' => 'krushal.verify@example.com',
                    'mobile' => '+918511008884',
                ],
            ]);

        // Cleanup env & config
        config([
            'services.twilio.account_sid' => null,
            'services.twilio.auth_token' => null,
            'services.twilio.verify_service_sid' => null,
            'services.twilio.verify_enabled' => false,
        ]);
        putenv('TWILIO_ACCOUNT_SID=');
        putenv('TWILIO_AUTH_TOKEN=');
        putenv('TWILIO_VERIFY_SERVICE_SID=');
        putenv('TWILIO_VERIFY_ENABLED=false');
    }

    /**
     * 13. Login: Rejects incorrect password
     */
    public function test_login_rejects_incorrect_password()
    {
        User::factory()->create([
            'email' => 'user@example.com',
            'password' => Hash::make('CorrectPassword123!'),
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'login' => 'user@example.com',
            'password' => 'WrongPassword',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'error',
                'message' => 'Invalid email/mobile or password.',
            ]);
    }

    /**
     * 14. Login using EMAIL -> OTP channel MUST be EMAIL.
     * Generates challenge and sends OTP to registered email.
     */
    public function test_email_login_routes_otp_to_email_channel()
    {
        Mail::fake();

        $user = User::factory()->create([
            'name' => 'Krushal Email',
            'email' => 'krushal.email@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('MyPassword123!'),
            'status' => 'active',
            'api_token' => null,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'login' => 'krushal.email@example.com',
            'password' => 'MyPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'requires_otp' => true,
                'channel' => 'email',
                'destination_masked' => 'k***@example.com',
                'message' => "We've sent a 6-digit OTP to your registered email.",
            ])
            ->assertJsonStructure(['challenge_id', 'channel', 'destination_masked', 'expires_in_seconds', 'cooldown_seconds']);

        $challengeId = $response->json('challenge_id');

        // Check AuthOtp record
        $this->assertDatabaseHas('auth_otps', [
            'challenge_id' => $challengeId,
            'user_id' => $user->id,
            'channel' => 'email',
            'purpose' => 'login',
        ]);

        // Email OTP mail must be sent to registered email
        Mail::assertSent(OtpVerificationMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }

    /**
     * 15. Login using MOBILE -> Dispatches OTP to that account's registered EMAIL.
     */
    public function test_mobile_login_routes_otp_to_email_channel()
    {
        Mail::fake();

        $user = User::factory()->create([
            'name' => 'Krushal Mobile',
            'email' => 'krushal.mobile@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('MyPassword123!'),
            'status' => 'active',
            'api_token' => null,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'login' => '9876543210', // 10-digit mobile
            'password' => 'MyPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'requires_otp' => true,
                'channel' => 'email',
                'destination_masked' => 'k***@example.com',
                'message' => "We've sent a 6-digit OTP to your registered email.",
            ])
            ->assertJsonStructure(['challenge_id', 'channel', 'destination_masked', 'expires_in_seconds', 'cooldown_seconds']);

        $challengeId = $response->json('challenge_id');

        // Check AuthOtp record channel is 'email'
        $this->assertDatabaseHas('auth_otps', [
            'challenge_id' => $challengeId,
            'user_id' => $user->id,
            'channel' => 'email',
            'purpose' => 'login',
        ]);

        // Email OTP mail must be sent to registered email
        Mail::assertSent(OtpVerificationMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }

    /**
     * 16. Suspended user cannot login
     */
    public function test_suspended_user_cannot_login()
    {
        User::factory()->create([
            'email' => 'suspended@example.com',
            'password' => Hash::make('Password123!'),
            'status' => 'suspended',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'login' => 'suspended@example.com',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'code' => 'ACCOUNT_SUSPENDED',
            ]);
    }

    /**
     * 17. Verify Login OTP: Rejects incorrect OTP
     */
    public function test_verify_login_otp_rejects_wrong_code()
    {
        $user = User::factory()->create(['email' => 'user@example.com']);
        AuthOtp::create([
            'user_id' => $user->id,
            'challenge_id' => 'test-challenge-uuid-1',
            'identifier' => $user->email,
            'channel' => 'email',
            'purpose' => 'login',
            'otp_hash' => hash('sha256', '123456'),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/login/verify-otp', [
            'challenge_id' => 'test-challenge-uuid-1',
            'otp' => '999999', // wrong OTP
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'message' => 'Invalid OTP. Please check and try again.',
                'attempts_remaining' => 4,
            ]);

        $this->assertNull($user->fresh()->api_token);
    }

    /**
     * 18. Verify Login OTP: Rejects expired OTP
     */
    public function test_verify_login_otp_rejects_expired_code()
    {
        $user = User::factory()->create(['email' => 'user@example.com']);
        AuthOtp::create([
            'user_id' => $user->id,
            'challenge_id' => 'test-challenge-expired',
            'identifier' => $user->email,
            'channel' => 'email',
            'purpose' => 'login',
            'otp_hash' => hash('sha256', '123456'),
            'expires_at' => now()->subMinute(), // expired
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now()->subMinutes(6),
        ]);

        $response = $this->postJson('/api/auth/login/verify-otp', [
            'challenge_id' => 'test-challenge-expired',
            'otp' => '123456',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'message' => 'This OTP has expired. Please request a new OTP.',
            ]);
    }

    /**
     * 19. Verify Login OTP: Attempt limit enforced (5 attempts)
     */
    public function test_verify_login_otp_enforces_max_attempts()
    {
        $user = User::factory()->create(['email' => 'user@example.com']);
        AuthOtp::create([
            'user_id' => $user->id,
            'challenge_id' => 'test-challenge-max-att',
            'identifier' => $user->email,
            'channel' => 'email',
            'purpose' => 'login',
            'otp_hash' => hash('sha256', '123456'),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 5, // reached max
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/login/verify-otp', [
            'challenge_id' => 'test-challenge-max-att',
            'otp' => '123456',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'message' => 'Too many incorrect attempts. Please request a new OTP.',
            ]);
    }

    /**
     * 20. Verify Login OTP: Successful verification authenticates user and updates last_login_at
     */
    public function test_successful_login_otp_verification_authenticates_user()
    {
        $user = User::factory()->create([
            'name' => 'Krushal Hirpara',
            'email' => 'krushal.login@example.com',
            'mobile' => '+919876543210',
            'api_token' => null,
            'last_login_at' => null,
        ]);

        AuthOtp::create([
            'user_id' => $user->id,
            'challenge_id' => 'test-challenge-success',
            'identifier' => $user->email,
            'channel' => 'email',
            'purpose' => 'login',
            'otp_hash' => hash('sha256', '543210'),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/login/verify-otp', [
            'challenge_id' => 'test-challenge-success',
            'otp' => '543210',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Login successful.',
                'user' => [
                    'id' => $user->id,
                    'email' => 'krushal.login@example.com',
                ],
            ])
            ->assertJsonStructure(['access_token', 'token_type', 'user']);

        $user->refresh();
        $this->assertNotNull($user->api_token);
        $this->assertNotNull($user->last_login_at);

        // Challenge record should be deleted/invalidated
        $this->assertDatabaseMissing('auth_otps', [
            'challenge_id' => 'test-challenge-success',
        ]);
    }

    /**
     * 21. Resend Login OTP: Enforces 60s cooldown
     */
    public function test_resend_login_otp_enforces_cooldown()
    {
        $user = User::factory()->create(['email' => 'user@example.com']);
        AuthOtp::create([
            'user_id' => $user->id,
            'challenge_id' => 'test-challenge-cooldown',
            'identifier' => $user->email,
            'channel' => 'email',
            'purpose' => 'login',
            'otp_hash' => hash('sha256', '123456'),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now()->subSeconds(20), // only 20s passed
        ]);

        $response = $this->postJson('/api/auth/login/resend-otp', [
            'challenge_id' => 'test-challenge-cooldown',
        ]);

        $response->assertStatus(429)
            ->assertJson([
                'status' => 'error',
                'message' => 'Please wait before requesting another OTP.',
            ]);
    }

    /**
     * 22. Resend Login OTP: Dispatches new OTP via correct channel & invalidates previous OTP
     */
    public function test_resend_login_otp_generates_new_otp_and_dispatches()
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'resenduser@example.com']);
        $challenge = AuthOtp::create([
            'user_id' => $user->id,
            'challenge_id' => 'test-challenge-resend',
            'identifier' => $user->email,
            'channel' => 'email',
            'purpose' => 'login',
            'otp_hash' => hash('sha256', '111111'),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 2,
            'max_attempts' => 5,
            'last_sent_at' => now()->subSeconds(70), // cooldown expired
        ]);

        $response = $this->postJson('/api/auth/login/resend-otp', [
            'challenge_id' => 'test-challenge-resend',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'A new verification code has been sent to your registered email.',
                'cooldown_seconds' => 60,
            ]);

        Mail::assertSent(OtpVerificationMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });

        $challenge->refresh();
        $this->assertNotEquals(hash('sha256', '111111'), $challenge->otp_hash);
        $this->assertEquals(0, $challenge->attempts);
    }

    /**
     * 23. User Logout clears api_token
     */
    public function test_user_logout_invalidates_session()
    {
        $user = User::factory()->create([
            'email' => 'logout@example.com',
            'api_token' => 'active_auth_token_777',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer active_auth_token_777')
            ->postJson('/api/auth/logout');

        $response->assertStatus(200)
            ->assertJson(['status' => 'success', 'message' => 'Signed out successfully.']);

        $user->refresh();
        $this->assertNull($user->api_token);
    }

    /**
     * 24. Protected user route rejects unauthenticated request
     */
    public function test_protected_route_rejects_unauthenticated_request()
    {
        $response = $this->getJson('/api/auth/user');
        $response->assertStatus(401);
    }

    /**
     * 25. Admin endpoints reject non-admin users
     */
    public function test_admin_endpoints_reject_unauthorized_normal_users()
    {
        $normalUser = User::factory()->create([
            'email' => 'normal@example.com',
            'is_admin' => 0,
            'user_type' => 'CA',
            'api_token' => 'normal_user_token_123',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer normal_user_token_123')
            ->getJson('/api/admin/users');

        $response->assertStatus(403);
    }

    /**
     * 26. Admin endpoints allow authorized admin users
     */
    public function test_admin_endpoints_allow_authorized_admin_user()
    {
        $adminUser = User::factory()->create([
            'email' => 'krushalhirapra12@gmail.com',
            'is_admin' => 1,
            'user_type' => 'Admin',
            'api_token' => 'admin_super_token_999',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer admin_super_token_999')
            ->getJson('/api/admin/users');

        $response->assertStatus(200)
            ->assertJsonStructure(['status', 'total', 'users']);
    }

    /**
     * 27. Forgot password email OTP request and reset flow
     */
    public function test_forgot_password_email_flow()
    {
        Mail::fake();

        $user = User::factory()->create([
            'email' => 'forgotpass@example.com',
            'password' => Hash::make('OldPassword123!'),
        ]);

        // Request reset code
        $reqRes = $this->postJson('/api/auth/forgot-password/request', [
            'login' => 'forgotpass@example.com',
        ]);

        $reqRes->assertStatus(200);
        Mail::assertSent(OtpVerificationMail::class, function ($mail) {
            return $mail->hasTo('forgotpass@example.com');
        });

        // Manually set known OTP hash for verification test
        $otpRecord = OtpVerification::where('user_id', $user->id)->first();
        $this->assertNotNull($otpRecord);
        $otpRecord->update(['otp_hash' => hash('sha256', '888888')]);

        // Reset password
        $resetRes = $this->postJson('/api/auth/forgot-password/reset', [
            'login' => 'forgotpass@example.com',
            'otp' => '888888',
            'password' => 'BrandNewPassword123!',
            'password_confirmation' => 'BrandNewPassword123!',
        ]);

        $resetRes->assertStatus(200)
            ->assertJson(['status' => 'success']);

        $user->refresh();
        $this->assertTrue(Hash::check('BrandNewPassword123!', $user->password));
    }

    /**
     * 28. Comprehensive End-to-End Test:
     * Dual OTP Signup -> Verify Both -> Login via Email (Email OTP) -> Login via Mobile (SMS OTP)
     */
    public function test_complete_end_to_end_flow()
    {
        Mail::fake();

        // 1. SIGNUP STEP 1: Submit Form
        $signupRes = $this->postJson('/api/auth/signup', [
            'name' => 'Krushal Test',
            'email' => 'testuser@example.com',
            'mobile' => '9876543210',
            'password' => 'ValidPassword123!',
            'password_confirmation' => 'ValidPassword123!',
        ]);

        $signupRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'requires_verification' => true,
            ]);

        $signupToken = $signupRes->json('signup_token');
        $this->assertNotEmpty($signupToken);

        // Fetch pending signup and set known OTP hashes
        $pending = PendingSignup::where('signup_token', $signupToken)->first();
        $this->assertNotNull($pending);
        $pending->update([
            'email_otp_hash' => hash('sha256', '333444'),
            'mobile_otp_hash' => hash('sha256', '555666'),
        ]);

        // 2. SIGNUP STEP 2: Verify Dual OTPs
        $verifySignupRes = $this->postJson('/api/auth/signup/verify', [
            'signup_token' => $signupToken,
            'email_otp' => '333444',
            'mobile_otp' => '555666',
        ]);

        $verifySignupRes->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'email' => 'testuser@example.com',
                    'mobile' => '+919876543210',
                ],
            ]);

        $token1 = $verifySignupRes->json('access_token');
        $this->assertNotEmpty($token1);

        // 3. LOGOUT
        $this->withHeader('Authorization', "Bearer {$token1}")
            ->postJson('/api/auth/logout')
            ->assertStatus(200);

        // 4. LOGIN USING: EMAIL + PASSWORD -> EMAIL OTP
        $loginEmailRes = $this->postJson('/api/auth/login', [
            'login' => 'testuser@example.com',
            'password' => 'ValidPassword123!',
        ]);

        $loginEmailRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'channel' => 'email',
            ]);

        $challengeId1 = $loginEmailRes->json('challenge_id');
        $challenge1 = AuthOtp::where('challenge_id', $challengeId1)->first();
        $this->assertNotNull($challenge1);
        $this->assertEquals('email', $challenge1->channel);
        $challenge1->update(['otp_hash' => hash('sha256', '777888')]);

        // Verify Email Login OTP
        $verifyEmailRes = $this->postJson('/api/auth/login/verify-otp', [
            'challenge_id' => $challengeId1,
            'otp' => '777888',
        ]);

        $verifyEmailRes->assertStatus(200);
        $token2 = $verifyEmailRes->json('access_token');

        // 5. LOGOUT
        $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson('/api/auth/logout')
            ->assertStatus(200);

        // 6. LOGIN USING: MOBILE + PASSWORD -> EMAIL OTP (to registered user email)
        $loginMobileRes = $this->postJson('/api/auth/login', [
            'login' => '9876543210',
            'password' => 'ValidPassword123!',
        ]);

        $loginMobileRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'channel' => 'email',
            ]);

        $challengeId2 = $loginMobileRes->json('challenge_id');
        $challenge2 = AuthOtp::where('challenge_id', $challengeId2)->first();
        $this->assertNotNull($challenge2);
        $this->assertEquals('email', $challenge2->channel);
        $challenge2->update(['otp_hash' => hash('sha256', '999111')]);

        // Verify Mobile Login OTP
        $verifyMobileRes = $this->postJson('/api/auth/login/verify-otp', [
            'challenge_id' => $challengeId2,
            'otp' => '999111',
        ]);

        $verifyMobileRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'email' => 'testuser@example.com',
                ],
            ]);

        // 7. Check user's last_login_at is updated
        $user = User::where('email', 'testuser@example.com')->first();
        $this->assertNotNull($user->last_login_at);
        $this->assertNotNull($user->api_token);
    }
}
