<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\FirebaseTokenVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class FirebaseAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_firebase_auth_endpoint_validates_token()
    {
        $response = $this->postJson('/api/auth/google', []);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['id_token']);
    }

    public function test_google_firebase_auth_requires_profile_completion_for_new_user()
    {
        $mockVerifier = Mockery::mock(FirebaseTokenVerifier::class);
        $mockVerifier->shouldReceive('verifyIdToken')
            ->with('valid-google-id-token')
            ->andReturn([
                'uid' => 'google_uid_new_123',
                'email' => 'newgoogleuser@example.com',
                'name' => 'New Google User',
                'picture' => 'https://example.com/avatar.jpg',
            ]);

        $this->app->instance(FirebaseTokenVerifier::class, $mockVerifier);

        $response = $this->postJson('/api/auth/google', [
            'id_token' => 'valid-google-id-token',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'profile_incomplete',
                'requires_profile_completion' => true,
                'google_user' => [
                    'uid' => 'google_uid_new_123',
                    'email' => 'newgoogleuser@example.com',
                    'name' => 'New Google User',
                ],
            ]);
    }

    public function test_google_firebase_auth_logs_in_existing_verified_user()
    {
        User::create([
            'name' => 'Existing Verified Google User',
            'email' => 'existinggoogle@example.com',
            'mobile' => '+919876543210',
            'mobile_verified_at' => now(),
            'firebase_uid' => 'google_uid_existing_456',
            'google_id' => 'google_uid_existing_456',
            'auth_provider' => 'google',
            'status' => 'active',
            'account_status' => 'active',
            'credits' => 50,
        ]);

        $mockVerifier = Mockery::mock(FirebaseTokenVerifier::class);
        $mockVerifier->shouldReceive('verifyIdToken')
            ->with('valid-existing-google-token')
            ->andReturn([
                'uid' => 'google_uid_existing_456',
                'email' => 'existinggoogle@example.com',
                'name' => 'Existing Verified Google User',
                'picture' => 'https://example.com/avatar.jpg',
            ]);

        $this->app->instance(FirebaseTokenVerifier::class, $mockVerifier);

        $response = $this->postJson('/api/auth/google', [
            'id_token' => 'valid-existing-google-token',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'email' => 'existinggoogle@example.com',
                    'mobile' => '+919876543210',
                ],
            ])
            ->assertJsonStructure(['access_token', 'user']);
    }

    public function test_google_complete_signup_with_phone_verification()
    {
        $mockVerifier = Mockery::mock(FirebaseTokenVerifier::class);
        $mockVerifier->shouldReceive('verifyIdToken')
            ->with('valid-phone-token-123')
            ->andReturn([
                'uid' => 'phone_uid_789',
                'phone_number' => '+919876543210',
                'sign_in_provider' => 'phone',
            ]);

        $this->app->instance(FirebaseTokenVerifier::class, $mockVerifier);

        $response = $this->postJson('/api/auth/google/complete-signup', [
            'phone_id_token' => 'valid-phone-token-123',
            'google_uid' => 'google_uid_new_123',
            'name' => 'Completed User',
            'email' => 'completed@example.com',
            'mobile' => '9876543210',
            'avatar' => 'https://example.com/avatar.png',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'name' => 'Completed User',
                    'email' => 'completed@example.com',
                    'mobile' => '+919876543210',
                    'auth_provider' => 'google',
                ],
            ])
            ->assertJsonStructure(['access_token', 'user']);

        $this->assertDatabaseHas('users', [
            'email' => 'completed@example.com',
            'mobile' => '+919876543210',
            'firebase_uid' => 'google_uid_new_123',
            'auth_provider' => 'google',
        ]);
    }
}
