<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubscriptionController extends Controller
{
    public function getPlans()
    {
        $plans = DB::table('plans')->get()->map(function ($plan) {
            $plan->features = json_decode($plan->features);
            return $plan;
        });

        return response()->json(['plans' => $plans]);
    }

    public function getCurrentSubscription(Request $request)
    {
        return response()->json([
            'current_plan' => [
                'name' => 'Professional Plan',
                'slug' => 'professional',
                'price_monthly' => 999.00,
                'status' => 'active',
                'current_period_end' => date('Y-m-d', strtotime('+24 days')),
                'bank_statements_used' => 38,
                'bank_statements_limit' => 200,
                'ecommerce_reports_used' => 14,
                'ecommerce_reports_limit' => 100,
            ],
            'billing_history' => [
                [
                    'id' => 'PAY-904821',
                    'date' => date('Y-m-d', strtotime('-6 days')),
                    'amount' => '₹999.00',
                    'status' => 'Success',
                    'method' => 'Razorpay (UPI)',
                    'invoice_url' => '#',
                ],
                [
                    'id' => 'PAY-810294',
                    'date' => date('Y-m-d', strtotime('-36 days')),
                    'amount' => '₹999.00',
                    'status' => 'Success',
                    'method' => 'Razorpay (Card)',
                    'invoice_url' => '#',
                ],
            ],
        ]);
    }

    public function createRazorpayOrder(Request $request)
    {
        $request->validate([
            'plan_slug' => 'required|string',
            'billing_cycle' => 'required|string|in:monthly,yearly',
        ]);

        $plan = DB::table('plans')->where('slug', $request->plan_slug)->first();
        if (!$plan) {
            return response()->json(['message' => 'Invalid subscription plan selected'], 404);
        }

        $amount = ($request->billing_cycle === 'yearly') ? $plan->price_yearly : $plan->price_monthly;

        // Razorpay Order ID architecture simulation
        $orderId = 'order_' . substr(md5(uniqid()), 0, 14);

        return response()->json([
            'order_id' => $orderId,
            'amount' => $amount * 100, // paise
            'currency' => 'INR',
            'key_id' => env('RAZORPAY_KEY_ID', 'rzp_test_sampleKey123'),
            'plan' => $plan,
        ]);
    }

    public function verifyPayment(Request $request)
    {
        $request->validate([
            'razorpay_payment_id' => 'required|string',
            'razorpay_order_id' => 'required|string',
            'razorpay_signature' => 'required|string',
        ]);

        // Simulated successful payment verification
        return response()->json([
            'status' => 'success',
            'message' => 'Payment verified successfully! Your subscription has been updated.',
        ]);
    }
}
