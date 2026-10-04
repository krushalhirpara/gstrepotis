<?php

namespace Tests\Feature;

use App\Models\PricingEnquiry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingEnquiryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test successful public submission of pricing enquiry
     */
    public function test_public_can_submit_valid_pricing_enquiry(): void
    {
        $response = $this->postJson('/api/pricing-enquiries', [
            'first_name' => 'Rajesh',
            'last_name' => 'Sharma',
            'contact_number' => '+91 9876543210',
            'email' => 'rajesh.sharma@example.com',
            'message' => 'Interested in the Professional plan for our CA firm with 50 clients.',
            'selected_plan' => 'Professional',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'success' => true,
            ]);

        $this->assertDatabaseHas('pricing_enquiries', [
            'first_name' => 'Rajesh',
            'last_name' => 'Sharma',
            'email' => 'rajesh.sharma@example.com',
            'selected_plan' => 'Professional',
            'status' => 'new',
        ]);
    }

    /**
     * Test plan slug normalization (e.g. 'free-trial' -> 'Free Trial')
     */
    public function test_plan_slug_is_normalized_correctly(): void
    {
        $response = $this->postJson('/api/pricing-enquiries', [
            'first_name' => 'Amit',
            'last_name' => 'Patel',
            'contact_number' => '9823456789',
            'email' => 'amit@pateltax.com',
            'message' => 'Need Free Trial for evaluating bank statement conversion.',
            'selected_plan' => 'free-trial',
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('pricing_enquiries', [
            'email' => 'amit@pateltax.com',
            'selected_plan' => 'Free Trial',
            'status' => 'new',
        ]);
    }

    /**
     * Test invalid plan rejection
     */
    public function test_rejects_invalid_pricing_plan(): void
    {
        $response = $this->postJson('/api/pricing-enquiries', [
            'first_name' => 'Unknown',
            'last_name' => 'User',
            'contact_number' => '9876543210',
            'email' => 'unknown@example.com',
            'message' => 'Testing invalid plan name',
            'selected_plan' => 'SuperGoldUnlimitedPlan',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'status' => 'error',
                'success' => false,
            ]);

        $this->assertDatabaseMissing('pricing_enquiries', [
            'email' => 'unknown@example.com',
        ]);
    }

    /**
     * Test validation failure on empty submission
     */
    public function test_validates_required_fields(): void
    {
        $response = $this->postJson('/api/pricing-enquiries', []);

        $response->assertStatus(422)
            ->assertJsonStructure([
                'errors' => ['first_name', 'last_name', 'contact_number', 'email', 'message', 'selected_plan']
            ]);
    }

    /**
     * Test invalid email format rejection
     */
    public function test_validates_email_format(): void
    {
        $response = $this->postJson('/api/pricing-enquiries', [
            'first_name' => 'Test',
            'last_name' => 'User',
            'contact_number' => '9876543210',
            'email' => 'not-a-valid-email',
            'message' => 'Hello',
            'selected_plan' => 'Business',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /**
     * Test unauthenticated access to admin enquiries is blocked
     */
    public function test_unauthenticated_admin_access_rejected(): void
    {
        $response = $this->getJson('/api/admin/pricing-enquiries');
        $response->assertStatus(401);
    }

    /**
     * Test admin can list, search, filter and paginate enquiries
     */
    public function test_admin_can_list_and_filter_enquiries(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'krushalhirapra12@gmail.com'],
            [
                'name' => 'Krushal Hirpara',
                'user_type' => 'Admin',
                'is_admin' => 1,
                'status' => 'active',
                'api_token' => 'test_admin_token_12345',
            ]
        );
        $admin->update(['api_token' => 'test_admin_token_12345', 'is_admin' => 1]);

        // Create sample enquiries
        PricingEnquiry::create([
            'first_name' => 'Pooja',
            'last_name' => 'Mehta',
            'contact_number' => '9898989898',
            'email' => 'pooja@mehta-firm.com',
            'message' => 'Looking for Enterprise multi-user CA workspace setup.',
            'selected_plan' => 'Enterprise',
            'status' => 'new',
        ]);

        PricingEnquiry::create([
            'first_name' => 'Suresh',
            'last_name' => 'Joshi',
            'contact_number' => '9123456780',
            'email' => 'suresh@joshitax.in',
            'message' => 'Business plan enquiry.',
            'selected_plan' => 'Business',
            'status' => 'contacted',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer test_admin_token_12345')
            ->getJson('/api/admin/pricing-enquiries?status=new');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data',
                'pagination' => ['total', 'current_page', 'per_page'],
                'metrics' => ['total', 'new', 'contacted', 'in_discussion', 'converted', 'closed', 'plans']
            ]);
    }

    /**
     * Test admin can update enquiry status
     */
    public function test_admin_can_update_enquiry_status(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'krushalhirapra12@gmail.com'],
            [
                'name' => 'Krushal Hirpara',
                'user_type' => 'Admin',
                'is_admin' => 1,
                'status' => 'active',
                'api_token' => 'test_admin_token_12345',
            ]
        );
        $admin->update(['api_token' => 'test_admin_token_12345', 'is_admin' => 1]);

        $enquiry = PricingEnquiry::create([
            'first_name' => 'Kiran',
            'last_name' => 'Desai',
            'contact_number' => '9786543210',
            'email' => 'kiran@desai.com',
            'message' => 'Testing status change flow.',
            'selected_plan' => 'Professional',
            'status' => 'new',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer test_admin_token_12345')
            ->patchJson("/api/admin/pricing-enquiries/{$enquiry->id}", [
                'status' => 'contacted'
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'id' => $enquiry->id,
                    'status' => 'contacted',
                ]
            ]);

        $this->assertDatabaseHas('pricing_enquiries', [
            'id' => $enquiry->id,
            'status' => 'contacted',
        ]);
    }

    /**
     * Test admin can delete enquiry
     */
    public function test_admin_can_delete_enquiry(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'krushalhirapra12@gmail.com'],
            [
                'name' => 'Krushal Hirpara',
                'user_type' => 'Admin',
                'is_admin' => 1,
                'status' => 'active',
                'api_token' => 'test_admin_token_12345',
            ]
        );
        $admin->update(['api_token' => 'test_admin_token_12345', 'is_admin' => 1]);

        $enquiry = PricingEnquiry::create([
            'first_name' => 'Delete',
            'last_name' => 'Me',
            'contact_number' => '9999999999',
            'email' => 'delete@example.com',
            'message' => 'To be deleted.',
            'selected_plan' => 'Free Trial',
            'status' => 'closed',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer test_admin_token_12345')
            ->deleteJson("/api/admin/pricing-enquiries/{$enquiry->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('pricing_enquiries', [
            'id' => $enquiry->id,
        ]);
    }
}
