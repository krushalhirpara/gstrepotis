import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { KpiCard } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { FileText, ShoppingCart, CheckCircle2, AlertCircle, ArrowUpRight, Plus } from 'lucide-react';

interface ActivityItem {
  id: number;
  filename: string;
  module: string;
  status: string;
  date: string;
  transactions_count: number;
}

export const DashboardOverview: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetch('/api/dashboard/summary')
      .then((res) => res.json())
      .then((data) => {
        setActivities(data.recent_activity || []);
      })
      .catch(() => {
        setActivities([
          { id: 1, filename: 'HDFC_Bank_Statement_Q3.pdf', module: 'Bank Converter', status: 'completed', date: '2026-08-21 14:30', transactions_count: 142 },
          { id: 2, filename: 'Amazon_Sales_Report_Aug.csv', module: 'E-Commerce GSTR-1', status: 'completed', date: '2026-08-21 11:15', transactions_count: 840 },
          { id: 3, filename: 'SBI_Statement_July.pdf', module: 'Bank Converter', status: 'completed', date: '2026-08-20 18:45', transactions_count: 88 },
          { id: 4, filename: 'Meesho_Payouts_Report.csv', module: 'E-Commerce GSTR-1', status: 'failed', date: '2026-08-19 16:00', transactions_count: 0 },
        ]);
      });
  }, []);

  const columns: Column<ActivityItem>[] = [
    {
      key: 'filename',
      header: 'File Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {row.module === 'Bank Converter' ? (
            <FileText className="w-4 h-4 text-black shrink-0" />
          ) : (
            <ShoppingCart className="w-4 h-4 text-black shrink-0" />
          )}
          <span className="font-semibold text-black">{row.filename}</span>
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Module',
      render: (row) => <Badge variant="outline">{row.module}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'completed' ? 'success' : 'error'}>
          {row.status === 'completed' ? 'Processed' : 'Failed'}
        </Badge>
      ),
    },
    {
      key: 'transactions_count',
      header: 'Extracted Count',
      render: (row) => <span>{row.transactions_count} Records</span>,
    },
    {
      key: 'date',
      header: 'Processed Date',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E5E5] shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-[#111111] tracking-tight">Overview Dashboard</h2>
          <p className="text-xs text-[#666666] mt-0.5">Welcome back! Run bank statement conversions or prepare GSTR-1 files.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dashboard/bank-converter">
            <Button variant="outline" size="sm" leftIcon={<FileText className="w-4 h-4" />}>
              Bank Statement
            </Button>
          </Link>
          <Link to="/dashboard/ecommerce-gstr1">
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              E-Commerce GST
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard title="Total Files Uploaded" value="12 Files" subtitle="All modules combined" icon={<FileText className="w-5 h-5" />} />
        <KpiCard title="Successfully Processed" value="11 Files" trend={{ value: '91.6% Success Rate', isPositive: true }} icon={<CheckCircle2 className="w-5 h-5 text-[#16A34A]" />} />
        <KpiCard title="Failed Extractions" value="1 File" subtitle="Requires column update" icon={<AlertCircle className="w-5 h-5 text-[#DC2626]" />} />
        <KpiCard title="Available Credits" value="150 Credits" badge={<Badge variant="neutral">Professional Plan</Badge>} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#111111]">Recent Processing Activity</h3>
          <Link to="/dashboard/files" className="text-xs font-bold text-black hover:underline flex items-center gap-1">
            View All Files <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable
          columns={columns}
          data={activities}
          searchPlaceholder="Filter recent files..."
          actions={() => (
            <Button variant="outline" size="sm">
              View Output
            </Button>
          )}
        />
      </div>
    </div>
  );
};
