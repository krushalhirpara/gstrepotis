<?php

namespace Tests\Feature;

use App\Models\RegistrationVerification;
use App\Models\OtpVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class FirebaseAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_request_otp_requires_all_fields()
    {
        $response = $this->postJson('/api/auth/register/request-otp', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'mobile', 'password']);
    }

    public function test_registration_rejects_invalid_name()
    {
        $response = $this->postJson('/api/auth/register/request-otp', [
            'name' => 'A', // too short
            'email' => 'test@example.com',
            'mobile' => '9876543210',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_registration_rejects_invalid_email()
    {
        $response = $this->postJson('/api/auth/register/request-otp', [
            'name' => 'Valid Name',
            'email' => 'invalid-email-format',
            'mobile' => '9876543210',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_registration_rejects_invalid_indian_mobile()
    {
        $response = $this->postJson('/api/auth/register/request-otp', [
            'name' => 'Valid Name',
            'email' => 'test@example.com',
            'mobile' => '12345', // invalid length & starting digit
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['mobile']);
    }

    public function test_registration_rejects_weak_or_mismatched_password()
    {
        $response = $this->postJson('/api/auth/register/request-otp', [
            'name' => 'Valid Name',
            'email' => 'test@example.com',
            'mobile' => '9876543210',
            'password' => 'short',
            'password_confirmation' => 'different',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_registration_rejects_duplicate_email()
    {
        User::factory()->create(['email' => 'existing@example.com']);

        $response = $this->postJson('/api/auth/register/request-otp', [
            'name' => 'Valid Name',
            'email' => 'EXISTING@example.com', // case insensitive check
            'mobile' => '9876543210',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_registration_rejects_duplicate_mobile()
    {
        User::factory()->create(['mobile' => '+919876543210']);

        $response = $this->postJson('/api/auth/register/request-otp', [
            'name' => 'Valid Name',
            'email' => 'unique@example.com',
            'mobile' => '9876543210',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['mobile']);
    }

    public function test_successful_registration_requests_otp_and_does_not_create_user_yet()
    {
        $response = $this->postJson('/api/auth/register/request-otp', [
            'name' => 'Krushal Hirpara',
            'email' => 'krushal@example.com',
            'mobile' => '9876543210',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ])
            ->assertJsonStructure(['registration_id', 'mobile_masked']);

        // User must NOT be in users table yet
        $this->assertDatabaseMissing('users', ['email' => 'krushal@example.com']);

        // Temporary registration verification record must exist
        $regId = $response->json('registration_id');
        $this->assertDatabaseHas('registration_verifications', [
            'registration_id' => $regId,
            'email' => 'krushal@example.com',
            'mobile' => '+919876543210',
        ]);
    }

    public function test_verify_otp_rejects_wrong_otp()
    {
        $reg = RegistrationVerification::create([
            'registration_id' => 'reg_test_uuid_1',
            'name' => 'Test User',
            'email' => 'test@example.com',
            'mobile' => '+919876543210',
            'password_hash' => Hash::make('Password123!'),
            'otp_hash' => hash('sha256', '654321'),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/register/verify-otp', [
            'registration_id' => 'reg_test_uuid_1',
            'otp' => '111111', // wrong OTP
        ]);

        $response->assertStatus(422)
            ->assertJson(['status' => 'error', 'message' => 'Invalid OTP. Please try again.']);

        $this->assertDatabaseMissing('users', ['email' => 'test@example.com']);
    }

    public function test_successful_otp_verification_creates_user_with_hashed_password()
    {
        $passwordHash = Hash::make('Password123!');
        $reg = RegistrationVerification::create([
            'registration_id' => 'reg_test_uuid_2',
            'name' => 'Krushal Hirpara',
            'email' => 'krushal.verified@example.com',
            'mobile' => '+919876543210',
            'password_hash' => $passwordHash,
            'otp_hash' => hash('sha256', '123456'),
            'expires_at' => now()->addMinutes(5),
            'attempts' => 0,
            'max_attempts' => 5,
            'last_sent_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/register/verify-otp', [
            'registration_id' => 'reg_test_uuid_2',
            'otp' => '123456',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'name' => 'Krushal Hirpara',
                    'email' => 'krushal.verified@example.com',
                    'mobile' => '+919876543210',
                ],
            ])
            ->assertJsonStructure(['access_token']);

        // Check user in database
        $user = User::where('email', 'krushal.verified@example.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('+919876543210', $user->mobile);
        $this->assertNotNull($user->mobile_verified_at);
        $this->assertTrue(Hash::check('Password123!', $user->password));

        // Temporary record should be deleted
        $this->assertDatabaseMissing('registration_verifications', ['registration_id' => 'reg_test_uuid_2']);
    }

    public function test_login_with_email_and_password()
    {
        $user = User::factory()->create([
            'email' => 'user@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'login' => 'USER@example.com',
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'id' => $user->id,
                    'email' => 'user@example.com',
                ],
            ])
            ->assertJsonStructure(['access_token']);
    }

    public function test_login_with_mobile_and_password()
    {
        $user = User::factory()->create([
            'email' => 'mobileuser@example.com',
            'mobile' => '+919876543210',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'login' => '9876543210', // 10 digit without +91
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'id' => $user->id,
                    'mobile' => '+919876543210',
                ],
            ]);
    }

    public function test_login_rejects_wrong_password()
    {
        User::factory()->create([
            'email' => 'user@example.com',
            'password' => Hash::make('Secret123!'),
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

    public function test_forgot_password_request_and_reset_flow()
    {
        $user = User::factory()->create([
            'email' => 'resetuser@example.com',
            'mobile' => '+919812345678',
            'password' => Hash::make('OldPassword1!'),
        ]);

        // Request reset
        $reqResponse = $this->postJson('/api/auth/forgot-password/request', [
            'login' => 'resetuser@example.com',
        ]);

        $reqResponse->assertStatus(200);

        // Verification record in otp_verifications
        $otpRecord = OtpVerification::where('user_id', $user->id)->first();
        $this->assertNotNull($otpRecord);

        // We simulate entering the generated OTP
        $otp = '654321';
        $otpRecord->update(['otp_hash' => hash('sha256', $otp)]);

        // Reset password
        $resetResponse = $this->postJson('/api/auth/forgot-password/reset', [
            'login' => 'resetuser@example.com',
            'otp' => '654321',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $resetResponse->assertStatus(200)
            ->assertJson(['status' => 'success']);

        // Verify user can now login with new password
        $user->refresh();
        $this->assertTrue(Hash::check('NewPassword123!', $user->password));
    }

    public function test_logout_invalidates_api_token()
    {
        $user = User::factory()->create([
            'email' => 'logoutuser@example.com',
            'api_token' => 'logout_test_token_456',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer logout_test_token_456')
            ->postJson('/api/auth/logout');

        $response->assertStatus(200)
            ->assertJson(['status' => 'success']);

        $this->assertDatabaseMissing('users', [
            'id' => $user->id,
            'api_token' => 'logout_test_token_456',
        ]);
    }
}
