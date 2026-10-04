import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/common/SEO';
import { Breadcrumbs } from '../../components/common/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export const PricingPage: React.FC = () => {
  const [isYearly, setIsYearly] = useState(true);

  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Pricing', path: '/pricing' },
  ];

  const plans = [
    {
      name: 'Free Trial',
      slug: 'free-trial',
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
      cta: 'Get Free Trial',
      highlight: false,
    },
    {
      name: 'Professional',
      slug: 'professional',
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
      slug: 'business',
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
      slug: 'enterprise',
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
    <div className="bg-white text-[#111111] py-12 sm:py-16">
      <SEO
        title="GST Software Pricing for CA Firms & Businesses | GSTRepotis"
        description="Affordable, transparent pricing plans for CA firms, accountants and businesses. Automate bank statement conversions, GSTR-1, GSTR-2B reconciliation and Tally exports."
        canonical="https://gstrepotis.com/pricing"
        type="website"
        breadcrumbs={breadcrumbs}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} className="mb-6" />

        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="outline" className="mb-4">
            Transparent Pricing
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-[#111111]">
            Simple GST Software Pricing for Your Business
          </h1>
          <p className="mt-4 text-base text-[#666666]">
            Save hundreds of manual entry hours. Choose a plan tailored to your CA practice, accounting consultancy, or growing business.
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

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <Link to={`/contact?plan=${p.slug}`}>
                  <Button variant={p.highlight ? 'primary' : 'outline'} className="w-full">
                    {p.cta}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>

        {/* Supporting Internal Links Section */}
        <div className="mt-16 pt-12 border-t border-[#E5E5E5]">
          <h2 className="text-xl font-bold text-[#111111] mb-4">Explore Related GST Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <Link to="/gst-software" className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl hover:border-black transition-colors">
              <p className="font-bold text-[#111111]">GST Software</p>
              <p className="text-[#666666] text-[11px] mt-1">All-in-one compliance and reconciliation platform.</p>
            </Link>
            <Link to="/gst-reconciliation" className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl hover:border-black transition-colors">
              <p className="font-bold text-[#111111]">GST Reconciliation</p>
              <p className="text-[#666666] text-[11px] mt-1">GSTR-2B matching and discrepancy analysis.</p>
            </Link>
            <Link to="/gst-audit-software" className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl hover:border-black transition-colors">
              <p className="font-bold text-[#111111]">GST Audit Workspace</p>
              <p className="text-[#666666] text-[11px] mt-1">Working papers and annual compliance verification.</p>
            </Link>
            <Link to="/contact" className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl hover:border-black transition-colors">
              <p className="font-bold text-[#111111]">Contact Sales</p>
              <p className="text-[#666666] text-[11px] mt-1">Custom enterprise solutions and firm discounts.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AboutPage: React.FC = () => {
  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
  ];

  return (
    <div className="bg-white text-[#111111] py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6">
      <SEO
        title="About GSTRepotis | GST Software & Accounting Automation"
        description="Learn about GSTRepotis, our mission to automate Indian GST compliance, GSTR-2B reconciliation, bank statement conversions, and Tally accounting workflows."
        canonical="https://gstrepotis.com/about"
        type="website"
        breadcrumbs={breadcrumbs}
      />

      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <Badge variant="outline" className="mb-4">
        Our Mission & Platform
      </Badge>
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111111]">
        Engineered for Indian Financial & GST Accuracy
      </h1>
      <p className="mt-4 text-base sm:text-lg text-[#555555] leading-relaxed">
        GSTRepotis was created to solve the massive operational bottlenecks faced by Chartered Accountants, accounting firms, tax professionals, and growing businesses when handling complex bank statements, marketplace sales reports, and monthly GST reconciliations.
      </p>

      <div className="mt-12 space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-[#111111] mb-3">Who GSTRepotis is Built For</h2>
          <p className="text-sm text-[#555555] leading-relaxed">
            Our infrastructure is specifically designed for Indian tax practitioners, CA firms managing high client volumes, tax consultants, corporate accountants, and multi-channel e-commerce sellers navigating the complex GST and Tally ecosystems.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-bold text-base text-[#111111] mb-2">100% Privacy & Data Security</h3>
            <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
              Uploaded bank statement PDFs and sales reports are processed strictly in isolated worker environments. We never sell client data or persist sensitive PDF passwords.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-base text-[#111111] mb-2">Precision Tally XML Architecture</h3>
            <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
              Our proprietary voucher generator outputs compliant Tally Prime and Tally ERP 9 XML files matching standard Indian accounting ledger conventions.
            </p>
          </Card>
        </section>

        <section className="p-6 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl">
          <h2 className="text-xl font-bold text-[#111111] mb-2">Continuous Regulatory Alignment</h2>
          <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">
            As GST Council decisions and CBIC notifications evolve, our validation rules and reconciliation models are continuously updated to ensure your practice remains compliant with Section 16(2)(aa), Rule 36(4), and official GST portal schema changes.
          </p>
        </section>

        <div className="pt-6 flex flex-wrap gap-4">
          <Link to="/login">
            <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Explore Platform
            </Button>
          </Link>
          <Link to="/contact">
            <Button size="lg" variant="outline">
              Contact Our Team
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
