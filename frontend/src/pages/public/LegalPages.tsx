import React from 'react';
import { SEO } from '../../components/common/SEO';
import { Breadcrumbs } from '../../components/common/Breadcrumbs';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const TermsPage: React.FC = () => {
  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Terms and Conditions', path: '/terms-and-conditions' },
  ];

  return (
    <div className="bg-white text-[#111111] py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6">
      <SEO
        title="Terms of Service & User Agreement | GSTRepotis"
        description="Read the terms and conditions for using GSTRepotis software, bank statement conversion, and GST reconciliation services."
        canonical="https://gstrepotis.com/terms-and-conditions"
        type="website"
        breadcrumbs={breadcrumbs}
      />
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <Badge variant="outline" className="mb-4">Legal Agreement</Badge>
      <h1 className="text-4xl font-extrabold tracking-tight text-[#111111]">Terms and Conditions</h1>
      <p className="text-xs text-[#666666] mt-2 mb-8 font-mono">Last Updated: October 2026</p>

      <Card className="p-8 space-y-6 text-xs sm:text-sm text-[#333333] leading-relaxed">
        <div>
          <h2 className="font-bold text-base text-black mb-1.5">1. Acceptance of Terms</h2>
          <p>By accessing or using GSTRepotis, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
        </div>
        <div>
          <h2 className="font-bold text-base text-black mb-1.5">2. Service Usage & Account Integrity</h2>
          <p>GSTRepotis provides automated bank statement parsing, Tally XML voucher generation, GSTR-1 preparation, GSTR-2B reconciliation, and GST audit support tools for accounting professionals and businesses.</p>
        </div>
        <div>
          <h2 className="font-bold text-base text-black mb-1.5">3. Data Confidentiality & Intellectual Property</h2>
          <p>We process uploaded bank statement PDFs and sales records strictly for user-requested extraction and reconciliation purposes. We do not claim ownership over client financial data or distribute user information.</p>
        </div>
        <div>
          <h2 className="font-bold text-base text-black mb-1.5">4. Limitation of Liability</h2>
          <p>GSTRepotis provides automated parsing and reconciliation tools as an aid to accounting and tax professionals. Users remain responsible for reviewing and verifying the accuracy of tax returns prior to final submission on government portals.</p>
        </div>
      </Card>
    </div>
  );
};

export const PrivacyPage: React.FC = () => {
  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Privacy Policy', path: '/privacy-policy' },
  ];

  return (
    <div className="bg-white text-[#111111] py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6">
      <SEO
        title="Privacy Policy & Data Protection | GSTRepotis"
        description="Learn how GSTRepotis protects your confidential financial data, bank statements, and GST information with industry-standard encryption."
        canonical="https://gstrepotis.com/privacy-policy"
        type="website"
        breadcrumbs={breadcrumbs}
      />
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <Badge variant="outline" className="mb-4">Data Security</Badge>
      <h1 className="text-4xl font-extrabold tracking-tight text-[#111111]">Privacy Policy</h1>
      <p className="text-xs text-[#666666] mt-2 mb-8 font-mono">Last Updated: October 2026</p>

      <Card className="p-8 space-y-6 text-xs sm:text-sm text-[#333333] leading-relaxed">
        <div>
          <h2 className="font-bold text-base text-black mb-1.5">1. Information Collection</h2>
          <p>We collect essential account details (Name, Email, Phone number, Business/Firm Name) required to provide secure authentication and manage your workspace.</p>
        </div>
        <div>
          <h2 className="font-bold text-base text-black mb-1.5">2. Handling of Sensitive Financial Files & Passwords</h2>
          <p>Uploaded bank statement PDFs, password credentials provided for encrypted statements, and sales spreadsheets are decoded strictly in-memory during temporary processing worker tasks. Passwords and raw statements are NEVER permanently stored or shared.</p>
        </div>
        <div>
          <h2 className="font-bold text-base text-black mb-1.5">3. Data Security & Encryption</h2>
          <p>All communication between your browser and our servers occurs via HTTPS with TLS 1.3 encryption. Internal databases utilize encrypted storage to protect account information.</p>
        </div>
      </Card>
    </div>
  );
};

export const RefundPolicyPage: React.FC = () => {
  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Refund Policy', path: '/refund-policy' },
  ];

  return (
    <div className="bg-white text-[#111111] py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6">
      <SEO
        title="Refund & Cancellation Policy | GSTRepotis"
        description="Review the refund, billing, and subscription cancellation terms for GSTRepotis software plans."
        canonical="https://gstrepotis.com/refund-policy"
        type="website"
        breadcrumbs={breadcrumbs}
      />
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <Badge variant="outline" className="mb-4">Billing & Cancellations</Badge>
      <h1 className="text-4xl font-extrabold tracking-tight text-[#111111]">Refund & Cancellation Policy</h1>
      <p className="text-xs text-[#666666] mt-2 mb-8 font-mono">Last Updated: October 2026</p>

      <Card className="p-8 space-y-6 text-xs sm:text-sm text-[#333333] leading-relaxed">
        <div>
          <h2 className="font-bold text-base text-black mb-1.5">1. 7-Day Money-Back Guarantee</h2>
          <p>We offer a 7-day money-back guarantee for all new Professional and Business subscription plans if our conversion or reconciliation tools fail to meet your technical requirements.</p>
        </div>
        <div>
          <h2 className="font-bold text-base text-black mb-1.5">2. Subscription Cancellation</h2>
          <p>You can cancel your recurring monthly or annual subscription at any time from your account settings. Your access will continue until the end of the paid billing period.</p>
        </div>
        <div>
          <h2 className="font-bold text-base text-black mb-1.5">3. Requesting a Refund</h2>
          <p>To request a refund under our guarantee policy, please reach out to support@gstrepotis.com with your account email and transaction ID.</p>
        </div>
      </Card>
    </div>
  );
};

export const DisclaimerPage: React.FC = () => {
  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Disclaimer', path: '/disclaimer' },
  ];

  return (
    <div className="bg-white text-[#111111] py-12 sm:py-16 max-w-4xl mx-auto px-4 sm:px-6">
      <SEO
        title="Legal Disclaimer & Professional Advice Notice | GSTRepotis"
        description="Legal disclaimer regarding the use of GSTRepotis software, automated reconciliations, and tax compliance tools."
        canonical="https://gstrepotis.com/disclaimer"
        type="website"
        breadcrumbs={breadcrumbs}
      />
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <Badge variant="outline" className="mb-4">Legal Disclaimer</Badge>
      <h1 className="text-4xl font-extrabold tracking-tight text-[#111111]">Legal & Tax Disclaimer</h1>
      <p className="text-xs text-[#666666] mt-2 mb-8 font-mono">Last Updated: October 2026</p>

      <Card className="p-8 space-y-6 text-xs sm:text-sm text-[#333333] leading-relaxed">
        <div>
          <h2 className="font-bold text-base text-black mb-1.5">1. Software Tool Notice</h2>
          <p>GSTRepotis is an independent software application designed to assist tax professionals, accountants, and businesses in automating data extraction, reconciliation, and format conversion. GSTRepotis is not an official government agency and is not affiliated with the Goods and Services Tax Network (GSTN) or the Central Board of Indirect Taxes and Customs (CBIC).</p>
        </div>
        <div>
          <h2 className="font-bold text-base text-black mb-1.5">2. No Professional Tax Advice</h2>
          <p>The information, blog articles, checklists, and automated calculation tools provided by GSTRepotis are for operational and informational purposes only. They do not constitute formal legal or Chartered Accountancy advice. Users should consult qualified tax advisors or Chartered Accountants for specific tax positions.</p>
        </div>
        <div>
          <h2 className="font-bold text-base text-black mb-1.5">3. Verification Responsibility</h2>
          <p>While GSTRepotis applies rigorous algorithms and mathematical checks, users remain responsible for reviewing all generated return payloads, vouchers, and reconciliation reports prior to filing on government portals or posting to official books of accounts.</p>
        </div>
      </Card>
    </div>
  );
};
