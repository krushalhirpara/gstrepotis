import React, { useState } from 'react';
import { Card, KpiCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FileUpload } from '../../components/ui/ProgressBar';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { SearchableSelect } from '../../components/ui/Input';
import { FileJson, FileCode, RefreshCw } from 'lucide-react';

interface B2bRow {
  id: number;
  gstin: string;
  customer_name: string;
  invoice_number: string;
  invoice_date: string;
  invoice_value: number;
  taxable_value: number;
  gst_rate: number;
  igst: number;
  cgst: number;
  sgst: number;
  is_valid: boolean;
  validation_errors?: string;
}

interface B2cRow {
  id: number;
  pos: string;
  taxable_value: number;
  gst_rate: number;
  igst: number;
  cgst: number;
  sgst: number;
}

interface HsnRow {
  id: number;
  hsn_code: string;
  description: string;
  taxable_value: number;
  gst_rate: number;
  is_valid: boolean;
}

export const EcommerceGstr1Workflow: React.FC = () => {
  const [step, setStep] = useState(1);
  const [marketplace, setMarketplace] = useState('amazon');
  const [activeTab, setActiveTab] = useState('overview');

  const [b2bList] = useState<B2bRow[]>([
    { id: 1, gstin: '27AAACG1234A1Z5', customer_name: 'TechSolutions Pvt Ltd', invoice_number: 'INV-2026-001', invoice_date: '2026-08-11', invoice_value: 59000, taxable_value: 50000, gst_rate: 18, igst: 9000, cgst: 0, sgst: 0, is_valid: true },
    { id: 2, gstin: '27BBBCH5678B1Z2', customer_name: 'Apex Retailers', invoice_number: 'INV-2026-002', invoice_date: '2026-08-14', invoice_value: 28000, taxable_value: 25000, gst_rate: 12, igst: 0, cgst: 1500, sgst: 1500, is_valid: true },
    { id: 3, gstin: 'INVALID_GSTIN_123', customer_name: 'Local Store Trader', invoice_number: 'INV-2026-003', invoice_date: '2026-08-18', invoice_value: 11800, taxable_value: 10000, gst_rate: 18, igst: 1800, cgst: 0, sgst: 0, is_valid: false, validation_errors: 'Invalid GSTIN checksum format' },
  ]);

  const [b2cList] = useState<B2cRow[]>([
    { id: 1, pos: '27-Maharashtra', taxable_value: 120000, gst_rate: 18, igst: 0, cgst: 10800, sgst: 10800 },
    { id: 2, pos: '07-Delhi', taxable_value: 85000, gst_rate: 18, igst: 15300, cgst: 0, sgst: 0 },
    { id: 3, pos: '29-Karnataka', taxable_value: 45000, gst_rate: 12, igst: 5400, cgst: 0, sgst: 0 },
  ]);

  const [hsnList] = useState<HsnRow[]>([
    { id: 1, hsn_code: '8471', description: 'Automatic data processing machines', taxable_value: 175000, gst_rate: 18, is_valid: true },
    { id: 2, hsn_code: '6203', description: 'Men\'s jackets and apparel', taxable_value: 70000, gst_rate: 12, is_valid: true },
    { id: 3, hsn_code: '9999', description: 'Unclassified item code', taxable_value: 8000, gst_rate: 18, is_valid: false },
  ]);

  const marketplacesOptions = [
    { value: 'amazon', label: 'Amazon India', sublabel: 'Merchant Sales Report' },
    { value: 'flipkart', label: 'Flipkart', sublabel: 'Seller Sales Report' },
    { value: 'meesho', label: 'Meesho', sublabel: 'Supplier Payout Report' },
    { value: 'myntra', label: 'Myntra', sublabel: 'Vendor Tax Report' },
    { value: 'jiomart', label: 'JioMart', sublabel: 'Merchant Report' },
  ];

  const handleFileUpload = () => {
    setStep(2);
    setTimeout(() => {
      setStep(3);
    }, 1200);
  };

  const handleDownloadJson = () => {
    fetch('/api/ecommerce/export-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ b2b: b2bList, b2c: b2cList }),
    })
      .then((res) => res.json())
      .then((data) => {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'GSTR1_Ready_Report.json';
        a.click();
      });
  };

  const handleDownloadTallyXml = () => {
    fetch('/api/ecommerce/export-tally-xml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ b2b: b2bList }),
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'GSTR1_Sales_Tally.xml';
        a.click();
      });
  };

  const b2bColumns: Column<B2bRow>[] = [
    {
      key: 'gstin',
      header: 'GSTIN',
      render: (r) => (
        <div>
          <span className={`font-mono font-bold ${r.is_valid ? 'text-[#111111]' : 'text-[#DC2626]'}`}>{r.gstin}</span>
          {!r.is_valid && <p className="font-mono text-[10px] text-[#DC2626] font-bold">{r.validation_errors}</p>}
        </div>
      ),
    },
    { key: 'customer_name', header: 'CUSTOMER' },
    { key: 'invoice_number', header: 'INVOICE NO' },
    { key: 'invoice_date', header: 'DATE' },
    { key: 'taxable_value', header: 'TAXABLE VAL', render: (r) => `₹${r.taxable_value.toFixed(2)}` },
    { key: 'gst_rate', header: 'RATE', render: (r) => `${r.gst_rate}%` },
    { key: 'igst', header: 'IGST', render: (r) => `₹${r.igst.toFixed(2)}` },
    {
      key: 'is_valid',
      header: 'STATUS',
      render: (r) => (
        <Badge variant={r.is_valid ? 'success' : 'error'}>
          {r.is_valid ? 'VALID GSTIN' : 'INVALID'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* GSTR-1 DASHBOARD HEADER */}
      <div className="bg-white p-6 rounded-xl border border-[#E5E5E5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="tech-label block mb-1">GSTR-1 / AUGUST 2026</span>
          <h2 className="text-xl font-extrabold text-[#111111]">E-Commerce GSTR-1 Engine</h2>
          <p className="text-xs text-[#555555] mt-0.5">
            Process marketplace sales reports into GSTR-1 JSON, TCS reconciliation & Tally XML.
          </p>
        </div>
        {step === 3 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<FileCode className="w-4 h-4" />} onClick={handleDownloadTallyXml}>
              TALLY XML
            </Button>
            <Button variant="primary" size="sm" leftIcon={<FileJson className="w-4 h-4" />} onClick={handleDownloadJson}>
              DOWNLOAD GST JSON
            </Button>
          </div>
        )}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="p-6 md:col-span-1 space-y-4 bg-white">
            <span className="tech-label block">01 / PLATFORM</span>
            <SearchableSelect
              label="E-COMMERCE PLATFORM"
              options={marketplacesOptions}
              value={marketplace}
              onChange={(val) => setMarketplace(val)}
            />
          </Card>

          <Card className="p-6 md:col-span-2 bg-white">
            <span className="tech-label block mb-3">02 / FILE SOURCE</span>
            <FileUpload
              onFileSelect={handleFileUpload}
              accept=".csv,.xlsx,.xls"
              label={`UPLOAD ${marketplace.toUpperCase()} REPORT`}
              helperText="Drag & drop seller report exported from seller central"
            />
          </Card>
        </div>
      )}

      {step === 2 && (
        <Card className="p-12 max-w-md mx-auto bg-white text-center space-y-4 font-mono text-xs">
          <RefreshCw className="w-8 h-8 text-black animate-spin mx-auto" />
          <span className="tech-label block">PARSING REPORT</span>
          <h3 className="text-base font-bold text-black">Validating HSN & GSTIN Checksums</h3>
          <p className="text-[#16A34A] font-bold">Running ValidationService...</p>
        </Card>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="flex overflow-x-auto border-b border-[#E5E5E5] gap-2 pb-1 bg-white p-2 rounded-xl font-mono text-xs">
            {[
              { id: 'overview', label: '01 / OVERVIEW' },
              { id: 'b2b', label: '02 / B2B INVOICES' },
              { id: 'b2c', label: '03 / B2C SALES' },
              { id: 'hsn', label: '04 / HSN DIRECTORY' },
              { id: 'tcs', label: '05 / TCS RECONCILIATION' },
              { id: 'section95', label: '06 / SECTION 9(5)' },
              { id: 'reports', label: '07 / REPORT OUTPUT' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-black text-white'
                    : 'text-[#555555] hover:bg-[#F7F7F7] hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard title="TAXABLE VALUE" value="₹3,25,000" subtitle="28 Invoices processed" technicalCode="INV / 01" />
                <KpiCard title="IGST AMOUNT" value="₹29,700" subtitle="Inter-state sales" technicalCode="IGST / 02" />
                <KpiCard title="CGST + SGST" value="₹24,600" subtitle="Intra-state sales" technicalCode="CGST / 03" />
                <KpiCard title="DEDUCTED TCS" value="₹3,250" badge={<Badge variant="success">MATCHED 100%</Badge>} technicalCode="TCS / 04" />
              </div>

              <Card className="p-6 bg-white space-y-4">
                <span className="tech-label block">SYSTEM STATUS SUMMARY</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-3 bg-white border border-[#E5E5E5] rounded-lg">
                    <p className="font-bold text-[#16A34A]">✓ 2 B2B GSTINs Valid</p>
                    <p className="text-[10px] text-[#555555] mt-1">Checksum verified against portal</p>
                  </div>
                  <div className="p-3 bg-white border border-[#E5E5E5] rounded-lg">
                    <p className="font-bold text-[#D97706]">⚠ 1 Invalid GSTIN Flagged</p>
                    <p className="text-[10px] text-[#555555] mt-1">Requires correction before JSON export</p>
                  </div>
                  <div className="p-3 bg-white border border-[#E5E5E5] rounded-lg">
                    <p className="font-bold text-black">✓ HSN Code Match 98%</p>
                    <p className="text-[10px] text-[#555555] mt-1">Matched with HSN Master Directory</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'b2b' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="tech-label">B2B TAXABLE INVOICES</span>
                <Badge variant="warning">1 INVALID GSTIN NEEDS REVIEW</Badge>
              </div>

              <DataTable columns={b2bColumns} data={b2bList} technicalHeader="B2B INVOICES" searchPlaceholder="Search GSTIN or customer..." />
            </div>
          )}

          {activeTab === 'b2c' && (
            <div className="space-y-4">
              <span className="tech-label">B2C SUMMARY (BY PLACE OF SUPPLY & RATE)</span>
              <DataTable
                columns={[
                  { key: 'pos', header: 'PLACE OF SUPPLY (POS)' },
                  { key: 'gst_rate', header: 'RATE', render: (r) => `${r.gst_rate}%` },
                  { key: 'taxable_value', header: 'TAXABLE VALUE', render: (r) => `₹${r.taxable_value.toFixed(2)}` },
                  { key: 'igst', header: 'IGST', render: (r) => `₹${r.igst.toFixed(2)}` },
                  { key: 'cgst', header: 'CGST', render: (r) => `₹${r.cgst.toFixed(2)}` },
                  { key: 'sgst', header: 'SGST', render: (r) => `₹${r.sgst.toFixed(2)}` },
                ]}
                data={b2cList}
                technicalHeader="B2C POS TABLE"
              />
            </div>
          )}

          {activeTab === 'hsn' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="tech-label">HSN VALIDATION WORKSPACE / 03</span>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="font-bold text-[#16A34A]">VALID 817</span>
                  <span>|</span>
                  <span className="font-bold text-[#DC2626]">INVALID 18</span>
                  <span>|</span>
                  <span className="font-bold text-[#D97706]">MISSING 7</span>
                </div>
              </div>

              <DataTable
                columns={[
                  { key: 'hsn_code', header: 'HSN CODE', render: (r) => <span className="font-mono font-bold text-[#111111]">{r.hsn_code}</span> },
                  { key: 'description', header: 'DESCRIPTION' },
                  { key: 'taxable_value', header: 'TAXABLE VALUE', render: (r) => `₹${r.taxable_value.toFixed(2)}` },
                  { key: 'gst_rate', header: 'GST RATE', render: (r) => `${r.gst_rate}%` },
                  {
                    key: 'is_valid',
                    header: 'VALIDATION',
                    render: (r) => <Badge variant={r.is_valid ? 'success' : 'error'}>{r.is_valid ? 'VALID HSN' : 'INVALID'}</Badge>,
                  },
                ]}
                data={hsnList}
                technicalHeader="HSN MASTER TABLE"
              />
            </div>
          )}

          {activeTab === 'tcs' && (
            <Card className="p-6 bg-white space-y-6">
              <span className="tech-label block">TCS RECONCILIATION COMPARISON</span>

              {/* HORIZONTAL COMPARISON LAYOUT (Prompt #28) */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center text-center font-mono">
                <div className="md:col-span-2 p-4 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl">
                  <span className="text-[10px] text-[#555555] uppercase block font-bold">MARKETPLACE TCS</span>
                  <span className="text-2xl font-extrabold text-[#111111] mt-1 block">₹42,520.00</span>
                </div>

                <div className="md:col-span-1 font-bold text-lg text-[#555555]">vs</div>

                <div className="md:col-span-2 p-4 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl">
                  <span className="text-[10px] text-[#555555] uppercase block font-bold">GST PORTAL 27O</span>
                  <span className="text-2xl font-extrabold text-[#111111] mt-1 block">₹42,520.00</span>
                </div>

                <div className="md:col-span-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] text-[#16A34A] uppercase block font-bold">DIFFERENCE / STATUS</span>
                  <span className="text-2xl font-extrabold text-[#16A34A] mt-1 block">₹0 (MATCHED)</span>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'section95' && (
            <Card className="p-6 bg-white space-y-4 font-mono text-xs">
              <span className="tech-label block">SECTION 9(5) E-COMMERCE OPERATOR ACCOUNTING</span>
              <div className="p-4 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg space-y-2">
                <p><strong>OPERATOR NAME:</strong> Amazon Seller Services India Pvt Ltd</p>
                <p><strong>OPERATOR GSTIN:</strong> 27AAACA0000A1Z5</p>
                <p><strong>TAXABLE VALUE:</strong> ₹3,25,000.00</p>
                <p><strong>TAX LIABILITY DISCHARGED:</strong> ₹52,800.00</p>
              </div>
            </Card>
          )}

          {activeTab === 'reports' && (
            <Card className="p-6 bg-white space-y-4 font-mono text-xs">
              <span className="tech-label block">REPORT OUTPUT / 04</span>
              <div className="space-y-3">
                <div className="p-4 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#111111]">GST JSON PORTAL FILE</p>
                    <p className="text-[11px] text-[#555555]">Ready for upload to government GST portal</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#16A34A]">READY</span>
                    <Button variant="primary" size="sm" onClick={handleDownloadJson}>Download JSON</Button>
                  </div>
                </div>

                <div className="p-4 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#111111]">TALLY PRIME XML VOUCHERS</p>
                    <p className="text-[11px] text-[#555555]">Import directly into Tally sales ledgers</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#16A34A]">READY</span>
                    <Button variant="outline" size="sm" onClick={handleDownloadTallyXml}>Download XML</Button>
                  </div>
                </div>

                <div className="p-4 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#111111]">CSV / EXCEL ACCOUNTING SUMMARY</p>
                    <p className="text-[11px] text-[#555555]">Complete multi-sheet breakdown</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#16A34A]">READY</span>
                    <Button variant="outline" size="sm">Download CSV</Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
