import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ArrowRight } from 'lucide-react';

export const BankConverterLanding: React.FC = () => {
  return (
    <div className="bg-white text-[#111111] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="outline" className="mb-4">
            Product 01 — Bank Statement Converter
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Convert Bank Statements to <span className="underline">Tally XML & CSV</span>
          </h1>
          <p className="mt-4 text-base text-[#666666] leading-relaxed">
            Extract clean transaction narrations, dates, debits, credits, and balances from PDF bank statements with 100% precision.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/dashboard/bank-converter">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Try Bank Converter Now
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="w-10 h-10 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl flex items-center justify-center font-bold mb-4">
              01
            </div>
            <h3 className="text-base font-bold">Password-Protected PDF Support</h3>
            <p className="text-xs text-[#666666] mt-2">
              Pass encrypted statement passwords safely during processing without storing passwords on servers.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-10 h-10 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl flex items-center justify-center font-bold mb-4">
              02
            </div>
            <h3 className="text-base font-bold">Interactive Transaction Review</h3>
            <p className="text-xs text-[#666666] mt-2">
              Filter debits, credits, narrations, edit mistaken rows, and insert missing entries before exporting.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-10 h-10 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl flex items-center justify-center font-bold mb-4">
              03
            </div>
            <h3 className="text-base font-bold">Direct Tally Prime XML Generator</h3>
            <p className="text-xs text-[#666666] mt-2">
              Export native Tally XML files ready to import directly into your Tally company ledgers.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const EcommerceGstr1Landing: React.FC = () => {
  return (
    <div className="bg-white text-[#111111] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="outline" className="mb-4">
            Product 02 — E-Commerce GSTR-1 Engine
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Marketplace Sales Reports to <span className="underline">GST JSON</span>
          </h1>
          <p className="mt-4 text-base text-[#666666] leading-relaxed">
            Process Amazon, Flipkart, Meesho, Myntra sales reports, validate HSN codes, reconcile TCS, and generate official GST portal filing JSON.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/dashboard/ecommerce-gstr1">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Launch GSTR-1 Engine
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-5">
            <h4 className="font-bold text-sm">B2B & B2C Module</h4>
            <p className="text-xs text-[#666666] mt-1">Automatic classification with state Place of Supply grouping.</p>
          </Card>
          <Card className="p-5">
            <h4 className="font-bold text-sm">HSN Code Validator</h4>
            <p className="text-xs text-[#666666] mt-1">Flag missing or incorrect HSN codes and update GST rates in bulk.</p>
          </Card>
          <Card className="p-5">
            <h4 className="font-bold text-sm">TCS Reconciliation</h4>
            <p className="text-xs text-[#666666] mt-1">Compare marketplace deducted TCS with GST Portal 27O data.</p>
          </Card>
          <Card className="p-5">
            <h4 className="font-bold text-sm">Section 9(5) Reporting</h4>
            <p className="text-xs text-[#666666] mt-1">Dedicated section for E-commerce operator liability accounting.</p>
          </Card>
        </div>
      </div>
    </div>
  );
};
