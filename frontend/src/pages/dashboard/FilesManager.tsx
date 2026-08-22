import React, { useState, useEffect } from 'react';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { FileText, ShoppingCart, Download, Trash2, RefreshCw } from 'lucide-react';

interface FileItem {
  id: number;
  filename: string;
  module: string;
  status: string;
  uploaded: string;
  processed: string;
  records_count: number;
  file_size: string;
  error?: string;
}

export const FilesManager: React.FC = () => {
  const [filter, setFilter] = useState('all');
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    fetch(`/api/files?filter=${filter}`)
      .then((res) => res.json())
      .then((data) => setFiles(data.files || []))
      .catch(() => {
        setFiles([
          { id: 1, filename: 'HDFC_Statement_Q3_2026.pdf', module: 'Bank Statement', status: 'completed', uploaded: '2026-08-19 10:20', processed: '2026-08-19 10:22', records_count: 142, file_size: '1.2 MB' },
          { id: 2, filename: 'Amazon_Sales_Aug2026.csv', module: 'E-Commerce GSTR-1', status: 'completed', uploaded: '2026-08-18 14:10', processed: '2026-08-18 14:12', records_count: 840, file_size: '4.8 MB' },
          { id: 3, filename: 'SBI_Statement_July2026.pdf', module: 'Bank Statement', status: 'completed', uploaded: '2026-08-16 11:00', processed: '2026-08-16 11:02', records_count: 88, file_size: '850 KB' },
          { id: 4, filename: 'Meesho_Payouts_Report.csv', module: 'E-Commerce GSTR-1', status: 'failed', uploaded: '2026-08-15 09:30', processed: '2026-08-15 09:31', records_count: 0, file_size: '320 KB', error: 'Invalid CSV column format' },
        ]);
      });
  }, [filter]);

  const handleDelete = (id: number) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const columns: Column<FileItem>[] = [
    {
      key: 'filename',
      header: 'Filename',
      render: (r) => (
        <div>
          <div className="flex items-center gap-2 font-semibold text-black">
            {r.module === 'Bank Statement' ? <FileText className="w-4 h-4 text-black" /> : <ShoppingCart className="w-4 h-4 text-black" />}
            <span>{r.filename}</span>
          </div>
          <p className="text-[10px] text-[#666666]">{r.file_size}</p>
        </div>
      ),
    },
    { key: 'module', header: 'Module', render: (r) => <Badge variant="outline">{r.module}</Badge> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <div>
          <Badge variant={r.status === 'completed' ? 'success' : 'error'}>{r.status}</Badge>
          {r.error && <p className="text-[10px] text-[#DC2626] font-semibold mt-0.5">{r.error}</p>}
        </div>
      ),
    },
    { key: 'uploaded', header: 'Uploaded Date' },
    { key: 'records_count', header: 'Extracted Records', render: (r) => `${r.records_count} rows` },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-black">Files History & Archive</h2>
          <p className="text-xs text-[#666666] mt-0.5">View uploaded statement PDFs and marketplace sales reports.</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'bank', 'ecommerce', 'failed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer capitalize ${
              filter === f ? 'bg-black text-white' : 'bg-white text-[#666666] border border-[#E5E5E5] hover:bg-[#F7F7F7]'
            }`}
          >
            {f} Files
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={files}
        searchPlaceholder="Search filename..."
        actions={(row) => (
          <div className="flex items-center gap-2">
            {row.status === 'completed' ? (
              <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
                Export
              </Button>
            ) : (
              <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            )}
            <button onClick={() => handleDelete(row.id)} className="p-1.5 text-[#DC2626] hover:bg-red-50 rounded-lg">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      />
    </div>
  );
};
