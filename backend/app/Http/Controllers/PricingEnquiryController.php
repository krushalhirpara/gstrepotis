<?php

namespace App\Http\Controllers;

use App\Models\PricingEnquiry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PricingEnquiryController extends Controller
{
    /**
     * Store a newly created pricing enquiry from public contact form.
     * POST /api/pricing-enquiries
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'contact_number' => [
                'required',
                'string',
                'max:25',
                'regex:/^[0-9+\s\-().]{7,25}$/'
            ],
            'email' => 'required|email|max:191',
            'message' => 'required|string|max:5000',
            'selected_plan' => 'required|string|max:50',
        ], [
            'first_name.required' => 'Please enter your first name.',
            'last_name.required' => 'Please enter your last name.',
            'contact_number.required' => 'Please enter your contact phone number.',
            'contact_number.regex' => 'Please enter a valid phone number (e.g. +91 98765 43210).',
            'email.required' => 'Please enter your email address.',
            'email.email' => 'Please enter a valid email address.',
            'message.required' => 'Please provide a message or requirement details.',
            'selected_plan.required' => 'Please select a pricing plan.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'success' => false,
                'message' => 'Please fix the validation errors.',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Validate and normalize selected plan
        $normalizedPlan = PricingEnquiry::normalizePlan($request->selected_plan);
        if (!$normalizedPlan) {
            return response()->json([
                'status' => 'error',
                'success' => false,
                'message' => 'The selected pricing plan is invalid. Please choose from: Free Trial, Professional, Business, or Enterprise.',
                'errors' => [
                    'selected_plan' => ['The selected plan is not recognized.']
                ]
            ], 400);
        }

        // Clean and normalize input
        $firstName = trim($request->first_name);
        $lastName = trim($request->last_name);
        $email = strtolower(trim($request->email));
        $contactNumber = trim($request->contact_number);
        $message = trim($request->message);

        $enquiry = PricingEnquiry::create([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'contact_number' => $contactNumber,
            'email' => $email,
            'message' => $message,
            'selected_plan' => $normalizedPlan,
            'status' => PricingEnquiry::STATUS_NEW,
        ]);

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Your enquiry has been submitted successfully. Our team will contact you shortly.',
            'data' => [
                'id' => $enquiry->id,
                'name' => $enquiry->full_name,
                'selected_plan' => $enquiry->selected_plan,
                'status' => $enquiry->status,
                'created_at' => $enquiry->created_at->toIso8601String(),
            ]
        ], 201);
    }

    /**
     * Admin: List all pricing enquiries with search, filters, sorting & metrics.
     * GET /api/admin/pricing-enquiries
     */
    public function index(Request $request)
    {
        $query = PricingEnquiry::query();

        // 1. Search Query
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('contact_number', 'like', "%{$search}%")
                  ->orWhere('selected_plan', 'like', "%{$search}%")
                  ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
            });
        }

        // 2. Status Filter
        if ($request->filled('status') && $request->status !== 'all') {
            $status = strtolower(trim($request->status));
            if (in_array($status, PricingEnquiry::ALLOWED_STATUSES)) {
                $query->where('status', $status);
            }
        }

        // 3. Plan Filter
        if ($request->filled('plan') && $request->plan !== 'all') {
            $normalizedPlan = PricingEnquiry::normalizePlan($request->plan) ?? trim($request->plan);
            $query->where('selected_plan', $normalizedPlan);
        }

        // 4. Sorting
        $sort = strtolower(trim($request->get('sort', 'newest')));
        if ($sort === 'oldest') {
            $query->orderBy('created_at', 'asc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        // 5. Pagination
        $perPage = min(max((int) $request->get('per_page', 20), 1), 100);
        $enquiries = $query->paginate($perPage);

        // 6. Calculate real-time database metrics
        $metrics = [
            'total' => PricingEnquiry::count(),
            'new' => PricingEnquiry::where('status', PricingEnquiry::STATUS_NEW)->count(),
            'contacted' => PricingEnquiry::where('status', PricingEnquiry::STATUS_CONTACTED)->count(),
            'in_discussion' => PricingEnquiry::where('status', PricingEnquiry::STATUS_IN_DISCUSSION)->count(),
            'converted' => PricingEnquiry::where('status', PricingEnquiry::STATUS_CONVERTED)->count(),
            'closed' => PricingEnquiry::where('status', PricingEnquiry::STATUS_CLOSED)->count(),
            'plans' => [
                'free_trial' => PricingEnquiry::where('selected_plan', 'Free Trial')->count(),
                'professional' => PricingEnquiry::where('selected_plan', 'Professional')->count(),
                'business' => PricingEnquiry::where('selected_plan', 'Business')->count(),
                'enterprise' => PricingEnquiry::where('selected_plan', 'Enterprise')->count(),
            ]
        ];

        return response()->json([
            'status' => 'success',
            'data' => $enquiries->items(),
            'pagination' => [
                'current_page' => $enquiries->currentPage(),
                'last_page' => $enquiries->lastPage(),
                'per_page' => $enquiries->perPage(),
                'total' => $enquiries->total(),
                'has_more' => $enquiries->hasMorePages(),
            ],
            'metrics' => $metrics,
        ]);
    }

    /**
     * Admin: Show specific pricing enquiry details.
     * GET /api/admin/pricing-enquiries/{id}
     */
    public function show($id)
    {
        $enquiry = PricingEnquiry::find($id);

        if (!$enquiry) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pricing enquiry not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $enquiry->id,
                'first_name' => $enquiry->first_name,
                'last_name' => $enquiry->last_name,
                'full_name' => $enquiry->full_name,
                'contact_number' => $enquiry->contact_number,
                'email' => $enquiry->email,
                'message' => $enquiry->message,
                'selected_plan' => $enquiry->selected_plan,
                'status' => $enquiry->status,
                'created_at' => $enquiry->created_at->format('d M Y, h:i A'),
                'updated_at' => $enquiry->updated_at->format('d M Y, h:i A'),
            ]
        ]);
    }

    /**
     * Admin: Update pricing enquiry status.
     * PATCH /api/admin/pricing-enquiries/{id}
     */
    public function update(Request $request, $id)
    {
        $enquiry = PricingEnquiry::find($id);

        if (!$enquiry) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pricing enquiry not found.',
            ], 404);
        }

        $request->validate([
            'status' => 'required|string|in:' . implode(',', PricingEnquiry::ALLOWED_STATUSES),
        ]);

        $enquiry->status = strtolower(trim($request->status));
        $enquiry->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Enquiry status updated successfully.',
            'data' => [
                'id' => $enquiry->id,
                'status' => $enquiry->status,
                'updated_at' => $enquiry->updated_at->format('d M Y, h:i A'),
            ]
        ]);
    }

    /**
     * Admin: Delete pricing enquiry.
     * DELETE /api/admin/pricing-enquiries/{id}
     */
    public function destroy($id)
    {
        $enquiry = PricingEnquiry::find($id);

        if (!$enquiry) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pricing enquiry not found.',
            ], 404);
        }

        $enquiry->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Enquiry deleted successfully.',
        ]);
    }
}
