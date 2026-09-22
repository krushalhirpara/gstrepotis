import React, { useState, useEffect, useCallback } from 'react';
import { type GstAudit, type GstAuditReconciliation, gstAuditService } from '../../services/gstAuditService';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Search, Filter, Loader2, Info } from 'lucide-react';

interface GstAuditReconciliationTabProps {
  audit: GstAudit;
}

export const GstAuditReconciliationTab: React.FC<GstAuditReconciliationTabProps> = ({ audit }) => {
  const [activeReconType, setActiveReconType] = useState<string>('gstr1_vs_books');
  const [matchStatusFilter, setMatchStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reconciliations, setReconciliations] = useState<GstAuditReconciliation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [lastPage, setLastPage] = useState<number>(1);

  const loadReconciliations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await gstAuditService.getReconciliations(audit.id, {
        recon_type: activeReconType,
        match_status: matchStatusFilter || undefined,
        search: searchQuery || undefined,
        page,
        per_page: 20,
      });
      setReconciliations(res.data || []);
      setTotal(res.total || 0);
      setLastPage(res.last_page || 1);
    } catch (err: unknown) {
      console.error('Failed to load reconciliations', err);
    } finally {
      setLoading(false);
    }
  }, [audit.id, activeReconType, matchStatusFilter, searchQuery, page]);

  useEffect(() => {
    loadReconciliations();
  }, [loadReconciliations]);

  const handleTabChange = (type: string) => {
    setActiveReconType(type);
    setPage(1);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Matched':
        return 'success';
      case 'Partial Match':
        return 'info';
      case 'Amount Mismatch':
      case 'Mismatch':
        return 'warning';
      case 'Missing in 2B':
      case 'Missing in Books':
      case 'Missing in Source':
      case 'Missing in Target':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-5">
      {/* Recon Type Selector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E5E5] pb-3">
        <button
          onClick={() => handleTabChange('gstr1_vs_books')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeReconType === 'gstr1_vs_books'
              ? 'bg-black text-white'
              : 'bg-white border border-[#E5E5E5] text-[#555555] hover:text-black'
          }`}
        >
          1. GSTR-1 vs Books (Sales)
        </button>
        <button
          onClick={() => handleTabChange('gstr2b_vs_purchase')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeReconType === 'gstr2b_vs_purchase'
              ? 'bg-black text-white'
              : 'bg-white border border-[#E5E5E5] text-[#555555] hover:text-black'
          }`}
        >
          2. GSTR-2B vs Purchase Register (ITC)
        </button>
        <button
          onClick={() => handleTabChange('gstr1_vs_gstr3b')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeReconType === 'gstr1_vs_gstr3b'
              ? 'bg-black text-white'
              : 'bg-white border border-[#E5E5E5] text-[#555555] hover:text-black'
          }`}
        >
          3. GSTR-1 vs GSTR-3B (Tax Liability)
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 border border-[#E5E5E5] rounded-2xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice number, GSTIN, party name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#888888]" />
          <select
            value={matchStatusFilter}
            onChange={(e) => {
              setMatchStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black font-medium"
          >
            <option value="">All Match Statuses</option>
            <option value="Matched">Matched</option>
            <option value="Mismatch">Mismatch / Diff</option>
            <option value="Amount Mismatch">Amount Mismatch</option>
            <option value="Missing in 2B">Missing in GSTR-2B</option>
            <option value="Missing in Books">Missing in Books</option>
            <option value="Missing in Source">Missing in Source</option>
            <option value="Missing in Target">Missing in Target</option>
          </select>
          <span className="text-xs text-[#888888] font-mono ml-2">
            Total: <span className="font-bold text-black">{total}</span>
          </span>
        </div>
      </div>

      {/* Reconciliation Table */}
      <Card className="border-[#E5E5E5] bg-white overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-[#888888] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-black" />
            Loading reconciliation comparisons...
          </div>
        ) : reconciliations.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#888888]">
            <Info className="w-6 h-6 mx-auto mb-2 text-[#AAAAAA]" />
            <p className="font-bold text-[#111111]">No reconciliation records found.</p>
            <p className="mt-1">
              {total === 0
                ? 'Upload returns and books datasets in Data Center, then run the engine.'
                : 'No records match the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F7F7] border-b border-[#E5E5E5] text-[11px] font-bold text-[#666666] uppercase tracking-wider">
                  <th className="py-3 px-3">Status & Match</th>
                  <th className="py-3 px-3 border-l border-[#E5E5E5]">
                    {activeReconType === 'gstr1_vs_books'
                      ? 'Books Record (Sales Register)'
                      : activeReconType === 'gstr2b_vs_purchase'
                      ? 'Books Record (Purchase Register)'
                      : 'GSTR-1 Reported'}
                  </th>
                  <th className="py-3 px-3 border-l border-[#E5E5E5]">
                    {activeReconType === 'gstr1_vs_books'
                      ? 'Portal Record (GSTR-1)'
                      : activeReconType === 'gstr2b_vs_purchase'
                      ? 'Portal Record (GSTR-2B)'
                      : 'GSTR-3B Tax Paid'}
                  </th>
                  <th className="py-3 px-3 border-l border-[#E5E5E5]">Variance / Analysis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {reconciliations.map((recon) => {
                  const src = recon.source_record;
                  const tgt = recon.target_record;

                  return (
                    <tr key={recon.id} className="hover:bg-[#FAFAFA] transition-colors align-top">
                      {/* Match Status Column */}
                      <td className="py-3 px-3 w-40">
                        <Badge variant={getStatusBadgeVariant(recon.match_status)} size="sm">
                          {recon.match_status}
                        </Badge>
                        <div className="text-[10px] text-[#888888] font-mono mt-1">
                          Confidence: {recon.confidence}%
                        </div>
                        {recon.match_type && (
                          <div className="text-[10px] text-[#666666] font-mono mt-0.5 truncate max-w-[140px]" title={recon.match_type}>
                            {recon.match_type}
                          </div>
                        )}
                      </td>

                      {/* Source Record Column */}
                      <td className="py-3 px-3 border-l border-[#E5E5E5] w-72">
                        {src ? (
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[#111111]">{src.invoice_number}</span>
                              <span className="text-[10px] text-[#888888] font-mono">{src.invoice_date || '—'}</span>
                            </div>
                            <p className="text-[11px] font-medium text-[#444444] truncate">{src.counterparty_name || 'Party N/A'}</p>
                            <p className="text-[10px] font-mono text-[#888888]">{src.counterparty_gstin || 'No GSTIN'}</p>
                            <div className="mt-1 flex items-center gap-2 text-[11px] font-mono">
                              <span>Taxable: <strong>{formatCurrency(src.taxable_value)}</strong></span>
                              <span>Tax: <strong>{formatCurrency(src.igst + src.cgst + src.sgst + src.cess)}</strong></span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#999999] italic">Not present in source dataset</span>
                        )}
                      </td>

                      {/* Target Record Column */}
                      <td className="py-3 px-3 border-l border-[#E5E5E5] w-72">
                        {tgt ? (
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[#111111]">{tgt.invoice_number}</span>
                              <span className="text-[10px] text-[#888888] font-mono">{tgt.invoice_date || '—'}</span>
                            </div>
                            <p className="text-[11px] font-medium text-[#444444] truncate">{tgt.counterparty_name || 'Party N/A'}</p>
                            <p className="text-[10px] font-mono text-[#888888]">{tgt.counterparty_gstin || 'No GSTIN'}</p>
                            <div className="mt-1 flex items-center gap-2 text-[11px] font-mono">
                              <span>Taxable: <strong>{formatCurrency(tgt.taxable_value)}</strong></span>
                              <span>Tax: <strong>{formatCurrency(tgt.igst + tgt.cgst + tgt.sgst + tgt.cess)}</strong></span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#999999] italic">Not present in target dataset</span>
                        )}
                      </td>

                      {/* Variance & Reason Column */}
                      <td className="py-3 px-3 border-l border-[#E5E5E5]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 text-xs font-mono">
                            <span>
                              Taxable Diff:{' '}
                              <strong className={recon.difference_taxable !== 0 ? 'text-red-600' : 'text-emerald-700'}>
                                {formatCurrency(recon.difference_taxable)}
                              </strong>
                            </span>
                            <span>
                              Tax Diff:{' '}
                              <strong className={(recon.difference_igst + recon.difference_cgst + recon.difference_sgst) !== 0 ? 'text-red-600' : 'text-emerald-700'}>
                                {formatCurrency(recon.difference_igst + recon.difference_cgst + recon.difference_sgst + recon.difference_cess)}
                              </strong>
                            </span>
                          </div>
                          {recon.reason && (
                            <p className="text-[11px] text-[#666666] leading-relaxed">{recon.reason}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="p-3 border-t border-[#E5E5E5] flex items-center justify-between text-xs bg-[#FBFBFB]">
            <span className="text-[#666666]">
              Page {page} of {lastPage}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-[#E5E5E5] rounded bg-white disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                className="px-2.5 py-1 border border-[#E5E5E5] rounded bg-white disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
