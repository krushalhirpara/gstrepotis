import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  type GstAudit,
  type GstAuditFile,
  type GstAuditSummaryReport,
  gstAuditService,
} from '../../services/gstAuditService';
import { GstAuditOverviewTab } from './GstAuditOverviewTab';
import { GstAuditUploadTab } from './GstAuditUploadTab';
import { GstAuditReconciliationTab } from './GstAuditReconciliationTab';
import { GstAuditItcTab } from './GstAuditItcTab';
import { GstAuditExceptionsTab } from './GstAuditExceptionsTab';
import { GstAuditChecklistTab } from './GstAuditChecklistTab';
import { GstAuditWorkingPapersTab } from './GstAuditWorkingPapersTab';
import { GstAuditReportTab } from './GstAuditReportTab';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft,
  Play,
  Loader2,
  Building2,
  AlertCircle,
  CheckCircle2,
  Layers,
  UploadCloud,
  FileCheck2,
  ListTodo,
  FileText,
} from 'lucide-react';

export const GstAuditWorkspace: React.FC = () => {
  const { auditId } = useParams<{ auditId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [audit, setAudit] = useState<GstAudit | null>(null);
  const [counts, setCounts] = useState({
    files: 0,
    records: 0,
    reconciliations: 0,
    exceptions: 0,
    open_exceptions: 0,
    working_papers: 0,
  });
  const [files, setFiles] = useState<GstAuditFile[]>([]);
  const [summary, setSummary] = useState<GstAuditSummaryReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [processMessage, setProcessMessage] = useState<string | null>(null);

  // Determine active tab from URL path
  const pathParts = location.pathname.split('/');
  const subTab = pathParts[3] || 'overview';

  const loadAuditData = useCallback(async () => {
    if (!auditId) return;
    try {
      setLoading(true);
      const [auditRes, filesRes] = await Promise.all([
        gstAuditService.getAudit(auditId),
        gstAuditService.getFiles(auditId),
      ]);
      setAudit(auditRes.data);
      setCounts(auditRes.counts);
      setFiles(filesRes.data || []);

      // Load summary if processing was completed
      try {
        const sumRes = await gstAuditService.getSummary(auditId);
        setSummary(sumRes.data);
      } catch {
        // Summary may not exist yet before processing
      }
    } catch (err: unknown) {
      console.error('Failed to load audit data', err);
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const handleRunProcessing = async () => {
    if (!auditId) return;
    try {
      setProcessing(true);
      setProcessMessage(null);
      const res = await gstAuditService.processAudit(auditId);
      setProcessMessage(
        `Reconciliation complete! Generated ${res.summary.exceptions.total_exceptions_generated} audit exceptions.`
      );
      await loadAuditData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Processing failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleNavigateTab = (tab: string) => {
    if (tab === 'overview') {
      navigate(`/gst-audit/${auditId}`);
    } else {
      navigate(`/gst-audit/${auditId}/${tab}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-xs text-[#888888] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
        <p className="font-semibold text-black">Opening GST Audit Workspace...</p>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="p-8 text-center text-xs text-[#888888]">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
        <p className="font-bold text-[#111111]">Audit Workspace Not Found or Access Denied.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/gst-audit')} className="mt-4">
          Back to GST Audit Hub
        </Button>
      </div>
    );
  }

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'upload', label: 'Data Center', icon: UploadCloud, badge: counts.files },
    { id: 'reconciliation', label: 'Reconciliation', icon: CheckCircle2, badge: counts.reconciliations },
    { id: 'itc', label: 'ITC Analysis', icon: CheckCircle2 },
    { id: 'exceptions', label: 'Exceptions Center', icon: AlertCircle, badge: counts.open_exceptions, badgeVariant: 'error' as const },
    { id: 'checklist', label: 'Checklist', icon: ListTodo },
    { id: 'working-papers', label: 'Working Papers', icon: FileText, badge: counts.working_papers },
    { id: 'report', label: 'Report Dossier', icon: FileCheck2 },
  ];

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'review_required':
        return <Badge variant="warning">Review Required</Badge>;
      case 'processing':
        return <Badge variant="info">Processing</Badge>;
      case 'in_progress':
        return <Badge variant="info">In Progress</Badge>;
      case 'data_pending':
        return <Badge variant="warning">Data Pending</Badge>;
      default:
        return <Badge variant="neutral">Draft</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 border border-[#E5E5E5] rounded-2xl shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[#888888]">
            <button
              onClick={() => navigate('/gst-audit')}
              className="hover:text-black flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> All Audits
            </button>
            <span>/</span>
            <span className="font-mono text-black font-semibold">FY {audit.financial_year}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-black text-[#111111] tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-black" />
              {audit.client?.trade_name || audit.audit_name}
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 bg-[#F0F0F0] text-[#333333] rounded-md font-bold">
              {audit.gstin}
            </span>
            {getStatusBadge(audit.status)}
          </div>
          <p className="text-xs text-[#666666]">
            {audit.audit_name} · Started on {new Date(audit.created_at).toLocaleDateString('en-IN')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={handleRunProcessing}
            disabled={processing}
            className="flex items-center gap-2 shadow-xs cursor-pointer"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing Reconciliation...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Run Reconciliation & Rules
              </>
            )}
          </Button>
        </div>
      </div>

      {processMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{processMessage}</span>
        </div>
      )}

      {/* Workspace Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#E5E5E5] pb-px">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleNavigateTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-white border-t-2 border-x border-[#E5E5E5] border-t-black text-black shadow-xs'
                  : 'text-[#666666] hover:text-black hover:bg-gray-100/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                    tab.badgeVariant === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-[#EAEAEA] text-[#444444]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Component */}
      <div className="min-h-[450px]">
        {subTab === 'overview' && (
          <GstAuditOverviewTab
            audit={audit}
            counts={counts}
            summary={summary}
            onNavigateTab={handleNavigateTab}
          />
        )}
        {subTab === 'upload' && (
          <GstAuditUploadTab
            audit={audit}
            files={files}
            onFilesChanged={loadAuditData}
          />
        )}
        {subTab === 'reconciliation' && <GstAuditReconciliationTab audit={audit} />}
        {subTab === 'itc' && <GstAuditItcTab audit={audit} />}
        {subTab === 'exceptions' && <GstAuditExceptionsTab audit={audit} />}
        {subTab === 'checklist' && <GstAuditChecklistTab audit={audit} />}
        {subTab === 'working-papers' && <GstAuditWorkingPapersTab audit={audit} />}
        {subTab === 'report' && <GstAuditReportTab audit={audit} />}
      </div>
    </div>
  );
};
