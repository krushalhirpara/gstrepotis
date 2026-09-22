import React, { useState, useRef } from 'react';
import { type GstAudit, type GstAuditFile, gstAuditService } from '../../services/gstAuditService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  UploadCloud,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
} from 'lucide-react';

interface GstAuditUploadTabProps {
  audit: GstAudit;
  files: GstAuditFile[];
  onFilesChanged: () => void;
}

export const GstAuditUploadTab: React.FC<GstAuditUploadTabProps> = ({
  audit,
  files,
  onFilesChanged,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('gstr1');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = [
    { id: 'gstr1', name: 'GSTR-1 Outward Return', group: 'GST Returns', desc: 'JSON portal export or Excel/CSV with B2B, B2C, CDNR' },
    { id: 'gstr2b', name: 'GSTR-2B Auto ITC Statement', group: 'GST Returns', desc: 'JSON portal export or Excel with B2B, CDNR, ITC eligible' },
    { id: 'gstr3b', name: 'GSTR-3B Monthly Return', group: 'GST Returns', desc: 'JSON portal export with Table 3.1 liability & Table 4 ITC' },
    { id: 'gstr9', name: 'GSTR-9 Annual Return', group: 'GST Returns', desc: 'JSON portal export or PDF summary' },
    { id: 'sales_register', name: 'Sales Register (Books)', group: 'Books of Accounts', desc: 'CSV or Excel export from Tally, Busy, SAP, Zoho Books' },
    { id: 'purchase_register', name: 'Purchase Register (Books)', group: 'Books of Accounts', desc: 'CSV or Excel with Invoice No, Date, Supplier GSTIN, Taxable, IGST, CGST, SGST' },
    { id: 'general_ledger', name: 'General Ledger / Trial Balance', group: 'Books of Accounts', desc: 'CSV or Excel with account heads and balances' },
    { id: 'e_way_bill', name: 'E-Way Bill / Other Docs', group: 'Other Data', desc: 'JSON, CSV or Excel with EWB numbers and vehicle data' },
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';

    setUploading(true);
    setUploadMessage(null);

    try {
      const res = await gstAuditService.uploadFile(audit.id, file, selectedCategory);
      setUploadMessage({
        type: 'success',
        text: `File "${file.name}" uploaded successfully. Normalized ${res.data.records_count} records.`,
      });
      onFilesChanged();
    } catch (err: unknown) {
      setUploadMessage({
        type: 'warning',
        text: err instanceof Error ? err.message : 'Unable to reliably extract this document. Please verify the file or upload the supported format.',
      });
      onFilesChanged();
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Are you sure you want to remove this file and its normalized records?')) return;
    try {
      await gstAuditService.deleteFile(audit.id, fileId);
      onFilesChanged();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete file.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Upload Banner */}
      <div className="p-4 bg-white border border-[#E5E5E5] rounded-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
          <div>
            <h3 className="text-sm font-bold text-[#111111]">Data Upload & Normalization Center</h3>
            <p className="text-xs text-[#666666] mt-0.5">
              Upload client GST portal returns (JSON) and books registers (CSV/Excel). The engine automatically normalizes columns.
            </p>
          </div>
          <div className="text-xs text-[#888888] font-mono">
            Supported: <span className="font-bold text-black">JSON, CSV, XLSX, PDF</span>
          </div>
        </div>

        {uploadMessage && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              uploadMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800'
            }`}
          >
            {uploadMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{uploadMessage.text}</div>
          </div>
        )}

        {/* Upload Selection Controls */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-2">
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider">
              Document Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black transition-colors font-medium"
            >
              <optgroup label="GST Returns">
                <option value="gstr1">GSTR-1 Outward Return</option>
                <option value="gstr2b">GSTR-2B Auto ITC Statement</option>
                <option value="gstr3b">GSTR-3B Monthly Return</option>
                <option value="gstr9">GSTR-9 Annual Return</option>
              </optgroup>
              <optgroup label="Books of Accounts">
                <option value="sales_register">Sales Register (Books)</option>
                <option value="purchase_register">Purchase Register (Books)</option>
                <option value="general_ledger">General Ledger / Trial Balance</option>
              </optgroup>
              <optgroup label="Other Data">
                <option value="e_way_bill">E-Way Bill / Other Docs</option>
              </optgroup>
            </select>
            <p className="text-[11px] text-[#888888]">
              {categories.find((c) => c.id === selectedCategory)?.desc}
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
              Select & Upload File
            </label>
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                uploading
                  ? 'border-gray-300 bg-[#F9F9F9] cursor-not-allowed'
                  : 'border-[#CCCCCC] hover:border-black bg-[#FBFBFB] hover:bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.xlsx,.xls,.pdf"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-black animate-spin mb-2" />
                  <p className="text-xs font-bold text-black">Uploading & Normalizing Data...</p>
                  <p className="text-[11px] text-[#888888] mt-0.5">
                    Validating column headers, GSTIN checksums, and calculating Data Quality score.
                  </p>
                </>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-[#666666] mb-2" />
                  <p className="text-xs font-bold text-[#111111]">
                    Click to browse or drop file here
                  </p>
                  <p className="text-[11px] text-[#888888] mt-0.5">
                    Upload for <span className="font-semibold text-black">{categories.find((c) => c.id === selectedCategory)?.name}</span>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded Files Table */}
      <Card className="border-[#E5E5E5] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-black" />
            <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              Uploaded Datasets ({files.length})
            </h4>
          </div>
          <span className="text-[11px] text-[#888888]">
            User & Audit scoped private storage
          </span>
        </div>

        {files.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#888888]">
            <Info className="w-6 h-6 mx-auto mb-2 text-[#AAAAAA]" />
            <p className="font-bold text-[#111111]">No audit data uploaded yet.</p>
            <p className="mt-1">
              Select a category above and upload real GST portal returns or client accounting exports.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F7F7] border-b border-[#E5E5E5] text-[11px] font-bold text-[#666666] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Document Category</th>
                  <th className="py-2.5 px-4">Filename</th>
                  <th className="py-2.5 px-4">Type / Size</th>
                  <th className="py-2.5 px-4">Normalized Lines</th>
                  <th className="py-2.5 px-4">Parse Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#111111]">
                      {categories.find((c) => c.id === file.category)?.name || file.category}
                    </td>
                    <td className="py-3 px-4 text-[#444444] font-mono text-[11px] max-w-xs truncate">
                      {file.original_filename}
                    </td>
                    <td className="py-3 px-4 text-[#666666] font-mono text-[11px]">
                      {file.file_type.toUpperCase()} · {formatFileSize(file.file_size)}
                    </td>
                    <td className="py-3 px-4 font-bold font-mono text-[#111111]">
                      {file.records_count} records
                    </td>
                    <td className="py-3 px-4">
                      {file.status === 'parsed' ? (
                        <Badge variant="success" size="sm">
                          Parsed Successfully
                        </Badge>
                      ) : file.status === 'processing' ? (
                        <Badge variant="warning" size="sm">
                          Processing
                        </Badge>
                      ) : (
                        <span title={file.error_message || ''}>
                          <Badge variant="error" size="sm">
                            Extraction Issue
                          </Badge>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-red-600 hover:bg-red-50"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
