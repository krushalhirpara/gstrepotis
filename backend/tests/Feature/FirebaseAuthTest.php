<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FirebaseAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_auth_requires_id_token()
    {
        $response = $this->postJson('/api/auth/google', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['id_token']);
    }

    public function test_google_auth_rejects_invalid_token()
    {
        $response = $this->postJson('/api/auth/google', [
            'id_token' => 'invalid.dummy.token',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'error',
                'code' => 'INVALID_TOKEN',
            ]);
    }

    public function test_unauthenticated_user_profile_returns_401()
    {
        $response = $this->getJson('/api/auth/user');

        $response->assertStatus(401);
    }

    public function test_authenticated_user_profile_returns_user()
    {
        $user = User::factory()->create([
            'email' => 'testuser@example.com',
            'firebase_uid' => 'google_test_123',
            'google_id' => 'google_test_123',
            'mobile' => '+919876543210',
            'api_token' => 'valid_test_token_123',
            'provider' => 'google',
            'status' => 'active',
            'account_status' => 'active',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer valid_test_token_123')
            ->getJson('/api/auth/user');

        $response->assertStatus(200)
            ->assertJson([
                'user' => [
                    'id' => $user->id,
                    'email' => 'testuser@example.com',
                    'mobile' => '+919876543210',
                ],
            ]);
    }

    public function test_new_user_registration_with_name_and_normalized_mobile()
    {
        $mockVerifier = $this->createMock(\App\Services\FirebaseTokenVerifier::class);
        $mockVerifier->method('verifyIdToken')->willReturn([
            'uid' => 'firebase_new_signup_101',
            'email' => 'newca@example.com',
            'email_verified' => true,
            'name' => 'Default Token Name',
            'picture' => 'https://example.com/photo.jpg',
        ]);
        $this->app->instance(\App\Services\FirebaseTokenVerifier::class, $mockVerifier);

        $response = $this->postJson('/api/auth/google', [
            'id_token' => 'mock_token_valid',
            'name' => 'Krushal Hirpara',
            'mobile' => '9876543210', // 10 digit without prefix
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'requires_profile_completion' => false,
                'user' => [
                    'name' => 'Krushal Hirpara',
                    'email' => 'newca@example.com',
                    'mobile' => '+919876543210', // Canonical normalized format
                    'firebase_uid' => 'firebase_new_signup_101',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'newca@example.com',
            'firebase_uid' => 'firebase_new_signup_101',
            'name' => 'Krushal Hirpara',
            'mobile' => '+919876543210',
        ]);
    }

    public function test_invalid_indian_mobile_is_rejected()
    {
        $response = $this->postJson('/api/auth/google', [
            'id_token' => 'mock_token',
            'name' => 'Krushal Hirpara',
            'mobile' => '12345', // invalid length / start
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['mobile']);
    }

    public function test_existing_email_is_safely_linked_without_duplicate()
    {
        // Existing user created prior to Google auth
        $existing = User::factory()->create([
            'email' => 'krushal@example.com',
            'firebase_uid' => null,
            'google_id' => null,
            'provider' => 'email',
            'account_status' => 'active',
        ]);

        $mockVerifier = $this->createMock(\App\Services\FirebaseTokenVerifier::class);
        $mockVerifier->method('verifyIdToken')->willReturn([
            'uid' => 'firebase_uid_krushal_999',
            'email' => 'krushal@example.com',
            'email_verified' => true,
            'name' => 'Krushal Hirpara',
            'picture' => 'https://example.com/avatar.jpg',
        ]);
        $this->app->instance(\App\Services\FirebaseTokenVerifier::class, $mockVerifier);

        $response = $this->postJson('/api/auth/google', ['id_token' => 'mock_token']);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'id' => $existing->id,
                    'email' => 'krushal@example.com',
                ],
            ]);

        // Verify only 1 user exists with this email and firebase_uid is updated
        $this->assertEquals(1, User::where('email', 'krushal@example.com')->count());
        $this->assertDatabaseHas('users', [
            'id' => $existing->id,
            'firebase_uid' => 'firebase_uid_krushal_999',
            'avatar' => 'https://example.com/avatar.jpg',
            'provider' => 'google',
        ]);
    }

    public function test_same_google_account_multiple_logins_never_duplicates_user()
    {
        $mockVerifier = $this->createMock(\App\Services\FirebaseTokenVerifier::class);
        $mockVerifier->method('verifyIdToken')->willReturn([
            'uid' => 'firebase_uid_unique_888',
            'email' => 'newuser@example.com',
            'email_verified' => true,
            'name' => 'New User',
            'picture' => null,
        ]);
        $this->app->instance(\App\Services\FirebaseTokenVerifier::class, $mockVerifier);

        // First login -> creates account
        $res1 = $this->postJson('/api/auth/google', [
            'id_token' => 'mock_token',
            'name' => 'Krushal H',
            'mobile' => '+919812345678',
        ]);
        $res1->assertStatus(200);

        // Second login -> finds existing account and updates last_login_at
        $res2 = $this->postJson('/api/auth/google', ['id_token' => 'mock_token']);
        $res2->assertStatus(200);

        // Third login -> finds existing account
        $res3 = $this->postJson('/api/auth/google', ['id_token' => 'mock_token']);
        $res3->assertStatus(200);

        $this->assertEquals(1, User::where('firebase_uid', 'firebase_uid_unique_888')->count());
        $this->assertEquals(1, User::where('email', 'newuser@example.com')->count());
    }

    public function test_profile_completion_endpoint_saves_missing_mobile()
    {
        $user = User::factory()->create([
            'email' => 'incomplete@example.com',
            'firebase_uid' => 'incomplete_uid_1',
            'mobile' => null,
            'api_token' => 'test_incomplete_token_99',
            'status' => 'active',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer test_incomplete_token_99')
            ->postJson('/api/user/complete-profile', [
                'name' => 'Completed User',
                'mobile' => '9988776655',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'requires_profile_completion' => false,
                'user' => [
                    'name' => 'Completed User',
                    'mobile' => '+919988776655',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Completed User',
            'mobile' => '+919988776655',
        ]);
    }

    public function test_admin_users_and_details_endpoints()
    {
        $admin = User::factory()->create([
            'email' => 'admin@example.com',
            'is_admin' => 1,
            'user_type' => 'Admin',
            'api_token' => 'admin_token_xyz',
            'status' => 'active',
        ]);

        $clientUser = User::factory()->create([
            'name' => 'Rahul Patel',
            'email' => 'rahul@example.com',
            'mobile' => '+919876543210',
            'firebase_uid' => 'rahul_fb_123',
            'is_admin' => 0,
            'status' => 'active',
        ]);

        // Get users list
        $listRes = $this->withHeader('Authorization', 'Bearer admin_token_xyz')
            ->getJson('/api/admin/users');

        $listRes->assertStatus(200)
            ->assertJsonStructure(['users', 'total']);

        // Get user details
        $detailRes = $this->withHeader('Authorization', 'Bearer admin_token_xyz')
            ->getJson("/api/admin/users/{$clientUser->id}");

        $detailRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'id' => $clientUser->id,
                    'name' => 'Rahul Patel',
                    'email' => 'rahul@example.com',
                    'mobile' => '+919876543210',
                    'firebase_uid' => 'rahul_fb_123',
                ],
            ]);
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
