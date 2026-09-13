import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle2 } from 'lucide-react';

export const PricingPage: React.FC = () => {
  const [isYearly, setIsYearly] = useState(true);

  const plans = [
    {
      name: 'Free Trial',
      priceMonthly: 0,
      priceYearly: 0,
      bankLimit: 1,
      ecommerceLimit: 1,
      bulkUpload: false,
      features: [
        '1 Bank Statement Conversion',
        '1 E-commerce Sales Report',
        'CSV & Tally XML Export',
        'Standard Email Support',
      ],
      cta: 'Start Free Trial',
      highlight: false,
    },
    {
      name: 'Professional',
      priceMonthly: 999,
      priceYearly: 9990,
      bankLimit: 200,
      ecommerceLimit: 100,
      bulkUpload: true,
      features: [
        '200 Bank Statement Conversions/mo',
        '100 E-Commerce Reports/mo',
        'Bulk PDF Drag & Drop Upload',
        'GST JSON & Tally XML Engine',
        'HSN Validation & TCS Reconciliation',
        'Priority Email & Chat Support',
      ],
      cta: 'Choose Professional',
      highlight: true,
    },
    {
      name: 'Business',
      priceMonthly: 2499,
      priceYearly: 24990,
      bankLimit: 1000,
      ecommerceLimit: 500,
      bulkUpload: true,
      features: [
        '1000 Bank Statement Conversions/mo',
        '500 E-Commerce Reports/mo',
        'Section 9(5) Tax Accounting',
        'Multi-user CA Firm Workspace',
        'Dedicated Account Manager',
      ],
      cta: 'Choose Business',
      highlight: false,
    },
    {
      name: 'Enterprise',
      priceMonthly: 4999,
      priceYearly: 49990,
      bankLimit: 9999,
      ecommerceLimit: 9999,
      bulkUpload: true,
      features: [
        'Unlimited Bank Conversions',
        'Unlimited E-Commerce Reports',
        'Custom API & Tally Connectors',
        '24/7 Phone & WhatsApp Support',
        '99.9% Uptime SLA Guarantee',
      ],
      cta: 'Contact Enterprise',
      highlight: false,
    },
  ];

  return (
    <div className="bg-white text-[#111111] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="outline" className="mb-4">
            Transparent Pricing
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Simple Plans for Every Accounting Firm
          </h1>
          <p className="mt-4 text-base text-[#666666]">
            Save hundreds of manual entry hours. Cancel or upgrade anytime without extra hidden fees.
          </p>

          <div className="mt-8 inline-flex items-center bg-[#F7F7F7] p-1.5 rounded-2xl border border-[#E5E5E5]">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                !isYearly ? 'bg-black text-white' : 'text-[#666666]'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                isYearly ? 'bg-black text-white' : 'text-[#666666]'
              }`}
            >
              Yearly Billing <Badge variant="success" size="sm">Save 20%</Badge>
            </button>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-6">
          {plans.map((p, i) => (
            <Card
              key={i}
              className={`flex flex-col justify-between p-6 ${
                p.highlight ? 'border-black ring-2 ring-black shadow-xl' : ''
              }`}
            >
              <div>
                {p.highlight && (
                  <Badge variant="neutral" className="bg-black text-white text-[10px] mb-3">
                    Most Popular for CAs
                  </Badge>
                )}
                <h3 className="text-lg font-bold text-black">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-black">
                    ₹{isYearly ? (p.priceYearly / 12).toFixed(0) : p.priceMonthly}
                  </span>
                  <span className="text-xs text-[#666666]">/month</span>
                </div>
                {isYearly && p.priceYearly > 0 && (
                  <p className="text-[11px] text-[#666666] mt-0.5">Billed ₹{p.priceYearly} annually</p>
                )}

                <ul className="mt-6 space-y-2.5 text-xs text-[#111111]">
                  {p.features.map((feat, fidx) => (
                    <li key={fidx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-[#E5E5E5]">
                <Link to="/sign-up">
                  <Button variant={p.highlight ? 'primary' : 'outline'} className="w-full">
                    {p.cta}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AboutPage: React.FC = () => {
  return (
    <div className="bg-white text-[#111111] py-16 max-w-4xl mx-auto px-4">
      <Badge variant="outline" className="mb-4">
        Our Mission
      </Badge>
      <h1 className="text-4xl font-extrabold tracking-tight">
        Engineered for Indian Financial Accuracy
      </h1>
      <p className="mt-4 text-base text-[#666666] leading-relaxed">
        GST Suite was created to solve the massive operational bottleneck faced by Chartered Accountants, accountants, and tax professionals when handling bank statement entries and marketplace sales reports.
      </p>

      <div className="mt-12 space-y-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg">100% Privacy & Data Security</h3>
          <p className="text-xs text-[#666666] mt-2">
            Uploaded PDFs and sales reports are processed in secure isolated worker environments. We never sell data or store PDF passwords.
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg">Precision Tally XML Architecture</h3>
          <p className="text-xs text-[#666666] mt-2">
            Our proprietary TallyXmlService generates compliant Tally Prime and Tally ERP 9 import XML vouchers matching Indian accounting standards.
          </p>
        </Card>
      </div>
    </div>
  );
};
