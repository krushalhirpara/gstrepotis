<?php

namespace Tests\Feature;

use App\Models\AuthOtp;
use App\Models\User;
use App\Mail\OtpVerificationMail;
use App\Services\FirebaseTokenVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Mockery;
use Tests\TestCase;

class AuthenticationFlowTest extends TestCase
{
    use RefreshDatabase;

    /**
     * 1. Signup Pre-Validation: Validates required fields, email format, and password confirmation
     */
    public function test_signup_validation_endpoint_validates_input_fields()
    {
        $response = $this->postJson('/api/auth/signup/validate', [
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
     * 2. Signup Pre-Validation: Rejects duplicate email (case-insensitive)
     */
    public function test_signup_validation_rejects_duplicate_email()
    {
        User::factory()->create([
            'email' => 'existing@example.com',
            'mobile' => '+919876543210',
        ]);

        $response = $this->postJson('/api/auth/signup/validate', [
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
     * 3. Signup Pre-Validation: Rejects duplicate mobile
     */
    public function test_signup_validation_rejects_duplicate_mobile()
    {
        User::factory()->create([
            'email' => 'first@example.com',
            'mobile' => '+919876543210',
        ]);

        $response = $this->postJson('/api/auth/signup/validate', [
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
     * 4. Signup Step 2: Rejects signup when Firebase phone number does not match submitted mobile number
     */
    public function test_signup_rejects_mismatched_phone_number_in_firebase_token()
    {
        $mockVerifier = Mockery::mock(FirebaseTokenVerifier::class);
        $mockVerifier->shouldReceive('verifyIdToken')
            ->with('phone-token-mismatch')
            ->andReturn([
                'uid' => 'phone_uid_different',
                'phone_number' => '+919999999999', // different from submitted
                'sign_in_provider' => 'phone',
            ]);

        $this->app->instance(FirebaseTokenVerifier::class, $mockVerifier);

        $response = $this->postJson('/api/auth/signup', [
            'name' => 'Krushal Hirpara',
            'email' => 'krushal@example.com',
            'mobile' => '9876543210', // +919876543210
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!',
            'id_token' => 'phone-token-mismatch',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['mobile'])
            ->assertJson([
                'code' => 'PHONE_MISMATCH',
            ]);
    }

    /**
     * 5. Signup Step 2: Creates active user account upon valid Firebase Phone verification
     */
    public function test_signup_creates_active_user_with_verified_firebase_phone_token()
    {
        $mockVerifier = Mockery::mock(FirebaseTokenVerifier::class);
        $mockVerifier->shouldReceive('verifyIdToken')
            ->with('valid-phone-token-9876543210')
            ->andReturn([
                'uid' => 'firebase_phone_uid_123',
                'phone_number' => '+919876543210',
                'sign_in_provider' => 'phone',
            ]);

        $this->app->instance(FirebaseTokenVerifier::class, $mockVerifier);

        $response = $this->postJson('/api/auth/signup', [
            'name' => 'Krushal Hirpara',
            'email' => 'krushal@example.com',
            'mobile' => '9876543210',
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!',
            'id_token' => 'valid-phone-token-9876543210',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'name' => 'Krushal Hirpara',
                    'email' => 'krushal@example.com',
                    'mobile' => '+919876543210',
                    'status' => 'active',
                    'account_status' => 'active',
                    'auth_provider' => 'phone',
                ],
            ])
            ->assertJsonStructure(['access_token', 'user']);

        $this->assertDatabaseHas('users', [
            'email' => 'krushal@example.com',
            'mobile' => '+919876543210',
            'firebase_uid' => 'firebase_phone_uid_123',
            'status' => 'active',
            'account_status' => 'active',
        ]);
    }

    /**
     * 6. Login: Rejects incorrect password
     */
    public function test_login_rejects_incorrect_password()
    {
        User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('CorrectPassword123!'),
            'status' => 'active',
            'account_status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'login' => 'test@example.com',
            'password' => 'WrongPassword!',
        ]);

        $response->assertStatus(401);
    }

    /**
     * 7. Login with Email: Dispatches 6-digit Email OTP exclusively via SMTP to registered email
     */
    public function test_login_with_email_sends_otp_to_registered_email()
    {
        Mail::fake();

        $user = User::create([
            'name' => 'Email Login User',
            'email' => 'emailuser@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('MyPassword123!'),
            'status' => 'active',
            'account_status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'login' => 'emailuser@example.com',
            'password' => 'MyPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'requires_otp' => true,
                'channel' => 'email',
                'destination_masked' => 'e***@example.com',
            ])
            ->assertJsonStructure(['challenge_id', 'destination_masked']);

        Mail::assertSent(OtpVerificationMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });

        // Challenge must exist in auth_otps
        $challengeId = $response->json('challenge_id');
        $this->assertDatabaseHas('auth_otps', [
            'challenge_id' => $challengeId,
            'user_id' => $user->id,
            'channel' => 'email',
            'purpose' => 'login',
        ]);
    }

    /**
     * 8. Login with Mobile: Returns mobile channel challenge for Firebase Phone Auth
     */
    public function test_login_with_mobile_triggers_mobile_otp_challenge()
    {
        $user = User::create([
            'name' => 'Mobile Login User',
            'email' => 'mobileuser@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('MyPassword123!'),
            'status' => 'active',
            'account_status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'login' => '9876543210',
            'password' => 'MyPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'requires_otp' => true,
                'channel' => 'mobile',
                'mobile' => '+919876543210',
                'destination_masked' => '+91 ******3210',
            ])
            ->assertJsonStructure(['challenge_id', 'mobile']);
    }

    /**
     * 9. Verify Email Login OTP: Correct 6-digit OTP authenticates user
     */
    public function test_successful_email_login_otp_authenticates_user()
    {
        $user = User::create([
            'name' => 'Email Login User',
            'email' => 'emailuser2@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('MyPassword123!'),
            'status' => 'active',
            'account_status' => 'active',
        ]);

        $otp = '654321';
        $challengeId = 'test-challenge-uuid-123';

        AuthOtp::create([
            'user_id' => $user->id,
            'challenge_id' => $challengeId,
            'identifier' => $user->email,
            'channel' => 'email',
            'purpose' => 'login',
            'otp_hash' => hash('sha256', $otp),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/login/verify-otp', [
            'challenge_id' => $challengeId,
            'otp' => '654321',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'id' => $user->id,
                    'email' => 'emailuser2@example.com',
                ],
            ])
            ->assertJsonStructure(['access_token', 'user']);

        // Challenge should be consumed
        $this->assertDatabaseMissing('auth_otps', [
            'challenge_id' => $challengeId,
        ]);
    }

    /**
     * 10. Verify Mobile Login Firebase Token: Authenticates user server-side
     */
    public function test_successful_mobile_login_firebase_token_authenticates_user()
    {
        $user = User::create([
            'name' => 'Mobile Login User',
            'email' => 'mobileuser2@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('MyPassword123!'),
            'status' => 'active',
            'account_status' => 'active',
        ]);

        $mockVerifier = Mockery::mock(FirebaseTokenVerifier::class);
        $mockVerifier->shouldReceive('verifyIdToken')
            ->with('valid-mobile-login-token')
            ->andReturn([
                'uid' => 'firebase_phone_uid_mobile_login',
                'phone_number' => '+919876543210',
                'sign_in_provider' => 'phone',
            ]);

        $this->app->instance(FirebaseTokenVerifier::class, $mockVerifier);

        $response = $this->postJson('/api/auth/login/verify-mobile', [
            'id_token' => 'valid-mobile-login-token',
            'mobile' => '+919876543210',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'id' => $user->id,
                    'email' => 'mobileuser2@example.com',
                    'mobile' => '+919876543210',
                ],
            ])
            ->assertJsonStructure(['access_token', 'user']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'firebase_uid' => 'firebase_phone_uid_mobile_login',
        ]);
    }

    /**
     * 11. Suspended user cannot login
     */
    public function test_suspended_user_cannot_login()
    {
        User::create([
            'name' => 'Suspended User',
            'email' => 'suspended@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('Password123!'),
            'status' => 'suspended',
            'account_status' => 'suspended',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'login' => 'suspended@example.com',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(403)
            ->assertJson(['code' => 'ACCOUNT_SUSPENDED']);
    }

    /**
     * 12. User logout invalidates session
     */
    public function test_user_logout_invalidates_session()
    {
        $user = User::create([
            'name' => 'Logout User',
            'email' => 'logout@example.com',
            'password' => Hash::make('Password123!'),
            'api_token' => 'test-bearer-token-12345',
            'status' => 'active',
            'account_status' => 'active',
        ]);

        $response = $this->withToken('test-bearer-token-12345')
            ->postJson('/api/auth/logout');

        $response->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'api_token' => null,
        ]);
    }

    /**
     * 13. Admin endpoints allow CEO admin and reject normal users
     */
    public function test_admin_access_control()
    {
        // Normal user rejected
        $normalUser = User::create([
            'name' => 'Normal User',
            'email' => 'normal@example.com',
            'password' => Hash::make('Password123!'),
            'api_token' => 'normal-token',
            'is_admin' => 0,
            'status' => 'active',
        ]);

        $response = $this->withToken('normal-token')
            ->getJson('/api/admin/metrics');
        $response->assertStatus(403);

        // Admin login succeeds
        $adminLogin = $this->postJson('/api/admin/login', [
            'email' => 'krushalhirapra12@gmail.com',
            'password' => 'Krushal@2807',
        ]);

        $adminLogin->assertStatus(200)
            ->assertJsonStructure(['token', 'user']);

        $adminToken = $adminLogin->json('token');

        // Admin access granted
        $metrics = $this->withToken($adminToken)
            ->getJson('/api/admin/metrics');
        $metrics->assertStatus(200);

        // User listing returns expected fields including Auth Provider and Account Status
        $usersList = $this->withToken($adminToken)
            ->getJson('/api/admin/users');
        $usersList->assertStatus(200)
            ->assertJsonStructure([
                'users' => [
                    '*' => [
                        'id',
                        'name',
                        'email',
                        'mobile',
                        'auth_provider',
                        'account_status',
                        'created_at',
                    ],
                ],
            ]);
    }

    /**
     * 14. Forgot password email reset flow
     */
    public function test_forgot_password_email_flow()
    {
        Mail::fake();

        $user = User::create([
            'name' => 'Forgot User',
            'email' => 'forgot@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('OldPassword123!'),
            'status' => 'active',
            'account_status' => 'active',
        ]);

        // 1. Request reset
        $req = $this->postJson('/api/auth/forgot-password', [
            'login' => 'forgot@example.com',
        ]);
        $req->assertStatus(200);

        Mail::assertSent(OtpVerificationMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });

        $challenge = AuthOtp::where('user_id', $user->id)
            ->where('purpose', 'password_reset')
            ->first();
        $this->assertNotNull($challenge);

        // Manually set known OTP
        $challenge->update(['otp_hash' => hash('sha256', '888999')]);
        \App\Models\OtpVerification::where('user_id', $user->id)->update(['otp_hash' => hash('sha256', '888999')]);

        // 2. Reset with OTP
        $reset = $this->postJson('/api/auth/reset-password', [
            'login' => 'forgot@example.com',
            'otp' => '888999',
            'password' => 'BrandNewPassword123!',
            'password_confirmation' => 'BrandNewPassword123!',
        ]);

        $reset->assertStatus(200);

        $user->refresh();
        $this->assertTrue(Hash::check('BrandNewPassword123!', $user->password));
    }
}
