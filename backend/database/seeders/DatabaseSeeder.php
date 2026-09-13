<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Admin & Demo User Creation
        $admin = User::updateOrCreate(
            ['email' => 'admin@gstsuite.com'],
            [
                'name' => 'System Admin',
                'password' => Hash::make('password123'),
                'mobile' => '+91 9876543210',
                'user_type' => 'CA',
                'is_admin' => true,
                'credits' => 99999,
                'status' => 'active',
            ]
        );

        $demoUser = User::updateOrCreate(
            ['email' => 'demo@gstsuite.com'],
            [
                'name' => 'Rajesh Sharma (CA)',
                'password' => Hash::make('password123'),
                'mobile' => '+91 9812345678',
                'user_type' => 'CA',
                'is_admin' => false,
                'credits' => 150,
                'status' => 'active',
            ]
        );

        // 2. Seed Banks Table (Section 8 of specification)
        $banks = [
            ['name' => 'HDFC Bank', 'code' => 'HDFC', 'parser_type' => 'pdf_hdfc'],
            ['name' => 'State Bank of India', 'code' => 'SBI', 'parser_type' => 'pdf_sbi'],
            ['name' => 'ICICI Bank', 'code' => 'ICICI', 'parser_type' => 'pdf_icici'],
            ['name' => 'Axis Bank', 'code' => 'AXIS', 'parser_type' => 'pdf_axis'],
            ['name' => 'Kotak Mahindra Bank', 'code' => 'KOTAK', 'parser_type' => 'pdf_kotak'],
            ['name' => 'Bank of Baroda', 'code' => 'BOB', 'parser_type' => 'pdf_standard'],
            ['name' => 'IDFC First Bank', 'code' => 'IDFC', 'parser_type' => 'pdf_standard'],
            ['name' => 'Yes Bank', 'code' => 'YES', 'parser_type' => 'pdf_standard'],
            ['name' => 'RBL Bank', 'code' => 'RBL', 'parser_type' => 'pdf_standard'],
            ['name' => 'Punjab National Bank', 'code' => 'PNB', 'parser_type' => 'pdf_standard'],
            ['name' => 'Canara Bank', 'code' => 'CANARA', 'parser_type' => 'pdf_standard'],
            ['name' => 'Union Bank', 'code' => 'UNION', 'parser_type' => 'pdf_standard'],
            ['name' => 'Indian Bank', 'code' => 'INDIAN', 'parser_type' => 'pdf_standard'],
            ['name' => 'Bank of India', 'code' => 'BOI', 'parser_type' => 'pdf_standard'],
            ['name' => 'Central Bank', 'code' => 'CENTRAL', 'parser_type' => 'pdf_standard'],
            ['name' => 'UCO Bank', 'code' => 'UCO', 'parser_type' => 'pdf_standard'],
            ['name' => 'Federal Bank', 'code' => 'FEDERAL', 'parser_type' => 'pdf_standard'],
            ['name' => 'Bandhan Bank', 'code' => 'BANDHAN', 'parser_type' => 'pdf_standard'],
        ];

        foreach ($banks as $b) {
            DB::table('banks')->updateOrInsert(
                ['code' => $b['code']],
                [
                    'name' => $b['name'],
                    'status' => 'active',
                    'parser_type' => $b['parser_type'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // 3. Seed Marketplaces Table (Section 9 of specification)
        $marketplaces = [
            ['name' => 'Amazon', 'slug' => 'amazon', 'parser_class' => 'AmazonParser', 'types' => json_encode(['csv', 'xlsx'])],
            ['name' => 'Flipkart', 'slug' => 'flipkart', 'parser_class' => 'FlipkartParser', 'types' => json_encode(['csv', 'xlsx'])],
            ['name' => 'Meesho', 'slug' => 'meesho', 'parser_class' => 'MeeshoParser', 'types' => json_encode(['csv', 'xlsx'])],
            ['name' => 'JioMart', 'slug' => 'jiomart', 'parser_class' => 'GenericMarketplaceParser', 'types' => json_encode(['csv'])],
            ['name' => 'Myntra', 'slug' => 'myntra', 'parser_class' => 'GenericMarketplaceParser', 'types' => json_encode(['csv', 'xlsx'])],
            ['name' => 'GlowRoad', 'slug' => 'glowroad', 'parser_class' => 'GenericMarketplaceParser', 'types' => json_encode(['csv'])],
            ['name' => 'Paytm', 'slug' => 'paytm', 'parser_class' => 'GenericMarketplaceParser', 'types' => json_encode(['csv'])],
            ['name' => 'Snapdeal', 'slug' => 'snapdeal', 'parser_class' => 'GenericMarketplaceParser', 'types' => json_encode(['csv'])],
            ['name' => 'Shop101', 'slug' => 'shop101', 'parser_class' => 'GenericMarketplaceParser', 'types' => json_encode(['csv'])],
            ['name' => 'LimeRoad', 'slug' => 'limeroad', 'parser_class' => 'GenericMarketplaceParser', 'types' => json_encode(['csv'])],
            ['name' => 'CityMall', 'slug' => 'citymall', 'parser_class' => 'GenericMarketplaceParser', 'types' => json_encode(['csv'])],
        ];

        foreach ($marketplaces as $m) {
            DB::table('marketplaces')->updateOrInsert(
                ['slug' => $m['slug']],
                [
                    'name' => $m['name'],
                    'supported_file_types' => $m['types'],
                    'status' => 'active',
                    'parser_class' => $m['parser_class'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // 4. Seed HSN Master Table (Section 20 of specification)
        $hsnData = [
            ['hsn_code' => '8471', 'description' => 'Automatic data processing machines & storage units', 'gst_rate' => 18.00],
            ['hsn_code' => '8517', 'description' => 'Telephone sets, smartphones & transmission apparatus', 'gst_rate' => 18.00],
            ['hsn_code' => '6109', 'description' => 'T-shirts, singlets and other vests, knitted or crocheted', 'gst_rate' => 5.00],
            ['hsn_code' => '6203', 'description' => 'Men\'s or boys\' suits, ensembles, jackets, trousers', 'gst_rate' => 12.00],
            ['hsn_code' => '3304', 'description' => 'Beauty or make-up preparations & skin care products', 'gst_rate' => 18.00],
            ['hsn_code' => '9403', 'description' => 'Other furniture and parts thereof', 'gst_rate' => 18.00],
            ['hsn_code' => '0902', 'description' => 'Tea, whether or not flavoured', 'gst_rate' => 5.00],
            ['hsn_code' => '2106', 'description' => 'Food preparations not elsewhere specified', 'gst_rate' => 18.00],
        ];

        foreach ($hsnData as $hsn) {
            DB::table('hsn_master')->updateOrInsert(
                ['hsn_code' => $hsn['hsn_code']],
                [
                    'description' => $hsn['description'],
                    'gst_rate' => $hsn['gst_rate'],
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // 5. Seed Subscription Plans (Section 27 of specification)
        $plans = [
            [
                'name' => 'Free Trial',
                'slug' => 'free-trial',
                'price_monthly' => 0.00,
                'price_yearly' => 0.00,
                'bank_statement_limit' => 1,
                'ecommerce_report_limit' => 1,
                'bulk_upload_enabled' => false,
                'features' => json_encode(['1 Bank Statement Conversion', '1 E-commerce Sales Report', 'CSV & Tally XML Export', 'Standard Email Support']),
            ],
            [
                'name' => 'Professional',
                'slug' => 'professional',
                'price_monthly' => 999.00,
                'price_yearly' => 9990.00,
                'bank_statement_limit' => 200,
                'ecommerce_report_limit' => 100,
                'bulk_upload_enabled' => true,
                'features' => json_encode(['200 Bank Statement Conversions/mo', '100 E-Commerce Reports/mo', 'Bulk PDF Upload', 'GST JSON & Tally XML Engine', 'Priority Support']),
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'price_monthly' => 2499.00,
                'price_yearly' => 24990.00,
                'bank_statement_limit' => 1000,
                'ecommerce_report_limit' => 500,
                'bulk_upload_enabled' => true,
                'features' => json_encode(['1000 Bank Statement Conversions/mo', '500 E-Commerce Reports/mo', 'TCS & Section 9(5) Reconciliation', 'Multi-user CA Workspace', 'Dedicated Account Manager']),
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'price_monthly' => 4999.00,
                'price_yearly' => 49990.00,
                'bank_statement_limit' => 9999,
                'ecommerce_report_limit' => 9999,
                'bulk_upload_enabled' => true,
                'features' => json_encode(['Unlimited Bank Statement Conversions', 'Unlimited E-Commerce Reports', 'Custom API & ERP Connectors', '24/7 Dedicated Support', 'SLA Guarantee']),
            ],
        ];

        foreach ($plans as $p) {
            DB::table('plans')->updateOrInsert(
                ['slug' => $p['slug']],
                [
                    'name' => $p['name'],
                    'price_monthly' => $p['price_monthly'],
                    'price_yearly' => $p['price_yearly'],
                    'bank_statement_limit' => $p['bank_statement_limit'],
                    'ecommerce_report_limit' => $p['ecommerce_report_limit'],
                    'bulk_upload_enabled' => $p['bulk_upload_enabled'],
                    'features' => $p['features'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
