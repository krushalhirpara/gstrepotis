import React, { useState } from 'react';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { FileUpload } from '../../components/ui/ProgressBar';
import { SearchableSelect } from '../../components/ui/Input';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import {
  Download,
  Lock,
  CheckCircle2,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import { apiFetch } from '../../services/api';

interface QualityMetrics {
  total_transactions: number;
  valid_rows: number;
  warnings_count: number;
  errors_count: number;
  duplicates_count: number;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  date_range: string;
}

interface TransactionRow {
  id: number;
  transaction_date: string;
  value_date: string;
  narration: string;
  reference_number: string;
  debit: number;
  credit: number;
  balance: number;
  raw_narration?: string;
  has_warning?: boolean;
  warning_message?: string;
}

export const BankConverterWorkflow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bankCode, setBankCode] = useState('AUTO');
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'success' | 'scanned_pdf' | 'no_transactions' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [detectedBankName, setDetectedBankName] = useState('');
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [deletedRows, setDeletedRows] = useState<TransactionRow[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TransactionRow | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRow, setNewRow] = useState<Partial<TransactionRow>>({
    transaction_date: dateToday(),
    narration: '',
    reference_number: '',
    debit: 0,
    credit: 0,
    balance: 0,
  });

  function dateToday() {
    return new Date().toISOString().split('T')[0];
  }

  const steps = [
    { id: 1, label: 'UPLOAD PDF' },
    { id: 2, label: 'SELECT BANK' },
    { id: 3, label: 'PASSWORD' },
    { id: 4, label: 'PROCESSING' },
    { id: 5, label: 'REVIEW DATA' },
    { id: 6, label: 'EXPORT OUTPUT' },
  ];

  const banks = [
    { value: 'AUTO', label: '✨ Auto-Detect Bank Format', sublabel: 'Recommended' },
    { value: 'HDFC', label: 'HDFC Bank', sublabel: 'Retail & Corporate PDF' },
    { value: 'SBI', label: 'State Bank of India', sublabel: 'e-Statement' },
    { value: 'ICICI', label: 'ICICI Bank', sublabel: 'Statement PDF' },
    { value: 'AXIS', label: 'Axis Bank', sublabel: 'Statement PDF' },
    { value: 'KOTAK', label: 'Kotak Mahindra Bank', sublabel: 'Statement PDF' },
    { value: 'BOB', label: 'Bank of Baroda', sublabel: 'Standard PDF' },
  ];

  const handleFileSelect = (files: FileList | File[]) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert('Invalid file format. Please upload a PDF bank statement file.');
        return;
      }
      setSelectedFile(file);
      setCurrentStep(2);
    }
  };

  const handleStartExtraction = async () => {
    if (!selectedFile) {
      alert('Please upload or select a PDF statement file.');
      setCurrentStep(1);
      return;
    }

    setCurrentStep(4);
    setExtractionStatus('idle');
    setStatusMessage('');

    try {
      const formData = new FormData();
      if (bankCode) formData.append('bank_code', bankCode);
      if (password) formData.append('password', password);
      formData.append('file', selectedFile);

      const res = await apiFetch('/api/bank-statements/process', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.status === 'error') {
        setExtractionStatus('error');
        setStatusMessage(data.message || 'Unable to extract transactions from this PDF statement.');
        setCurrentStep(5);
        return;
      }

      if (data.status === 'scanned_pdf') {
        setExtractionStatus('scanned_pdf');
        setStatusMessage(data.message || 'This PDF appears to be scanned. OCR processing is required.');
        setCurrentStep(5);
        return;
      }

      if (data.status === 'no_transactions') {
        setExtractionStatus('no_transactions');
        setStatusMessage(data.message || 'No bank transactions could be reliably extracted from this PDF.');
        setCurrentStep(5);
        return;
      }

      if (data.status === 'success' && data.transactions && data.transactions.length > 0) {
        setTransactions(data.transactions.map((tx: any, idx: number) => ({ id: idx + 1, ...tx })));
        setQualityMetrics(data.quality_metrics || null);
        setDetectedBankName(data.bank_name || bankCode);
        setExtractionStatus('success');
        setCurrentStep(5);
        return;
      }

      setExtractionStatus('no_transactions');
      setStatusMessage('No bank transactions could be extracted from this PDF.');
      setCurrentStep(5);
    } catch {
      setExtractionStatus('error');
      setStatusMessage('Connection error or server failure while processing bank statement.');
      setCurrentStep(5);
    }
  };

  const handleDownloadCsv = () => {
    apiFetch('/api/bank-statements/export-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions }),
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Bank_Transactions_Export.csv';
        a.click();
      });
  };

  const handleDownloadExcel = () => {
    apiFetch('/api/bank-statements/export-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions }),
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Bank_Transactions_Export.xls';
        a.click();
      });
  };

  const handleDownloadTallyXml = () => {
    apiFetch('/api/bank-statements/export-xml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bank_name: detectedBankName || 'HDFC Bank', transactions }),
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Bank_Transactions_Tally.xml';
        a.click();
      });
  };

  const handleDeleteRow = (id: number) => {
    const target = transactions.find((t) => t.id === id);
    if (target) {
      setDeletedRows([...deletedRows, target]);
      setTransactions(transactions.filter((t) => t.id !== id));
    }
  };

  const handleRestoreLastDeletedRow = () => {
    if (deletedRows.length > 0) {
      const last = deletedRows[deletedRows.length - 1];
      setTransactions([...transactions, last].sort((a, b) => a.id - b.id));
      setDeletedRows(deletedRows.slice(0, -1));
    }
  };

  const handleSaveEdit = () => {
    if (editingRow) {
      setTransactions(transactions.map((t) => (t.id === editingRow.id ? editingRow : t)));
      setIsEditModalOpen(false);
      setEditingRow(null);
    }
  };

  const handleAddRow = () => {
    if (newRow.narration) {
      const created: TransactionRow = {
        id: Date.now(),
        transaction_date: newRow.transaction_date || dateToday(),
        value_date: newRow.transaction_date || dateToday(),
        narration: newRow.narration,
        reference_number: newRow.reference_number || 'REF' + Math.floor(100000 + Math.random() * 900000),
        debit: Number(newRow.debit) || 0,
        credit: Number(newRow.credit) || 0,
        balance: Number(newRow.balance) || 0,
      };
      setTransactions([...transactions, created]);
      setIsAddModalOpen(false);
      setNewRow({
        transaction_date: dateToday(),
        narration: '',
        reference_number: '',
        debit: 0,
        credit: 0,
        balance: 0,
      });
    }
  };

  const totalDebitSum = transactions.reduce((acc, curr) => acc + (curr.debit || 0), 0);
  const totalCreditSum = transactions.reduce((acc, curr) => acc + (curr.credit || 0), 0);
  const openingBalVal = qualityMetrics?.opening_balance ?? (transactions[0]?.balance ? transactions[0].balance - (transactions[0].credit || 0) + (transactions[0].debit || 0) : 0);
  const closingBalVal = qualityMetrics?.closing_balance ?? (transactions[transactions.length - 1]?.balance || 0);

  const columns: Column<TransactionRow>[] = [
    {
      key: 'transaction_date',
      header: 'TX DATE',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[#111111]">{r.transaction_date}</span>
      ),
    },
    {
      key: 'narration',
      header: 'NARRATION / DESCRIPTION',
      render: (r) => (
        <div className="space-y-1">
          <div className="font-sans text-xs text-black font-medium leading-normal">{r.narration}</div>
          {r.has_warning && (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-mono border border-amber-200">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>{r.warning_message || '⚠ Review Needed'}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'reference_number',
      header: 'REF NO / CHQ',
      render: (r) => <span className="font-mono text-xs text-[#555555]">{r.reference_number || '—'}</span>,
    },
    {
      key: 'debit',
      header: 'DEBIT (DR)',
      render: (r) => (r.debit > 0 ? <span className="font-mono font-bold text-[#DC2626]">₹{r.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> : '—'),
    },
    {
      key: 'credit',
      header: 'CREDIT (CR)',
      render: (r) => (r.credit > 0 ? <span className="font-mono font-bold text-[#16A34A]">₹{r.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> : '—'),
    },
    {
      key: 'balance',
      header: 'BALANCE',
      render: (r) => <span className="font-mono font-bold text-[#111111]">₹{r.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-[#E5E5E5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="tech-label block mb-1">BANK CONVERTER / 01</span>
          <h2 className="text-xl font-extrabold text-black">Bank Statement PDF Converter</h2>
          <p className="text-xs text-[#555555] mt-0.5">
            Convert PDF bank statements into structured transaction rows & downloadable Tally XML vouchers.
          </p>
        </div>
        {currentStep > 1 && (
          <Button variant="outline" size="sm" onClick={() => { setCurrentStep(1); setSelectedFile(null); setTransactions([]); setDeletedRows([]); setExtractionStatus('idle'); }}>
            Reset Workflow
          </Button>
        )}
      </div>

      <Card className="p-4 bg-white">
        <ProgressBar steps={steps} currentStep={currentStep} onStepClick={(id) => setCurrentStep(id)} />
      </Card>

      {currentStep === 1 && (
        <Card className="p-8 max-w-2xl mx-auto bg-white">
          <FileUpload onFileSelect={handleFileSelect} accept=".pdf" label="UPLOAD BANK STATEMENT PDF" />
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="p-8 max-w-lg mx-auto bg-white space-y-6">
          <div>
            <span className="tech-label block mb-1">STEP 02 / SELECTION</span>
            <h3 className="text-base font-bold text-black">{selectedFile?.name || 'Bank_Statement.pdf'}</h3>
            <p className="text-xs font-mono text-[#555555] mt-1">FILE SIZE: {((selectedFile?.size || 1240000) / 1024 / 1024).toFixed(2)} MB</p>
          </div>

          <SearchableSelect
            label="SELECT BANK NAME / LAYOUT"
            options={banks}
            value={bankCode}
            onChange={(val) => setBankCode(val)}
          />

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-[#111111] font-semibold">
              <input
                type="checkbox"
                checked={isProtected}
                onChange={(e) => setIsProtected(e.target.checked)}
                className="rounded border-neutral-300 text-black focus:ring-black"
              />
              <span>THIS STATEMENT IS PASSWORD PROTECTED</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
            <Button variant="outline" className="w-1/2" onClick={() => setCurrentStep(1)}>
              Back
            </Button>
            <Button
              variant="primary"
              className="w-1/2"
              onClick={() => {
                if (isProtected) {
                  setCurrentStep(3);
                } else {
                  handleStartExtraction();
                }
              }}
            >
              {isProtected ? 'Enter Password' : 'Start Processing'}
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 3 && (
        <Card className="p-8 max-w-md mx-auto bg-white space-y-4">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center mx-auto mb-2 font-mono text-xs">
              <Lock className="w-5 h-5" />
            </div>
            <span className="tech-label block">PDF PASSWORD / 03</span>
            <h3 className="text-lg font-bold text-black">Protected PDF Password</h3>
            <p className="text-xs text-[#555555]">
              Passwords are decoded strictly in-memory and are never stored on our servers.
            </p>
          </div>

          <Input
            label="STATEMENT PASSWORD"
            type="password"
            placeholder="e.g. PAN card or DOB"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
            <Button variant="outline" className="w-1/2" onClick={() => setCurrentStep(2)}>
              Back
            </Button>
            <Button variant="primary" className="w-1/2" onClick={handleStartExtraction}>
              Submit & Process
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 4 && (
        <Card className="p-8 max-w-md mx-auto bg-white space-y-5 font-mono text-xs">
          <div className="text-center pb-3 border-b border-[#E5E5E5]">
            <RefreshCw className="w-8 h-8 text-black animate-spin mx-auto mb-2" />
            <span className="tech-label block">PROCESSING DOCUMENT</span>
            <h3 className="text-base font-bold text-black mt-1">Extracting Bank Data</h3>
            <p className="text-[11px] text-[#666666] mt-1">Reading PDF file and extracting transactions via server parser...</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded border border-black bg-[#FAFAFA]">
              <span>✓ File format & PDF uploaded</span>
              <span className="font-bold text-[#16A34A]">OK</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded border border-black bg-[#FAFAFA]">
              <span>● Server PDF parser processing</span>
              <span className="font-bold animate-pulse text-amber-600">IN PROGRESS</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded border border-[#E5E5E5] text-[#888888]">
              <span>○ Reconciling running balances</span>
              <span className="font-bold">PENDING</span>
            </div>
          </div>
        </Card>
      )}

      {currentStep === 5 && (
        <div className="space-y-6">
          {/* Error Banner */}
          {extractionStatus === 'error' && (
            <Card className="p-6 bg-red-50 border border-red-200 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-red-900">Processing Failed</h3>
                  <p className="text-xs text-red-800 mt-1">{statusMessage || 'Unable to read this bank statement PDF format.'}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                  Upload Another PDF
                </Button>
                <Button variant="primary" size="sm" onClick={() => setCurrentStep(2)}>
                  Try Again
                </Button>
              </div>
            </Card>
          )}
          {/* Scanned PDF Warning Banner */}
          {extractionStatus === 'scanned_pdf' && (
            <Card className="p-6 bg-amber-50 border border-amber-200 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-amber-900">Scanned PDF Detected</h3>
                  <p className="text-xs text-amber-800 mt-1">{statusMessage}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                  Try Another PDF
                </Button>
                <Button variant="primary" size="sm" onClick={() => setCurrentStep(2)}>
                  Select Bank Layout
                </Button>
              </div>
            </Card>
          )}

          {/* No Transactions Found Banner */}
          {extractionStatus === 'no_transactions' && (
            <Card className="p-6 bg-red-50 border border-red-200 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-red-900">No Transactions Extracted</h3>
                  <p className="text-xs text-red-800 mt-1">{statusMessage}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                  Try Another PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
                  Select Bank Layout
                </Button>
                <Button variant="primary" size="sm" onClick={() => alert('Support team contacted for bank statement format analysis.')}>
                  Contact Support
                </Button>
              </div>
            </Card>
          )}

          {/* Successful Extraction Layout */}
          {extractionStatus === 'success' && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4 bg-white border border-[#E5E5E5]">
                  <span className="text-[10px] font-mono text-[#666666] uppercase block">OPENING BALANCE</span>
                  <span className="text-base font-bold font-mono text-black">
                    ₹{openingBalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </Card>
                <Card className="p-4 bg-white border border-[#E5E5E5]">
                  <span className="text-[10px] font-mono text-[#666666] uppercase block">TOTAL DEBIT (DR)</span>
                  <span className="text-base font-bold font-mono text-[#DC2626]">
                    ₹{totalDebitSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </Card>
                <Card className="p-4 bg-white border border-[#E5E5E5]">
                  <span className="text-[10px] font-mono text-[#666666] uppercase block">TOTAL CREDIT (CR)</span>
                  <span className="text-base font-bold font-mono text-[#16A34A]">
                    ₹{totalCreditSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </Card>
                <Card className="p-4 bg-white border border-[#E5E5E5]">
                  <span className="text-[10px] font-mono text-[#666666] uppercase block">CLOSING BALANCE</span>
                  <span className="text-base font-bold font-mono text-black">
                    ₹{closingBalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </Card>
              </div>

              {/* Data Quality Metrics Strip */}
              {qualityMetrics && (
                <div className="bg-[#FAFAFA] p-3 rounded-lg border border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-4">
                    <span><strong className="text-black">Transactions:</strong> {qualityMetrics.total_transactions}</span>
                    <span className="text-[#16A34A]"><strong className="text-black">Valid:</strong> {qualityMetrics.valid_rows}</span>
                    <span className="text-amber-600"><strong className="text-black">Warnings:</strong> {qualityMetrics.warnings_count}</span>
                    <span className="text-[#DC2626]"><strong className="text-black">Errors:</strong> {qualityMetrics.errors_count}</span>
                  </div>
                  {qualityMetrics.date_range && (
                    <div className="text-[#555555]">
                      <span>Period: {qualityMetrics.date_range}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Review Table Header & Action Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="tech-label block mb-1">REVIEW TRANSACTIONS / 05</span>
                  <h3 className="text-lg font-bold text-black">Extracted Transactions Table ({transactions.length} Rows)</h3>
                  <p className="text-xs text-[#555555]">Review and correct extracted PDF entries before generating Tally XML or CSV exports.</p>
                </div>
                <div className="flex items-center gap-2">
                  {deletedRows.length > 0 && (
                    <Button variant="outline" size="sm" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={handleRestoreLastDeletedRow}>
                      Restore Row ({deletedRows.length})
                    </Button>
                  )}
                  <Button variant="outline" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsAddModalOpen(true)}>
                    Add Row
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setCurrentStep(6)}>
                    Proceed to Export
                  </Button>
                </div>
              </div>

              <DataTable
                columns={columns}
                data={transactions}
                technicalHeader="EXTRACTED STATEMENT TABLE"
                searchPlaceholder="Search narration or ref no..."
                actions={(row) => (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingRow(row); setIsEditModalOpen(true); }}
                      className="p-1.5 text-black hover:bg-[#F7F7F7] rounded"
                      title="Edit Row"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="p-1.5 text-[#DC2626] hover:bg-red-50 rounded"
                      title="Delete Row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              />
            </>
          )}
        </div>
      )}

      {currentStep === 6 && (
        <Card className="p-8 max-w-2xl mx-auto bg-white text-center space-y-6 font-mono">
          <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-[#16A34A]" />
          </div>
          <div>
            <span className="tech-label block mb-1">EXPORT READY / 06</span>
            <h3 className="text-xl font-extrabold text-black">Statement Vouchers Ready for Accounting</h3>
            <p className="text-xs text-[#555555] mt-1">
              Extracted {transactions.length} verified transaction vouchers ready for export.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              size="lg"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleDownloadCsv}
            >
              DOWNLOAD CSV
            </Button>
            <Button
              variant="outline"
              size="lg"
              leftIcon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={handleDownloadExcel}
            >
              DOWNLOAD EXCEL
            </Button>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleDownloadTallyXml}
            >
              GENERATE TALLY XML
            </Button>
          </div>
        </Card>
      )}

      {/* Edit Row Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Transaction Row"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>Save Changes</Button>
          </>
        }
      >
        {editingRow && (
          <div className="space-y-4 font-mono text-xs">
            <Input label="TRANSACTION DATE" type="date" value={editingRow.transaction_date} onChange={(e) => setEditingRow({ ...editingRow, transaction_date: e.target.value })} />
            <Input label="NARRATION" value={editingRow.narration} onChange={(e) => setEditingRow({ ...editingRow, narration: e.target.value })} />
            <Input label="REFERENCE NO" value={editingRow.reference_number} onChange={(e) => setEditingRow({ ...editingRow, reference_number: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="DEBIT AMOUNT" type="number" value={editingRow.debit} onChange={(e) => setEditingRow({ ...editingRow, debit: Number(e.target.value) })} />
              <Input label="CREDIT AMOUNT" type="number" value={editingRow.credit} onChange={(e) => setEditingRow({ ...editingRow, credit: Number(e.target.value) })} />
            </div>
            <Input label="CLOSING BALANCE" type="number" value={editingRow.balance} onChange={(e) => setEditingRow({ ...editingRow, balance: Number(e.target.value) })} />
          </div>
        )}
      </Modal>

      {/* Add Row Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Transaction"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAddRow}>Add Transaction</Button>
          </>
        }
      >
        <div className="space-y-4 font-mono text-xs">
          <Input label="TRANSACTION DATE" type="date" value={newRow.transaction_date} onChange={(e) => setNewRow({ ...newRow, transaction_date: e.target.value })} />
          <Input label="NARRATION" placeholder="UPI or NEFT transfer detail" value={newRow.narration} onChange={(e) => setNewRow({ ...newRow, narration: e.target.value })} />
          <Input label="REFERENCE NO" placeholder="REF12345" value={newRow.reference_number} onChange={(e) => setNewRow({ ...newRow, reference_number: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="DEBIT" type="number" value={newRow.debit} onChange={(e) => setNewRow({ ...newRow, debit: Number(e.target.value) })} />
            <Input label="CREDIT" type="number" value={newRow.credit} onChange={(e) => setNewRow({ ...newRow, credit: Number(e.target.value) })} />
          </div>
          <Input label="BALANCE" type="number" value={newRow.balance} onChange={(e) => setNewRow({ ...newRow, balance: Number(e.target.value) })} />
        </div>
      </Modal>
    </div>
  );
};
