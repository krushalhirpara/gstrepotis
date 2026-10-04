import React, { useState } from 'react';
import { SEO } from '../../components/common/SEO';
import { Breadcrumbs } from '../../components/common/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Send, CheckCircle2, ArrowRight, ArrowLeft, Clock, Sparkles, Mail, Phone, MapPin } from 'lucide-react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';

export interface GuideDetail {
  slug: string;
  title: string;
  category: string;
  duration: string;
  desc: string;
  updatedAt: string;
  targetPath: string;
  targetLabel: string;
  prerequisites: string[];
  steps: { title: string; desc: string; tip?: string }[];
}

export const TUTORIALS_DATA: GuideDetail[] = [
  {
    slug: 'hdfc-bank-statement-to-tally-xml',
    title: 'How to Convert HDFC Bank Statement PDF to Tally XML',
    desc: 'Complete step-by-step walkthrough of uploading your HDFC statement, unlocking password-protected PDF files, reviewing extracted debits/credits, and importing vouchers directly into Tally Prime.',
    duration: '4 mins read',
    category: 'Bank Converter',
    updatedAt: 'October 2026',
    targetPath: '/bank-statement-to-tally',
    targetLabel: 'Open Bank Statement Converter',
    prerequisites: [
      'Original HDFC Bank PDF statement (or password if protected)',
      'Active GSTRepotis account',
      'Tally Prime or Tally ERP 9 installed on your desktop',
    ],
    steps: [
      {
        title: 'Step 1: Select HDFC Bank & Drag PDF Statement',
        desc: 'Navigate to the Bank Statement Converter. Select "HDFC Bank" from the supported bank list or search for HDFC. Drag & drop your PDF statement file into the upload zone.',
        tip: 'Supports single-page and multi-page annual HDFC savings, current, and credit card PDF statements.',
      },
      {
        title: 'Step 2: Enter Password (If Protected)',
        desc: 'If your HDFC PDF is encrypted with a password (e.g. Customer ID or DOB format), enter the password in the prompt field. GSTRepotis decrypts the text in-memory without storing raw passwords.',
      },
      {
        title: 'Step 3: Review Extracted Multi-Page Data Table',
        desc: 'The parser engine processes all pages in seconds, extracting Transaction Date, Value Date, Narration, Chq/Ref Number, Debit, Credit, and Running Balance.',
        tip: 'Use the inline table search bar to filter specific suppliers, Paytm, UPI, or salary payments.',
      },
      {
        title: 'Step 4: Export to Tally XML & Import into Tally Prime',
        desc: 'Click "Generate Tally XML" or "Download CSV". Open Tally Prime, navigate to Import > Vouchers, select the generated XML file, and all bank entries will automatically create bank vouchers with exact ledger matching.',
      },
    ],
  },
  {
    slug: 'amazon-flipkart-gstr1-guide',
    title: 'Preparing Amazon & Flipkart Sales Reports for GSTR-1',
    desc: 'Learn how to export B2B and B2C sales summary files, validate HSN codes, compute Section 9(5) liabilities, and generate official GST portal JSON files.',
    duration: '6 mins read',
    category: 'E-Commerce GSTR-1',
    updatedAt: 'October 2026',
    targetPath: '/gstr-1-software',
    targetLabel: 'Open GSTR-1 Engine',
    prerequisites: [
      'Amazon Seller Central / Flipkart Seller Hub account access',
      'B2B Tax Report & B2C Sales Summary CSV files',
      'GSTIN Registration Number',
    ],
    steps: [
      {
        title: 'Step 1: Export Sales Reports from Marketplace Portal',
        desc: 'Log in to Amazon Seller Central or Flipkart Seller Hub. Download the monthly B2B Tax Report and B2C Sales Summary Excel/CSV files.',
        tip: 'Ensure report date range covers the exact tax period (e.g. July 1 to July 31).',
      },
      {
        title: 'Step 2: Upload Reports to GSTRepotis GSTR-1 Engine',
        desc: 'Open the E-Commerce GSTR-1 Engine. Upload your marketplace sales files. The system auto-detects Amazon, Flipkart, Meesho, or Myntra report structures.',
      },
      {
        title: 'Step 3: Validate HSN Codes & State-wise POS Breakdown',
        desc: 'The engine automatically validates 4-digit and 6-digit HSN codes, calculates IGST, CGST, and SGST breakdowns based on Place of Supply (POS), and flags tax discrepancies.',
      },
      {
        title: 'Step 4: Generate & Upload Official GST Portal JSON File',
        desc: 'Click "Generate Official GST JSON". Log in to government GST Portal (gst.gov.in) > Returns Dashboard > GSTR-1 > Upload Offline JSON file for instant filing.',
      },
    ],
  },
  {
    slug: 'tcs-section-95-reconciliation',
    title: 'Reconciling TCS & Section 9(5) Liability in GSTRepotis',
    desc: 'How to match marketplace deducted Tax Collected at Source (TCS) with GSTR-2B credit filings and verify Electronic Commerce Operator (ECO) liability.',
    duration: '5 mins read',
    category: 'Tax Reconciliation',
    updatedAt: 'October 2026',
    targetPath: '/gstr-2b-reconciliation',
    targetLabel: 'Open Tax Reconciliation Workflow',
    prerequisites: [
      'GSTR-27O downloaded from GST portal (TCS credit statement)',
      'Monthly e-commerce marketplace settlement summary report',
    ],
    steps: [
      {
        title: 'Step 1: Import GSTR-27O Government TCS Data',
        desc: 'Upload the monthly TCS statement downloaded from the GST portal showing taxes deducted by Amazon, Flipkart, or Meesho under Section 52.',
      },
      {
        title: 'Step 2: Run Automatic Net Sales vs TCS Match',
        desc: 'GSTRepotis matches the 1% gross TCS deduction with your declared taxable supplies and highlights any variance caused by returns or shipping charges.',
      },
      {
        title: 'Step 3: Account for Section 9(5) Taxable Supplies',
        desc: 'Ensure services supplied through e-commerce operators where liability falls on the operator are segregated and reported accurately in Table 3.1.1.',
      },
    ],
  },
];

/* ====================================================================
   1. TUTORIALS LIST PAGE (/tutorials)
   ==================================================================== */
export const TutorialsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['All', 'Bank Converter', 'E-Commerce GSTR-1', 'Tax Reconciliation'];

  const filteredTutorials = TUTORIALS_DATA.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Tutorials', path: '/tutorials' },
  ];

  return (
    <div className="bg-white text-[#111111] py-12 sm:py-16">
      <SEO
        title="Tutorials & Step-by-Step Guides | GSTRepotis"
        description="Comprehensive guides on converting bank statements, preparing GSTR-1 returns, reconciling TCS, and importing vouchers into Tally Prime."
        canonical="https://gstrepotis.com/tutorials"
        type="website"
        breadcrumbs={breadcrumbs}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} className="mb-6" />

        {/* Hero Section */}
        <div className="max-w-3xl mb-12">
          <Badge variant="outline" className="mb-3">
            Knowledge Base
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111111]">
            Step-by-Step Tutorials & Walkthroughs
          </h1>
          <p className="mt-4 text-base text-[#555555] leading-relaxed">
            Detailed procedural documentation to help you master bank statement extraction, GSTR-1 filing payloads, and Tally Prime integrations.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pb-8 border-b border-[#E5E5E5] mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  selectedCategory === cat
                    ? 'bg-black text-white font-bold'
                    : 'bg-[#F7F7F7] border border-[#E5E5E5] text-[#555555] hover:text-black'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-xs font-mono text-[#111111] rounded-lg border border-[#D4D4D4] px-3 py-2 outline-none focus:border-black"
            />
          </div>
        </div>

        {/* Tutorials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredTutorials.map((tut) => (
            <Card
              key={tut.slug}
              className="flex flex-col justify-between p-6 hover:border-black transition-colors group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] text-[#555555] uppercase tracking-wider font-bold bg-[#F7F7F7] px-2 py-0.5 rounded border border-[#E5E5E5]">
                    {tut.category}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-[#888888]">
                    <Clock className="w-3 h-3" /> {tut.duration}
                  </span>
                </div>
                <Link to={`/tutorials/${tut.slug}`}>
                  <h2 className="text-base font-bold text-[#111111] group-hover:underline">{tut.title}</h2>
                </Link>
                <p className="mt-2 text-xs text-[#666666] leading-relaxed line-clamp-3">{tut.desc}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E5E5E5] flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-[#888888]">{tut.updatedAt}</span>
                <Link
                  to={`/tutorials/${tut.slug}`}
                  className="font-bold text-black flex items-center gap-1 hover:gap-2 transition-all"
                >
                  View Tutorial <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ====================================================================
   2. TUTORIAL DETAIL PAGE (/tutorials/:slug)
   ==================================================================== */
export const TutorialDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const tutorial = TUTORIALS_DATA.find((t) => t.slug === slug);

  if (!tutorial) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Tutorial Not Found</h1>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/tutorials')}>
          Back to Tutorials
        </Button>
      </div>
    );
  }

  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Tutorials', path: '/tutorials' },
    { label: tutorial.title, path: `/tutorials/${tutorial.slug}` },
  ];

  return (
    <div className="bg-white text-[#111111] py-12 sm:py-16">
      <SEO
        title={`${tutorial.title} | GSTRepotis`}
        description={tutorial.desc}
        canonical={`https://gstrepotis.com/tutorials/${tutorial.slug}`}
        type="article"
        breadcrumbs={breadcrumbs}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Breadcrumbs items={breadcrumbs} className="mb-6" />

        <div className="border-b border-[#E5E5E5] pb-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline">{tutorial.category}</Badge>
            <span className="text-xs font-mono text-[#888888] flex items-center gap-1">
              <Clock className="w-3 h-3" /> {tutorial.duration}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111]">{tutorial.title}</h1>
          <p className="mt-3 text-sm text-[#555555] leading-relaxed">{tutorial.desc}</p>
        </div>

        {/* Prerequisites */}
        {tutorial.prerequisites && (
          <div className="mb-10 p-5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl">
            <h2 className="text-xs font-mono uppercase font-bold text-[#555555] tracking-wider mb-3">Prerequisites</h2>
            <ul className="space-y-2 text-xs text-[#111111]">
              {tutorial.prerequisites.map((p, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-8">
          {tutorial.steps.map((st, sidx) => (
            <div key={sidx} className="p-6 bg-white border border-[#E5E5E5] rounded-xl">
              <h2 className="text-base font-bold text-[#111111] mb-2">{st.title}</h2>
              <p className="text-xs sm:text-sm text-[#555555] leading-relaxed">{st.desc}</p>
              {st.tip && (
                <div className="mt-3 p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg text-xs text-[#333333] flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-black shrink-0 mt-0.5" />
                  <span><strong>Tip:</strong> {st.tip}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-[#E5E5E5] flex justify-between items-center">
          <Link to="/tutorials">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              All Tutorials
            </Button>
          </Link>
          <Link to={tutorial.targetPath}>
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              {tutorial.targetLabel}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

/* ====================================================================
   3. CONTACT SUPPORT PAGE (/contact)
   ==================================================================== */
export const ContactPage: React.FC = () => {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const rawPlanParam = searchParams.get('plan');

  const normalizePlan = (raw: string | null): string => {
    if (!raw) return 'Professional';
    const clean = raw.toLowerCase().replace(/[-_]/g, ' ').trim();
    if (clean.includes('free')) return 'Free Trial';
    if (clean.includes('pro')) return 'Professional';
    if (clean.includes('biz') || clean.includes('business')) return 'Business';
    if (clean.includes('ent') || clean.includes('enterprise')) return 'Enterprise';
    return 'Professional';
  };

  const selectedPlan = normalizePlan(rawPlanParam);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    email: '',
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errs.firstName = 'First name is required.';
    }
    if (!formData.lastName.trim()) {
      errs.lastName = 'Last name is required.';
    }
    if (!formData.contactNumber.trim()) {
      errs.contactNumber = 'Contact number is required.';
    } else if (!/^[0-9+\s\-().]{7,25}$/.test(formData.contactNumber.trim())) {
      errs.contactNumber = 'Please enter a valid phone number (at least 7 digits).';
    }
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!formData.message.trim()) {
      errs.message = 'Please enter your message or requirement details.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/pricing-enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          contact_number: formData.contactNumber.trim(),
          email: formData.email.trim().toLowerCase(),
          message: formData.message.trim(),
          selected_plan: selectedPlan,
        }),
      });

      const data = await response.json();

      if (response.ok && (data.success || data.status === 'success')) {
        setSubmitted(true);
      } else {
        if (data.errors && typeof data.errors === 'object') {
          const fieldErrors: Record<string, string> = {};
          if (data.errors.first_name) fieldErrors.firstName = data.errors.first_name[0];
          if (data.errors.last_name) fieldErrors.lastName = data.errors.last_name[0];
          if (data.errors.contact_number) fieldErrors.contactNumber = data.errors.contact_number[0];
          if (data.errors.email) fieldErrors.email = data.errors.email[0];
          if (data.errors.message) fieldErrors.message = data.errors.message[0];
          setErrors(fieldErrors);
        }
        setApiError(data.message || 'Unable to submit your enquiry right now. Please try again.');
      }
    } catch {
      setApiError('Unable to submit your enquiry right now. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <div className="bg-white text-[#111111] py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6">
      <SEO
        title="Contact GSTRepotis | Sales & Support Enquiry"
        description="Tell us about your requirement and our team will contact you. Inquire about GSTRepotis Free Trial, Professional, Business, and Enterprise plans."
        canonical="https://gstrepotis.com/contact"
        type="website"
        breadcrumbs={breadcrumbs}
      />

      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <div className="text-center max-w-xl mx-auto mb-10">
        <Badge variant="outline" className="mb-3">
          Sales & Support Enquiry
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#111111]">Contact GSTRepotis</h1>
        <p className="mt-2 text-sm sm:text-base text-[#666666]">
          Tell us about your requirement and our team will contact you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Contact Info Sidebar */}
        <div className="space-y-4">
          <Card className="p-5 bg-[#FAFAFA] border border-[#E5E5E5]">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-4 h-4 text-black" />
              <h2 className="text-xs font-bold text-black uppercase tracking-wider">Email Support</h2>
            </div>
            <p className="text-xs text-[#555555]">support@gstrepotis.com</p>
            <p className="text-[11px] text-[#888888] mt-1">Average response within 2 hours</p>
          </Card>

          <Card className="p-5 bg-[#FAFAFA] border border-[#E5E5E5]">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="w-4 h-4 text-black" />
              <h2 className="text-xs font-bold text-black uppercase tracking-wider">Business Hours</h2>
            </div>
            <p className="text-xs text-[#555555]">Monday to Saturday</p>
            <p className="text-[11px] text-[#888888] mt-1">9:30 AM – 6:30 PM IST</p>
          </Card>

          <Card className="p-5 bg-[#FAFAFA] border border-[#E5E5E5]">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-4 h-4 text-black" />
              <h2 className="text-xs font-bold text-black uppercase tracking-wider">Location</h2>
            </div>
            <p className="text-xs text-[#555555]">Gujarat, India</p>
            <p className="text-[11px] text-[#888888] mt-1">Indian GST & Accounting Focus</p>
          </Card>
        </div>

        {/* Contact Form */}
        <div className="md:col-span-2">
          <Card className="p-6 sm:p-8 border border-[#E5E5E5]">
            {submitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-12 h-12 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto text-[#16A34A]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-[#111111]">Thank you!</h3>
                <p className="text-xs sm:text-sm text-[#555555] max-w-md mx-auto leading-relaxed">
                  Your enquiry has been submitted successfully. Our team will contact you shortly.
                </p>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 bg-[#F7F7F7] border border-[#E5E5E5] rounded-md font-mono text-xs font-bold text-[#111111]">
                    Plan: {selectedPlan}
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Non-editable selected plan indicator */}
                <div className="flex items-center justify-between p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl mb-4">
                  <span className="text-xs font-mono text-[#666666]">Selected Plan:</span>
                  <span className="text-xs font-mono font-bold text-black bg-white px-2.5 py-1 rounded border border-[#E5E5E5]">
                    {selectedPlan}
                  </span>
                </div>

                {apiError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {apiError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your first name"
                      value={formData.firstName}
                      onChange={(e) => {
                        setFormData({ ...formData, firstName: e.target.value });
                        if (errors.firstName) setErrors({ ...errors, firstName: '' });
                      }}
                      className={`w-full bg-white text-xs text-[#111111] rounded-xl border p-3 outline-none transition-colors ${
                        errors.firstName ? 'border-red-500 focus:border-red-500' : 'border-[#E5E5E5] focus:border-black'
                      }`}
                    />
                    {errors.firstName && <p className="text-[11px] text-red-600 mt-1">{errors.firstName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your last name"
                      value={formData.lastName}
                      onChange={(e) => {
                        setFormData({ ...formData, lastName: e.target.value });
                        if (errors.lastName) setErrors({ ...errors, lastName: '' });
                      }}
                      className={`w-full bg-white text-xs text-[#111111] rounded-xl border p-3 outline-none transition-colors ${
                        errors.lastName ? 'border-red-500 focus:border-red-500' : 'border-[#E5E5E5] focus:border-black'
                      }`}
                    />
                    {errors.lastName && <p className="text-[11px] text-red-600 mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter your contact number"
                    value={formData.contactNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, contactNumber: e.target.value });
                      if (errors.contactNumber) setErrors({ ...errors, contactNumber: '' });
                    }}
                    className={`w-full bg-white text-xs text-[#111111] rounded-xl border p-3 outline-none transition-colors ${
                      errors.contactNumber ? 'border-red-500 focus:border-red-500' : 'border-[#E5E5E5] focus:border-black'
                    }`}
                  />
                  {errors.contactNumber && <p className="text-[11px] text-red-600 mt-1">{errors.contactNumber}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    Email ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    className={`w-full bg-white text-xs text-[#111111] rounded-xl border p-3 outline-none transition-colors ${
                      errors.email ? 'border-red-500 focus:border-red-500' : 'border-[#E5E5E5] focus:border-black'
                    }`}
                  />
                  {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about your requirement..."
                    value={formData.message}
                    onChange={(e) => {
                      setFormData({ ...formData, message: e.target.value });
                      if (errors.message) setErrors({ ...errors, message: '' });
                    }}
                    className={`w-full bg-white text-xs text-[#111111] rounded-xl border p-3 outline-none transition-colors ${
                      errors.message ? 'border-red-500 focus:border-red-500' : 'border-[#E5E5E5] focus:border-black'
                    }`}
                  />
                  {errors.message && <p className="text-[11px] text-red-600 mt-1">{errors.message}</p>}
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={isSubmitting}
                    rightIcon={!isSubmitting ? <Send className="w-4 h-4" /> : undefined}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};


/* ====================================================================
   4. REQUEST DEMO PAGE (/request-demo)
   ==================================================================== */
export const RequestDemoPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Request Demo', path: '/request-demo' },
  ];

  return (
    <div className="bg-white text-[#111111] py-12 sm:py-16 max-w-xl mx-auto px-4 text-center">
      <SEO
        title="Schedule a Personalized Demo | GSTRepotis"
        description="Book a live walkthrough of GSTRepotis with our product team. Discover how to streamline bank conversions and GST reconciliations."
        canonical="https://gstrepotis.com/request-demo"
        type="website"
        breadcrumbs={breadcrumbs}
      />

      <Breadcrumbs items={breadcrumbs} className="mb-6 justify-center" />

      <Badge variant="outline" className="mb-3">
        Live Walkthrough
      </Badge>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#111111]">Request a Live Platform Demo</h1>
      <p className="mt-2 text-xs sm:text-sm text-[#666666] mb-8">
        See how GSTRepotis automates bank statement extraction, GSTR-2B matching, and Tally XML vouchers for your firm.
      </p>

      <Card className="p-8 text-left">
        {submitted ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-[#16A34A] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#111111]">Demo Scheduled!</h3>
            <p className="text-xs text-[#666666] mt-1">Our product specialist will contact you to confirm the time.</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="space-y-4"
          >
            <Input label="Full Name" placeholder="CA Rajesh Sharma" required />
            <Input label="Work Email" type="email" placeholder="rajesh@ca-firm.com" required />
            <Input label="Mobile / WhatsApp Number" placeholder="+91 98765 43210" required />
            <Input label="Firm / Business Name" placeholder="Sharma & Associates CAs" required />
            <Button type="submit" variant="primary" className="w-full">
              Schedule Live Walkthrough
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
