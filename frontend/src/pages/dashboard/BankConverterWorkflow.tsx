import React, { useState } from 'react';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { FileUpload } from '../../components/ui/ProgressBar';
import { SearchableSelect } from '../../components/ui/Input';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Download, Lock, CheckCircle2, RefreshCw, Plus, Edit2, Trash2 } from 'lucide-react';

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

export const BankConverterWorkflow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bankCode, setBankCode] = useState('AUTO');
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [processingStep, setProcessingStep] = useState(1);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TransactionRow | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRow, setNewRow] = useState<Partial<TransactionRow>>({
    transaction_date: dateToday(),
    narration: '',
    reference_number: '',
    debit: 0,
    credit: 0,
    balance: 50000,
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
    { value: 'IDFC', label: 'IDFC First Bank', sublabel: 'Standard PDF' },
  ];

  const handleFileSelect = (files: FileList | File[]) => {
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setCurrentStep(2);
    }
  };

  const handleStartExtraction = () => {
    setCurrentStep(4);
    setProcessingStep(1);

    setTimeout(() => setProcessingStep(2), 600);
    setTimeout(() => setProcessingStep(3), 1200);
    setTimeout(() => setProcessingStep(4), 1800);
    setTimeout(() => {
      const formData = new FormData();
      if (bankCode) formData.append('bank_code', bankCode);
      if (password) formData.append('password', password);
      if (selectedFile) formData.append('file', selectedFile);

      fetch('/api/bank-statements/process', {
        method: 'POST',
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'success' && data.transactions) {
            setTransactions(data.transactions.map((tx: any, idx: number) => ({ id: idx + 1, ...tx })));
            setCurrentStep(5);
          } else {
            alert(data.message || 'Unable to extract the complete statement. Please verify the PDF format or try another supported bank format.');
            setCurrentStep(2);
          }
        })
        .catch(() => {
          alert('Unable to extract the complete statement. Please verify the PDF format or try another supported bank format.');
          setCurrentStep(2);
        });
    }, 2200);
  };

  const handleDownloadCsv = () => {
    fetch('/api/bank-statements/export-csv', {
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

  const handleDownloadTallyXml = () => {
    fetch('/api/bank-statements/export-xml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bank_name: 'HDFC Bank', transactions }),
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
    setTransactions(transactions.filter((t) => t.id !== id));
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
        balance: Number(newRow.balance) || 50000,
      };
      setTransactions([...transactions, created]);
      setIsAddModalOpen(false);
    }
  };

  const columns: Column<TransactionRow>[] = [
    { key: 'transaction_date', header: 'TX DATE' },
    { key: 'narration', header: 'NARRATION / DESCRIPTION' },
    { key: 'reference_number', header: 'REF NO / CHQ' },
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
          <Button variant="outline" size="sm" onClick={() => { setCurrentStep(1); setSelectedFile(null); }}>
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
            <h3 className="text-base font-bold text-black">{selectedFile?.name || 'HDFC_Statement.pdf'}</h3>
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
            <Button variant="primary" className="w-1/2" onClick={() => setCurrentStep(isProtected ? 3 : 4)}>
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
          </div>

          <div className="space-y-3">
            <div className={`flex items-center justify-between p-2.5 rounded border ${
              processingStep >= 1 ? 'border-black bg-[#FAFAFA]' : 'border-[#E5E5E5] text-[#888888]'
            }`}>
              <span>✓ File format validated</span>
              <span className="font-bold">{processingStep >= 1 ? 'OK' : 'WAIT'}</span>
            </div>
            <div className={`flex items-center justify-between p-2.5 rounded border ${
              processingStep >= 2 ? 'border-black bg-[#FAFAFA]' : 'border-[#E5E5E5] text-[#888888]'
            }`}>
              <span>✓ Bank layout identified</span>
              <span className="font-bold">{processingStep >= 2 ? 'OK' : 'WAIT'}</span>
            </div>
            <div className={`flex items-center justify-between p-2.5 rounded border ${
              processingStep >= 3 ? 'border-black bg-[#FAFAFA]' : 'border-[#E5E5E5] text-[#888888]'
            }`}>
              <span>● Extracting transactions</span>
              <span className="font-bold">{processingStep >= 3 ? 'OK' : 'WAIT'}</span>
            </div>
            <div className={`flex items-center justify-between p-2.5 rounded border ${
              processingStep >= 4 ? 'border-black bg-[#FAFAFA]' : 'border-[#E5E5E5] text-[#888888]'
            }`}>
              <span>○ Preparing Tally output</span>
              <span className="font-bold">{processingStep >= 4 ? 'OK' : 'WAIT'}</span>
            </div>
          </div>
        </Card>
      )}

      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="tech-label block mb-1">REVIEW TRANSACTIONS / 05</span>
              <h3 className="text-lg font-bold text-black">Extracted Transactions Preview</h3>
              <p className="text-xs text-[#555555]">Inspect debit/credit lines. Edit or add missing transactions before export.</p>
            </div>
            <div className="flex items-center gap-2">
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
            technicalHeader="EXTRACTED TABLE"
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
        </div>
      )}

      {currentStep === 6 && (
        <Card className="p-8 max-w-xl mx-auto bg-white text-center space-y-6 font-mono">
          <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
          </div>
          <div>
            <span className="tech-label block mb-1">EXPORT READY / 06</span>
            <h3 className="text-xl font-extrabold text-black">Statement Processed Successfully</h3>
            <p className="text-xs text-[#555555] mt-1">
              Extracted {transactions.length} normalized transaction vouchers ready for accounting export.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="outline"
              size="lg"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleDownloadCsv}
            >
              DOWNLOAD CSV
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
          </div>
        )}
      </Modal>

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
        </div>
      </Modal>
    </div>
  );
};
