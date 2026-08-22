import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Send, CheckCircle2, ArrowRight, ArrowLeft, Clock, BookOpen, Sparkles } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';

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
    updatedAt: 'August 2026',
    targetPath: '/products/bank-statement-converter',
    targetLabel: 'Open Bank Statement Converter',
    prerequisites: [
      'Original HDFC Bank PDF statement (or password if protected)',
      'Active GST Suite account',
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
        desc: 'If your HDFC PDF is encrypted with a password (e.g. Customer ID or DOB format), enter the password in the prompt field. GST Suite decrypts the text in-memory without storing raw passwords.',
      },
      {
        title: 'Step 3: Review Extracted Multi-Page Data Table',
        desc: 'The AI text parser engine processes all pages in seconds, extracting Transaction Date, Value Date, Narration, Chq/Ref Number, Debit, Credit, and Running Balance.',
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
    updatedAt: 'August 2026',
    targetPath: '/products/ecommerce-gstr1',
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
        title: 'Step 2: Upload Reports to GST Suite GSTR-1 Engine',
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
    title: 'Reconciling TCS & Section 9(5) Liability in GST Suite',
    desc: 'How to match marketplace deducted Tax Collected at Source (TCS) with GSTR-2B credit filings and verify Electronic Commerce Operator (ECO) liability.',
    duration: '5 mins read',
    category: 'Tax Reconciliation',
    updatedAt: 'August 2026',
    targetPath: '/products/ecommerce-gstr1',
    targetLabel: 'Open Tax Reconciliation Workflow',
    prerequisites: [
      'Monthly TCS certificates issued by marketplaces',
      'Form 27EQ / GSTR-2B credit statements',
      'GST Suite E-Commerce Subscription',
    ],
    steps: [
      {
        title: 'Step 1: Import Monthly TCS Deduction Certificate',
        desc: 'Upload the TCS deduction statement issued by Amazon, Flipkart, Meesho, or Swiggy/Zomato for the current tax period.',
      },
      {
        title: 'Step 2: Segregate Section 9(5) Operator Liabilities',
        desc: 'For restaurant and specified ECO services under Section 9(5), separate transactions where liability is discharged directly by the platform operator.',
        tip: 'Section 9(5) transactions must not be double-taxed in your standard GSTR-3B liability computation.',
      },
      {
        title: 'Step 3: Auto-Match TCS Credits with GSTR-2B',
        desc: 'Run automated reconciliation between marketplace TCS deductions and credit reflections in your GSTR-2B portal downloads.',
      },
      {
        title: 'Step 4: Export Audit Summary Sheet for CA Certification',
        desc: 'Download the reconciled Excel audit report with complete discrepancy notes, ready for CA sign-off and annual GST return filings.',
      },
    ],
  },
];

/* ====================================================================
   1. TUTORIALS LISTING PAGE (/tutorials)
   ==================================================================== */
export const TutorialsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white text-[#111111] py-16 max-w-5xl mx-auto px-4">
      <Badge variant="outline" className="mb-4">
        Learning Center
      </Badge>
      <h1 className="text-4xl font-extrabold tracking-tight">Tutorials & Step-by-Step Guides</h1>
      <p className="mt-2 text-sm text-[#666666]">Master bank statement conversions and GSTR-1 filing workflows.</p>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {TUTORIALS_DATA.map((tut) => (
          <Card
            key={tut.slug}
            hoverEffect
            className="p-6 flex flex-col justify-between cursor-pointer group"
            onClick={() => navigate(`/tutorials/${tut.slug}`)}
          >
            <div>
              <Badge variant="neutral" className="mb-3">
                {tut.category}
              </Badge>
              <h3 className="font-bold text-base text-black group-hover:text-[#555555] transition-colors">{tut.title}</h3>
              <p className="text-xs text-[#666666] mt-2 leading-relaxed">{tut.desc}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E5E5E5] flex items-center justify-between text-xs text-[#666666]">
              <span>{tut.duration}</span>
              <Link
                to={`/tutorials/${tut.slug}`}
                className="font-bold text-black group-hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                Read Guide <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ====================================================================
   2. DEDICATED TUTORIAL DETAIL PAGE (/tutorials/:slug)
   ==================================================================== */
export const TutorialDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const guide = TUTORIALS_DATA.find((g) => g.slug === slug) || TUTORIALS_DATA[0];

  const otherGuides = TUTORIALS_DATA.filter((g) => g.slug !== guide.slug);

  return (
    <div className="bg-white text-[#111111] py-12 min-h-[80vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <Link
          to="/tutorials"
          className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#666666] hover:text-black transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to All Tutorials
        </Link>

        {/* Article Meta Header */}
        <div className="space-y-4 pb-8 border-b border-[#E5E5E5]">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="neutral">{guide.category}</Badge>
            <span className="text-xs font-mono text-[#666666] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {guide.duration}
            </span>
            <span className="text-xs font-mono text-[#888888]">• Updated {guide.updatedAt}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#111111] leading-tight">
            {guide.title}
          </h1>

          <p className="text-sm sm:text-base text-[#555555] leading-relaxed font-normal">{guide.desc}</p>
        </div>

        {/* Prerequisites Box */}
        <div className="my-8 p-6 bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl">
          <h4 className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-black" /> What You Will Need (Prerequisites)
          </h4>
          <ul className="space-y-2 text-xs text-[#555555]">
            {guide.prerequisites.map((req, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-8 my-10">
          <h2 className="text-xl font-extrabold text-[#111111] tracking-tight">Step-by-Step Implementation Walkthrough</h2>

          <div className="space-y-6">
            {guide.steps.map((st, idx) => (
              <div key={idx} className="p-6 bg-white border border-[#E5E5E5] rounded-2xl shadow-2xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-black text-white font-mono font-extrabold text-sm flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <h3 className="text-base font-bold text-[#111111]">{st.title}</h3>
                </div>

                <p className="text-xs sm:text-sm text-[#555555] leading-relaxed pl-11">{st.desc}</p>

                {st.tip && (
                  <div className="ml-11 p-3.5 bg-[#FAFAFA] border-l-2 border-black text-xs text-[#333333] rounded-r-lg font-mono flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-black shrink-0 mt-0.5" />
                    <span>
                      <strong>PRO TIP:</strong> {st.tip}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action Card */}
        <div className="my-12 p-8 bg-black text-white rounded-2xl text-center space-y-4 shadow-xl">
          <h3 className="text-2xl font-extrabold tracking-tight">Ready to Try It Yourself?</h3>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
            Experience 100% automated bank statement conversion and e-commerce GSTR-1 filings on GST Suite.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="lg"
              className="bg-white !text-black hover:bg-neutral-100 font-bold border-white"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate(guide.targetPath)}
            >
              {guide.targetLabel}
            </Button>
          </div>
        </div>

        {/* Other Recommended Tutorials */}
        <div className="pt-10 border-t border-[#E5E5E5] space-y-6">
          <h3 className="text-lg font-extrabold text-[#111111]">Other Recommended Guides</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {otherGuides.map((og) => (
              <Card
                key={og.slug}
                hoverEffect
                className="p-5 flex flex-col justify-between cursor-pointer group"
                onClick={() => {
                  window.scrollTo(0, 0);
                  navigate(`/tutorials/${og.slug}`);
                }}
              >
                <div>
                  <Badge variant="neutral" className="mb-2">
                    {og.category}
                  </Badge>
                  <h4 className="font-bold text-sm text-black group-hover:text-[#555555] transition-colors">{og.title}</h4>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E5E5E5] flex items-center justify-between text-xs text-[#666666]">
                  <span>{og.duration}</span>
                  <span className="font-bold text-black group-hover:underline flex items-center gap-1">
                    Read <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ====================================================================
   3. CONTACT SUPPORT PAGE (/contact)
   ==================================================================== */
export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="bg-white text-[#111111] py-16 max-w-4xl mx-auto px-4">
      <div className="text-center max-w-xl mx-auto mb-12">
        <Badge variant="outline" className="mb-3">
          Support & Help
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight">Contact Support</h1>
        <p className="mt-2 text-xs text-[#666666]">Have questions about your bank statement or GSTR-1 files? We are here to help.</p>
      </div>

      <Card className="p-8">
        {submitted ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-[#16A34A] mx-auto mb-3" />
            <h3 className="text-xl font-bold">Thank You!</h3>
            <p className="text-xs text-[#666666] mt-1">Our support team will respond to your message within 2 hours.</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" placeholder="CA Rajesh Sharma" required />
              <Input label="Email Address" type="email" placeholder="rajesh@ca-firm.com" required />
            </div>
            <Input label="Mobile Number" placeholder="+91 98765 43210" required />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111111] mb-1.5">Message</label>
              <textarea
                rows={4}
                required
                placeholder="How can we assist with your bank statement or GST workflow?"
                className="w-full bg-white text-xs text-[#111111] rounded-xl border border-[#E5E5E5] p-3 outline-none focus:border-black"
              />
            </div>
            <Button type="submit" variant="primary" className="w-full" rightIcon={<Send className="w-4 h-4" />}>
              Send Message
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};

/* ====================================================================
   4. REQUEST DEMO PAGE (/request-demo)
   ==================================================================== */
export const RequestDemoPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="bg-white text-[#111111] py-16 max-w-xl mx-auto px-4 text-center">
      <Badge variant="outline" className="mb-3">
        Live Walkthrough
      </Badge>
      <h1 className="text-3xl font-extrabold tracking-tight">Request a Personalized Demo</h1>
      <p className="mt-2 text-xs text-[#666666] mb-8">
        See how GST Suite automates bank statement extraction & GSTR-1 files for your firm.
      </p>

      <Card className="p-8 text-left">
        {submitted ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-[#16A34A] mx-auto mb-3" />
            <h3 className="text-lg font-bold">Demo Scheduled!</h3>
            <p className="text-xs text-[#666666] mt-1">Our product specialist will get in touch shortly.</p>
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
            <Input label="Mobile Number" placeholder="+91 98765 43210" required />
            <Input label="Firm / Business Name" placeholder="Sharma & Associates CAs" required />
            <Button type="submit" variant="primary" className="w-full">
              Schedule Demo Call
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
