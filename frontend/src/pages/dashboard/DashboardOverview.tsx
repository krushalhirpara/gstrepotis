import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { KpiCard } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { FileText, ShoppingCart, CheckCircle2, AlertCircle, ArrowUpRight, Plus } from 'lucide-react';
import { apiFetch } from '../../services/api';

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
  const [widgets, setWidgets] = useState({ total_files: 0, processed_files: 0, failed_files: 0, remaining_credits: 150 });

  useEffect(() => {
    apiFetch('/api/dashboard/summary')
      .then((res) => res.json())
      .then((data) => {
        setActivities(data.recent_activity || []);
        if (data.widgets) setWidgets(data.widgets);
      })
      .catch(() => {
        setActivities([]);
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
        <KpiCard title="Total Files Uploaded" value={`${widgets.total_files} Files`} subtitle="All modules combined" icon={<FileText className="w-5 h-5" />} />
        <KpiCard title="Successfully Processed" value={`${widgets.processed_files} Files`} trend={{ value: widgets.total_files > 0 ? `${Math.round((widgets.processed_files/widgets.total_files)*100)}% Success Rate` : '0% Success Rate', isPositive: true }} icon={<CheckCircle2 className="w-5 h-5 text-[#16A34A]" />} />
        <KpiCard title="Failed Extractions" value={`${widgets.failed_files} File${widgets.failed_files !== 1 ? 's' : ''}`} subtitle={widgets.failed_files > 0 ? "Requires column update" : "All clear"} icon={<AlertCircle className="w-5 h-5 text-[#DC2626]" />} />
        <KpiCard title="Available Credits" value={`${widgets.remaining_credits} Credits`} badge={<Badge variant="neutral">Professional Plan</Badge>} />
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
