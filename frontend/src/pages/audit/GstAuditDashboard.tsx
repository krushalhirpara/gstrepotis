import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type GstAudit,
  type GstAuditMetrics,
  gstAuditService,
} from '../../services/gstAuditService';
import { GstAuditNewModal } from './GstAuditNewModal';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ShieldCheck,
  Plus,
  Search,
  Building2,
  Loader2,
  Trash2,
  ExternalLink,
  Info,
} from 'lucide-react';

export const GstAuditDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [audits, setAudits] = useState<GstAudit[]>([]);
  const [metrics, setMetrics] = useState<GstAuditMetrics>({
    total_clients: 0,
    active_audits: 0,
    completed_audits: 0,
    pending_data: 0,
    critical_exceptions: 0,
    warning_exceptions: 0,
    reconciled_records: 0,
    unreconciled_records: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fyFilter, setFyFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [lastPage, setLastPage] = useState<number>(1);

  const [isNewAuditModalOpen, setIsNewAuditModalOpen] = useState<boolean>(false);

  const loadAudits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await gstAuditService.getAudits({
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        financial_year: fyFilter || undefined,
        page,
        per_page: 15,
      });
      setAudits(res.data || []);
      setTotal(res.total || 0);
      setLastPage(res.last_page || 1);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch (err: unknown) {
      console.error('Failed to load audits', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, fyFilter, page]);

  useEffect(() => {
    loadAudits();
  }, [loadAudits]);

  const handleDeleteAudit = async (e: React.MouseEvent, auditId: number) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this GST Audit workspace?')) return;
    try {
      await gstAuditService.deleteAudit(auditId);
      loadAudits();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete audit.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" size="sm">Completed</Badge>;
      case 'review_required':
        return <Badge variant="warning" size="sm">Review Required</Badge>;
      case 'in_progress':
      case 'processing':
        return <Badge variant="info" size="sm">Processing</Badge>;
      case 'data_pending':
        return <Badge variant="neutral" size="sm">Data Pending</Badge>;
      default:
        return <Badge variant="outline" size="sm">Draft</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-black" />
            <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
              GST Audit & Reconciliation Workspace
            </h1>
          </div>
          <p className="text-xs text-[#666666] mt-1">
            Automated checks are analytical aids and should be reviewed by a qualified professional.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsNewAuditModalOpen(true)}
          className="flex items-center gap-2 self-start sm:self-auto cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" /> Start New Audit
        </Button>
      </div>

      {/* Real Aggregate KPI Metrics from Database */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="p-3 border-[#E5E5E5] bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#888888] block">
            Clients
          </span>
          <p className="text-lg font-mono font-black text-[#111111] mt-0.5">{metrics.total_clients}</p>
          <span className="text-[10px] text-[#888888]">Master records</span>
        </Card>

        <Card className="p-3 border-[#E5E5E5] bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
            Active Audits
          </span>
          <p className="text-lg font-mono font-black text-blue-700 mt-0.5">{metrics.active_audits}</p>
          <span className="text-[10px] text-[#888888]">In progress</span>
        </Card>

        <Card className="p-3 border-[#E5E5E5] bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
            Completed
          </span>
          <p className="text-lg font-mono font-black text-emerald-600 mt-0.5">{metrics.completed_audits}</p>
          <span className="text-[10px] text-[#888888]">Signed off</span>
        </Card>

        <Card className="p-3 border-[#E5E5E5] bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
            Pending Data
          </span>
          <p className="text-lg font-mono font-black text-amber-700 mt-0.5">{metrics.pending_data}</p>
          <span className="text-[10px] text-[#888888]">Files required</span>
        </Card>

        <Card className="p-3 border-[#E5E5E5] bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
            Critical Issues
          </span>
          <p className="text-lg font-mono font-black text-red-600 mt-0.5">{metrics.critical_exceptions}</p>
          <span className="text-[10px] text-[#888888]">High exposure</span>
        </Card>

        <Card className="p-3 border-[#E5E5E5] bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
            Warnings
          </span>
          <p className="text-lg font-mono font-black text-amber-600 mt-0.5">{metrics.warning_exceptions}</p>
          <span className="text-[10px] text-[#888888]">Review needed</span>
        </Card>

        <Card className="p-3 border-[#E5E5E5] bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
            Reconciled
          </span>
          <p className="text-lg font-mono font-black text-emerald-700 mt-0.5">{metrics.reconciled_records}</p>
          <span className="text-[10px] text-[#888888]">Matched lines</span>
        </Card>

        <Card className="p-3 border-[#E5E5E5] bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666] block">
            Unreconciled
          </span>
          <p className="text-lg font-mono font-black text-[#111111] mt-0.5">{metrics.unreconciled_records}</p>
          <span className="text-[10px] text-[#888888]">Variances</span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 border border-[#E5E5E5] rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit by client, GSTIN, trade name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl font-medium"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="data_pending">Data Pending</option>
            <option value="processing">Processing</option>
            <option value="review_required">Review Required</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={fyFilter}
            onChange={(e) => {
              setFyFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl font-medium"
          >
            <option value="">All Financial Years</option>
            <option value="2024-25">FY 2024-25</option>
            <option value="2023-24">FY 2023-24</option>
            <option value="2022-23">FY 2022-23</option>
            <option value="2021-22">FY 2021-22</option>
          </select>
        </div>
      </div>

      {/* Audits Table */}
      <Card className="border-[#E5E5E5] bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-xs text-[#888888] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-black" />
            Loading GST audit workspaces...
          </div>
        ) : audits.length === 0 ? (
          <div className="p-14 text-center text-xs text-[#888888]">
            <Info className="w-8 h-8 mx-auto mb-2 text-[#AAAAAA]" />
            <p className="font-bold text-[#111111] text-sm">No audits created yet.</p>
            <p className="mt-1 max-w-sm mx-auto">
              Select an existing client from your Client Master and begin a new GST Audit workspace for the desired Financial Year.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNewAuditModalOpen(true)}
              className="mt-4"
            >
              <Plus className="w-4 h-4 mr-1" /> Start First GST Audit
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F7F7] border-b border-[#E5E5E5] text-[11px] font-bold text-[#666666] uppercase tracking-wider">
                  <th className="py-3 px-4">Client / Entity</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4">Financial Year</th>
                  <th className="py-3 px-4">Data Quality</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {audits.map((audit) => (
                  <tr
                    key={audit.id}
                    onClick={() => navigate(`/gst-audit/${audit.id}`)}
                    className="hover:bg-[#FBFBFB] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-bold text-[#111111]">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#888888] shrink-0" />
                        <div>
                          <p className="text-[#111111] font-bold hover:underline">
                            {audit.client?.trade_name || audit.audit_name}
                          </p>
                          <p className="text-[11px] text-[#666666] font-normal">
                            {audit.audit_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#111111]">
                      {audit.gstin}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      FY {audit.financial_year}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{audit.data_quality_score}%</span>
                        <div className="w-12 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              audit.data_quality_score >= 80
                                ? 'bg-emerald-500'
                                : audit.data_quality_score >= 50
                                ? 'bg-amber-500'
                                : 'bg-gray-400'
                            }`}
                            style={{ width: `${audit.data_quality_score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(audit.status)}
                    </td>
                    <td className="py-3.5 px-4 text-[#666666] font-mono text-[11px]">
                      {new Date(audit.updated_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/gst-audit/${audit.id}`);
                          }}
                          className="flex items-center gap-1"
                        >
                          Open <ExternalLink className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteAudit(e, audit.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="p-3 border-t border-[#E5E5E5] flex items-center justify-between text-xs bg-[#FBFBFB]">
            <span className="text-[#666666]">
              Showing page {page} of {lastPage} ({total} total audits)
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

      {/* New Audit Modal */}
      <GstAuditNewModal
        isOpen={isNewAuditModalOpen}
        onClose={() => setIsNewAuditModalOpen(false)}
        onAuditCreated={loadAudits}
      />
    </div>
  );
};
