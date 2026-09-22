import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { clientService, type Client } from '../../services/clientService';
import { gstAuditService } from '../../services/gstAuditService';
import { Search, ShieldAlert, Loader2, Building2 } from 'lucide-react';

interface GstAuditNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuditCreated?: () => void;
}

export const GstAuditNewModal: React.FC<GstAuditNewModalProps> = ({
  isOpen,
  onClose,
  onAuditCreated,
}) => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [financialYear, setFinancialYear] = useState('2024-25');
  const [assessmentYear, setAssessmentYear] = useState('2025-26');
  const [auditName, setAuditName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fyOptions = ['2024-25', '2023-24', '2022-23', '2021-22', '2020-21'];

  useEffect(() => {
    if (isOpen) {
      loadClients();
      setError(null);
      setSelectedClient(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedClient) {
      setAuditName(`GST Audit — ${selectedClient.trade_name} (${financialYear})`);
      const startYear = parseInt(financialYear.split('-')[0], 10);
      if (!isNaN(startYear)) {
        setAssessmentYear(`${startYear + 1}-${String(startYear + 2).slice(-2)}`);
      }
    }
  }, [selectedClient, financialYear]);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const res = await clientService.getClients({ per_page: 100 });
      setClients(res.data || []);
    } catch (err: unknown) {
      console.error('Failed to load clients', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.trade_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.party_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.gstin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      setError('Please select an active client to begin the GST audit.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await gstAuditService.createAudit({
        client_id: selectedClient.id,
        financial_year: financialYear,
        assessment_year: assessmentYear,
        audit_name: auditName.trim(),
      });

      if (onAuditCreated) onAuditCreated();
      onClose();
      // Navigate to file upload center for the newly created audit
      navigate(`/gst-audit/${res.data.id}/upload`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initialize audit workspace.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create GST Audit Workspace"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          <p className="font-semibold mb-0.5">GST Audit & Reconciliation Workspace</p>
          <p className="text-blue-700 text-[11px]">
            Automated checks are analytical aids and should be reviewed by a qualified professional.
          </p>
        </div>

        {/* Client Selection */}
        <div>
          <label className="block text-xs font-bold text-[#111111] mb-1.5 uppercase tracking-wider">
            1. Select Client
          </label>
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search client by Trade Name, Party Name, or GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black transition-colors"
            />
          </div>

          <div className="max-h-40 overflow-y-auto border border-[#E5E5E5] rounded-xl divide-y divide-[#E5E5E5] bg-white">
            {loadingClients ? (
              <div className="p-4 text-center text-xs text-[#888888] flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading clients...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#888888]">
                {clients.length === 0
                  ? 'No clients found. Please create a client in Client Master first.'
                  : 'No client matches your search.'}
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClient(client)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-black text-white font-medium'
                        : 'hover:bg-[#F7F7F7] text-[#111111]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#888888]'}`} />
                      <div className="truncate">
                        <p className="font-bold truncate">{client.trade_name}</p>
                        <p className={`text-[11px] truncate ${isSelected ? 'text-gray-300' : 'text-[#666666]'}`}>
                          {client.party_name}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[11px] shrink-0 ml-2 px-2 py-0.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#EFEFEF] text-[#444444]'
                      }`}
                    >
                      {client.gstin}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Client Preview */}
        {selectedClient && (
          <div className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl text-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-[#888888]">Selected Client GSTIN</p>
              <p className="font-mono font-bold text-[#111111]">{selectedClient.gstin}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-[#888888]">State</p>
              <p className="font-medium text-[#111111]">{selectedClient.state || 'N/A'}</p>
            </div>
          </div>
        )}

        {/* Financial Year & Assessment Year */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1.5 uppercase tracking-wider">
              2. Financial Year
            </label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl focus:outline-hidden focus:bg-white focus:border-black transition-colors font-mono font-medium"
            >
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] mb-1.5 uppercase tracking-wider">
              Assessment Year
            </label>
            <Input
              value={assessmentYear}
              onChange={(e) => setAssessmentYear(e.target.value)}
              placeholder="e.g. 2025-26"
              className="font-mono"
            />
          </div>
        </div>

        {/* Audit Workspace Name */}
        <div>
          <label className="block text-xs font-bold text-[#111111] mb-1.5 uppercase tracking-wider">
            3. Audit Name / Reference
          </label>
          <Input
            value={auditName}
            onChange={(e) => setAuditName(e.target.value)}
            placeholder="e.g. GST Audit — Client Name (FY 2024-25)"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!selectedClient || submitting}
            className="flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Initializing...
              </>
            ) : (
              'Start Audit Workspace'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
