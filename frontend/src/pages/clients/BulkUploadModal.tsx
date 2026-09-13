import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { FileUpload } from '../../components/ui/ProgressBar';
import type { BulkUploadResponse } from '../../services/clientService';
import { clientService } from '../../services/clientService';
import { Download, Upload, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BulkUploadResponse | null>(null);

  const handleDownloadSample = () => {
    const csvContent =
      'Trade Name,Party Name,GSTIN,PAN,Mobile,Email,State,Filing Frequency\n' +
      'Acme Traders,Acme Traders Pvt Ltd,24ABCDE1234F1Z5,ABCDE1234F,9876543210,accounts@acme.com,Gujarat,monthly\n' +
      'Bharat Logistics,Bharat Logistics Enterprise,27FGHIJ5678K1Z2,FGHIJ5678K,9820011223,info@bharatlogistics.com,Maharashtra,quarterly\n' +
      'Shiv Shakti Retail,Shiv Shakti Store,07KLMNO9012P1Z8,KLMNO9012P,9811099887,contact@shivshakti.in,Delhi,monthly\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'GST_Suite_Bulk_Clients_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a CSV or Excel file to upload.');
      return;
    }

    setError('');
    setIsLoading(true);
    setResult(null);

    try {
      const res = await clientService.bulkUploadClients(selectedFile);
      setResult(res);
      setIsLoading(false);
      onSuccess();
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to parse and upload bulk client file.');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="BULK CLIENT IMPORT (CSV / EXCEL)"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Helper Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-xs">
          <div>
            <p className="font-bold text-[#111111]">Upload CSV or Excel file containing your GST clients list.</p>
            <p className="text-[#666666] mt-0.5">Required fields: Trade Name, Party Name, 15-digit GSTIN.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleDownloadSample}
          >
            Download Sample CSV
          </Button>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-xs font-mono font-bold text-[#DC2626] rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!result ? (
          <div className="space-y-5">
            <FileUpload
              onFileSelect={(files) => {
                const file = Array.isArray(files) ? files[0] : files instanceof FileList ? files[0] : files;
                if (file) {
                  setSelectedFile(file);
                  setError('');
                }
              }}
              accept=".csv, .txt, .xlsx, .xls"
              label="DRAG & DROP BULK CLIENT FILE OR BROWSE"
              helperText={selectedFile ? `Selected File: ${selectedFile.name}` : 'Supports CSV, XLSX or XLS files up to 10MB'}
            />

            <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                isLoading={isLoading}
                disabled={!selectedFile}
                leftIcon={<Upload className="w-4 h-4" />}
                onClick={handleUploadSubmit}
              >
                Process & Import Clients
              </Button>
            </div>
          </div>
        ) : (
          /* Import Result & Preview */
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 text-xs text-green-800 font-mono">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-green-900">{result.message}</p>
                <p className="mt-1">
                  Successfully added <strong>{result.summary.inserted_count}</strong> new clients out of {result.summary.total_records} total records.
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3 text-center font-mono">
              <div className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl">
                <span className="text-[10px] text-[#666666] uppercase block font-bold">TOTAL ROWS</span>
                <span className="text-lg font-extrabold text-black">{result.summary.total_records}</span>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-900">
                <span className="text-[10px] text-green-700 uppercase block font-bold">IMPORTED</span>
                <span className="text-lg font-extrabold">{result.summary.inserted_count}</span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <span className="text-[10px] text-amber-700 uppercase block font-bold">DUPLICATES</span>
                <span className="text-lg font-extrabold">{result.summary.duplicate_count}</span>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900">
                <span className="text-[10px] text-red-700 uppercase block font-bold">INVALID</span>
                <span className="text-lg font-extrabold">{result.summary.invalid_count}</span>
              </div>
            </div>

            {/* Import Notes / Errors */}
            {result.import_errors && result.import_errors.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> IMPORT DISCREPANCY LOGS
                </p>
                <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
                  {result.import_errors.map((errNote, i) => (
                    <p key={i} className="text-[#666666] text-[11px]">
                      • {errNote}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
              <Button type="button" variant="primary" size="md" onClick={() => { handleReset(); onClose(); }}>
                Done & View Clients List
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
