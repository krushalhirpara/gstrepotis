import React from 'react';
import { type GstAudit, type GstAuditSummaryReport } from '../../services/gstAuditService';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  FileCheck2,
  TrendingUp,
  Percent,
} from 'lucide-react';

interface GstAuditOverviewTabProps {
  audit: GstAudit;
  counts: {
    files: number;
    records: number;
    reconciliations: number;
    exceptions: number;
    open_exceptions: number;
    working_papers: number;
  };
  summary: GstAuditSummaryReport | null;
  onNavigateTab: (tab: string) => void;
}

export const GstAuditOverviewTab: React.FC<GstAuditOverviewTabProps> = ({
  audit,
  counts,
  summary,
  onNavigateTab,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer Alert */}
      <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-950">GST Audit & Reconciliation Workspace</p>
          <p className="mt-0.5 text-amber-800">
            Automated checks are analytical aids and should be reviewed by a qualified professional.
            This module assists Tax Professionals and Chartered Accountants in performing reconciliations
            and identifying tax exposure.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-4 border-[#E5E5E5] bg-white">
          <div className="flex items-center justify-between text-[#888888] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Quality Score</span>
            <Percent className="w-4 h-4 text-black" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-[#111111]">
              {audit.data_quality_score}%
            </span>
            <span className="text-[11px] text-[#666666]">Data Integrity</span>
          </div>
          <div className="w-full bg-[#EFEFEF] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                audit.data_quality_score >= 80
                  ? 'bg-emerald-500'
                  : audit.data_quality_score >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, audit.data_quality_score))}%` }}
            />
          </div>
        </Card>

        <Card className="p-4 border-[#E5E5E5] bg-white">
          <div className="flex items-center justify-between text-[#888888] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Uploaded Data</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-[#111111]">{counts.files}</span>
            <span className="text-[11px] text-[#666666]">Files ({counts.records} lines)</span>
          </div>
          <button
            onClick={() => onNavigateTab('upload')}
            className="text-[11px] font-bold text-black hover:underline mt-2 inline-block cursor-pointer"
          >
            Manage Data Center →
          </button>
        </Card>

        <Card className="p-4 border-[#E5E5E5] bg-white">
          <div className="flex items-center justify-between text-[#888888] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Reconciliations</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-[#111111]">{counts.reconciliations}</span>
            <span className="text-[11px] text-[#666666]">Processed</span>
          </div>
          <button
            onClick={() => onNavigateTab('reconciliation')}
            className="text-[11px] font-bold text-black hover:underline mt-2 inline-block cursor-pointer"
          >
            View Reconciliations →
          </button>
        </Card>

        <Card className="p-4 border-[#E5E5E5] bg-white">
          <div className="flex items-center justify-between text-[#888888] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Audit Exceptions</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-red-600">{counts.open_exceptions}</span>
            <span className="text-[11px] text-[#666666]">Open / {counts.exceptions} Total</span>
          </div>
          <button
            onClick={() => onNavigateTab('exceptions')}
            className="text-[11px] font-bold text-red-600 hover:underline mt-2 inline-block cursor-pointer"
          >
            Review Exceptions →
          </button>
        </Card>
      </div>

      {/* Analytical Findings Overview */}
      {summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Outward Supplies Comparison */}
          <Card className="p-5 border-[#E5E5E5] bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] mb-4">
              <div>
                <h4 className="text-sm font-bold text-[#111111]">Outward Supplies Reconciliation</h4>
                <p className="text-[11px] text-[#666666]">GSTR-1 vs Books of Accounts (Sales)</p>
              </div>
              <Badge variant={summary.outward_supplies.taxable_difference === 0 ? 'success' : 'warning'}>
                Diff: {formatCurrency(summary.outward_supplies.taxable_difference)}
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">Books (Sales Register) Taxable:</span>
                <span className="font-mono font-bold">{formatCurrency(summary.outward_supplies.books_taxable)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">GSTR-1 Portal Taxable:</span>
                <span className="font-mono font-bold">{formatCurrency(summary.outward_supplies.gstr1_taxable)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">Books Total Tax (IGST+CGST+SGST):</span>
                <span className="font-mono font-bold">{formatCurrency(summary.outward_supplies.books_tax)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">GSTR-1 Total Tax Reported:</span>
                <span className="font-mono font-bold">{formatCurrency(summary.outward_supplies.gstr1_tax)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 font-bold text-black">
                <span>Net Tax Liability Exposure:</span>
                <span className={`font-mono ${summary.outward_supplies.tax_difference > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(summary.outward_supplies.tax_difference)}
                </span>
              </div>
            </div>
          </Card>

          {/* Inward Supplies / ITC Comparison */}
          <Card className="p-5 border-[#E5E5E5] bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] mb-4">
              <div>
                <h4 className="text-sm font-bold text-[#111111]">ITC & Inward Reconciliation</h4>
                <p className="text-[11px] text-[#666666]">GSTR-2B Auto-Drafted vs Purchase Register</p>
              </div>
              <Badge variant={summary.inward_supplies.tax_difference === 0 ? 'success' : 'info'}>
                Tax Diff: {formatCurrency(summary.inward_supplies.tax_difference)}
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">Books (Purchase Register) Taxable:</span>
                <span className="font-mono font-bold">{formatCurrency(summary.inward_supplies.purchase_taxable)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">GSTR-2B Available Taxable:</span>
                <span className="font-mono font-bold">{formatCurrency(summary.inward_supplies.gstr2b_taxable)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">ITC Recorded in Books:</span>
                <span className="font-mono font-bold">{formatCurrency(summary.inward_supplies.purchase_tax)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">ITC as per GSTR-2B:</span>
                <span className="font-mono font-bold">{formatCurrency(summary.inward_supplies.gstr2b_tax)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 font-bold text-black">
                <span>Unreconciled / Potential ITC Difference:</span>
                <span className="font-mono text-amber-600">
                  {formatCurrency(summary.inward_supplies.tax_difference)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 border-[#E5E5E5] bg-white text-center">
          <p className="text-sm font-bold text-[#111111]">No reconciliation data calculated yet.</p>
          <p className="text-xs text-[#666666] mt-1">
            Upload GSTR returns and Books registers in Data Center, then click "Run Reconciliation & Rules".
          </p>
          <button
            onClick={() => onNavigateTab('upload')}
            className="mt-3 px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Go to Data Center
          </button>
        </Card>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 pt-2">
        <button
          onClick={() => onNavigateTab('reconciliation')}
          className="p-4 bg-white border border-[#E5E5E5] rounded-2xl text-left hover:border-black transition-all group cursor-pointer"
        >
          <TrendingUp className="w-5 h-5 text-black mb-2" />
          <h5 className="text-xs font-bold text-[#111111] group-hover:underline">Reconciliation Center</h5>
          <p className="text-[11px] text-[#666666] mt-0.5">
            Multi-pass matching for GSTR-1, GSTR-2B, and GSTR-3B with tolerance settings.
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('itc')}
          className="p-4 bg-white border border-[#E5E5E5] rounded-2xl text-left hover:border-black transition-all group cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5 text-black mb-2" />
          <h5 className="text-xs font-bold text-[#111111] group-hover:underline">ITC Analysis</h5>
          <p className="text-[11px] text-[#666666] mt-0.5">
            Section 16(2) compliance, 2B vs Books, blocked credits, and reversal reviews.
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('checklist')}
          className="p-4 bg-white border border-[#E5E5E5] rounded-2xl text-left hover:border-black transition-all group cursor-pointer"
        >
          <ListTodo className="w-5 h-5 text-black mb-2" />
          <h5 className="text-xs font-bold text-[#111111] group-hover:underline">15-Category Checklist</h5>
          <p className="text-[11px] text-[#666666] mt-0.5">
            Standard CA audit checklist covering Registration, Sales, Purchases, RCM, etc.
          </p>
        </button>

        <button
          onClick={() => onNavigateTab('report')}
          className="p-4 bg-white border border-[#E5E5E5] rounded-2xl text-left hover:border-black transition-all group cursor-pointer"
        >
          <FileCheck2 className="w-5 h-5 text-black mb-2" />
          <h5 className="text-xs font-bold text-[#111111] group-hover:underline">Audit Dossier & Report</h5>
          <p className="text-[11px] text-[#666666] mt-0.5">
            Generate printable audit report dossier and export exception data to CSV/Excel.
          </p>
        </button>
      </div>
    </div>
  );
};
