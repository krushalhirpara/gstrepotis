import React, { useState, useEffect, useCallback } from 'react';
import { type GstAudit, type GstAuditException, gstAuditService } from '../../services/gstAuditService';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import {
  Search,
  CheckCircle2,
  Edit3,
  Loader2,
} from 'lucide-react';

interface GstAuditExceptionsTabProps {
  audit: GstAudit;
}

export const GstAuditExceptionsTab: React.FC<GstAuditExceptionsTabProps> = ({ audit }) => {
  const [exceptions, setExceptions] = useState<GstAuditException[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<{
    critical: number;
    high: number;
    medium: number;
    low: number;
    open: number;
    resolved: number;
    total_financial_impact: number;
  } | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [ruleCodeFilter, setRuleCodeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [lastPage, setLastPage] = useState<number>(1);

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('Resolved');
  const [bulkRemark, setBulkRemark] = useState<string>('');
  const [updatingBulk, setUpdatingBulk] = useState<boolean>(false);

  // Single Edit Modal
  const [editingException, setEditingException] = useState<GstAuditException | null>(null);
  const [editStatus, setEditStatus] = useState<string>('Open');
  const [editRemark, setEditRemark] = useState<string>('');
  const [editAction, setEditAction] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const loadExceptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await gstAuditService.getExceptions(audit.id, {
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
        rule_code: ruleCodeFilter || undefined,
        search: searchQuery || undefined,
        page,
        per_page: 20,
      });
      setExceptions(res.data || []);
      setTotal(res.total || 0);
      setLastPage(res.last_page || 1);
      setSummary(res.summary);
    } catch (err: unknown) {
      console.error('Failed to load exceptions', err);
    } finally {
      setLoading(false);
    }
  }, [audit.id, severityFilter, statusFilter, ruleCodeFilter, searchQuery, page]);

  useEffect(() => {
    loadExceptions();
  }, [loadExceptions]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(exceptions.map((ex) => ex.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    try {
      setUpdatingBulk(true);
      await gstAuditService.bulkUpdateExceptions(audit.id, {
        exception_ids: selectedIds,
        status: bulkStatus,
        ca_remark: bulkRemark || undefined,
      });
      setSelectedIds([]);
      setBulkRemark('');
      loadExceptions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Bulk update failed.');
    } finally {
      setUpdatingBulk(false);
    }
  };

  const handleOpenEdit = (ex: GstAuditException) => {
    setEditingException(ex);
    setEditStatus(ex.status);
    setEditRemark(ex.ca_remark || '');
    setEditAction(ex.action_taken || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingException) return;
    try {
      setSavingEdit(true);
      await gstAuditService.updateException(audit.id, editingException.id, {
        status: editStatus,
        ca_remark: editRemark.trim(),
        action_taken: editAction.trim(),
      });
      setEditingException(null);
      loadExceptions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update exception.');
    } finally {
      setSavingEdit(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return <Badge variant="error">Critical</Badge>;
      case 'High':
        return <Badge variant="error">High</Badge>;
      case 'Medium':
        return <Badge variant="warning">Medium</Badge>;
      case 'Low':
        return <Badge variant="info">Low</Badge>;
      default:
        return <Badge variant="neutral">Info</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return <Badge variant="error" size="sm">Open</Badge>;
      case 'Under Review':
        return <Badge variant="warning" size="sm">Under Review</Badge>;
      case 'Resolved':
        return <Badge variant="success" size="sm">Resolved</Badge>;
      case 'Needs Client Clarification':
        return <Badge variant="info" size="sm">Needs Client Clarification</Badge>;
      case 'Ignored':
        return <Badge variant="neutral" size="sm">Ignored</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
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
      {/* Summary KPI Counters */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3.5 border-[#E5E5E5] bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
              Critical & High
            </span>
            <p className="text-xl font-mono font-black text-red-600 mt-0.5">
              {summary.critical + summary.high}
            </p>
            <p className="text-[10px] text-[#888888]">{summary.critical} Critical · {summary.high} High</p>
          </Card>

          <Card className="p-3.5 border-[#E5E5E5] bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              Open Exceptions
            </span>
            <p className="text-xl font-mono font-black text-[#111111] mt-0.5">
              {summary.open}
            </p>
            <p className="text-[10px] text-[#888888]">Requiring CA action</p>
          </Card>

          <Card className="p-3.5 border-[#E5E5E5] bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Resolved
            </span>
            <p className="text-xl font-mono font-black text-emerald-600 mt-0.5">
              {summary.resolved}
            </p>
            <p className="text-[10px] text-[#888888]">Verified & closed</p>
          </Card>

          <Card className="p-3.5 border-[#E5E5E5] bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">
              Exposure Impact
            </span>
            <p className="text-xl font-mono font-black text-[#111111] mt-0.5">
              {formatCurrency(summary.total_financial_impact)}
            </p>
            <p className="text-[10px] text-[#888888]">Potential tax variance</p>
          </Card>
        </div>
      )}

      {/* Filter and Bulk Bar */}
      <div className="bg-white p-3.5 border border-[#E5E5E5] rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by rule, invoice number, or description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl font-medium"
            >
              <option value="">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Info">Info</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl font-medium"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
              <option value="Needs Client Clarification">Needs Clarification</option>
              <option value="Ignored">Ignored</option>
            </select>

            <select
              value={ruleCodeFilter}
              onChange={(e) => {
                setRuleCodeFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl font-medium font-mono"
            >
              <option value="">All Rules</option>
              <option value="INV-001">INV-001 (Duplicates)</option>
              <option value="INV-002">INV-002 (Future Date)</option>
              <option value="INV-003">INV-003 (GSTIN Format)</option>
              <option value="INV-004">INV-004 (Tax Math)</option>
              <option value="GST-R1-001">GST-R1-001 (Books Missing in R1)</option>
              <option value="GST-R1-002">GST-R1-002 (R1 Missing in Books)</option>
              <option value="GST-2B-001">GST-2B-001 (Books Missing in 2B)</option>
              <option value="GST-2B-002">GST-2B-002 (2B Missing in Books)</option>
              <option value="RCM-001">RCM-001 (RCM Taxes)</option>
              <option value="HSN-001">HSN-001 (HSN Reporting)</option>
            </select>

            <span className="text-xs text-[#888888] font-mono ml-1">
              Total: <strong className="text-black">{total}</strong>
            </span>
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-[#111111]">
              {selectedIds.length} exceptions selected
            </span>

            <div className="flex items-center gap-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-[#E5E5E5] rounded-lg font-medium"
              >
                <option value="Resolved">Mark Resolved</option>
                <option value="Under Review">Mark Under Review</option>
                <option value="Needs Client Clarification">Needs Clarification</option>
                <option value="Ignored">Mark Ignored</option>
              </select>

              <input
                type="text"
                placeholder="Add CA remark for bulk update..."
                value={bulkRemark}
                onChange={(e) => setBulkRemark(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-[#E5E5E5] rounded-lg w-56"
              />

              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkUpdate}
                disabled={updatingBulk}
              >
                {updatingBulk ? 'Updating...' : 'Apply Bulk Update'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Exceptions List Table */}
      <Card className="border-[#E5E5E5] bg-white overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-[#888888] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-black" />
            Loading audit exceptions...
          </div>
        ) : exceptions.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#888888]">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
            <p className="font-bold text-[#111111]">No exceptions detected.</p>
            <p className="mt-1">
              All parsed records conform to current rule engine parameters or match existing filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F7F7] border-b border-[#E5E5E5] text-[11px] font-bold text-[#666666] uppercase tracking-wider">
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length === exceptions.length && exceptions.length > 0}
                      className="rounded"
                    />
                  </th>
                  <th className="py-3 px-3">Rule & Severity</th>
                  <th className="py-3 px-3">Reference & Source</th>
                  <th className="py-3 px-3">Description & Variance</th>
                  <th className="py-3 px-3">Exposure</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">CA Remarks</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {exceptions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-[#FAFAFA] transition-colors align-top">
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(ex.id)}
                        onChange={() => handleToggleSelect(ex.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-[#111111] block mb-1">
                        {ex.rule_code}
                      </span>
                      {getSeverityBadge(ex.severity)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-[#111111] block">
                        {ex.record_reference || '—'}
                      </span>
                      <span className="text-[10px] text-[#888888]">{ex.source}</span>
                    </td>
                    <td className="py-3 px-3 max-w-sm">
                      <p className="font-medium text-[#222222] leading-relaxed">
                        {ex.description}
                      </p>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#111111]">
                      {ex.financial_impact > 0 ? formatCurrency(ex.financial_impact) : '—'}
                    </td>
                    <td className="py-3 px-3">
                      {getStatusBadge(ex.status)}
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      {ex.ca_remark ? (
                        <p className="text-[11px] text-[#444444] italic">"{ex.ca_remark}"</p>
                      ) : (
                        <span className="text-[11px] text-[#AAAAAA] italic">No remarks yet</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(ex)}
                        className="flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Review
                      </Button>
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

      {/* Single Exception Review Modal */}
      {editingException && (
        <Modal
          isOpen={true}
          onClose={() => setEditingException(null)}
          title={`Review Exception: ${editingException.rule_code}`}
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#111111]">{editingException.record_reference}</span>
                {getSeverityBadge(editingException.severity)}
              </div>
              <p className="text-[#444444]">{editingException.description}</p>
              {editingException.financial_impact > 0 && (
                <p className="font-mono font-bold text-red-600">
                  Potential Exposure: {formatCurrency(editingException.financial_impact)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                Audit Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black font-medium"
              >
                <option value="Open">Open</option>
                <option value="Under Review">Under Review</option>
                <option value="Resolved">Resolved</option>
                <option value="Needs Client Clarification">Needs Client Clarification</option>
                <option value="Ignored">Ignored / Acceptable Variance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                Action Taken / Follow-up
              </label>
              <input
                type="text"
                placeholder="e.g. Requested credit note / Verified ledger entry"
                value={editAction}
                onChange={(e) => setEditAction(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                CA Professional Remarks
              </label>
              <textarea
                rows={3}
                placeholder="Enter working observation or explanation..."
                value={editRemark}
                onChange={(e) => setEditRemark(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
              <Button type="button" variant="outline" onClick={() => setEditingException(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save Review'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
