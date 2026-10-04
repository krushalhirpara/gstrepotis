import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/common/SEO';
import { Button } from '../../components/ui/Button';
import { ArrowRight, Home, FileText, Calculator, ShieldCheck, DollarSign, BookOpen, Mail } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="bg-white text-[#111111] min-h-[70vh] flex items-center justify-center py-16 px-4">
      <SEO
        title="Page Not Found | GSTRepotis"
        description="The page you are looking for does not exist or has been moved. Explore GSTRepotis GST software, reconciliation, audit tools, or blog."
        canonical="https://gstrepotis.com/404"
        noIndex={true}
      />

      <div className="max-w-3xl w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F7F7F7] border border-[#E5E5E5] text-2xl font-mono font-extrabold text-black mb-6">
          404
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111111] mb-4">
          Page Not Found
        </h1>

        <p className="text-base text-[#555555] max-w-lg mx-auto mb-10 leading-relaxed">
          The page you requested could not be found. It may have been relocated or removed. Please explore our main tools and resources below.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-left mb-10">
          <Link
            to="/"
            className="p-4 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors block group"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-[#111111] group-hover:underline">
              <Home className="w-4 h-4" /> Home
            </div>
            <p className="text-xs text-[#666666] mt-1">Return to GSTRepotis homepage.</p>
          </Link>

          <Link
            to="/gst-software"
            className="p-4 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors block group"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-[#111111] group-hover:underline">
              <FileText className="w-4 h-4" /> GST Software
            </div>
            <p className="text-xs text-[#666666] mt-1">All-in-one compliance platform.</p>
          </Link>

          <Link
            to="/gst-reconciliation"
            className="p-4 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors block group"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-[#111111] group-hover:underline">
              <Calculator className="w-4 h-4" /> GST Reconciliation
            </div>
            <p className="text-xs text-[#666666] mt-1">GSTR-2B and purchase matching.</p>
          </Link>

          <Link
            to="/gst-audit-software"
            className="p-4 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors block group"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-[#111111] group-hover:underline">
              <ShieldCheck className="w-4 h-4" /> GST Audit
            </div>
            <p className="text-xs text-[#666666] mt-1">Audit working papers & checklists.</p>
          </Link>

          <Link
            to="/pricing"
            className="p-4 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors block group"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-[#111111] group-hover:underline">
              <DollarSign className="w-4 h-4" /> Pricing & Plans
            </div>
            <p className="text-xs text-[#666666] mt-1">Simple transparent subscription tiers.</p>
          </Link>

          <Link
            to="/blog"
            className="p-4 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors block group"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-[#111111] group-hover:underline">
              <BookOpen className="w-4 h-4" /> GST & Tax Blog
            </div>
            <p className="text-xs text-[#666666] mt-1">Practical compliance & Tally guides.</p>
          </Link>
        </div>

        <div className="flex justify-center gap-3">
          <Link to="/">
            <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Go to Homepage
            </Button>
          </Link>
          <Link to="/contact">
            <Button size="lg" variant="outline" leftIcon={<Mail className="w-4 h-4" />}>
              Contact Support
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
