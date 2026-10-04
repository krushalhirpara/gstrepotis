<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure the 3 authorized accounts exist with correct passwords
        User::updateOrCreate(
            ['email' => 'ca.narendrabhai@gmail.com'],
            [
                'name' => 'CA Narendra Patel',
                'password' => Hash::make('Narendra@2026!'),
                'mobile' => '+919825000001',
                'user_type' => 'CA',
                'status' => 'active',
                'account_status' => 'active',
                'credits' => 5000,
            ]
        );

        User::updateOrCreate(
            ['email' => 'ca.umeshbhai@gmail.com'],
            [
                'name' => 'CA Umesh Patel',
                'password' => Hash::make('Umesh@2026!'),
                'mobile' => '+919825000002',
                'user_type' => 'CA',
                'status' => 'active',
                'account_status' => 'active',
                'credits' => 5000,
            ]
        );

        User::updateOrCreate(
            ['email' => 'ca.test@gmail.com'],
            [
                'name' => 'CA Test Account',
                'password' => Hash::make('Test@2026!'),
                'mobile' => '+919825000003',
                'user_type' => 'CA',
                'status' => 'active',
                'account_status' => 'active',
                'credits' => 5000,
            ]
        );
    }

    /**
     * 1. Valid login for Account 1 (ca.narendrabhai@gmail.com)
     */
    public function test_valid_login_for_account_1()
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'ca.narendrabhai@gmail.com',
            'password' => 'Narendra@2026!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'email' => 'ca.narendrabhai@gmail.com',
                    'name' => 'CA Narendra Patel',
                ],
            ])
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'user',
            ]);

        $this->assertNotEmpty($response->json('access_token'));
    }

    /**
     * 2. Valid login for Account 2 (ca.umeshbhai@gmail.com)
     */
    public function test_valid_login_for_account_2()
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'ca.umeshbhai@gmail.com',
            'password' => 'Umesh@2026!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'email' => 'ca.umeshbhai@gmail.com',
                    'name' => 'CA Umesh Patel',
                ],
            ]);

        $this->assertNotEmpty($response->json('access_token'));
    }

    /**
     * 3. Valid login for Account 3 (ca.test@gmail.com)
     */
    public function test_valid_login_for_account_3()
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'ca.test@gmail.com',
            'password' => 'Test@2026!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'email' => 'ca.test@gmail.com',
                    'name' => 'CA Test Account',
                ],
            ]);

        $this->assertNotEmpty($response->json('access_token'));
    }

    /**
     * 4. Login rejects wrong password with generic error
     */
    public function test_login_rejects_wrong_password()
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'ca.narendrabhai@gmail.com',
            'password' => 'WrongPassword123!',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'error',
                'message' => 'Invalid email or password.',
            ]);
    }

    /**
     * 5. Login rejects unknown email with generic error
     */
    public function test_login_rejects_unknown_email()
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'unauthorized.unknown@example.com',
            'password' => 'SomePassword123!',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'error',
                'message' => 'Invalid email or password.',
            ]);
    }

    /**
     * 6. Logout invalidates bearer token
     */
    public function test_logout_invalidates_session_token()
    {
        $loginRes = $this->postJson('/api/auth/login', [
            'email' => 'ca.narendrabhai@gmail.com',
            'password' => 'Narendra@2026!',
        ]);

        $token = $loginRes->json('access_token');

        // Can access protected endpoint with token
        $userRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/user');
        $userRes->assertStatus(200);

        // Logout
        $logoutRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout');
        $logoutRes->assertStatus(200);

        // Access with old token is now rejected
        $retryRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/user');
        $retryRes->assertStatus(401);
    }

    /**
     * 7. Direct dashboard/clients access without login is rejected (401)
     */
    public function test_unauthenticated_requests_are_rejected()
    {
        $this->getJson('/api/dashboard/summary')->assertStatus(401);
        $this->getJson('/api/clients')->assertStatus(401);
        $this->getJson('/api/files')->assertStatus(401);
        $this->getJson('/api/gst-audits')->assertStatus(401);
    }

    /**
     * 8 & 9. Multi-client isolation: User A cannot see or access User B's clients or data
     */
    public function test_multi_client_isolation_between_users()
    {
        $userA = User::where('email', 'ca.narendrabhai@gmail.com')->first();
        $userB = User::where('email', 'ca.umeshbhai@gmail.com')->first();
        $userC = User::where('email', 'ca.test@gmail.com')->first();

        // Create clients under User A
        $clientA1 = Client::create([
            'user_id' => $userA->id,
            'trade_name' => 'Narendra Client Alpha',
            'party_name' => 'Alpha Private Limited',
            'gstin' => '24ABCDE1234F1Z5',
            'status' => 'active',
        ]);
        $clientA2 = Client::create([
            'user_id' => $userA->id,
            'trade_name' => 'Narendra Client Beta',
            'party_name' => 'Beta Industries',
            'gstin' => '24BCDEF2345G1Z6',
            'status' => 'active',
        ]);

        // Create clients under User B
        $clientB1 = Client::create([
            'user_id' => $userB->id,
            'trade_name' => 'Umesh Client Gamma',
            'party_name' => 'Gamma Enterprises',
            'gstin' => '24CDEFG3456H1Z7',
            'status' => 'active',
        ]);

        // Login as User A
        $loginA = $this->postJson('/api/auth/login', [
            'email' => 'ca.narendrabhai@gmail.com',
            'password' => 'Narendra@2026!',
        ]);
        $tokenA = $loginA->json('access_token');

        // User A fetches client list -> only sees 2 clients belonging to User A
        $resA = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->getJson('/api/clients');
        $resA->assertStatus(200);
        $this->assertCount(2, $resA->json('data'));
        $this->assertEquals('Narendra Client Alpha', $resA->json('data.0.trade_name'));

        // User A tries to directly access User B's client (IDOR attempt) -> rejected with 404
        $idorRes = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->getJson("/api/clients/{$clientB1->id}");
        $idorRes->assertStatus(404);

        // Login as User B
        $loginB = $this->postJson('/api/auth/login', [
            'email' => 'ca.umeshbhai@gmail.com',
            'password' => 'Umesh@2026!',
        ]);
        $tokenB = $loginB->json('access_token');

        // User B fetches client list -> only sees 1 client belonging to User B
        $resB = $this->withHeader('Authorization', "Bearer {$tokenB}")
            ->getJson('/api/clients');
        $resB->assertStatus(200);
        $this->assertCount(1, $resB->json('data'));
        $this->assertEquals('Umesh Client Gamma', $resB->json('data.0.trade_name'));

        // User B tries to directly access User A's client (IDOR attempt) -> rejected with 404
        $idorResB = $this->withHeader('Authorization', "Bearer {$tokenB}")
            ->getJson("/api/clients/{$clientA1->id}");
        $idorResB->assertStatus(404);

        // Login as User C -> has 0 clients initially
        $loginC = $this->postJson('/api/auth/login', [
            'email' => 'ca.test@gmail.com',
            'password' => 'Test@2026!',
        ]);
        $tokenC = $loginC->json('access_token');

        $resC = $this->withHeader('Authorization', "Bearer {$tokenC}")
            ->getJson('/api/clients');
        $resC->assertStatus(200);
        $this->assertCount(0, $resC->json('data'));
    }

    /**
     * 10. Multiple clients can be created under one user
     */
    public function test_multiple_clients_can_be_created_under_one_user()
    {
        $login = $this->postJson('/api/auth/login', [
            'email' => 'ca.narendrabhai@gmail.com',
            'password' => 'Narendra@2026!',
        ]);
        $token = $login->json('access_token');

        // Create Client 1
        $res1 = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/clients', [
                'trade_name' => 'Sunrise Textiles',
                'party_name' => 'Sunrise Textiles Pvt Ltd',
                'gstin' => '24AAAAA0000A1Z5',
                'filing_frequency' => 'monthly',
            ]);
        $res1->assertStatus(201);

        // Create Client 2
        $res2 = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/clients', [
                'trade_name' => 'Apex Logistics',
                'party_name' => 'Apex Logistics LLP',
                'gstin' => '24BBBBB0000B1Z6',
                'filing_frequency' => 'quarterly',
            ]);
        $res2->assertStatus(201);

        // Fetch list
        $listRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/clients');
        $listRes->assertStatus(200);
        $this->assertCount(2, $listRes->json('data'));
    }

    /**
     * 11. Public signup/OTP endpoints are disabled
     */
    public function test_public_signup_endpoints_are_disabled()
    {
        $this->postJson('/api/auth/signup/validate', ['email' => 'random@example.com'])
            ->assertStatus(403);
        $this->postJson('/api/auth/register', ['email' => 'random@example.com'])
            ->assertStatus(403);
        $this->postJson('/api/auth/google', ['id_token' => 'dummy'])
            ->assertStatus(403);
    }
}
