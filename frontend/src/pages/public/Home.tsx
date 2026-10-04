import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/common/SEO';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { FileUpload } from '../../components/ui/ProgressBar';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { ArrowRight, Search, Lock, RefreshCw, Download, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../services/api';

interface TransactionRow {
  id: number;
  transaction_date: string;
  value_date: string;
  narration: string;
  reference_number: string;
  debit: number;
  credit: number;
  balance: number;
}

export const Home: React.FC = () => {
  const [bankSearch, setBankSearch] = useState('');
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [activeStep, setActiveStep] = useState(2);

  // Interactive Bank Converter Modal State
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'done'>('idle');
  const [processingStep, setProcessingStep] = useState(1);
  const [extractedTransactions, setExtractedTransactions] = useState<TransactionRow[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev % 4) + 1);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  const sampleBanks = [
    'HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank',
    'Kotak Mahindra Bank', 'Bank of Baroda', 'IDFC First Bank', 'Yes Bank',
    'RBL Bank', 'Punjab National Bank', 'Canara Bank', 'Union Bank',
    'Indian Bank', 'Bank of India', 'Central Bank', 'Federal Bank',
    'Bandhan Bank', 'UCO Bank'
  ];

  const filteredBanks = sampleBanks.filter((b) =>
    b.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const marketplaces = [
    'Amazon India', 'Flipkart', 'Meesho', 'JioMart', 'Myntra', 'GlowRoad',
    'Paytm Mall', 'Snapdeal', 'Shop101', 'LimeRoad', 'CityMall'
  ];

  const faqs = [
    {
      q: 'What is GST software and why is it needed?',
      a: 'GST software automates return filing, invoice matching, and reconciliation between internal accounting books and official GST portal records (like GSTR-2B), preventing tax credit leakage and ensuring compliance with Section 16(2)(aa) of the CGST Act.',
    },
    {
      q: 'Who can use GSTRepotis?',
      a: 'GSTRepotis is purpose-built for Chartered Accountants (CAs), CA firms, tax practitioners, corporate finance teams, accountants, and e-commerce businesses operating in India.',
    },
    {
      q: 'Is GSTRepotis suitable for CA firms managing multiple clients?',
      a: 'Yes. GSTRepotis includes dedicated multi-client workspace management allowing CA firms to track filing statuses, perform bulk GSTR-2B reconciliations, and generate audit working papers for all their clients in one place.',
    },
    {
      q: 'What is GSTR-2B reconciliation and why is it important?',
      a: 'GSTR-2B reconciliation is the process of matching purchase invoices in your accounting records with auto-drafted ITC statements in GSTR-2B. Under Indian tax law, you cannot claim ITC in GSTR-3B unless the supplier has filed their return and the invoice reflects in GSTR-2B.',
    },
    {
      q: 'Can bank statements be converted into Tally XML format?',
      a: 'Yes. GSTRepotis converts PDF bank statements from 18+ major Indian banks (including password-protected PDFs) directly into native Tally XML vouchers ready to import into Tally Prime and Tally ERP 9.',
    },
    {
      q: 'Is client financial and GST data secure?',
      a: 'Yes. GSTRepotis uses isolated worker processing environments. Password-protected PDFs are decrypted in-memory only and passwords are never logged or stored.',
    },
  ];

  // Open Bank Converter Modal for selected bank
  const handleBankCardClick = (bankName: string) => {
    setSelectedBank(bankName);
    setSelectedFile(null);
    setIsProtected(false);
    setPassword('');
    setProcessingState('idle');
    setExtractedTransactions([]);
    setIsBankModalOpen(true);
  };

  const handleFileSelect = (files: FileList | File[]) => {
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleStartExtraction = () => {
    if (!selectedFile && !selectedBank) return;
    setProcessingState('processing');
    setProcessingStep(1);

    setTimeout(() => setProcessingStep(2), 600);
    setTimeout(() => setProcessingStep(3), 1200);
    setTimeout(() => setProcessingStep(4), 1800);
    setTimeout(() => {
      const formData = new FormData();
      if (selectedBank) formData.append('bank_code', selectedBank);
      if (password) formData.append('password', password);
      if (selectedFile) formData.append('file', selectedFile);

      apiFetch('/api/bank-statements/process', {
        method: 'POST',
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'success' && data.transactions) {
            setExtractedTransactions(data.transactions.map((tx: any, idx: number) => ({ id: idx + 1, ...tx })));
            setProcessingState('done');
          } else {
            alert(data.message || 'Unable to extract the complete statement. Please verify the PDF format or try another supported bank format.');
            setProcessingState('idle');
          }
        })
        .catch(() => {
          alert('Unable to extract the complete statement. Please verify the PDF format or try another supported bank format.');
          setProcessingState('idle');
        });
    }, 2200);
  };

  const handleDownloadCsv = () => {
    apiFetch('/api/bank-statements/export-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: extractedTransactions }),
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedBank?.replace(/\s+/g, '_')}_Transactions.csv`;
        a.click();
      });
  };

  const handleDownloadTallyXml = () => {
    apiFetch('/api/bank-statements/export-xml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bank_name: selectedBank, transactions: extractedTransactions }),
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedBank?.replace(/\s+/g, '_')}_Tally_Vouchers.xml`;
        a.click();
      });
  };

  const transactionColumns: Column<TransactionRow>[] = [
    { key: 'transaction_date', header: 'TX DATE' },
    { key: 'narration', header: 'NARRATION / DESCRIPTION' },
    { key: 'reference_number', header: 'REF NO' },
    {
      key: 'debit',
      header: 'DEBIT (DR)',
      render: (r) => (r.debit > 0 ? <span className="font-mono font-bold text-[#DC2626]">₹{r.debit.toFixed(2)}</span> : '—'),
    },
    {
      key: 'credit',
      header: 'CREDIT (CR)',
      render: (r) => (r.credit > 0 ? <span className="font-mono font-bold text-[#16A34A]">₹{r.credit.toFixed(2)}</span> : '—'),
    },
    {
      key: 'balance',
      header: 'BALANCE',
      render: (r) => <span className="font-mono font-bold text-[#111111]">₹{r.balance.toFixed(2)}</span>,
    },
  ];

  return (
    <div className="bg-white text-[#111111] overflow-hidden">
      <SEO
        title="GST Software for CA Firms & Businesses | GSTRepotis"
        description="GSTRepotis is an all-in-one GST software for CA firms, accountants and businesses. Manage GST returns, GSTR-1, GSTR-3B, GSTR-2B reconciliation, GST audit and financial reports from one platform."
        canonical="https://gstrepotis.com/"
        type="website"
        softwareData={{
          name: 'GSTRepotis',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web Browser',
          description: 'All-in-one GST software for CA firms, accountants and businesses. Manage GST returns, GSTR-1, GSTR-3B, GSTR-2B reconciliation, GST audit and financial reports from one platform.',
        }}
      />

      {/* 1. HERO SECTION */}
      <section className="relative pt-16 sm:pt-24 pb-20 border-b border-[#E5E5E5] bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* LEFT: EDITORIAL TEXT (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F7F7F7] border border-[#E5E5E5] rounded-md font-mono text-[11px] font-bold text-[#555555] uppercase tracking-wider">
                <span>ALL-IN-ONE GST PLATFORM</span>
              </div>

              {/* Exact H1 requested in prompt */}
              <h1 className="editorial-title text-4xl sm:text-6xl font-extrabold tracking-tight text-[#111111] leading-tight">
                GST Software for CA Firms, Accountants & Businesses
              </h1>

              {/* Exact Supporting Copy requested in prompt */}
              <p className="text-base sm:text-lg text-[#555555] max-w-xl leading-relaxed font-normal">
                Simplify GST compliance, return preparation, reconciliation, audit and financial reporting with GSTRepotis.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link to="/login">
                  <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Sign In to Workspace
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button size="lg" variant="outline">
                    View Pricing Plans
                  </Button>
                </Link>
              </div>

              <div className="pt-4 flex items-center gap-6 font-mono text-[11px] text-[#888888] uppercase tracking-wider">
                <span>✓ 18+ BANKS</span>
                <span>•</span>
                <span>✓ TALLY XML</span>
                <span>•</span>
                <span>✓ GST PORTAL JSON</span>
              </div>
            </div>

            {/* RIGHT: TECHNICAL PRODUCT VISUALIZATION (5 Cols) */}
            <div className="lg:col-span-5">
              <div className="border border-[#E5E5E5] rounded-xl bg-white p-6 shadow-xl space-y-5 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                  <div>
                    <span className="text-[10px] text-[#888888] uppercase tracking-widest block">FILE RECEIVED</span>
                    <span className="font-bold text-[#111111] text-xs">amazon_sales_august.xlsx</span>
                  </div>
                  <span className="px-2 py-0.5 bg-[#F7F7F7] border border-[#E5E5E5] text-[10px] font-bold text-[#16A34A] rounded">
                    PROCESSING
                  </span>
                </div>

                {/* Animated Steps */}
                <div className="space-y-3 pt-1">
                  <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                    activeStep >= 1 ? 'border-black bg-[#FAFAFA]' : 'border-[#E5E5E5] text-[#888888]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">01</span>
                      <span>FILE DETECTION</span>
                    </div>
                    <span className={activeStep >= 1 ? 'text-[#16A34A] font-bold' : ''}>
                      {activeStep >= 1 ? '✓ COMPLETE' : '○ WAITING'}
                    </span>
                  </div>

                  <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                    activeStep >= 2 ? 'border-black bg-[#FAFAFA]' : 'border-[#E5E5E5] text-[#888888]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">02</span>
                      <span>DATA EXTRACTION</span>
                    </div>
                    <span className={activeStep >= 2 ? 'text-[#16A34A] font-bold' : ''}>
                      {activeStep >= 2 ? '✓ COMPLETE' : '○ PROCESSING'}
                    </span>
                  </div>

                  <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                    activeStep >= 3 ? 'border-black bg-[#FAFAFA]' : 'border-[#E5E5E5] text-[#888888]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">03</span>
                      <span>GST & HSN VALIDATION</span>
                    </div>
                    <span className={activeStep >= 3 ? 'text-[#16A34A] font-bold' : activeStep === 2 ? 'text-[#D97706] font-bold animate-pulse' : ''}>
                      {activeStep >= 3 ? '✓ VALIDATED' : activeStep === 2 ? '● IN PROGRESS' : '○ PENDING'}
                    </span>
                  </div>

                  <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                    activeStep >= 4 ? 'border-black bg-[#FAFAFA]' : 'border-[#E5E5E5] text-[#888888]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">04</span>
                      <span>TALLY XML & GST JSON</span>
                    </div>
                    <span className={activeStep >= 4 ? 'text-[#16A34A] font-bold' : ''}>
                      {activeStep >= 4 ? '✓ READY' : '○ QUEUED'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-between text-[11px]">
                  <span className="text-[#555555]">Extracted 840 Tax Invoices</span>
                  <span className="font-bold text-[#111111]">100% Precision</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. COMPLETE GST COMPLIANCE PLATFORM (H2) */}
      <section className="py-20 border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="tech-label block mb-2">END-TO-END SUITE</span>
            <h2 className="editorial-title text-3xl sm:text-4xl font-extrabold text-[#111111]">
              Complete GST Compliance Platform
            </h2>
            <p className="text-sm sm:text-base text-[#555555] mt-3 leading-relaxed">
              From monthly GSTR-1 preparation and GSTR-3B compilation to automated GSTR-2B purchase reconciliation and annual audit working papers, GSTRepotis unifies all critical tax compliance modules into a single, cohesive cloud platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link to="/gst-compliance-software" className="p-6 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors block group">
              <span className="font-mono text-xs font-bold text-[#555555] block mb-2">MODULE 01</span>
              <h3 className="font-bold text-base text-[#111111] group-hover:underline">GST Compliance Software</h3>
              <p className="text-xs text-[#666666] mt-2 leading-relaxed">
                Organize filing calendars, validate HSN directories, and manage return obligations across multiple client GSTINs.
              </p>
            </Link>

            <Link to="/gst-reconciliation" className="p-6 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors block group">
              <span className="font-mono text-xs font-bold text-[#555555] block mb-2">MODULE 02</span>
              <h3 className="font-bold text-base text-[#111111] group-hover:underline">GST Reconciliation</h3>
              <p className="text-xs text-[#666666] mt-2 leading-relaxed">
                Cross-match purchase registers, GSTR-2B auto-drafted statements, and GSTR-1 vs 3B liabilities with fuzzy logic.
              </p>
            </Link>

            <Link to="/gst-audit-software" className="p-6 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors block group">
              <span className="font-mono text-xs font-bold text-[#555555] block mb-2">MODULE 03</span>
              <h3 className="font-bold text-base text-[#111111] group-hover:underline">GST Audit & Compliance</h3>
              <p className="text-xs text-[#666666] mt-2 leading-relaxed">
                Generate structured audit working papers, turnover reconciliations, exception registers, and statutory checklists.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. GST RETURN MANAGEMENT (H2) */}
      <section className="py-20 border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="tech-label">RETURN WORKFLOWS</span>
              <h2 className="editorial-title text-3xl sm:text-4xl font-extrabold text-[#111111]">
                GST Return Management
              </h2>
              <p className="text-sm text-[#555555] leading-relaxed">
                Streamline end-to-end GST return preparation. Ingest raw billing registers, normalize multi-state invoices, validate Place of Supply rules, and prepare official filing JSON files without offline utility crashes.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium">
                <Link to="/gstr-1-software" className="text-black font-bold flex items-center gap-1 hover:underline">
                  GSTR-1 Software <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link to="/gstr-3b-software" className="text-black font-bold flex items-center gap-1 hover:underline">
                  GSTR-3B Software <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <Card className="p-6 bg-[#FAFAFA] border border-[#E5E5E5] space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-[#E5E5E5]">
                  <span className="font-bold text-[#111111]">RETURN FILING STATUS</span>
                  <span className="text-[#16A34A] font-bold">ALL VALIDATED</span>
                </div>
                <div className="p-3 bg-white border border-[#E5E5E5] rounded flex justify-between items-center">
                  <span>GSTR-1 (Outward Supplies)</span>
                  <span className="font-bold text-[#16A34A]">JSON Payload Ready</span>
                </div>
                <div className="p-3 bg-white border border-[#E5E5E5] rounded flex justify-between items-center">
                  <span>GSTR-3B (Tax Liability & ITC)</span>
                  <span className="font-bold text-[#16A34A]">Reconciled with 2B</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 4. GSTR-1 MANAGEMENT (H2) & GSTR-3B PREPARATION (H2) */}
      <section className="py-20 border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* GSTR-1 Management */}
            <Card className="p-8 bg-white border border-[#E5E5E5]">
              <span className="font-mono text-xs font-bold text-[#555555] block mb-2">OUTWARD SUPPLIES</span>
              <h2 className="editorial-title text-2xl sm:text-3xl font-extrabold text-[#111111] mb-4">
                GSTR-1 Management
              </h2>
              <p className="text-xs sm:text-sm text-[#555555] leading-relaxed mb-6">
                Automate outward tax invoice classification across Table 4 (B2B), Table 7 (B2C), and Table 12 (HSN summary). Process marketplace CSV reports and validate GSTINs in bulk before generating portal JSON.
              </p>
              <ul className="space-y-2 text-xs text-[#333333] mb-6">
                <li className="flex items-center gap-2">✓ Automatic B2B and B2C Place of Supply grouping</li>
                <li className="flex items-center gap-2">✓ HSN directory validation with tax rate cross-check</li>
                <li className="flex items-center gap-2">✓ E-commerce marketplace report normalization</li>
              </ul>
              <Link to="/gstr-1-software">
                <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Explore GSTR-1 Software
                </Button>
              </Link>
            </Card>

            {/* GSTR-3B Preparation */}
            <Card className="p-8 bg-white border border-[#E5E5E5]">
              <span className="font-mono text-xs font-bold text-[#555555] block mb-2">MONTHLY SUMMARY</span>
              <h2 className="editorial-title text-2xl sm:text-3xl font-extrabold text-[#111111] mb-4">
                GSTR-3B Preparation
              </h2>
              <p className="text-xs sm:text-sm text-[#555555] leading-relaxed mb-6">
                Compile verified Table 3.1 tax liabilities and compute eligible Table 4 Input Tax Credit strictly from GSTR-2B reconciliations, eliminating the risk of automated DRC-01B and DRC-01C notices.
              </p>
              <ul className="space-y-2 text-xs text-[#333333] mb-6">
                <li className="flex items-center gap-2">✓ Automated Table 3.1 outward liability aggregation</li>
                <li className="flex items-center gap-2">✓ Section 16(2)(aa) compliant Table 4 eligible ITC</li>
                <li className="flex items-center gap-2">✓ Rule 42/43 ITC reversal calculations</li>
              </ul>
              <Link to="/gstr-3b-software">
                <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Explore GSTR-3B Software
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* 5. GSTR-2B RECONCILIATION (H2) & GST RECONCILIATION (H2) */}
      <section className="py-20 border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <span className="tech-label">INPUT TAX CREDIT RECOVERY</span>
              <h2 className="editorial-title text-3xl sm:text-4xl font-extrabold text-[#111111]">
                GSTR-2B Reconciliation
              </h2>
              <p className="text-sm text-[#555555] leading-relaxed">
                Under Section 16(2)(aa), claiming un-uploaded vendor ITC leads to heavy interest penalties. GSTRepotis cross-matches your internal purchase register with official GSTR-2B statements using intelligent fuzzy matching.
              </p>
              <div className="space-y-2 text-xs text-[#333333]">
                <p className="flex items-center gap-2">✓ 5-way status: Exact Match, Value Mismatch, Missing in 2B, Missing in Books</p>
                <p className="flex items-center gap-2">✓ Supplier-wise mismatch summaries for instant follow-up</p>
                <p className="flex items-center gap-2">✓ Multi-month cumulative reconciliations for year-end claims</p>
              </div>
              <div className="pt-2">
                <Link to="/gstr-2b-reconciliation">
                  <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Explore GSTR-2B Reconciliation
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <Card className="p-6 bg-[#FAFAFA] border border-[#E5E5E5]">
                <div className="font-mono text-xs space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[#E5E5E5]">
                    <span className="font-bold text-[#111111]">GSTR-2B VS PURCHASE REGISTER</span>
                    <span className="text-[#16A34A] font-bold">MATCHED 100%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="p-2 bg-white border border-[#E5E5E5] rounded">
                      <span className="text-[#888888] block text-[10px]">BOOK ITC</span>
                      <span className="font-bold">₹1,42,800</span>
                    </div>
                    <div className="p-2 bg-white border border-[#E5E5E5] rounded">
                      <span className="text-[#888888] block text-[10px]">GSTR-2B ITC</span>
                      <span className="font-bold">₹1,42,800</span>
                    </div>
                    <div className="p-2 bg-white border border-[#E5E5E5] rounded">
                      <span className="text-[#888888] block text-[10px]">VARIANCE</span>
                      <span className="font-bold text-[#16A34A]">₹0.00</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="pt-12 border-t border-[#E5E5E5]">
            <div className="max-w-3xl">
              <span className="tech-label block mb-2">CROSS-MODULE MATCHING</span>
              <h2 className="editorial-title text-3xl sm:text-4xl font-extrabold text-[#111111] mb-4">
                GST Reconciliation
              </h2>
              <p className="text-sm text-[#555555] leading-relaxed mb-6">
                Beyond purchase matching, GSTRepotis automates GSTR-1 vs GSTR-3B turnover comparisons, e-Way bill vs sales register cross-checks, and marketplace TCS Section 27O reconciliations to ensure complete data integrity.
              </p>
              <Link to="/gst-reconciliation">
                <Button variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Learn More About GST Reconciliation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. GST AUDIT & COMPLIANCE (H2) */}
      <section className="py-20 border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="tech-label block mb-2">AUDIT INFRASTRUCTURE</span>
            <h2 className="editorial-title text-3xl sm:text-4xl font-extrabold text-[#111111]">
              GST Audit & Compliance
            </h2>
            <p className="text-sm sm:text-base text-[#555555] mt-3 leading-relaxed">
              Equip your firm with structured audit working papers, turnover reconciliation sheets, and compliance verification checklists for GSTR-9/9C annual returns and departmental scrutiny assessments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white border border-[#E5E5E5]">
              <h3 className="font-bold text-base text-[#111111] mb-2">Turnover Reconciliations</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Reconcile gross turnover across audited financial statements, general ledgers, GSTR-1 filings, and GSTR-3B returns.
              </p>
            </Card>
            <Card className="p-6 bg-white border border-[#E5E5E5]">
              <h3 className="font-bold text-base text-[#111111] mb-2">ITC & RCM Audits</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Verify Section 17(5) blocked credit classifications, reverse charge liabilities, and cumulative 2B eligibility.
              </p>
            </Card>
            <Card className="p-6 bg-white border border-[#E5E5E5]">
              <h3 className="font-bold text-base text-[#111111] mb-2">Working Papers Export</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Generate clean, formatted Excel working papers with complete formula audit trails for partner reviews.
              </p>
            </Card>
          </div>

          <div className="mt-8">
            <Link to="/gst-audit-software">
              <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Explore GST Audit Software
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. BANK STATEMENT TO TALLY CONVERSION (H2) */}
      <section className="py-20 border-b border-[#E5E5E5]" id="bank-grid-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="tech-label block mb-2">ACCOUNTING AUTOMATION</span>
            <h2 className="editorial-title text-3xl sm:text-4xl font-extrabold text-[#111111]">
              Bank Statement to Tally Conversion
            </h2>
            <p className="text-xs sm:text-sm text-[#555555] mt-2">
              Select any bank below to instantly upload and convert PDF statement files into Tally XML & CSV table rows.
            </p>

            <div className="mt-6 relative max-w-md mx-auto">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
              <input
                type="text"
                placeholder="Search bank format (HDFC, SBI, ICICI, Axis)..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="w-full bg-white text-xs font-mono text-[#111111] rounded-lg border border-[#D4D4D4] pl-10 pr-4 py-2.5 outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Bank Cards Grid with Click Handler */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-10">
            {filteredBanks.map((bank, i) => {
              const isSelected = selectedBank === bank;
              return (
                <div
                  key={i}
                  onClick={() => handleBankCardClick(bank)}
                  className={`p-4 rounded-lg text-center cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-neutral-50 border-2 border-black ring-2 ring-black shadow-md'
                      : 'bg-white border border-[#E5E5E5] hover:border-black shadow-xs'
                  }`}
                >
                  <div className="w-7 h-7 rounded bg-[#F7F7F7] text-black font-mono font-bold text-xs flex items-center justify-center mx-auto mb-2 border border-[#E5E5E5]">
                    {bank.substring(0, 2).toUpperCase()}
                  </div>
                  <p className="text-xs font-bold text-[#111111] truncate">{bank}</p>
                  <span className="font-mono text-[10px] text-[#16A34A] font-bold block mt-1">
                    {isSelected ? 'SELECTED ⚡' : 'CLICK TO CONVERT'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Supported Marketplaces */}
          <div className="pt-8 border-t border-[#E5E5E5]">
            <span className="tech-label text-center block mb-4">SUPPORTED MARKETPLACE INTEGRATIONS</span>
            <div className="flex flex-wrap justify-center gap-2">
              {marketplaces.map((m, i) => (
                <span key={i} className="px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-md font-mono text-xs font-bold text-[#111111] hover:border-black cursor-pointer">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. BUILT FOR CA FIRMS & ACCOUNTANTS (H2) */}
      <section className="py-20 border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="tech-label block mb-2">PRACTICE MANAGEMENT</span>
            <h2 className="editorial-title text-3xl sm:text-4xl font-extrabold text-[#111111]">
              Built for CA Firms & Accountants
            </h2>
            <p className="text-sm sm:text-base text-[#555555] mt-3 leading-relaxed">
              Designed around the daily operational workflows of Indian Chartered Accountants and tax practitioners. Eliminate repetitive spreadsheet tasks, manage hundreds of client GSTINs, and maintain complete audit traceability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/gst-software-for-ca" className="p-6 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors block group">
              <h3 className="font-bold text-base text-[#111111] group-hover:underline">GST Software for CA Firms</h3>
              <p className="text-xs text-[#666666] mt-2 leading-relaxed">
                Centralized client portfolios, staff assignment workflows, and bulk return reconciliation.
              </p>
            </Link>
            <Link to="/gst-software-for-accountants" className="p-6 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors block group">
              <h3 className="font-bold text-base text-[#111111] group-hover:underline">GST Software for Accountants</h3>
              <p className="text-xs text-[#666666] mt-2 leading-relaxed">
                Fast bank conversions, monthly GSTR-1 JSON creation, and automated ITC verification.
              </p>
            </Link>
            <Link to="/gst-software-for-business" className="p-6 bg-white border border-[#E5E5E5] rounded-xl hover:border-black transition-colors block group">
              <h3 className="font-bold text-base text-[#111111] group-hover:underline">GST Software for Businesses</h3>
              <p className="text-xs text-[#666666] mt-2 leading-relaxed">
                Multi-state e-commerce accounting, vendor ITC recovery, and Tally integration.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* 9. WHY CHOOSE GSTREPOTIS? (H2) */}
      <section className="py-20 border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="tech-label block mb-2">BENEFITS & TRUST</span>
            <h2 className="editorial-title text-3xl sm:text-4xl font-extrabold text-[#111111]">
              Why Choose GSTRepotis?
            </h2>
            <p className="text-sm sm:text-base text-[#555555] mt-3 leading-relaxed">
              We combine deep Indian taxation domain knowledge with high-performance automated parsers to deliver an accurate, secure compliance experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
            <div className="flex items-start gap-3 p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#111111]">100% Data Confidentiality</p>
                <p className="text-xs text-[#666666] mt-0.5">Encrypted bank statements are parsed strictly in-memory without storing client PDF passwords.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#111111]">Native Tally Prime Integration</p>
                <p className="text-xs text-[#666666] mt-0.5">Export vouchers directly into Tally Prime and ERP 9 without requiring external plugins or TDLs.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#111111]">Compliant with CGST Rules</p>
                <p className="text-xs text-[#666666] mt-0.5">Strict adherence to Section 16(2)(aa), Rule 36(4), and official GST portal schema guidelines.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-[#111111]">Save Over 15 Hours Weekly</p>
                <p className="text-xs text-[#666666] mt-0.5">Eliminate manual Excel data entry, invoice cross-checking, and offline tool conversion delays.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FREQUENTLY ASKED QUESTIONS (H2) */}
      <section className="py-20 border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="tech-label block mb-2">HELP & FAQ</span>
            <h2 className="editorial-title text-3xl sm:text-4xl font-extrabold text-[#111111]">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="border border-[#E5E5E5] rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full px-6 py-4 text-left font-bold text-xs sm:text-sm text-[#111111] flex items-center justify-between hover:bg-[#F7F7F7] cursor-pointer"
                >
                  <span>{f.q}</span>
                  <span className="font-mono text-sm">{faqOpen === i ? '−' : '+'}</span>
                </button>
                {faqOpen === i && (
                  <div className="px-6 pb-4 text-xs sm:text-sm text-[#555555] leading-relaxed border-t border-[#E5E5E5] pt-3">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. GET STARTED WITH GSTREPOTIS (H2) */}
      <section className="py-20 bg-black text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <span className="font-mono text-xs text-[#888888] uppercase tracking-widest font-bold block mb-3">
            INFRASTRUCTURE READY
          </span>
          <h2 className="editorial-title text-3xl sm:text-5xl font-extrabold tracking-tight">
            Get Started With GSTRepotis
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto font-normal leading-relaxed">
            Join Indian Chartered Accountants, tax practitioners, and growing businesses saving hours every week on GST compliance and bank statement reconciliation.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/login">
              <Button size="lg" variant="outline" className="bg-white !text-black hover:bg-neutral-100 font-bold border-white">
                Sign In to Workspace
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="ghost" className="text-white hover:bg-neutral-800">
                View Pricing & Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Bank Statement Converter Modal */}
      <Modal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        title={`${selectedBank?.toUpperCase() || 'BANK'} STATEMENT CONVERTER`}
        maxWidth={processingState === 'done' ? '4xl' : 'lg'}
      >
        <div className="space-y-6">
          <div className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-black text-white font-mono font-bold text-xs flex items-center justify-center rounded">
                {selectedBank?.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-xs text-[#111111]">{selectedBank}</p>
                <p className="font-mono text-[10px] text-[#555555]">PDF Extraction & Tally XML Voucher Parser</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-black text-white font-mono text-[10px] font-bold rounded uppercase">
              PARSER ACTIVE
            </span>
          </div>

          {processingState === 'idle' && (
            <div className="space-y-5">
              <FileUpload
                onFileSelect={handleFileSelect}
                accept=".pdf"
                label={`UPLOAD ${selectedBank?.toUpperCase()} STATEMENT PDF`}
                helperText={selectedFile ? `Selected File: ${selectedFile.name}` : 'Drag & drop bank statement PDF or browse local files'}
              />

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-[#111111] font-semibold">
                  <input
                    type="checkbox"
                    checked={isProtected}
                    onChange={(e) => setIsProtected(e.target.checked)}
                    className="rounded border-neutral-300 text-black focus:ring-black"
                  />
                  <span>This PDF is password protected</span>
                </label>
              </div>

              {isProtected && (
                <Input
                  label="PDF PASSWORD"
                  type="password"
                  placeholder="e.g. PAN card or DOB"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                />
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-4 border-t border-[#E5E5E5]">
                <Button variant="outline" className="w-full sm:w-1/2 text-xs" onClick={() => setIsBankModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" className="w-full sm:w-1/2 text-xs" onClick={handleStartExtraction}>
                  Submit & Convert Statement
                </Button>
              </div>
            </div>
          )}

          {processingState === 'processing' && (
            <div className="py-6 space-y-4 font-mono text-xs text-center">
              <RefreshCw className="w-8 h-8 text-black animate-spin mx-auto mb-2" />
              <p className="font-bold text-sm text-[#111111]">Processing {selectedBank} Statement...</p>
              <div className="space-y-2 max-w-sm mx-auto text-left">
                <div className={`p-2.5 rounded border ${processingStep >= 1 ? 'border-black bg-[#FAFAFA]' : 'border-[#E5E5E5] text-[#888888]'}`}>
                  <span>✓ File received and validated</span>
                </div>
                <div className={`p-2.5 rounded border ${processingStep >= 2 ? 'border-black bg-[#FAFAFA]' : 'border-[#E5E5E5] text-[#888888]'}`}>
                  <span>✓ {selectedBank} layout identified</span>
                </div>
                <div className={`p-2.5 rounded border ${processingStep >= 3 ? 'border-black bg-[#FAFAFA]' : 'border-[#E5E5E5] text-[#888888]'}`}>
                  <span>● Extracting debits, credits & balances</span>
                </div>
                <div className={`p-2.5 rounded border ${processingStep >= 4 ? 'border-black bg-[#FAFAFA]' : 'border-[#E5E5E5] text-[#888888]'}`}>
                  <span>○ Generating Tally XML vouchers</span>
                </div>
              </div>
            </div>
          )}

          {processingState === 'done' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FAFAFA] p-4 rounded-lg border border-[#E5E5E5] font-mono text-xs">
                <div>
                  <span className="text-[10px] text-[#555555] uppercase block font-bold">CONVERSION COMPLETE</span>
                  <span className="font-bold text-sm text-black">Extracted {extractedTransactions.length} Transactions</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-xs" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={handleDownloadCsv}>
                    Download CSV
                  </Button>
                  <Button variant="primary" size="sm" className="flex-1 sm:flex-none text-xs" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={handleDownloadTallyXml}>
                    Generate Tally XML
                  </Button>
                </div>
              </div>

              <DataTable
                columns={transactionColumns}
                data={extractedTransactions}
                technicalHeader="STATEMENT TRANSACTIONS"
                searchPlaceholder="Search narration or ref no..."
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
