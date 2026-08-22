import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { FileUpload } from '../../components/ui/ProgressBar';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { ArrowRight, Search, Lock, RefreshCw, Download } from 'lucide-react';

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
      q: 'How does the Bank Statement PDF Converter extract entries?',
      a: 'Our engine uses structured layout matching for 18+ Indian banks to extract date, narration, reference number, debit, credit, and running balance with zero accuracy loss.',
    },
    {
      q: 'Which e-commerce marketplaces are supported for GSTR-1?',
      a: 'Supported marketplaces include Amazon, Flipkart, Meesho, Myntra, JioMart, Paytm, Snapdeal, GlowRoad, LimeRoad, and custom CSV sales reports.',
    },
    {
      q: 'How is the downloadable Tally Prime XML generated?',
      a: 'The modular TallyXmlService converts validated transactions and sales invoices into native Tally XML vouchers ready to import via Tally > Import Data > Vouchers.',
    },
    {
      q: 'How does TCS reconciliation work against the GST Portal?',
      a: 'The engine reconciles marketplace TCS deductions against GSTR-27O filings on the GST portal to verify matched amounts and flag discrepancies.',
    },
    {
      q: 'Is data kept private and secure?',
      a: 'Yes. All uploads are processed in secure isolated environments. Password-protected PDFs are decoded strictly in-memory and passwords are never saved.',
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

      fetch('/api/bank-statements/process', {
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
    fetch('/api/bank-statements/export-csv', {
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
    fetch('/api/bank-statements/export-xml', {
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
      {/* 1. HERO SECTION - EDITORIAL COMPOSITION */}
      <section className="relative pt-16 sm:pt-24 pb-20 border-b border-[#E5E5E5] bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* LEFT: EDITORIAL TEXT (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F7F7F7] border border-[#E5E5E5] rounded-md font-mono text-[11px] font-bold text-[#555555] uppercase tracking-wider">
                <span>GST AUTOMATION / 01</span>
              </div>

              <h1 className="editorial-title text-5xl sm:text-7xl font-extrabold tracking-tight text-[#111111]">
                Your GST workflow, <br />
                <span className="font-light text-[#555555]">without the manual work.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#555555] max-w-xl leading-relaxed font-normal">
                Automate PDF bank statement conversions, marketplace sales report processing, HSN validation, and GSTR-1 filings. Built for Indian CAs, accountants & businesses.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link to="/sign-up">
                  <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/request-demo">
                  <Button size="lg" variant="outline">
                    Request Live Demo
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

      {/* 2. TRUST / METRICS STRIP */}
      <section className="py-10 border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x-0 md:divide-x divide-[#E5E5E5]">
            <div className="p-4">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold text-[#111111] block">18+</span>
              <span className="tech-label mt-1 block">BANK FORMATS SUPPORTED</span>
            </div>
            <div className="p-4">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold text-[#111111] block">11+</span>
              <span className="tech-label mt-1 block">MARKETPLACE FORMATS</span>
            </div>
            <div className="p-4">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold text-[#111111] block">GSTR-1</span>
              <span className="tech-label mt-1 block">JSON READY FOR PORTAL</span>
            </div>
            <div className="p-4">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold text-[#111111] block">TALLY</span>
              <span className="tech-label mt-1 block">DIRECT XML EXPORT</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM SECTION */}
      <section className="py-24 border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-16">
            <span className="tech-label block mb-2">THE PROBLEM / 02</span>
            <h2 className="editorial-title text-3xl sm:text-5xl font-extrabold text-[#111111]">
              Manual accounting creates unnecessary work.
            </h2>
            <p className="text-sm sm:text-base text-[#555555] mt-4">
              Chartered accountants and tax teams waste hundreds of hours copying entries from PDF bank statements and marketplace sales reports into spreadsheets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 bg-[#F7F7F7] border border-[#E5E5E5]">
              <span className="font-mono text-xs font-bold text-[#DC2626] uppercase tracking-wider block mb-4">
                OLD MANUAL WAY
              </span>
              <div className="space-y-3 font-mono text-xs text-[#555555]">
                <div className="p-3 bg-white border border-[#E5E5E5] rounded-md">PDF Statement Received</div>
                <div className="text-center font-bold text-[#888888]">↓</div>
                <div className="p-3 bg-white border border-[#E5E5E5] rounded-md">Manual Excel Re-typing</div>
                <div className="text-center font-bold text-[#888888]">↓</div>
                <div className="p-3 bg-white border border-[#E5E5E5] rounded-md">Manual Validation & Corrections</div>
                <div className="text-center font-bold text-[#888888]">↓</div>
                <div className="p-3 bg-white border border-[#E5E5E5] rounded-md">Hours of Tally Data Entry</div>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black">
              <span className="font-mono text-xs font-bold text-[#16A34A] uppercase tracking-wider block mb-4">
                GST SUITE AUTOMATION WAY
              </span>
              <div className="space-y-3 font-mono text-xs text-[#111111]">
                <div className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-md font-bold">01 / DRAG & DROP UPLOAD</div>
                <div className="text-center font-bold text-[#111111]">↓</div>
                <div className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-md font-bold">02 / AUTOMATED EXTRACTION & HSN MATCH</div>
                <div className="text-center font-bold text-[#111111]">↓</div>
                <div className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-md font-bold">03 / GSTIN & TCS RECONCILIATION</div>
                <div className="text-center font-bold text-[#111111]">↓</div>
                <div className="p-3 bg-black text-white rounded-md font-bold text-center">04 / DOWNLOAD TALLY XML & GST JSON</div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. PRODUCT SHOWCASE - ALTERNATING COMPOSITIONS */}
      <section className="py-24 border-b border-[#E5E5E5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          {/* COMPOSITION 1: Bank Converter */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="tech-label">PRODUCT 01 / BANK CONVERTER</span>
              <h2 className="editorial-title text-3xl sm:text-5xl font-extrabold text-[#111111]">
                Convert PDF statements to Tally XML in seconds.
              </h2>
              <p className="text-sm text-[#555555] leading-relaxed">
                Extract narrations, debits, credits, and balances from 18+ Indian bank PDF statements including password-protected statements.
              </p>

              <div className="pt-4 border-t border-[#E5E5E5] space-y-2 text-xs font-medium text-[#111111]">
                <p className="flex items-center gap-2">✓ Auto-detect bank layout format</p>
                <p className="flex items-center gap-2">✓ In-memory encrypted password handling</p>
                <p className="flex items-center gap-2">✓ Interactive data preview with row edit/add/delete</p>
                <p className="flex items-center gap-2">✓ Native Tally Prime & ERP 9 XML export</p>
              </div>

              <div className="pt-2">
                <Link to="/products/bank-statement-converter">
                  <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Explore Bank Converter
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <Card className="p-6 bg-[#FAFAFA] border border-[#E5E5E5]">
                <div className="font-mono text-xs space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[#E5E5E5]">
                    <span className="font-bold text-[#111111]">HDFC_BANK_STATEMENT.PDF</span>
                    <span className="text-[#16A34A] font-bold">142 TRANSACTIONS</span>
                  </div>
                  <div className="bg-white p-3 border border-[#E5E5E5] rounded-md space-y-1">
                    <p className="text-[11px] text-[#555555]">UPI/42318890212/PAYTM PAYMENTS</p>
                    <div className="flex justify-between font-bold text-xs">
                      <span className="text-[#DC2626]">Debit: ₹1,250.00</span>
                      <span>Bal: ₹48,750.00</span>
                    </div>
                  </div>
                  <div className="bg-white p-3 border border-[#E5E5E5] rounded-md space-y-1">
                    <p className="text-[11px] text-[#555555]">NEFT/N34920019/AMAZON SELLER PAYOUT</p>
                    <div className="flex justify-between font-bold text-xs">
                      <span className="text-[#16A34A]">Credit: ₹34,500.00</span>
                      <span>Bal: ₹83,250.00</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* COMPOSITION 2: E-Commerce GSTR-1 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <Card className="p-6 bg-[#FAFAFA] border border-[#E5E5E5]">
                <div className="font-mono text-xs space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-[#E5E5E5]">
                    <span className="font-bold text-[#111111]">GSTR-1 RECONCILIATION SUMMARY</span>
                    <span className="text-[#16A34A] font-bold">MATCHED 100%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="p-2 bg-white border border-[#E5E5E5] rounded">
                      <span className="text-[#888888] block text-[10px]">MARKETPLACE TCS</span>
                      <span className="font-bold">₹3,250.00</span>
                    </div>
                    <div className="p-2 bg-white border border-[#E5E5E5] rounded">
                      <span className="text-[#888888] block text-[10px]">GST PORTAL TCS</span>
                      <span className="font-bold">₹3,250.00</span>
                    </div>
                    <div className="p-2 bg-white border border-[#E5E5E5] rounded">
                      <span className="text-[#888888] block text-[10px]">DIFFERENCE</span>
                      <span className="font-bold text-[#16A34A]">₹0.00</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <span className="tech-label">PRODUCT 02 / GSTR-1 ENGINE</span>
              <h2 className="editorial-title text-3xl sm:text-5xl font-extrabold text-[#111111]">
                Process marketplace sales into GST JSON files.
              </h2>
              <p className="text-sm text-[#555555] leading-relaxed">
                Normalize Amazon, Flipkart, Meesho, and Myntra sales report CSV files into GSTR-1 B2B, B2C, HSN directory validation, TCS, and Section 9(5) accounting.
              </p>

              <div className="pt-4 border-t border-[#E5E5E5] space-y-2 text-xs font-medium text-[#111111]">
                <p className="flex items-center gap-2">✓ Automatic B2B / B2C tax invoice classification</p>
                <p className="flex items-center gap-2">✓ HSN code master validation engine</p>
                <p className="flex items-center gap-2">✓ TCS 27O portal reconciliation</p>
                <p className="flex items-center gap-2">✓ Official GSTR-1 JSON schema download</p>
              </div>

              <div className="pt-2">
                <Link to="/products/ecommerce-gstr1">
                  <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Explore E-Commerce GST
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE BANK & MARKETPLACE SEARCH GRID (Repotic-style Interactive Selection) */}
      <section className="py-20 bg-[#FAFAFA] border-b border-[#E5E5E5]" id="bank-grid-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="tech-label block mb-2">ECOSYSTEM / 03</span>
            <h2 className="editorial-title text-3xl font-extrabold text-[#111111]">
              Supported Banking Institutions & Marketplaces
            </h2>
            <p className="text-xs text-[#555555] mt-2">
              Select any bank below to instantly upload and convert statement PDFs into Tally XML & CSV table rows.
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

      {/* 6. INTERACTIVE BANK STATEMENT CONVERTER MODAL (Repotic style popup workflow) */}
      <Modal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        title={`${selectedBank?.toUpperCase() || 'BANK'} STATEMENT CONVERTER`}
        maxWidth={processingState === 'done' ? '4xl' : 'lg'}
      >
        <div className="space-y-6">
          {/* Header Info */}
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

          {/* PHASE 1: IDLE / UPLOAD */}
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

              <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
                <Button variant="outline" className="w-1/2" onClick={() => setIsBankModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" className="w-1/2" onClick={handleStartExtraction}>
                  Submit & Convert Statement
                </Button>
              </div>
            </div>
          )}

          {/* PHASE 2: PROCESSING */}
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

          {/* PHASE 3: DONE / TRANSACTIONS TABLE VIEW (REPOTIC STYLE STATEMENT DISPLAY) */}
          {processingState === 'done' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FAFAFA] p-4 rounded-lg border border-[#E5E5E5] font-mono text-xs">
                <div>
                  <span className="text-[10px] text-[#555555] uppercase block font-bold">CONVERSION COMPLETE</span>
                  <span className="font-bold text-sm text-black">Extracted {extractedTransactions.length} Transactions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={handleDownloadCsv}>
                    Download CSV
                  </Button>
                  <Button variant="primary" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={handleDownloadTallyXml}>
                    Generate Tally XML
                  </Button>
                </div>
              </div>

              {/* Transactions Table */}
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

      {/* 7. FAQ ACCORDION */}
      <section className="py-24 border-b border-[#E5E5E5]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="tech-label block mb-2">HELP & FAQ / 04</span>
            <h2 className="editorial-title text-3xl font-extrabold text-[#111111]">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="border border-[#E5E5E5] rounded-lg overflow-hidden bg-white">
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full px-6 py-4 text-left font-bold text-xs sm:text-sm text-[#111111] flex items-center justify-between hover:bg-[#F7F7F7] cursor-pointer"
                >
                  <span>{f.q}</span>
                  <span className="font-mono text-sm">{faqOpen === i ? '−' : '+'}</span>
                </button>
                {faqOpen === i && (
                  <div className="px-6 pb-4 text-xs text-[#555555] leading-relaxed border-t border-[#E5E5E5] pt-3">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="py-24 bg-black text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <span className="font-mono text-xs text-[#888888] uppercase tracking-widest font-bold block mb-3">
            INFRASTRUCTURE READY
          </span>
          <h2 className="editorial-title text-3xl sm:text-5xl font-extrabold tracking-tight">
            Ready to Automate Your GST & Accounting?
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto font-normal">
            Join Indian CAs and Tax Professionals saving 15+ hours every week on bank conversions and GSTR-1 filings.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/sign-up">
              <Button size="lg" variant="outline" className="bg-white !text-black hover:bg-neutral-100 font-bold border-white">
                Start Free Trial Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
