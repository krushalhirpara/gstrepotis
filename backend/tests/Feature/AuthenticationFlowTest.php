<?php

namespace Tests\Feature;

use App\Models\LoginOtpVerification;
use App\Models\OtpVerification;
use App\Models\User;
use App\Mail\OtpVerificationMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthenticationFlowTest extends TestCase
{
    use RefreshDatabase;

    /**
     * 1. Direct Signup (Option 1) creates user in MySQL immediately with secure password hash
     */
    public function test_signup_creates_user_directly_without_otp()
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Krushal Hirpara',
            'email' => 'krushal@example.com',
            'mobile' => '9876543210',
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'message' => 'Account created successfully.',
                'user' => [
                    'name' => 'Krushal Hirpara',
                    'email' => 'krushal@example.com',
                    'mobile' => '+919876543210',
                    'status' => 'active',
                ],
            ])
            ->assertJsonStructure(['access_token', 'token_type', 'user']);

        // Assert user exists in database
        $this->assertDatabaseHas('users', [
            'email' => 'krushal@example.com',
            'mobile' => '+919876543210',
            'status' => 'active',
        ]);

        $user = User::where('email', 'krushal@example.com')->first();
        $this->assertNotNull($user);
        $this->assertTrue(Hash::check('SecurePassword123!', $user->password));
        $this->assertNotNull($user->api_token);
        $this->assertNotNull($user->last_login_at);

        // No email sent during signup
        Mail::assertNothingSent();
    }

    /**
     * 2. Signup validates required fields, email format, and password length
     */
    public function test_signup_validates_input_fields()
    {
        $response = $this->postJson('/api/auth/register', [
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
     * 3. Signup rejects duplicate email
     */
    public function test_signup_rejects_duplicate_email()
    {
        User::factory()->create([
            'email' => 'existing@example.com',
            'mobile' => '+919876543210',
        ]);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Another User',
            'email' => 'EXISTING@example.com', // case-insensitive check
            'mobile' => '9876543211',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /**
     * 4. Signup rejects duplicate mobile
     */
    public function test_signup_rejects_duplicate_mobile()
    {
        User::factory()->create([
            'email' => 'first@example.com',
            'mobile' => '+919876543210',
        ]);

        $response = $this->postJson('/api/auth/register', [
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
     * 5. Login Step 1: Reject wrong password
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
     * 6. Login Step 1 with Email: Sends OTP to registered email & returns challenge_id without authenticating yet
     */
    public function test_login_with_email_triggers_otp_challenge_and_does_not_issue_token_yet()
    {
        Mail::fake();

        $user = User::factory()->create([
            'name' => 'Krushal Hirpara',
            'email' => 'krushal@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('MyPassword123!'),
            'status' => 'active',
            'api_token' => null,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'login' => 'krushal@example.com',
            'password' => 'MyPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'requires_otp' => true,
                'email_masked' => 'k***@example.com',
                'cooldown_seconds' => 30,
            ])
            ->assertJsonStructure(['challenge_id', 'email_masked', 'expires_in_seconds', 'cooldown_seconds']);

        // User must NOT have an access token yet
        $this->assertNull($user->fresh()->api_token);

        // Challenge must be stored in login_otp_verifications
        $challengeId = $response->json('challenge_id');
        $this->assertDatabaseHas('login_otp_verifications', [
            'challenge_id' => $challengeId,
            'user_id' => $user->id,
            'verified_at' => null,
        ]);

        // Email OTP mail must be sent to registered email
        Mail::assertSent(OtpVerificationMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }

    /**
     * 7. Login Step 1 with Mobile: Finds user by mobile & sends OTP to user's registered EMAIL
     */
    public function test_login_with_mobile_sends_otp_to_registered_email()
    {
        Mail::fake();

        $user = User::factory()->create([
            'name' => 'Krushal Hirpara',
            'email' => 'krushal@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('MyPassword123!'),
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'login' => '9876543210', // user enters mobile number
            'password' => 'MyPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'requires_otp' => true,
                'email_masked' => 'k***@example.com',
            ]);

        // OTP must be sent to krushal@example.com
        Mail::assertSent(OtpVerificationMail::class, function ($mail) {
            return $mail->hasTo('krushal@example.com');
        });
    }

    /**
     * 8. Suspended user cannot login
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
     * 9. Verify Login OTP: Rejects incorrect OTP
     */
    public function test_verify_login_otp_rejects_wrong_code()
    {
        $user = User::factory()->create(['email' => 'user@example.com']);
        $challenge = LoginOtpVerification::create([
            'user_id' => $user->id,
            'challenge_id' => 'test-challenge-uuid-1',
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
                'message' => 'Invalid verification code.',
                'attempts_remaining' => 4,
            ]);

        $this->assertNull($user->fresh()->api_token);
    }

    /**
     * 10. Verify Login OTP: Rejects expired OTP
     */
    public function test_verify_login_otp_rejects_expired_code()
    {
        $user = User::factory()->create(['email' => 'user@example.com']);
        LoginOtpVerification::create([
            'user_id' => $user->id,
            'challenge_id' => 'test-challenge-expired',
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
                'message' => 'This verification code has expired. Please request a new code.',
            ]);
    }

    /**
     * 11. Verify Login OTP: Attempt limit enforced (5 attempts)
     */
    public function test_verify_login_otp_enforces_max_attempts()
    {
        $user = User::factory()->create(['email' => 'user@example.com']);
        LoginOtpVerification::create([
            'user_id' => $user->id,
            'challenge_id' => 'test-challenge-max-att',
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
                'message' => 'Too many attempts. Please request a new verification code.',
            ]);
    }

    /**
     * 12. Verify Login OTP: Successful verification authenticates user and updates last_login_at
     */
    public function test_successful_otp_verification_authenticates_user()
    {
        $user = User::factory()->create([
            'name' => 'Krushal Hirpara',
            'email' => 'krushal.success@example.com',
            'mobile' => '+919876543210',
            'api_token' => null,
            'last_login_at' => null,
        ]);

        LoginOtpVerification::create([
            'user_id' => $user->id,
            'challenge_id' => 'test-challenge-success',
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
                    'email' => 'krushal.success@example.com',
                ],
            ])
            ->assertJsonStructure(['access_token', 'token_type', 'user']);

        $user->refresh();
        $this->assertNotNull($user->api_token);
        $this->assertNotNull($user->last_login_at);

        // Challenge record should be deleted/invalidated
        $this->assertDatabaseMissing('login_otp_verifications', [
            'challenge_id' => 'test-challenge-success',
        ]);
    }

    /**
     * 13. Resend Login OTP: Enforces 30s cooldown
     */
    public function test_resend_login_otp_enforces_cooldown()
    {
        $user = User::factory()->create(['email' => 'user@example.com']);
        LoginOtpVerification::create([
            'user_id' => $user->id,
            'challenge_id' => 'test-challenge-cooldown',
            'otp_hash' => hash('sha256', '123456'),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now()->subSeconds(10), // only 10s passed
        ]);

        $response = $this->postJson('/api/auth/login/resend-otp', [
            'challenge_id' => 'test-challenge-cooldown',
        ]);

        $response->assertStatus(429)
            ->assertJson([
                'status' => 'error',
                'message' => 'Please wait before requesting another code.',
            ]);
    }

    /**
     * 14. Resend Login OTP: Dispatches new OTP & invalidates previous OTP
     */
    public function test_resend_login_otp_generates_new_otp_and_sends_email()
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'resenduser@example.com']);
        $challenge = LoginOtpVerification::create([
            'user_id' => $user->id,
            'challenge_id' => 'test-challenge-resend',
            'otp_hash' => hash('sha256', '111111'),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 2,
            'max_attempts' => 5,
            'last_sent_at' => now()->subSeconds(40), // cooldown expired
        ]);

        $response = $this->postJson('/api/auth/login/resend-otp', [
            'challenge_id' => 'test-challenge-resend',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'New verification code has been sent to your registered email.',
                'cooldown_seconds' => 30,
            ]);

        Mail::assertSent(OtpVerificationMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });

        $challenge->refresh();
        $this->assertNotEquals(hash('sha256', '111111'), $challenge->otp_hash);
        $this->assertEquals(0, $challenge->attempts);
    }

    /**
     * 15. User Logout clears api_token
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
     * 16. Protected user route rejects unauthenticated request
     */
    public function test_protected_route_rejects_unauthenticated_request()
    {
        $response = $this->getJson('/api/auth/user');
        $response->assertStatus(401);
    }

    /**
     * 17. Admin endpoints reject non-admin users
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
     * 18. Admin endpoints allow authorized admin users
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
     * 19. Forgot password email OTP request and reset flow
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
     * 20. Comprehensive End-to-End Test (Requirement 27)
     * Signup -> Logout -> Email Login + OTP -> Logout -> Mobile Login + Email OTP -> Verify last_login_at
     */
    public function test_complete_end_to_end_flow()
    {
        Mail::fake();

        // 1. SIGNUP (Option 1: Name + Mobile + Email + Password)
        $signupRes = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'testuser@example.com',
            'mobile' => '9876543210',
            'password' => 'ValidPassword123!',
            'password_confirmation' => 'ValidPassword123!',
        ]);

        $signupRes->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'name' => 'Test User',
                    'email' => 'testuser@example.com',
                    'mobile' => '+919876543210',
                ],
            ]);

        $token1 = $signupRes->json('access_token');
        $this->assertNotEmpty($token1);

        // 2. LOGOUT
        $logout1 = $this->withHeader('Authorization', "Bearer {$token1}")
            ->postJson('/api/auth/logout');
        $logout1->assertStatus(200);

        // 3. LOGIN USING: EMAIL + PASSWORD
        $loginEmailRes = $this->postJson('/api/auth/login', [
            'login' => 'testuser@example.com',
            'password' => 'ValidPassword123!',
        ]);

        $loginEmailRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'requires_otp' => true,
                'email_masked' => 't***@example.com',
            ]);

        $challengeId1 = $loginEmailRes->json('challenge_id');
        $this->assertNotEmpty($challengeId1);

        // Verify Email OTP was dispatched
        Mail::assertSent(OtpVerificationMail::class, function ($mail) {
            return $mail->hasTo('testuser@example.com');
        });

        // Fetch challenge and set a deterministic OTP for test verification
        $challenge1 = LoginOtpVerification::where('challenge_id', $challengeId1)->first();
        $this->assertNotNull($challenge1);
        $challenge1->update(['otp_hash' => hash('sha256', '777888')]);

        // VERIFY EMAIL OTP
        $verifyEmailRes = $this->postJson('/api/auth/login/verify-otp', [
            'challenge_id' => $challengeId1,
            'otp' => '777888',
        ]);

        $verifyEmailRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Login successful.',
                'user' => [
                    'email' => 'testuser@example.com',
                ],
            ]);

        $token2 = $verifyEmailRes->json('access_token');
        $this->assertNotEmpty($token2);

        // 4. LOGOUT
        $logout2 = $this->withHeader('Authorization', "Bearer {$token2}")
            ->postJson('/api/auth/logout');
        $logout2->assertStatus(200);

        // 5. LOGIN USING: MOBILE + PASSWORD
        $loginMobileRes = $this->postJson('/api/auth/login', [
            'login' => '9876543210',
            'password' => 'ValidPassword123!',
        ]);

        $loginMobileRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'requires_otp' => true,
                'email_masked' => 't***@example.com',
            ]);

        $challengeId2 = $loginMobileRes->json('challenge_id');
        $this->assertNotEmpty($challengeId2);

        // Verify OTP was sent to user's registered EMAIL (NOT mobile)
        Mail::assertSent(OtpVerificationMail::class, function ($mail) {
            return $mail->hasTo('testuser@example.com');
        });

        $challenge2 = LoginOtpVerification::where('challenge_id', $challengeId2)->first();
        $this->assertNotNull($challenge2);
        $challenge2->update(['otp_hash' => hash('sha256', '999111')]);

        // VERIFY MOBILE LOGIN OTP
        $verifyMobileRes = $this->postJson('/api/auth/login/verify-otp', [
            'challenge_id' => $challengeId2,
            'otp' => '999111',
        ]);

        $verifyMobileRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Login successful.',
                'user' => [
                    'name' => 'Test User',
                    'email' => 'testuser@example.com',
                    'mobile' => '+919876543210',
                ],
            ]);

        // 6. VERIFY last_login_at is updated
        $user = User::where('email', 'testuser@example.com')->first();
        $this->assertNotNull($user->last_login_at);
        $this->assertNotNull($user->api_token);
    }
}
