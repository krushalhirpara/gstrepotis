import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const TermsPage: React.FC = () => {
  return (
    <div className="bg-white text-[#111111] py-16 max-w-4xl mx-auto px-4">
      <Badge variant="outline" className="mb-4">Legal Terms</Badge>
      <h1 className="text-4xl font-extrabold tracking-tight">Terms of Service</h1>
      <p className="text-xs text-[#666666] mt-2 mb-8">Last Updated: August 21, 2026</p>

      <Card className="p-8 space-y-6 text-xs text-[#111111] leading-relaxed">
        <div>
          <h3 className="font-bold text-sm text-black mb-1">1. Acceptance of Terms</h3>
          <p>By accessing or using GST Suite, you agree to comply with and be bound by these Terms of Service.</p>
        </div>
        <div>
          <h3 className="font-bold text-sm text-black mb-1">2. Service Usage & Account Integrity</h3>
          <p>GST Suite provides automated bank statement parsing, Tally XML generation, and GSTR-1 preparation services.</p>
        </div>
        <div>
          <h3 className="font-bold text-sm text-black mb-1">3. Data Confidentiality</h3>
          <p>We process bank statement PDFs and sales reports strictly for user-requested extraction.</p>
        </div>
      </Card>
    </div>
  );
};

export const PrivacyPage: React.FC = () => {
  return (
    <div className="bg-white text-[#111111] py-16 max-w-4xl mx-auto px-4">
      <Badge variant="outline" className="mb-4">Data Privacy</Badge>
      <h1 className="text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
      <p className="text-xs text-[#666666] mt-2 mb-8">Last Updated: August 21, 2026</p>

      <Card className="p-8 space-y-6 text-xs text-[#111111] leading-relaxed">
        <div>
          <h3 className="font-bold text-sm text-black mb-1">1. Information Collection</h3>
          <p>We collect user account information (Name, Email, Mobile, User Type) and temporary file uploads required for document extraction.</p>
        </div>
        <div>
          <h3 className="font-bold text-sm text-black mb-1">2. Password Handling</h3>
          <p>Passwords provided for encrypted bank statement PDFs are held transiently in memory and are NEVER permanently logged or stored.</p>
        </div>
      </Card>
    </div>
  );
};

export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="bg-white text-[#111111] py-16 max-w-4xl mx-auto px-4">
      <Badge variant="outline" className="mb-4">Billing Terms</Badge>
      <h1 className="text-4xl font-extrabold tracking-tight">Refund & Cancellation Policy</h1>
      <p className="text-xs text-[#666666] mt-2 mb-8">Last Updated: August 21, 2026</p>

      <Card className="p-8 space-y-6 text-xs text-[#111111] leading-relaxed">
        <div>
          <h3 className="font-bold text-sm text-black mb-1">1. 7-Day Money-Back Guarantee</h3>
          <p>We offer a 7-day money-back guarantee for all new Professional and Business subscription plans if you are unsatisfied with our parsing capabilities.</p>
        </div>
        <div>
          <h3 className="font-bold text-sm text-black mb-1">2. Cancellation Process</h3>
          <p>You may cancel your recurring subscription at any time from your User Dashboard & Billing Settings.</p>
        </div>
      </Card>
    </div>
  );
};
