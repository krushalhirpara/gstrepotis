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
            'google_id' => 'google_test_123',
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

    public function test_existing_email_is_safely_linked_without_duplicate()
    {
        // Existing user created prior to Google auth
        $existing = User::factory()->create([
            'email' => 'krushal@example.com',
            'google_id' => null,
            'provider' => 'email',
            'account_status' => 'active',
        ]);

        // Mock token verifier returning verified google identity matching email
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

        // Verify only 1 user exists with this email and google_id is updated
        $this->assertEquals(1, User::where('email', 'krushal@example.com')->count());
        $this->assertDatabaseHas('users', [
            'id' => $existing->id,
            'google_id' => 'firebase_uid_krushal_999',
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
        $res1 = $this->postJson('/api/auth/google', ['id_token' => 'mock_token']);
        $res1->assertStatus(200);

        // Second login -> finds existing account
        $res2 = $this->postJson('/api/auth/google', ['id_token' => 'mock_token']);
        $res2->assertStatus(200);

        // Third login -> finds existing account
        $res3 = $this->postJson('/api/auth/google', ['id_token' => 'mock_token']);
        $res3->assertStatus(200);

        $this->assertEquals(1, User::where('google_id', 'firebase_uid_unique_888')->count());
        $this->assertEquals(1, User::where('email', 'newuser@example.com')->count());
    }
}
