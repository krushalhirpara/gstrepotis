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

    public function test_google_firebase_auth_handles_valid_token()
    {
        $mockVerifier = Mockery::mock(FirebaseTokenVerifier::class);
        $mockVerifier->shouldReceive('verifyIdToken')
            ->with('valid-google-id-token')
            ->andReturn([
                'uid' => 'google_uid_12345',
                'email' => 'googleuser@example.com',
                'name' => 'Google User',
                'picture' => 'https://example.com/avatar.jpg',
            ]);

        $this->app->instance(FirebaseTokenVerifier::class, $mockVerifier);

        $response = $this->postJson('/api/auth/google', [
            'id_token' => 'valid-google-id-token',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'email' => 'googleuser@example.com',
                    'name' => 'Google User',
                ],
            ])
            ->assertJsonStructure(['access_token', 'user']);

        $this->assertDatabaseHas('users', [
            'email' => 'googleuser@example.com',
            'firebase_uid' => 'google_uid_12345',
        ]);
    }
}
