import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/common/SEO';
import { Breadcrumbs } from '../../components/common/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

interface FeatureItem {
  title: string;
  description: string;
}

interface StepItem {
  step: string;
  title: string;
  desc: string;
}

interface LandingPageProps {
  seoTitle: string;
  seoDescription: string;
  canonical: string;
  breadcrumbs: { label: string; path: string }[];
  h1: string;
  tagline: string;
  badge: string;
  overviewH2: string;
  overviewText: string;
  featuresH2: string;
  features: FeatureItem[];
  workflowH2: string;
  steps: StepItem[];
  whyChooseH2: string;
  whyChoosePoints: string[];
  faqsH2: string;
  faqs: FaqItem[];
  relatedPages: { title: string; path: string; desc: string }[];
  ctaTitle: string;
  ctaSubtitle: string;
}

const BaseSeoPage: React.FC<LandingPageProps> = ({
  seoTitle,
  seoDescription,
  canonical,
  breadcrumbs,
  h1,
  tagline,
  badge,
  overviewH2,
  overviewText,
  featuresH2,
  features,
  workflowH2,
  steps,
  whyChooseH2,
  whyChoosePoints,
  faqsH2,
  faqs,
  relatedPages,
  ctaTitle,
  ctaSubtitle,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="bg-white text-[#111111] min-h-screen py-12 sm:py-16">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={canonical}
        type="website"
        breadcrumbs={breadcrumbs}
        softwareData={{
          name: h1,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web Browser',
          description: seoDescription,
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} className="mb-6" />

        {/* HERO SECTION */}
        <section className="max-w-3xl">
          <Badge variant="outline" className="mb-4">
            {badge}
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#111111] leading-tight">
            {h1}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-[#555555] leading-relaxed">
            {tagline}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Access GSTRepotis Workspace
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline">
                View Pricing Plans
              </Button>
            </Link>
          </div>
        </section>

        {/* OVERVIEW SECTION */}
        <section className="mt-16 pt-12 border-t border-[#E5E5E5]">
          <div className="max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111]">
              {overviewH2}
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[#555555] leading-relaxed">
              {overviewText}
            </p>
          </div>
        </section>

        {/* CORE FEATURES SECTION */}
        <section className="mt-16 pt-12 border-t border-[#E5E5E5]">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] mb-8">
            {featuresH2}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, fidx) => (
              <Card key={fidx} className="p-6 bg-white border border-[#E5E5E5] hover:border-black transition-colors">
                <div className="w-8 h-8 rounded bg-[#F7F7F7] border border-[#E5E5E5] flex items-center justify-center font-mono font-bold text-xs text-[#111111] mb-4">
                  0{fidx + 1}
                </div>
                <h3 className="text-base font-bold text-[#111111] mb-2">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">{feat.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* WORKFLOW / PROCESS SECTION */}
        <section className="mt-16 pt-12 border-t border-[#E5E5E5]">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] mb-8">
            {workflowH2}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {steps.map((st, sidx) => (
              <div key={sidx} className="p-5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-[#555555] block mb-2">{st.step}</span>
                  <h3 className="text-sm font-bold text-[#111111] mb-1.5">{st.title}</h3>
                  <p className="text-xs text-[#666666] leading-relaxed">{st.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WHY CHOOSE SECTION */}
        <section className="mt-16 pt-12 border-t border-[#E5E5E5]">
          <div className="max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] mb-6">
              {whyChooseH2}
            </h2>
            <div className="space-y-3">
              {whyChoosePoints.map((pt, pidx) => (
                <div key={pidx} className="flex items-start gap-3 p-4 bg-white border border-[#E5E5E5] rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">{pt}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQS ACCORDION SECTION */}
        <section className="mt-16 pt-12 border-t border-[#E5E5E5]">
          <div className="max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111] mb-6">
              {faqsH2}
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, fidx) => (
                <div key={fidx} className="border border-[#E5E5E5] rounded-xl overflow-hidden bg-white">
                  <button
                    onClick={() => setOpenFaq(openFaq === fidx ? null : fidx)}
                    className="w-full px-6 py-4 text-left font-bold text-xs sm:text-sm text-[#111111] flex items-center justify-between hover:bg-[#F7F7F7] cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className="font-mono text-sm">{openFaq === fidx ? '−' : '+'}</span>
                  </button>
                  {openFaq === fidx && (
                    <div className="px-6 pb-5 text-xs sm:text-sm text-[#555555] leading-relaxed border-t border-[#E5E5E5] pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INTERNAL LINKING / RELATED MODULES */}
        <section className="mt-16 pt-12 border-t border-[#E5E5E5]">
          <h2 className="text-xl font-bold text-[#111111] mb-6">Related GST Solutions & Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {relatedPages.map((rel, ridx) => (
              <Link
                key={ridx}
                to={rel.path}
                className="p-5 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors block group"
              >
                <h3 className="font-bold text-sm text-[#111111] group-hover:underline">{rel.title}</h3>
                <p className="text-xs text-[#666666] mt-1.5 leading-relaxed">{rel.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* BOTTOM CTA SECTION */}
        <section className="mt-16 p-8 sm:p-12 bg-black text-white rounded-2xl text-center">
          <Badge variant="neutral" className="bg-neutral-800 text-white border-neutral-700 mb-3">
            GET STARTED TODAY
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{ctaTitle}</h2>
          <p className="mt-3 text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed">
            {ctaSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/login">
              <Button size="lg" variant="outline" className="bg-white !text-black hover:bg-neutral-100 font-bold border-white">
                Sign In to Workspace
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="ghost" className="text-white hover:bg-neutral-800">
                Contact Sales & Support
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

// 1. /gst-software
export const GstSoftwarePage: React.FC = () => (
  <BaseSeoPage
    seoTitle="GST Software for Businesses & CA Firms | GSTRepotis"
    seoDescription="Manage GST compliance, returns, reconciliation, reporting and accounting workflows with GSTRepotis GST software for CA firms, accountants and businesses."
    canonical="https://gstrepotis.com/gst-software"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'GST Software', path: '/gst-software' },
    ]}
    h1="GST Software for CA Firms, Accountants & Businesses"
    tagline="Simplify GST compliance, return preparation, reconciliation, audit and financial reporting with GSTRepotis."
    badge="All-in-One GST Platform"
    overviewH2="Complete GST Compliance and Automation Infrastructure"
    overviewText="GSTRepotis delivers a unified accounting and tax compliance engine engineered specifically for Indian tax regulations. From automated GSTR-2B purchase reconciliation to bank statement conversion into Tally-ready vouchers, GSTRepotis reduces manual data entry and prevents costly input tax credit leakages."
    featuresH2="Key Capabilities of GSTRepotis"
    features={[
      {
        title: 'Multi-Client CA Workspace',
        description: 'Manage unlimited client GSTINs with role-based access, return status tracking, and centralized audit trails.',
      },
      {
        title: 'Automated GSTR-2B Reconciliation',
        description: 'Match purchase registers with auto-drafted GSTR-2B statements using fuzzy matching to pinpoint missing or mismatched invoices.',
      },
      {
        title: 'E-Commerce GSTR-1 Generator',
        description: 'Process Amazon, Flipkart, Meesho, and Myntra sales reports, validate HSN codes, and generate filing JSON.',
      },
      {
        title: 'Bank Statement to Tally XML',
        description: 'Convert PDF statements from 18+ Indian banks into native Tally XML vouchers with 100% precision.',
      },
      {
        title: 'GST Audit Working Papers',
        description: 'Systematize turnover reconciliation, ITC eligibility checks, RCM audits, and generate structured audit reports.',
      },
      {
        title: 'TCS & TDS Section 27O Reconciliation',
        description: 'Verify marketplace deducted TCS against GST portal records to ensure accurate compliance credit claims.',
      },
    ]}
    workflowH2="How GSTRepotis Streamlines Your Tax Operations"
    steps={[
      { step: 'STEP 01', title: 'Connect or Upload', desc: 'Upload purchase books, bank PDFs, or e-commerce sales reports into your secure workspace.' },
      { step: 'STEP 02', title: 'Automated Validation', desc: 'Engine validates GSTINs, HSN codes, tax rates, and Place of Supply rules instantly.' },
      { step: 'STEP 03', title: 'Reconcile & Match', desc: 'Review identified matches, partial mismatches, and missing credits with clear variance summaries.' },
      { step: 'STEP 04', title: 'Export & File', desc: 'Download official GST portal JSON files or direct Tally XML vouchers ready to import.' },
    ]}
    whyChooseH2="Why Tax Professionals Rely on GSTRepotis"
    whyChoosePoints={[
      '100% Data Confidentiality: Uploads are processed in isolated worker environments without saving client PDF passwords.',
      'ICAI & GST Act Compliant: Built following CGST Rules, CBIC circulars, and standard Indian auditing standards.',
      'Significant Time Savings: Cut manual spreadsheet reconciliation from days to minutes per client.',
      'Native Tally Prime Integration: Export vouchers directly into your existing Tally accounting ledgers.',
    ]}
    faqsH2="Frequently Asked Questions About GST Software"
    faqs={[
      {
        q: 'What is GSTRepotis and who should use it?',
        a: 'GSTRepotis is a specialized GST compliance and accounting automation platform built for Chartered Accountants, accounting firms, tax practitioners, and growing businesses in India.',
      },
      {
        q: 'Does GSTRepotis require desktop installation?',
        a: 'No, GSTRepotis is 100% web-based. You can securely access your client workspaces and tools from any modern browser without local server setup.',
      },
      {
        q: 'Can I export files directly into Tally Prime?',
        a: 'Yes. GSTRepotis produces native Tally XML files formatted for direct voucher import into Tally Prime and Tally ERP 9.',
      },
    ]}
    relatedPages={[
      { title: 'GST Software for CA Firms', path: '/gst-software-for-ca', desc: 'Specialized features for managing multiple client GST workflows.' },
      { title: 'GSTR-2B Reconciliation', path: '/gstr-2b-reconciliation', desc: 'Automated purchase matching and ITC discrepancy analysis.' },
      { title: 'GST Audit Software', path: '/gst-audit-software', desc: 'Working papers, compliance checklists, and audit reports.' },
    ]}
    ctaTitle="Start Simplifying Your GST Workflows"
    ctaSubtitle="Sign in to your GSTRepotis workspace to streamline reconciliations and returns today."
  />
);

// 2. /gst-software-for-ca
export const GstSoftwareForCaPage: React.FC = () => (
  <BaseSeoPage
    seoTitle="GST Software for CA Firms & Chartered Accountants | GSTRepotis"
    seoDescription="Manage multiple GST clients, returns, reconciliation, reports and GST audit workflows with GSTRepotis for CA firms and professionals."
    canonical="https://gstrepotis.com/gst-software-for-ca"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'GST Software for CA', path: '/gst-software-for-ca' },
    ]}
    h1="GST Software for CA Firms"
    tagline="Manage multiple GST clients, returns, reconciliation, reports and GST audit workflows with GSTRepotis for CA firms and professionals."
    badge="Built for Chartered Accountants"
    overviewH2="Designed Specifically for Indian CA Practice Requirements"
    overviewText="Chartered Accountancy firms manage dozens or hundreds of client GSTINs simultaneously with varying return deadlines. GSTRepotis provides CA practices with a centralized client management dashboard, automated reconciliation engines, and audit documentation tools that eliminate repetitive administrative overhead."
    featuresH2="Firm-Level Capabilities for Practice Productivity"
    features={[
      { title: 'Centralized Client Portfolio', description: 'Monitor GST filing status, pending reconciliations, and compliance alerts across all your clients from one screen.' },
      { title: 'Bulk GSTR-2B Matching', description: 'Run fuzzy matching between client purchase registers and GSTR-2B with automated exception tagging.' },
      { title: 'Audit Working Papers Generator', description: 'Create organized, traceable working papers for annual GST audits and departmental inquiries.' },
      { title: 'Bank PDF Conversion Engine', description: 'Convert messy client PDF bank statements directly to Tally XML vouchers without manual entry.' },
      { title: 'E-Commerce Tax Normalizer', description: 'Process complex Amazon, Flipkart, and Meesho reports for your merchant clients in minutes.' },
      { title: 'Secure Multi-Staff Workflows', description: 'Assign client tasks to article assistants while maintaining partner-level review controls.' },
    ]}
    workflowH2="CA Practice Workflow with GSTRepotis"
    steps={[
      { step: '01. ONBOARD', title: 'Add Client Profile', desc: 'Set up client GSTIN, business type, and filing frequency.' },
      { step: '02. IMPORT', title: 'Upload Client Data', desc: 'Upload purchase books, sales registers, or bank PDFs.' },
      { step: '03. AUDIT', title: 'Run Automated Checks', desc: 'Identify ITC mismatches, HSN errors, and RCM discrepancies.' },
      { step: '04. DELIVER', title: 'Export Reports & XML', desc: 'Provide clients with clean variance reports and Tally XML.' },
    ]}
    whyChooseH2="Why Leading CA Firms Choose GSTRepotis"
    whyChoosePoints={[
      'Handles Peak Filing Pressures: Process large invoice datasets during monthly return filing deadlines without crashes.',
      'Clear ITC Tracking: Prevent client tax notices under Section 16(2)(aa) by ensuring only valid GSTR-2B ITC is claimed.',
      'Professional Client Reporting: Generate branded, easy-to-understand reconciliation summaries for client reviews.',
      'Strict Data Security: Client data is segregated and encrypted with zero persistence of sensitive PDF credentials.',
    ]}
    faqsH2="CA Practice FAQs"
    faqs={[
      { q: 'Can article assistants be given restricted access?', a: 'Yes. You can manage roles so staff can upload and reconcile data while partners approve final audit reports.' },
      { q: 'Is there a limit on the number of clients a CA firm can manage?', a: 'No, professional and business plans are designed to scale smoothly with your growing practice client base.' },
      { q: 'How does this software help during GST audits?', a: 'GSTRepotis automates Section 9, Section 16, and turnover reconciliations, generating structured working papers ready for review.' },
    ]}
    relatedPages={[
      { title: 'GST Audit Software', path: '/gst-audit-software', desc: 'Audit working papers, checklists, and compliance verification.' },
      { title: 'GSTR-2B Reconciliation', path: '/gstr-2b-reconciliation', desc: 'Compare purchase register with GSTR-2B in bulk.' },
      { title: 'Bank Statement to Tally', path: '/bank-statement-to-tally', desc: 'Convert client bank statements directly into Tally vouchers.' },
    ]}
    ctaTitle="Empower Your CA Practice with GSTRepotis"
    ctaSubtitle="Join hundreds of Chartered Accountants who save over 15 hours per client on compliance and reconciliation."
  />
);

// 3. /gst-software-for-accountants
export const GstSoftwareForAccountantsPage: React.FC = () => (
  <BaseSeoPage
    seoTitle="GST Software for Accountants | GSTRepotis"
    seoDescription="Simplify GST compliance, reconciliation, return preparation and client accounting workflows with GSTRepotis."
    canonical="https://gstrepotis.com/gst-software-for-accountants"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'GST Software for Accountants', path: '/gst-software-for-accountants' },
    ]}
    h1="GST Software for Accountants"
    tagline="Simplify GST compliance, reconciliation, return preparation and client accounting workflows with GSTRepotis."
    badge="Accountant Productivity"
    overviewH2="Speed Up Routine Bookkeeping and GST Tasks"
    overviewText="Professional accountants and tax consultants handle heavy monthly volume: converting bank statements, calculating ITC, cross-checking vendor invoices, and preparing return figures. GSTRepotis automates the tedious data entry steps so you can focus on accurate financial reporting."
    featuresH2="Essential Tools for Everyday Accounting"
    features={[
      { title: 'Instant Bank Statement Conversion', description: 'Transform PDF statements from HDFC, SBI, ICICI, and 15+ banks into clean Excel or Tally XML.' },
      { title: 'Vendor ITC Verification', description: 'Quickly verify whether vendor invoices appear in GSTR-2B before finalizing monthly ITC claims.' },
      { title: 'GSTR-1 JSON Creation', description: 'Compile B2B, B2C, and HSN summary tables and generate portal-ready JSON files in seconds.' },
      { title: 'Mismatch Exception Flagging', description: 'Automatically flag invoice number differences, date mismatches, and GST rate discrepancies.' },
      { title: 'Tally Accounting Export', description: 'Export validated vouchers directly into your Tally accounting company without manual re-typing.' },
      { title: 'Multi-Format File Support', description: 'Import Excel, CSV, PDF, and JSON files seamlessly without formatting headaches.' },
    ]}
    workflowH2="Monthly Accounting Routine Simplified"
    steps={[
      { step: '01. EXTRACT', title: 'Convert Bank PDFs', desc: 'Drop bank PDFs into the converter to extract all debit/credit rows.' },
      { step: '02. IMPORT', title: 'Load Purchase Records', desc: 'Upload purchase books and match against downloaded 2B files.' },
      { step: '03. REVIEW', title: 'Check Variances', desc: 'Review vendor mismatches and adjust ITC claim values.' },
      { step: '04. EXPORT', title: 'Generate XML & JSON', desc: 'Export Tally XML for books and GST JSON for portal upload.' },
    ]}
    whyChooseH2="Benefits for Tax Accountants & Bookkeepers"
    whyChoosePoints={[
      'Zero Typing Errors: Eliminates human transposition errors when copying numbers from bank PDFs to Tally.',
      'Accurate GSTR-3B ITC: Never overclaim or underclaim ITC with automated GSTR-2B reconciliation.',
      'Intuitive Web Interface: No complex installations required; get started immediately in your browser.',
    ]}
    faqsH2="Accountant FAQs"
    faqs={[
      { q: 'How accurate is the bank statement converter?', a: 'GSTRepotis uses precise bank-specific parsers matching exact bank statement formats with 100% extraction accuracy.' },
      { q: 'Can I use GSTRepotis for multiple business clients?', a: 'Yes, you can easily create separate client workspaces for every business you manage.' },
    ]}
    relatedPages={[
      { title: 'Bank Statement to Tally', path: '/bank-statement-to-tally', desc: 'Convert bank statements into Tally XML format.' },
      { title: 'GST Reconciliation', path: '/gst-reconciliation', desc: 'Comprehensive reconciliation for books and returns.' },
      { title: 'GSTR-1 Software', path: '/gstr-1-software', desc: 'Prepare GSTR-1 returns with automated HSN validation.' },
    ]}
    ctaTitle="Save Time on Monthly Accounting"
    ctaSubtitle="Switch to automated bank conversion and GST reconciliation today with GSTRepotis."
  />
);

// 4. /gst-software-for-business
export const GstSoftwareForBusinessPage: React.FC = () => (
  <BaseSeoPage
    seoTitle="GST Software for Businesses | GSTRepotis"
    seoDescription="Manage GST compliance, reconciliation, returns and financial workflows with GSTRepotis for growing businesses."
    canonical="https://gstrepotis.com/gst-software-for-business"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'GST Software for Business', path: '/gst-software-for-business' },
    ]}
    h1="GST Software for Businesses"
    tagline="Manage GST compliance, reconciliation, returns and financial workflows with GSTRepotis for growing businesses."
    badge="Business & SME Solutions"
    overviewH2="Protect Cash Flow and Maintain Full Compliance"
    overviewText="For growing Indian enterprises, e-commerce sellers, and SMEs, unverified vendor invoices and manual bank reconciliations drain financial resources. GSTRepotis protects your cash flow by ensuring every rupee of eligible Input Tax Credit (ITC) is claimed while keeping returns 100% compliant."
    featuresH2="Capabilities Tailored for Growing Businesses"
    features={[
      { title: 'Maximized ITC Recovery', description: 'Identify missing vendor invoices before filing GSTR-3B to prevent paying excess cash tax.' },
      { title: 'E-Commerce Marketplace Normalizer', description: 'Consolidate Amazon, Flipkart, Meesho, and offline sales into a unified GST sales register.' },
      { title: 'Bank Reconciliation Automation', description: 'Extract bank transactions into structured accounting records to keep books reconciled.' },
      { title: 'Section 9(5) Tax Compliance', description: 'Ensure e-commerce operator liabilities and TCS credits are accurately accounted for.' },
      { title: 'Vendor Compliance Insights', description: 'Identify non-compliant vendors who fail to upload invoices on the GST portal.' },
      { title: 'Audit-Ready Records', description: 'Maintain structured audit logs and working papers for stress-free statutory audits.' },
    ]}
    workflowH2="How Businesses Use GSTRepotis"
    steps={[
      { step: '01. UPLOAD', title: 'Import Sales & Purchases', desc: 'Import internal ERP/Tally sales and purchase registers.' },
      { step: '02. RECONCILE', title: 'Auto-Match GSTR-2B', desc: 'Instantly match eligible vendor credits and identify gaps.' },
      { step: '03. COMMUNICATE', title: 'Notify Defaulting Vendors', desc: 'Share mismatch lists with vendors to prompt invoice uploads.' },
      { step: '04. COMPLY', title: 'File with Confidence', desc: 'Generate precise filing summaries for GSTR-1 and GSTR-3B.' },
    ]}
    whyChooseH2="Why Businesses Prefer GSTRepotis"
    whyChoosePoints={[
      'Prevent ITC Reversal Penalties: Ensure full compliance with Section 16(2)(aa) rules to avoid tax department notices.',
      'Seamless Tally Integration: Connect your existing Tally accounting workflow with zero operational disruption.',
      'Affordable & Transparent Pricing: Transparent plans designed for Indian small and mid-sized enterprises.',
    ]}
    faqsH2="Business FAQs"
    faqs={[
      { q: 'How does GSTRepotis prevent cash tax overpayment?', a: 'By reconciling your purchase register with GSTR-2B, GSTRepotis identifies all eligible ITC, ensuring you claim full tax credits against your output liability.' },
      { q: 'Is it suitable for multi-state e-commerce sellers?', a: 'Yes. It handles Place of Supply classification and Section 9(5) e-commerce accounting across all Indian states.' },
    ]}
    relatedPages={[
      { title: 'GSTR-2B Reconciliation', path: '/gstr-2b-reconciliation', desc: 'Reconcile vendor ITC and prevent tax credit leakage.' },
      { title: 'Tally Integration', path: '/tally-integration', desc: 'Automate accounting data transfer to Tally.' },
      { title: 'Pricing & Plans', path: '/pricing', desc: 'Simple, transparent pricing for growing businesses.' },
    ]}
    ctaTitle="Upgrade Your Business GST Workflow"
    ctaSubtitle="Take control of your tax compliance, vendor reconciliations, and accounting automation."
  />
);

// 5. /gst-compliance-software
export const GstComplianceSoftwarePage: React.FC = () => (
  <BaseSeoPage
    seoTitle="GST Compliance Software for India | GSTRepotis"
    seoDescription="Organize GST compliance, return preparation, reconciliation, reports and audit workflows with GSTRepotis."
    canonical="https://gstrepotis.com/gst-compliance-software"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'GST Compliance Software', path: '/gst-compliance-software' },
    ]}
    h1="GST Compliance Software"
    tagline="Organize GST compliance, return preparation, reconciliation, reports and audit workflows with GSTRepotis."
    badge="End-to-End Compliance"
    overviewH2="Comprehensive Compliance Across the Entire GST Lifecycle"
    overviewText="India's Goods and Services Tax framework demands strict alignment between internal accounting ledgers, auto-drafted portal statements, and filed returns. GSTRepotis delivers a robust compliance engine covering GSTR-1 preparation, GSTR-3B summary compilation, GSTR-2B reconciliation, and annual audit documentation."
    featuresH2="Comprehensive Compliance Features"
    features={[
      { title: 'Full Return Lifecycle Management', description: 'Prepare GSTR-1, compile GSTR-3B tax figures, and maintain historical filing records in one hub.' },
      { title: 'Rule 36(4) & Section 16(2)(aa) Verification', description: 'Enforce statutory ITC eligibility rules to ensure claimed credits strictly match GSTR-2B.' },
      { title: 'HSN Directory & Tax Rate Validator', description: 'Validate 4, 6, and 8-digit HSN codes against official GST rate tables to prevent misclassifications.' },
      { title: 'Place of Supply (POS) Rule Engine', description: 'Verify IGST, CGST, and SGST tax components based on inter-state and intra-state POS rules.' },
      { title: 'Reverse Charge (RCM) Tracking', description: 'Track and verify inward supplies liable for Reverse Charge Mechanism.' },
      { title: 'Audit Trail & Working Papers', description: 'Generate comprehensive reconciliation sheets for annual GST compliance reviews.' },
    ]}
    workflowH2="4-Step GST Compliance Routine"
    steps={[
      { step: '01. GATHER', title: 'Aggregate Tax Records', desc: 'Consolidate sales registers, purchase books, and e-commerce reports.' },
      { step: '02. VALIDATE', title: 'Rule & Format Check', desc: 'Verify GSTINs, HSN masters, and tax mathematical accuracy.' },
      { step: '03. RECONCILE', title: 'Cross-Match Returns', desc: 'Reconcile 1 vs 3B and 2B vs books to ensure zero discrepancies.' },
      { step: '04. PREPARE', title: 'Generate Filing Payloads', desc: 'Export portal JSON payloads and Tally vouchers.' },
    ]}
    whyChooseH2="Why GSTRepotis is the Preferred Compliance Platform"
    whyChoosePoints={[
      'Always Up to Date: Continuously updated for the latest CBIC circulars, GST portal schema updates, and filing rules.',
      'Audit Defense Ready: Detailed mismatch reports serve as concrete documentation during tax department assessments.',
      'Reduced Compliance Risk: Automated error detection eliminates manual filing inaccuracies and potential interest penalties.',
    ]}
    faqsH2="GST Compliance FAQs"
    faqs={[
      { q: 'What returns does GSTRepotis support?', a: 'GSTRepotis supports GSTR-1 preparation, GSTR-3B tax summary compilation, GSTR-2B reconciliation, TCS Section 27O verification, and annual audit reconciliations.' },
      { q: 'How does it help with Section 16(2)(aa) compliance?', a: 'It matches your purchase register with GSTR-2B, ensuring you only claim ITC on invoices that have actually been uploaded by suppliers.' },
    ]}
    relatedPages={[
      { title: 'GST Software for CA', path: '/gst-software-for-ca', desc: 'Manage compliance across multiple client GSTINs.' },
      { title: 'GSTR-3B Software', path: '/gstr-3b-software', desc: 'Accurate tax liability and ITC summary preparation.' },
      { title: 'GST Audit Software', path: '/gst-audit-software', desc: 'Audit workflows and working paper generation.' },
    ]}
    ctaTitle="Ensure 100% GST Compliance"
    ctaSubtitle="Experience seamless, automated tax compliance for your business or practice."
  />
);

// 6. /gst-reconciliation
export const GstReconciliationPage: React.FC = () => (
  <BaseSeoPage
    seoTitle="GST Reconciliation Software | GSTRepotis"
    seoDescription="Simplify GST reconciliation across returns, books, purchase data and GSTR-2B with GSTRepotis."
    canonical="https://gstrepotis.com/gst-reconciliation"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'GST Reconciliation', path: '/gst-reconciliation' },
    ]}
    h1="GST Reconciliation Software"
    tagline="Simplify GST reconciliation across returns, books, purchase data and GSTR-2B with GSTRepotis."
    badge="Reconciliation Engine"
    overviewH2="The Complete GST Data Cross-Matching Solution"
    overviewText="Discrepancies between purchase registers and GSTR-2B, or between GSTR-1 sales and GSTR-3B tax figures, lead to tax demand notices and lost input tax credit. GSTRepotis provides automated reconciliation algorithms that handle large datasets, fuzzy invoice matching, and clear variance reporting."
    featuresH2="Reconciliation Capabilities"
    features={[
      { title: 'GSTR-2B vs Purchase Register', description: 'Advanced matching on GSTIN, invoice number, date, and tax amounts with intelligent tolerance thresholds.' },
      { title: 'GSTR-1 vs GSTR-3B Sales Cross-Check', description: 'Verify that taxable turnover and output tax declared in GSTR-1 perfectly match figures paid in 3B.' },
      { title: 'GSTR-1 vs Financial Books', description: 'Compare sales invoices recorded in Tally or ERP with GSTR-1 return filings.' },
      { title: 'Fuzzy Invoice Number Matching', description: 'Handle common invoice formatting differences like leading zeros, prefix slashes, and special characters.' },
      { title: 'Mismatch Categorization', description: 'Categorize differences into Exact Match, Probable Match, Value Mismatch, Missing in 2B, and Missing in Books.' },
      { title: 'Actionable Excel Reports', description: 'Download clean Excel sheets with vendor-wise summaries to easily follow up on missing credits.' },
    ]}
    workflowH2="How Automated Reconciliation Works"
    steps={[
      { step: '01. UPLOAD', title: 'Import Purchase & 2B', desc: 'Upload your purchase register and the downloaded GSTR-2B JSON/Excel.' },
      { step: '02. MATCH', title: 'Run Matching Engine', desc: 'Algorithm cross-matches invoice numbers, dates, tax rates, and values.' },
      { step: '03. REVIEW', title: 'Analyze Discrepancies', desc: 'Review exact matches, value variances, and missing vendor invoices.' },
      { step: '04. RESOLVE', title: 'Export Follow-Up Sheets', desc: 'Export supplier-wise mismatch notices and adjust GSTR-3B claims.' },
    ]}
    whyChooseH2="Why GSTRepotis Outperforms Manual Spreadsheets"
    whyChoosePoints={[
      'Massive Scale: Reconcile tens of thousands of invoices in seconds without Excel freezing or calculation errors.',
      'Smart Fuzzy Logic: Catches invoices even if the vendor wrote "INV-01" and you recorded "INV/001".',
      'Defend Against Notices: Maintain a timestamped record of reconciliations to defend against DRC-01B notices.',
    ]}
    faqsH2="GST Reconciliation FAQs"
    faqs={[
      { q: 'What is the difference between GSTR-2A and GSTR-2B reconciliation?', a: 'GSTR-2A is a dynamic monthly statement that updates whenever a vendor files, whereas GSTR-2B is a static, auto-drafted statement generated on the 14th of each month that determines final eligible ITC under CGST Rule 36(4).' },
      { q: 'Can I reconcile data across multiple months or an entire financial year?', a: 'Yes. GSTRepotis supports multi-month and annual cumulative reconciliations for comprehensive year-end audits.' },
    ]}
    relatedPages={[
      { title: 'GSTR-2B Reconciliation', path: '/gstr-2b-reconciliation', desc: 'Dedicated purchase register vs GSTR-2B matching tool.' },
      { title: 'GSTR-1 vs GSTR-3B Guide', path: '/blog/gstr-1-vs-gstr-3b-reconciliation', desc: 'Read our in-depth reconciliation guide on our blog.' },
      { title: 'GST Audit Software', path: '/gst-audit-software', desc: 'Annual GST audit and exception working papers.' },
    ]}
    ctaTitle="Eliminate Reconciliation Headaches"
    ctaSubtitle="Reconcile thousands of invoices in seconds with GSTRepotis."
  />
);

// 7. /gstr-1-software
export const Gstr1SoftwarePage: React.FC = () => (
  <BaseSeoPage
    seoTitle="GSTR-1 Software for GST Return Management | GSTRepotis"
    seoDescription="Manage GSTR-1 data and GST return workflows efficiently with GSTRepotis for businesses, accountants and CA firms."
    canonical="https://gstrepotis.com/gstr-1-software"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'GSTR-1 Software', path: '/gstr-1-software' },
    ]}
    h1="GSTR-1 Software"
    tagline="Manage GSTR-1 data and GST return workflows efficiently with GSTRepotis for businesses, accountants and CA firms."
    badge="Outward Supplies Engine"
    overviewH2="Streamlined GSTR-1 Return Preparation and Filing Payload Generation"
    overviewText="Filing GSTR-1 requires organizing outward sales into specific tables: B2B (Table 4), B2C Large (Table 5), B2C Small (Table 7), Credit/Debit Notes (Table 9), and HSN Summary (Table 12). GSTRepotis automatically classifies your sales transactions, validates HSN codes, and creates official GST portal JSON payloads."
    featuresH2="GSTR-1 Features"
    features={[
      { title: 'Automatic Table Classification', description: 'Automatically routes invoices into B2B, B2CL, B2CS, and export tables based on GSTIN and invoice value.' },
      { title: 'HSN Table 12 Generator', description: 'Aggregates sales by HSN code and UQC with tax rate validation to ensure complete Table 12 compliance.' },
      { title: 'Credit & Debit Note Management', description: 'Reconciles sales returns and adjustments into Table 9CD with original invoice linkages.' },
      { title: 'E-Commerce Marketplace Parser', description: 'Normalizes Amazon, Flipkart, and Meesho sales into GSTR-1 tables with state-wise Place of Supply.' },
      { title: 'Official GST Portal JSON Export', description: 'Generates valid, error-free JSON files ready for direct upload on the GST portal.' },
      { title: 'Pre-Upload Error Verification', description: 'Catches invalid GSTINs, duplicate invoice numbers, and rate mismatches before you upload to the portal.' },
    ]}
    workflowH2="GSTR-1 Preparation in 4 Steps"
    steps={[
      { step: '01. IMPORT', title: 'Upload Sales Data', desc: 'Upload sales registers from Tally, ERP, or e-commerce marketplaces.' },
      { step: '02. VALIDATE', title: 'Auto-Validate Invoices', desc: 'Validate GSTINs, HSN codes, and state tax classifications.' },
      { step: '03. PREVIEW', title: 'Review GSTR-1 Tables', desc: 'Inspect Table 4, Table 7, and Table 12 summary figures.' },
      { step: '04. GENERATE', title: 'Download JSON', desc: 'Export official GST JSON payload for seamless portal filing.' },
    ]}
    whyChooseH2="Why Choose GSTRepotis for GSTR-1"
    whyChoosePoints={[
      'Eliminates Offline Tool Crashes: Avoid the slow, error-prone official offline utility with our lightning-fast web engine.',
      'Handles Heavy Invoice Volume: Process tens of thousands of e-commerce and retail transactions effortlessly.',
      'Accurate HSN Summaries: Prevents common portal upload rejections caused by missing or invalid HSN codes.',
    ]}
    faqsH2="GSTR-1 FAQs"
    faqs={[
      { q: 'When is GSTR-1 due?', a: 'Monthly filers must file GSTR-1 by the 11th of the succeeding month, while quarterly filers (QRMP scheme) file by the 13th following the quarter end.' },
      { q: 'Can I generate GSTR-1 from Amazon or Flipkart sales reports?', a: 'Yes. GSTRepotis has built-in parsers for Amazon, Flipkart, Meesho, Myntra, and custom e-commerce CSV reports.' },
    ]}
    relatedPages={[
      { title: 'GSTR-3B Software', path: '/gstr-3b-software', desc: 'Compile tax liability and ITC summaries for GSTR-3B.' },
      { title: 'GST Software for CA', path: '/gst-software-for-ca', desc: 'Manage GSTR-1 returns across all your practice clients.' },
      { title: 'Tally Integration', path: '/tally-integration', desc: 'Move sales vouchers between GSTRepotis and Tally.' },
    ]}
    ctaTitle="Prepare Error-Free GSTR-1 Returns"
    ctaSubtitle="Generate portal-ready GSTR-1 JSON files with automated validation."
  />
);

// 8. /gstr-3b-software
export const Gstr3bSoftwarePage: React.FC = () => (
  <BaseSeoPage
    seoTitle="GSTR-3B Software & Return Management | GSTRepotis"
    seoDescription="Organize GSTR-3B preparation, GST data and compliance workflows with GSTRepotis."
    canonical="https://gstrepotis.com/gstr-3b-software"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'GSTR-3B Software', path: '/gstr-3b-software' },
    ]}
    h1="GSTR-3B Software"
    tagline="Organize GSTR-3B preparation, GST data and compliance workflows with GSTRepotis."
    badge="Summary Return Platform"
    overviewH2="Accurate Summary Compilation for Stress-Free Monthly Filing"
    overviewText="GSTR-3B is the monthly self-declaration return through which tax liabilities are settled. Inaccuracies between outward tax liabilities (Table 3.1) and eligible input tax credit (Table 4) result in interest liabilities or scrutiny under DRC-01B and DRC-01C. GSTRepotis compiles verified figures directly from reconciled data."
    featuresH2="GSTR-3B Capabilities"
    features={[
      { title: 'Table 3.1 Tax Liability Compilation', description: 'Automatically aggregates outward taxable supplies, zero-rated exports, and reverse charge liabilities.' },
      { title: 'Table 4 Eligible ITC Calculation', description: 'Calculates eligible ITC strictly based on GSTR-2B reconciliation to comply with Section 16(2)(aa).' },
      { title: 'Table 4(B) ITC Reversals', description: 'Tracks mandatory reversals under Rule 38, Rule 42, Rule 43, and other statutory provisions.' },
      { title: 'Table 3.2 Inter-State Supplies', description: 'Computes place-of-supply breakdown for supplies made to unregistered persons and composition dealers.' },
      { title: 'Cross-Check with GSTR-1', description: 'Identifies differences between GSTR-1 sales and GSTR-3B liabilities before filing to prevent DRC-01B notices.' },
      { title: 'Cash & Credit Ledger Preview', description: 'Simulates tax offset using electronic credit and cash ledgers.' },
    ]}
    workflowH2="GSTR-3B Compilation Workflow"
    steps={[
      { step: '01. RECONCILE', title: 'Verify GSTR-1 & 2B', desc: 'Complete outward sales and GSTR-2B inward reconciliation.' },
      { step: '02. COMPILE', title: 'Auto-Calculate Tables', desc: 'GSTRepotis populates Table 3.1, 3.2, and Table 4 figures.' },
      { step: '03. CROSS-CHECK', title: 'Run Variance Checks', desc: 'Verify zero discrepancy against books and filed GSTR-1.' },
      { step: '04. SETTLE', title: 'File with Confidence', desc: 'Use verified summary numbers for portal filing.' },
    ]}
    whyChooseH2="Why Tax Teams Trust GSTRepotis for GSTR-3B"
    whyChoosePoints={[
      'Zero Discrepancy Notice Risk: Keeps GSTR-1 and GSTR-3B figures harmonized, preventing automated DRC-01B scrutiny.',
      'Strict ITC Safety: Ensures you never claim ineligible or un-uploaded vendor ITC, avoiding Section 50 interest penalties.',
      'Centralized Filing Records: Maintain a clear record of monthly calculations and working notes for year-end audits.',
    ]}
    faqsH2="GSTR-3B FAQs"
    faqs={[
      { q: 'What is the due date for GSTR-3B?', a: 'Monthly filers must file GSTR-3B by the 20th of the following month, while quarterly filers file by the 22nd or 24th depending on their state category.' },
      { q: 'Can GSTR-3B be revised after filing?', a: 'No, GSTR-3B cannot be revised. Any corrections must be adjusted in subsequent return periods, making pre-filing accuracy vital.' },
    ]}
    relatedPages={[
      { title: 'GSTR-1 Software', path: '/gstr-1-software', desc: 'Manage outward supplies and prepare GSTR-1 JSON.' },
      { title: 'GSTR-2B Reconciliation', path: '/gstr-2b-reconciliation', desc: 'Determine accurate eligible ITC for Table 4.' },
      { title: 'GST Reconciliation', path: '/gst-reconciliation', desc: 'Complete 1 vs 3B and 2B vs books matching.' },
    ]}
    ctaTitle="Compile Accurate GSTR-3B Figures"
    ctaSubtitle="Ensure verified tax liabilities and safe ITC claims every month."
  />
);

// 9. /gstr-2b-reconciliation
export const Gstr2bReconciliationPage: React.FC = () => (
  <BaseSeoPage
    seoTitle="GSTR-2B Reconciliation Software | GSTRepotis"
    seoDescription="Reconcile GSTR-2B with purchase records and analyze ITC differences using GSTRepotis."
    canonical="https://gstrepotis.com/gstr-2b-reconciliation"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'GSTR-2B Reconciliation', path: '/gstr-2b-reconciliation' },
    ]}
    h1="GSTR-2B Reconciliation Software"
    tagline="Reconcile GSTR-2B with purchase records and analyze ITC differences using GSTRepotis."
    badge="ITC Optimization"
    overviewH2="The Precision Tool for Maximizing Eligible Input Tax Credit"
    overviewText="Under Section 16(2)(aa) of the CGST Act, taxpayers can only claim Input Tax Credit on invoices that appear in their auto-drafted GSTR-2B statement. GSTRepotis compares your purchase register with GSTR-2B data, pinpointing exact matches, value mismatches, and defaulting vendors who have not uploaded invoices."
    featuresH2="Advanced GSTR-2B Matching Features"
    features={[
      { title: 'Intelligent Multi-Criteria Matching', description: 'Matches on GSTIN, invoice number, document date, taxable amount, and tax components with configurable tolerances.' },
      { title: 'Smart Fuzzy Matching Engine', description: 'Resolves formatting variations such as slashes, hyphens, and leading zeros in invoice numbers.' },
      { title: 'Clear 5-Way Status Classification', description: 'Categorizes data into: Exact Match, Probable Match, Amount Discrepancy, Missing in GSTR-2B, and Missing in Books.' },
      { title: 'Vendor Default Tracking', description: 'Generates automated vendor-wise summaries of missing invoices to fast-track follow-up communications.' },
      { title: 'Multi-Period Cumulative Reconciliations', description: 'Reconcile across several months or the entire financial year to claim pending ITC before statutory deadlines.' },
      { title: 'Export Ready for GSTR-3B Table 4', description: 'Provides exact eligible and ineligible ITC figures ready to enter directly into Table 4 of GSTR-3B.' },
    ]}
    workflowH2="GSTR-2B Reconciliation Process"
    steps={[
      { step: '01. UPLOAD', title: 'Upload Purchase & 2B', desc: 'Import your internal purchase register and the GSTR-2B JSON or Excel file.' },
      { step: '02. PROCESS', title: 'Execute Auto-Matching', desc: 'Our engine cross-references thousands of lines in seconds.' },
      { step: '03. INVESTIGATE', title: 'Inspect Differences', desc: 'Filter by vendor, mismatch reason, or high-value variances.' },
      { step: '04. RECOVER', title: 'Export Follow-Up Sheets', desc: 'Send itemized discrepancy reports to suppliers for prompt resolution.' },
    ]}
    whyChooseH2="Why Reconcile GSTR-2B with GSTRepotis"
    whyChoosePoints={[
      'Prevent ITC Reversals & Penalties: Claim only verified credits to avoid interest liabilities under Section 50.',
      'Stop Credit Leakage: Identify vendors who collected GST from you but failed to upload invoices to the government.',
      'Fast Processing Speed: Handles files with over 50,000 invoices in seconds without browser lag or crashing.',
    ]}
    faqsH2="GSTR-2B Reconciliation FAQs"
    faqs={[
      { q: 'Why is GSTR-2B reconciliation mandatory for every business?', a: 'Rule 36(4) and Section 16(2)(aa) prohibit claiming ITC unless the invoice has been reported by the supplier in GSTR-1/IFF and appears in the recipient’s GSTR-2B.' },
      { q: 'What should I do if an invoice appears in books but is missing from GSTR-2B?', a: 'You must follow up with the vendor to file their GSTR-1 return. The credit should not be claimed in GSTR-3B until it reflects in a future GSTR-2B.' },
    ]}
    relatedPages={[
      { title: 'GST Reconciliation Software', path: '/gst-reconciliation', desc: 'Comprehensive reconciliation suite for books and returns.' },
      { title: 'GSTR-2B Guide on Blog', path: '/blog/gstr-2b-reconciliation-guide', desc: 'Read our step-by-step practical reconciliation tutorial.' },
      { title: 'GST Software for CA', path: '/gst-software-for-ca', desc: 'Bulk 2B reconciliation across all your clients.' },
    ]}
    ctaTitle="Protect Your Input Tax Credit Today"
    ctaSubtitle="Stop losing tax credits to vendor filing delays with GSTRepotis."
  />
);

// 10. /gst-audit-software
export const GstAuditSoftwarePage: React.FC = () => (
  <BaseSeoPage
    seoTitle="GST Audit Software for CA Firms & Accountants | GSTRepotis"
    seoDescription="Manage GST audit data, reconciliations, exceptions, working papers and compliance checks with GSTRepotis."
    canonical="https://gstrepotis.com/gst-audit-software"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'GST Audit Software', path: '/gst-audit-software' },
    ]}
    h1="GST Audit Software"
    tagline="Manage GST audit data, reconciliations, exceptions, working papers and compliance checks with GSTRepotis."
    badge="Audit & Scrutiny Defense"
    overviewH2="Systematize Annual GST Audits and Compliance Reviews"
    overviewText="Annual GST compliance reviews, GSTR-9/9C preparations, and departmental scrutiny proceedings require detailed working papers, turnover reconciliations, and verifiable audit trails. GSTRepotis equips CA firms and corporate finance teams with structured audit workspaces and automated compliance checks."
    featuresH2="Comprehensive Audit Capabilities"
    features={[
      { title: 'Turnover & Outward Tax Reconciliation', description: 'Reconcile gross turnover and taxable turnover across Audited Financial Statements, GSTR-1, and GSTR-3B.' },
      { title: 'ITC Audit & Section 16/17 Eligibility', description: 'Systematically audit claimed ITC against GSTR-2B, blocked credits under Section 17(5), and RCM inward supplies.' },
      { title: 'Automated Audit Working Papers', description: 'Generate formatted, traceable working papers ready for partner review and client sign-off.' },
      { title: 'Exception & Discrepancy Tracking', description: 'Log and track management representations, audit observations, and corrective adjustments.' },
      { title: 'RCM Compliance Verification', description: 'Verify reverse charge liability declarations against payments and corresponding ITC claims.' },
      { title: 'Comprehensive Compliance Checklist', description: 'Interactive statutory checklist covering GST registration details, invoicing standards, and e-way bill compliance.' },
    ]}
    workflowH2="Annual GST Audit Workflow"
    steps={[
      { step: '01. UPLOAD', title: 'Import Audited Books & Returns', desc: 'Load trial balance, GSTR-1, GSTR-3B, and annual GSTR-2B.' },
      { step: '02. RECONCILE', title: 'Run Core Reconciliations', desc: 'Execute turnover and ITC cross-checks across all sources.' },
      { step: '03. DOCUMENT', title: 'Log Audit Observations', desc: 'Tag exceptions, rate discrepancies, and management responses.' },
      { step: '04. DELIVER', title: 'Generate Audit Report', desc: 'Export comprehensive audit summary and GSTR-9C working papers.' },
    ]}
    whyChooseH2="Why Chartered Accountants Rely on GSTRepotis for Audits"
    whyChoosePoints={[
      'Structured Working Papers: Eliminates scattered spreadsheets by maintaining all audit notes and reconciliations in a secure digital workspace.',
      'Defensible Audit Trails: Every calculation and variance has a clear, verifiable formula trail for peer reviews and tax scrutiny.',
      'Save Over 60% Audit Time: Automates repetitive mathematical cross-checks, freeing professionals to focus on technical tax issues.',
    ]}
    faqsH2="GST Audit FAQs"
    faqs={[
      { q: 'How does GSTRepotis assist with GSTR-9 and GSTR-9C?', a: 'It automates the reconciliation between audited financial statements, annual books of account, and monthly returns, populating the required reconciliation tables.' },
      { q: 'Can working papers be exported to Excel and PDF?', a: 'Yes. All reconciliation sheets, exception registers, and working papers can be exported in clean, formatted Excel files.' },
    ]}
    relatedPages={[
      { title: 'GST Software for CA Firms', path: '/gst-software-for-ca', desc: 'Practice tools for Chartered Accountants.' },
      { title: 'GST Audit Checklist Article', path: '/blog/gst-audit-checklist-guide', desc: 'Read our comprehensive GST audit checklist guide on our blog.' },
      { title: 'GSTR-2B Reconciliation', path: '/gstr-2b-reconciliation', desc: 'Annual purchase vs 2B credit matching.' },
    ]}
    ctaTitle="Systematize Your GST Audits"
    ctaSubtitle="Build traceable, professional audit working papers with GSTRepotis."
  />
);

// 11. /bank-statement-to-tally
export const BankStatementToTallyPage: React.FC = () => (
  <BaseSeoPage
    seoTitle="Bank Statement to Tally Converter | GSTRepotis"
    seoDescription="Convert bank statement data into structured Tally-compatible formats with GSTRepotis and simplify accounting workflows."
    canonical="https://gstrepotis.com/bank-statement-to-tally"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'Bank Statement to Tally', path: '/bank-statement-to-tally' },
    ]}
    h1="Bank Statement to Tally Converter"
    tagline="Convert bank statement data into structured Tally-compatible formats with GSTRepotis and simplify accounting workflows."
    badge="Accounting Automation"
    overviewH2="Transform Messy Bank PDFs into Clean Tally XML Vouchers"
    overviewText="Manually typing hundreds of bank statement transactions into Tally is one of the biggest time-wasters in accounting. GSTRepotis uses specialized layout extraction algorithms for 18+ Indian banks to convert PDF statements into structured Excel tables and direct Tally XML import vouchers."
    featuresH2="Bank Statement Converter Features"
    features={[
      { title: '18+ Indian Banks Supported', description: 'Engineered for HDFC, SBI, ICICI, Axis, Kotak, Bank of Baroda, PNB, Canara, and other major Indian banks.' },
      { title: 'Password-Protected PDF Support', description: 'Decrypt and process password-protected bank PDFs in-memory with zero server password retention.' },
      { title: 'Interactive Transaction Editor', description: 'Review, edit, add, or delete transaction rows, clean narrations, and adjust ledgers before exporting.' },
      { title: 'Native Tally XML Generation', description: 'Generates compliant Tally Prime and Tally ERP 9 XML vouchers ready for direct import via Banking vouchers.' },
      { title: 'Clean Narration Extraction', description: 'Separates UPI transaction IDs, IMPS reference numbers, NEFT details, and party names automatically.' },
      { title: 'Dual Export to CSV & Excel', description: 'Download clean Excel spreadsheets alongside Tally XML for fast client data analysis.' },
    ]}
    workflowH2="How to Convert Bank Statements to Tally in 4 Steps"
    steps={[
      { step: '01. SELECT', title: 'Choose Bank Format', desc: 'Select your bank (e.g. HDFC, SBI, ICICI) and upload the statement PDF.' },
      { step: '02. EXTRACT', title: 'Automated Extraction', desc: 'The parser extracts transaction dates, narrations, debits, credits, and balances.' },
      { step: '03. REVIEW', title: 'Inspect & Edit', desc: 'Preview rows in the interactive table and adjust narrations or ledgers.' },
      { step: '04. IMPORT', title: 'Download Tally XML', desc: 'Import the generated XML file directly into Tally Prime via Import Data.' },
    ]}
    whyChooseH2="Why Accountants Prefer GSTRepotis for Bank Conversion"
    whyChoosePoints={[
      '100% Extraction Accuracy: Mathematical verification ensures opening balance + credits - debits equals closing balance.',
      'Absolute Security: Bank PDFs are processed in isolated worker sessions and passwords are never permanently logged.',
      'Massive Time Savings: Turn a 50-page PDF with 1,000 entries into Tally vouchers in under 2 minutes.',
    ]}
    faqsH2="Bank Converter FAQs"
    faqs={[
      { q: 'How do I import the generated XML into Tally Prime?', a: 'In Tally Prime, navigate to Import > Transactions > specify file path > select the generated XML file.' },
      { q: 'Does it handle scanned image PDFs?', a: 'GSTRepotis is optimized for standard digital PDF statements downloaded from net banking portals for maximum data fidelity.' },
    ]}
    relatedPages={[
      { title: 'Tally Integration', path: '/tally-integration', desc: 'Explore all accounting automation and Tally export features.' },
      { title: 'GST Software for Accountants', path: '/gst-software-for-accountants', desc: 'Full accounting and tax toolset for professionals.' },
      { title: 'Pricing Plans', path: '/pricing', desc: 'Transparent plans with generous bank conversion limits.' },
    ]}
    ctaTitle="Stop Manual Bank Entry Today"
    ctaSubtitle="Convert your first bank statement to Tally XML in seconds with GSTRepotis."
  />
);

// 12. /tally-integration
export const TallyIntegrationPage: React.FC = () => (
  <BaseSeoPage
    seoTitle="Tally Integration & Accounting Automation | GSTRepotis"
    seoDescription="Simplify accounting workflows and move financial data between GSTRepotis and Tally-compatible formats."
    canonical="https://gstrepotis.com/tally-integration"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'Tally Integration', path: '/tally-integration' },
    ]}
    h1="Tally Integration & Accounting Automation"
    tagline="Simplify accounting workflows and move financial data between GSTRepotis and Tally-compatible formats."
    badge="Accounting Ecosystem"
    overviewH2="Bridging the Gap Between GST Workflows and Tally Prime"
    overviewText="Tally is the backbone of Indian accounting. GSTRepotis complements your existing Tally setup by providing high-speed automation tools that ingest messy external data (bank PDFs, e-commerce CSVs, GSTR-2B records) and convert it into native Tally XML vouchers."
    featuresH2="Integration & Automation Capabilities"
    features={[
      { title: 'Native Tally XML Voucher Engine', description: 'Creates standard Tally XML vouchers for payment, receipt, contra, sales, and purchase entries.' },
      { title: 'Bank Statement Ingestion', description: 'Converts bank transactions into direct Tally banking vouchers with party ledger allocations.' },
      { title: 'E-Commerce Sales Voucher Creator', description: 'Translates Amazon and Flipkart sales into Tally sales vouchers with appropriate GST tax ledgers.' },
      { title: 'No External Tally Plugins Required', description: 'Uses standard Tally XML import functionality built into Tally Prime and Tally ERP 9.' },
      { title: 'Custom Ledger Mapping', description: 'Map bank names, revenue accounts, and tax ledgers to match your existing Tally chart of accounts.' },
      { title: 'Batch Processing Support', description: 'Generate monthly batch vouchers to import thousands of transactions in a single import operation.' },
    ]}
    workflowH2="4 Steps to Tally Automation"
    steps={[
      { step: '01. UPLOAD', title: 'Upload Raw Data', desc: 'Upload bank statements or e-commerce sales files.' },
      { step: '02. MAP', title: 'Set Ledger Names', desc: 'Specify bank ledger and GST duty account names.' },
      { step: '03. GENERATE', title: 'Download XML', desc: 'Download compliant Tally XML voucher payload.' },
      { step: '04. IMPORT', title: 'Import to Tally', desc: 'Use Tally > Import Data > Vouchers to finish.' },
    ]}
    whyChooseH2="Why GSTRepotis is the Ideal Tally Companion"
    whyChoosePoints={[
      'Zero Disruption to Existing Books: Keeps your existing Tally company file structure completely intact.',
      'Works with Tally Prime & ERP 9: Full compatibility with all modern versions of Tally software.',
      'Eliminates Manual Ledger Typing: Converts external statements into ledger entries with zero human entry error.',
    ]}
    faqsH2="Tally Integration FAQs"
    faqs={[
      { q: 'Do I need a Tally TDL (TCP file) to use this?', a: 'No, you do not need custom TDL scripts. GSTRepotis generates native standard Tally XML vouchers that Tally natively accepts via standard XML import.' },
      { q: 'Can I map custom ledger names like "HDFC Current A/c" or "Output IGST 18%"?', a: 'Yes, you can configure your exact ledger names so imported vouchers integrate smoothly with your Tally chart of accounts.' },
    ]}
    relatedPages={[
      { title: 'Bank Statement to Tally', path: '/bank-statement-to-tally', desc: 'Convert bank statement PDFs to Tally XML.' },
      { title: 'GSTR-1 Software', path: '/gstr-1-software', desc: 'Marketplace sales to GST JSON and Tally.' },
      { title: 'GST Software for CA', path: '/gst-software-for-ca', desc: 'Practice tools for Chartered Accountants.' },
    ]}
    ctaTitle="Supercharge Your Tally Accounting"
    ctaSubtitle="Connect your external bank and GST data directly to Tally Prime."
  />
);
