import React, { useState, useEffect, useCallback } from 'react';
import { type GstAudit, type GstAuditWorkingPaper, gstAuditService } from '../../services/gstAuditService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Plus, Trash2, User, Clock, Loader2, Info } from 'lucide-react';

interface GstAuditWorkingPapersTabProps {
  audit: GstAudit;
}

export const GstAuditWorkingPapersTab: React.FC<GstAuditWorkingPapersTabProps> = ({ audit }) => {
  const [papers, setPapers] = useState<GstAuditWorkingPaper[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form states
  const [section, setSection] = useState<string>('ITC Verification');
  const [title, setTitle] = useState<string>('');
  const [observation, setObservation] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [managementResponse, setManagementResponse] = useState<string>('');
  const [conclusion, setConclusion] = useState<string>('');
  const [followUpAction, setFollowUpAction] = useState<string>('');
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const sections = [
    'GST Registration & Master Data',
    'Outward Supply & Turnover',
    'GSTR-1 vs Books Reconciliation',
    'ITC Verification & Section 16/17',
    'GSTR-2B vs Purchase Register',
    'Reverse Charge Liability (RCM)',
    'Credit Notes & Debit Notes',
    'E-Commerce & Section 9(5)',
    'HSN/SAC Classification & Tax Rates',
    'Trial Balance & P&L Heads',
    'Final Partner Review & Opinion',
  ];

  const loadPapers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await gstAuditService.getWorkingPapers(audit.id);
      setPapers(res.data || []);
    } catch (err: unknown) {
      console.error('Failed to load working papers', err);
    } finally {
      setLoading(false);
    }
  }, [audit.id]);

  useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  const handleCreatePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      await gstAuditService.createWorkingPaper(audit.id, {
        section,
        title: title.trim(),
        observation: observation.trim() || undefined,
        explanation: explanation.trim() || undefined,
        management_response: managementResponse.trim() || undefined,
        conclusion: conclusion.trim() || undefined,
        follow_up_action: followUpAction.trim() || undefined,
        reviewer_notes: reviewerNotes.trim() || undefined,
      });

      // Reset form
      setTitle('');
      setObservation('');
      setExplanation('');
      setManagementResponse('');
      setConclusion('');
      setFollowUpAction('');
      setReviewerNotes('');
      setIsAddModalOpen(false);

      loadPapers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create working paper entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePaper = async (wpId: number) => {
    if (!window.confirm('Delete this working paper note?')) return;
    try {
      await gstAuditService.deleteWorkingPaper(audit.id, wpId);
      loadPapers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete note.');
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-[#888888] flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-black" />
        Loading CA working papers...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="p-4 bg-white border border-[#E5E5E5] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#111111]">CA Audit Working Papers & Dossier Notes</h3>
          <p className="text-xs text-[#666666] mt-0.5">
            Maintain formal audit documentation, management inquiries, client responses, and partner sign-offs.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> New Working Paper
        </Button>
      </div>

      {/* Papers List */}
      {papers.length === 0 ? (
        <Card className="p-12 text-center text-xs text-[#888888] border-[#E5E5E5] bg-white">
          <Info className="w-6 h-6 mx-auto mb-2 text-[#AAAAAA]" />
          <p className="font-bold text-[#111111]">No working papers recorded yet.</p>
          <p className="mt-1">
            Document audit inquiries, client management explanations, and conclusions by creating a working paper.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="mt-3"
          >
            Create First Working Paper
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {papers.map((paper) => (
            <Card key={paper.id} className="p-5 border-[#E5E5E5] bg-white space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#E5E5E5]">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-[#F0F0F0] text-[#555555] rounded">
                    {paper.section}
                  </span>
                  <h4 className="text-sm font-bold text-[#111111] mt-1">{paper.title}</h4>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#888888]">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{paper.user?.name || 'Tax Professional'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(paper.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <button
                    onClick={() => handleDeletePaper(paper.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer ml-1"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Working Paper Body */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {paper.observation && (
                  <div className="p-3 bg-[#FBFBFB] border border-[#EEEEEE] rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-[#888888] block mb-1">
                      Audit Observation
                    </span>
                    <p className="text-[#222222] leading-relaxed">{paper.observation}</p>
                  </div>
                )}

                {paper.explanation && (
                  <div className="p-3 bg-[#FBFBFB] border border-[#EEEEEE] rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-[#888888] block mb-1">
                      Auditor Explanation
                    </span>
                    <p className="text-[#222222] leading-relaxed">{paper.explanation}</p>
                  </div>
                )}

                {paper.management_response && (
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-blue-800 block mb-1">
                      Management Response
                    </span>
                    <p className="text-blue-950 leading-relaxed">{paper.management_response}</p>
                  </div>
                )}

                {paper.conclusion && (
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-1">
                      Conclusion & Final View
                    </span>
                    <p className="text-emerald-950 leading-relaxed">{paper.conclusion}</p>
                  </div>
                )}
              </div>

              {(paper.follow_up_action || paper.reviewer_notes) && (
                <div className="pt-2 border-t border-[#F0F0F0] flex flex-wrap gap-4 text-[11px]">
                  {paper.follow_up_action && (
                    <span className="text-[#666666]">
                      <strong>Follow-up:</strong> {paper.follow_up_action}
                    </span>
                  )}
                  {paper.reviewer_notes && (
                    <span className="text-[#666666]">
                      <strong>Reviewer Notes:</strong> {paper.reviewer_notes}
                    </span>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Working Paper Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Audit Working Paper"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreatePaper} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                Audit Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl font-medium"
              >
                {sections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                Note Title / Matter Under Review
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Verification of Section 17(5) motor vehicle repair invoices"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
              Auditor Observation & Analysis
            </label>
            <textarea
              rows={2}
              placeholder="State the factual background or numbers identified..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
              Management / Client Response
            </label>
            <textarea
              rows={2}
              placeholder="Response provided by client account department or management..."
              value={managementResponse}
              onChange={(e) => setManagementResponse(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                Conclusion
              </label>
              <input
                type="text"
                placeholder="Auditor's concluding position..."
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
                Follow-up Action
              </label>
              <input
                type="text"
                placeholder="e.g. Reverse ITC in Table 4(B) next month"
                value={followUpAction}
                onChange={(e) => setFollowUpAction(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Working Paper'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
