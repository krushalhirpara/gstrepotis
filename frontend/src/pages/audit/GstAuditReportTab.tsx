import React, { useState, useEffect, useCallback } from 'react';
import { type GstAudit, type GstAuditSummaryReport, gstAuditService } from '../../services/gstAuditService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Download, Printer, ShieldAlert, Loader2 } from 'lucide-react';

interface GstAuditReportTabProps {
  audit: GstAudit;
}

export const GstAuditReportTab: React.FC<GstAuditReportTabProps> = ({ audit }) => {
  const [report, setReport] = useState<GstAuditSummaryReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await gstAuditService.getSummary(audit.id);
      setReport(res.data);
    } catch (err: unknown) {
      console.error('Failed to load audit report data', err);
    } finally {
      setLoading(false);
    }
  }, [audit.id]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    window.open(gstAuditService.downloadCsvUrl(audit.id), '_blank');
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-[#888888] flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-black" />
        Compiling comprehensive GST Audit Dossier & Analytical Working Papers...
      </div>
    );
  }

  if (!report) {
    return (
      <Card className="p-10 text-center text-xs text-[#888888] border-[#E5E5E5] bg-white">
        <p className="font-bold text-[#111111]">No report can be generated until required data is processed.</p>
        <p className="mt-1">Please ensure files are uploaded and reconciliation processing is complete.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Action Header (Hidden during print) */}
      <div className="p-4 bg-white border border-[#E5E5E5] rounded-2xl flex items-center justify-between print:hidden">
        <div>
          <h3 className="text-sm font-bold text-[#111111]">Comprehensive GST Audit Dossier</h3>
          <p className="text-xs text-[#666666]">
            Structured audit working papers with cross-return reconciliations and analytical findings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download Exceptions CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print / Export PDF
          </Button>
        </div>
      </div>

      {/* Printable Report Canvas */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-8 shadow-xs print:border-0 print:shadow-none print:p-0 space-y-8 text-[#111111]">
        {/* Header Title Section */}
        <div className="border-b-2 border-black pb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#666666] uppercase">
                GST Repotis Analytical Suite
              </span>
              <h1 className="text-2xl font-black tracking-tight text-[#111111] mt-0.5">
                GST AUDIT & RECONCILIATION DOSSIER
              </h1>
              <p className="text-xs text-[#666666] mt-1">
                Formal Working Papers for Tax Review & Annual Reconciliation
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold block">Status: {report.audit.status.toUpperCase()}</span>
              <span className="text-[11px] text-[#666666] block">
                Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Statutory Disclaimer Box */}
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">System-Generated Analytical Findings & Professional Disclaimer</p>
            <p className="text-[11px] leading-relaxed text-amber-900">
              {report.disclaimer}
            </p>
          </div>
        </div>

        {/* Section 1 & 2: Client & Master Details */}
        <div>
          <h2 className="text-xs font-bold font-mono text-[#888888] uppercase tracking-wider mb-2 border-b border-[#E5E5E5] pb-1">
            01. Entity & Master Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#FBFBFB] border border-[#EEEEEE] rounded-xl text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">Trade Name</span>
              <span className="font-bold text-[#111111]">{report.client.trade_name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">Legal Name</span>
              <span className="font-medium text-[#333333]">{report.client.party_name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">GSTIN</span>
              <span className="font-mono font-bold text-black">{report.client.gstin}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">Financial Year</span>
              <span className="font-mono font-bold text-black">{report.audit.financial_year}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">PAN</span>
              <span className="font-mono">{report.client.pan || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">State Jurisdiction</span>
              <span>{report.client.state || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">Filing Frequency</span>
              <span className="capitalize">{report.client.filing_frequency || 'Monthly'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">Data Quality Score</span>
              <span className="font-mono font-bold text-emerald-700">{report.audit.data_quality_score}%</span>
            </div>
          </div>
        </div>

        {/* Section 7 & 11: Outward Supplies & GSTR-1 Reconciliation */}
        <div>
          <h2 className="text-xs font-bold font-mono text-[#888888] uppercase tracking-wider mb-2 border-b border-[#E5E5E5] pb-1">
            02. Outward Supplies & GSTR-1 Reconciliation
          </h2>
          <table className="w-full text-xs border border-[#E5E5E5] rounded-xl overflow-hidden text-left">
            <thead className="bg-[#F7F7F7] font-bold text-[#666666] text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Books (Sales Register)</th>
                <th className="py-2.5 px-3">Reported in GSTR-1</th>
                <th className="py-2.5 px-3">Variance / Exposure</th>
                <th className="py-2.5 px-3">Analytical Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              <tr>
                <td className="py-2.5 px-3 font-semibold">Taxable Turnover</td>
                <td className="py-2.5 px-3 font-mono">{formatCurrency(report.outward_supplies.books_taxable)}</td>
                <td className="py-2.5 px-3 font-mono">{formatCurrency(report.outward_supplies.gstr1_taxable)}</td>
                <td className={`py-2.5 px-3 font-mono font-bold ${report.outward_supplies.taxable_difference !== 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {formatCurrency(report.outward_supplies.taxable_difference)}
                </td>
                <td className="py-2.5 px-3 text-[11px] text-[#666666]">
                  {report.outward_supplies.taxable_difference === 0 ? 'Exact match' : 'Turnover variance identified'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Output Tax (IGST+CGST+SGST)</td>
                <td className="py-2.5 px-3 font-mono">{formatCurrency(report.outward_supplies.books_tax)}</td>
                <td className="py-2.5 px-3 font-mono">{formatCurrency(report.outward_supplies.gstr1_tax)}</td>
                <td className={`py-2.5 px-3 font-mono font-bold ${report.outward_supplies.tax_difference !== 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {formatCurrency(report.outward_supplies.tax_difference)}
                </td>
                <td className="py-2.5 px-3 text-[11px] text-[#666666]">
                  {report.outward_supplies.tax_difference === 0 ? 'Taxes reconciled' : 'Review short/excess discharge in 3B'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 9 & 10: Inward Supplies & GSTR-2B vs Purchase Reconciliation */}
        <div>
          <h2 className="text-xs font-bold font-mono text-[#888888] uppercase tracking-wider mb-2 border-b border-[#E5E5E5] pb-1">
            03. Input Tax Credit & GSTR-2B vs Purchase Reconciliation
          </h2>
          <table className="w-full text-xs border border-[#E5E5E5] rounded-xl overflow-hidden text-left">
            <thead className="bg-[#F7F7F7] font-bold text-[#666666] text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Books (Purchase Register)</th>
                <th className="py-2.5 px-3">Auto-Drafted in GSTR-2B</th>
                <th className="py-2.5 px-3">Variance</th>
                <th className="py-2.5 px-3">Analytical Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              <tr>
                <td className="py-2.5 px-3 font-semibold">Inward Taxable Value</td>
                <td className="py-2.5 px-3 font-mono">{formatCurrency(report.inward_supplies.purchase_taxable)}</td>
                <td className="py-2.5 px-3 font-mono">{formatCurrency(report.inward_supplies.gstr2b_taxable)}</td>
                <td className="py-2.5 px-3 font-mono font-bold text-amber-600">
                  {formatCurrency(report.inward_supplies.taxable_difference)}
                </td>
                <td className="py-2.5 px-3 text-[11px] text-[#666666]">
                  Difference between booked purchases and 2B
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Input Tax Credit (ITC)</td>
                <td className="py-2.5 px-3 font-mono">{formatCurrency(report.inward_supplies.purchase_tax)}</td>
                <td className="py-2.5 px-3 font-mono">{formatCurrency(report.inward_supplies.gstr2b_tax)}</td>
                <td className={`py-2.5 px-3 font-mono font-bold ${report.inward_supplies.tax_difference > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {formatCurrency(report.inward_supplies.tax_difference)}
                </td>
                <td className="py-2.5 px-3 text-[11px] text-[#666666]">
                  {report.inward_supplies.tax_difference > 0
                    ? 'Requires follow-up with non-filing vendors'
                    : 'Unclaimed 2B credit identified'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 17: Exceptions Breakdown */}
        <div>
          <h2 className="text-xs font-bold font-mono text-[#888888] uppercase tracking-wider mb-2 border-b border-[#E5E5E5] pb-1">
            04. Summary of Audit Exceptions & Rule Violations
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#FBFBFB] border border-[#EEEEEE] rounded-xl text-xs mb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">Total Issues Flagged</span>
              <span className="font-mono font-bold text-black text-sm">{report.exceptions.total}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-red-600 block">Critical / High Risk</span>
              <span className="font-mono font-bold text-red-600 text-sm">{report.exceptions.critical + report.exceptions.high}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-600 block">Open for Review</span>
              <span className="font-mono font-bold text-amber-700 text-sm">{report.exceptions.open}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">Financial Exposure</span>
              <span className="font-mono font-bold text-black text-sm">{formatCurrency(report.exceptions.total_financial_impact)}</span>
            </div>
          </div>

          {report.exception_items.length > 0 && (
            <table className="w-full text-xs border border-[#E5E5E5] rounded-xl overflow-hidden text-left mt-2">
              <thead className="bg-[#F7F7F7] font-bold text-[#666666] text-[11px]">
                <tr>
                  <th className="py-2 px-3">Rule Code</th>
                  <th className="py-2 px-3">Severity</th>
                  <th className="py-2 px-3">Reference / Doc</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Impact</th>
                  <th className="py-2 px-3">CA Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {report.exception_items.slice(0, 15).map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#FAFAFA]">
                    <td className="py-2 px-3 font-mono font-bold text-[#111111]">{item.rule_code}</td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-800">
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono">{item.record_reference || item.source}</td>
                    <td className="py-2 px-3 max-w-xs">{item.description}</td>
                    <td className="py-2 px-3 font-mono font-semibold">
                      {item.financial_impact > 0 ? formatCurrency(item.financial_impact) : '—'}
                    </td>
                    <td className="py-2 px-3 text-[11px] italic text-[#555555]">
                      {item.ca_remark || 'Pending CA review'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 18 & 20: Sign-off & Audit Certification */}
        <div className="pt-6 border-t border-[#E5E5E5] grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-4">
            <p className="font-bold text-[#111111]">Prepared By:</p>
            <div className="pt-8 border-b border-black w-48"></div>
            <p className="text-[11px] text-[#666666]">Tax Consultant / Audit Team</p>
          </div>
          <div className="space-y-4 text-right">
            <p className="font-bold text-[#111111]">Chartered Accountant Final Review & Sign-Off:</p>
            <div className="pt-8 border-b border-black w-48 ml-auto"></div>
            <p className="text-[11px] text-[#666666]">Partner / Proprietor / Membership No.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
