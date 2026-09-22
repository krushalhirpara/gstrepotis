import React, { useState, useEffect, useCallback } from 'react';
import { type GstAudit, type GstAuditChecklistItem, gstAuditService } from '../../services/gstAuditService';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Loader2, Save } from 'lucide-react';

interface GstAuditChecklistTabProps {
  audit: GstAudit;
}

export const GstAuditChecklistTab: React.FC<GstAuditChecklistTabProps> = ({ audit }) => {
  const [checklist, setChecklist] = useState<GstAuditChecklistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [remarkText, setRemarkText] = useState<string>('');
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadChecklist = useCallback(async () => {
    try {
      setLoading(true);
      const res = await gstAuditService.getChecklist(audit.id);
      setChecklist(res.data || []);
    } catch (err: unknown) {
      console.error('Failed to load checklist', err);
    } finally {
      setLoading(false);
    }
  }, [audit.id]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const handleStatusChange = async (item: GstAuditChecklistItem, newStatus: string) => {
    try {
      setSavingId(item.id);
      const res = await gstAuditService.updateChecklistItem(audit.id, item.id, {
        status: newStatus,
      });
      setChecklist((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: res.data.status } : it))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update item status.');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveRemark = async (item: GstAuditChecklistItem) => {
    try {
      setSavingId(item.id);
      const res = await gstAuditService.updateChecklistItem(audit.id, item.id, {
        ca_remarks: remarkText.trim(),
      });
      setChecklist((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, ca_remarks: res.data.ca_remarks } : it))
      );
      setEditingItemId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save remark.');
    } finally {
      setSavingId(null);
    }
  };

  // Categories list
  const categories = Array.from(new Set(checklist.map((i) => i.category)));
  const filteredItems =
    activeCategory === 'All'
      ? checklist
      : checklist.filter((i) => i.category === activeCategory);

  const completedCount = checklist.filter((i) => i.status === 'Completed').length;
  const progressPercentage = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-[#888888] flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-black" />
        Loading 15-category CA audit checklist...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress Header */}
      <div className="p-4 bg-white border border-[#E5E5E5] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[#111111]">15-Category Statutory & Analytical Checklist</h3>
          <p className="text-xs text-[#666666] mt-0.5">
            Structured audit checklist for Chartered Accountants covering GST registration, outward liability, ITC, RCM, and documentation.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-[#111111]">{progressPercentage}% Complete</span>
            <span className="text-[10px] text-[#888888] block font-mono">
              {completedCount} / {checklist.length} verified
            </span>
          </div>
          <div className="w-28 bg-[#EFEFEF] h-2 rounded-full overflow-hidden">
            <div
              className="bg-black h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategory('All')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeCategory === 'All'
              ? 'bg-black text-white'
              : 'bg-white border border-[#E5E5E5] text-[#555555] hover:text-black'
          }`}
        >
          All Categories ({checklist.length})
        </button>
        {categories.map((cat) => {
          const count = checklist.filter((i) => i.category === cat).length;
          const completedInCat = checklist.filter((i) => i.category === cat && i.status === 'Completed').length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeCategory === cat
                  ? 'bg-black text-white'
                  : 'bg-white border border-[#E5E5E5] text-[#555555] hover:text-black'
              }`}
            >
              <span>{cat}</span>
              <span className="text-[10px] font-mono opacity-80">
                {completedInCat}/{count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Checklist Items List */}
      <Card className="border-[#E5E5E5] bg-white overflow-hidden divide-y divide-[#E5E5E5]">
        {filteredItems.map((item) => {
          const isEditing = editingItemId === item.id;
          const isSaving = savingId === item.id;

          return (
            <div key={item.id} className="p-4 hover:bg-[#FAFAFA] transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-[#888888]">
                      {item.item_code}
                    </span>
                    <Badge variant="outline" size="sm">
                      {item.category}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-[#111111] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    disabled={isSaving}
                    onClick={() => handleStatusChange(item, 'Pending')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      item.status === 'Pending'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-[#F7F7F7] text-[#666666] hover:bg-gray-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={() => handleStatusChange(item, 'Completed')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      item.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-[#F7F7F7] text-[#666666] hover:bg-gray-200'
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={() => handleStatusChange(item, 'Needs Review')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      item.status === 'Needs Review'
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : 'bg-[#F7F7F7] text-[#666666] hover:bg-gray-200'
                    }`}
                  >
                    Needs Review
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={() => handleStatusChange(item, 'Not Applicable')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      item.status === 'Not Applicable'
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-[#F7F7F7] text-[#666666] hover:bg-gray-200'
                    }`}
                  >
                    N/A
                  </button>
                </div>
              </div>

              {/* Remarks Area */}
              <div className="mt-2.5 pt-2 border-t border-[#F0F0F0]">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={remarkText}
                      onChange={(e) => setRemarkText(e.target.value)}
                      placeholder="Add CA remark on compliance findings..."
                      className="flex-1 px-3 py-1.5 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black"
                    />
                    <button
                      onClick={() => handleSaveRemark(item)}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                    <button
                      onClick={() => setEditingItemId(null)}
                      className="px-2.5 py-1.5 text-xs text-[#666666] hover:text-black cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#666666] text-[11px]">
                      {item.ca_remarks ? (
                        <span className="text-[#222222]"><strong>Remark:</strong> {item.ca_remarks}</span>
                      ) : (
                        <span className="italic text-[#AAAAAA]">No specific CA remarks added</span>
                      )}
                    </span>
                    <button
                      onClick={() => {
                        setEditingItemId(item.id);
                        setRemarkText(item.ca_remarks || '');
                      }}
                      className="text-[11px] font-bold text-black hover:underline cursor-pointer"
                    >
                      {item.ca_remarks ? 'Edit Remark' : '+ Add Remark'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};
