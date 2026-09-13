import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { Client, ClientListResponse } from '../../services/clientService';
import { clientService } from '../../services/clientService';
import { ClientFormModal } from './ClientFormModal';
import { BulkUploadModal } from './BulkUploadModal';
import type { Column } from '../../components/ui/DataTable';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import {
  Users,
  Plus,
  Upload,
  Search,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export const ClientListPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState({
    total_clients: 0,
    active_clients: 0,
    monthly_filers: 0,
    quarterly_filers: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search query (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch client data
  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const res: ClientListResponse = await clientService.getClients({
        search: debouncedSearch,
        status: statusFilter,
        filing_frequency: frequencyFilter,
        page: 1,
        per_page: 250,
      });

      setClients(res.data);
      setTotalRecords(res.total);
      if (res.summary) {
        setSummary(res.summary);
      }
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Unable to load client records.');
    }
  }, [debouncedSearch, statusFilter, frequencyFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Delete client handler
  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);

    try {
      await clientService.deleteClient(clientToDelete.id);
      setIsDeleting(false);
      setClientToDelete(null);
      fetchClients();
    } catch (err: any) {
      setIsDeleting(false);
      alert(err.message || 'Failed to remove client record.');
    }
  };

  // Table Columns Setup
  const columns: Column<Client>[] = [
    {
      key: 'sr_no',
      header: 'Sr. No.',
      render: (_row: Client, idx: number) => (
        <span className="font-mono text-xs text-[#666666]">
          {String(idx + 1).padStart(2, '0')}
        </span>
      ),
    },
    {
      key: 'trade_name',
      header: 'Trade Name',
      render: (row: Client) => (
        <div>
          <Link
            to={`/clients/${row.id}`}
            className="font-bold text-xs text-[#111111] hover:underline block truncate max-w-[180px]"
          >
            {row.trade_name}
          </Link>
          <span className="font-mono text-[10px] text-[#666666] block truncate max-w-[180px]">
            {row.party_name}
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'gstin',
      header: 'GSTIN',
      render: (row: Client) => (
        <div className="font-mono text-xs font-bold text-black">
          {row.gstin}
          <span className="block text-[10px] text-[#888888] font-normal">PAN: {row.pan || 'N/A'}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'state',
      header: 'State',
      render: (row: Client) => (
        <span className="text-xs text-[#555555]">
          {row.state || 'N/A'} {row.state_code ? `(${row.state_code})` : ''}
        </span>
      ),
    },
    {
      key: 'filing_frequency',
      header: 'Filing Frequency',
      render: (row: Client) => (
        <Badge variant={row.filing_frequency === 'monthly' ? 'neutral' : 'outline'}>
          {row.filing_frequency.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Client) => (
        <Badge variant={row.status === 'active' ? 'success' : 'neutral'}>
          {row.status.toUpperCase()}
        </Badge>
      ),
    },
  ];

  const renderActions = (row: Client) => (
    <div className="flex items-center gap-1.5 justify-end">
      <button
        onClick={() => navigate(`/clients/${row.id}`)}
        title="View Client Details"
        className="p-1.5 text-[#555555] hover:text-black hover:bg-[#F7F7F7] rounded-lg transition-colors cursor-pointer"
      >
        <Eye className="w-4 h-4" />
      </button>

      <button
        onClick={() => setClientToEdit(row)}
        title="Edit Client"
        className="p-1.5 text-[#555555] hover:text-black hover:bg-[#F7F7F7] rounded-lg transition-colors cursor-pointer"
      >
        <Edit className="w-4 h-4" />
      </button>

      <button
        onClick={() => navigate(`/dashboard/ecommerce-gstr1?client_id=${row.id}`)}
        title="Open GSTR-1 Engine"
        className="p-1.5 text-black hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer font-mono font-bold text-xs flex items-center gap-1"
      >
        <ShoppingCart className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setClientToDelete(row)}
        title="Delete Client"
        className="p-1.5 text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs text-[#666666] uppercase tracking-widest font-bold block mb-1">
            CLIENT DATABASE / MANAGEMENT
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">Clients</h1>
          <p className="text-xs text-[#555555] mt-0.5 font-normal">
            Manage your GST clients, filing preferences, and GSTR-1 reporting workflows.
          </p>
        </div>

        {/* Top Header Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setIsBulkModalOpen(true)}
          >
            Upload Bulk Client
          </Button>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setClientToEdit(null);
              setIsAddModalOpen(true);
            }}
          >
            Add Client
          </Button>
        </div>
      </div>

      {/* 2. KPI SUMMARY METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-mono font-bold text-sm shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#666666] uppercase block font-mono font-bold">TOTAL CLIENTS</span>
            <span className="text-xl font-extrabold text-[#111111]">{summary.total_clients}</span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 text-green-700 flex items-center justify-center font-mono font-bold text-sm shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#666666] uppercase block font-mono font-bold">ACTIVE CLIENTS</span>
            <span className="text-xl font-extrabold text-[#111111]">{summary.active_clients}</span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] text-[#111111] flex items-center justify-center font-mono font-bold text-sm shrink-0">
            M
          </div>
          <div>
            <span className="text-[10px] text-[#666666] uppercase block font-mono font-bold">MONTHLY FILERS</span>
            <span className="text-xl font-extrabold text-[#111111]">{summary.monthly_filers}</span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] text-[#111111] flex items-center justify-center font-mono font-bold text-sm shrink-0">
            Q
          </div>
          <div>
            <span className="text-[10px] text-[#666666] uppercase block font-mono font-bold">QUARTERLY FILERS</span>
            <span className="text-xl font-extrabold text-[#111111]">{summary.quarterly_filers}</span>
          </div>
        </Card>
      </div>

      {/* 3. SEARCH & FILTERS BAR */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
          {/* Live Search Bar */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-[#666666] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients by Trade Name, Party, GSTIN, PAN, Email..."
              className="w-full bg-[#FAFAFA] text-xs text-[#111111] rounded-xl border border-[#E5E5E5] pl-10 pr-4 py-2.5 outline-none focus:border-black transition-colors"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#FAFAFA] text-xs text-[#111111] font-medium rounded-xl border border-[#E5E5E5] px-3 py-2.5 outline-none focus:border-black cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value)}
              className="bg-[#FAFAFA] text-xs text-[#111111] font-medium rounded-xl border border-[#E5E5E5] px-3 py-2.5 outline-none focus:border-black cursor-pointer"
            >
              <option value="">All Frequencies</option>
              <option value="monthly">Monthly Filer</option>
              <option value="quarterly">Quarterly Filer</option>
            </select>

            {(searchQuery || statusFilter || frequencyFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('');
                  setFrequencyFilter('');
                }}
                className="text-xs font-mono font-bold text-[#DC2626] hover:underline cursor-pointer px-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* 4. CLIENT DATA TABLE */}
      {error ? (
        <Card className="p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-[#DC2626] mx-auto" />
          <p className="font-mono font-bold text-sm text-[#111111]">{error}</p>
          <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={fetchClients}>
            Try Again
          </Button>
        </Card>
      ) : (
        <Card className="p-6">
          {isLoading ? (
            <div className="py-12 text-center font-mono text-xs text-[#666666]">
              <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading clients database...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={clients}
              actions={renderActions}
              technicalHeader={`CLIENT RECORDS (${totalRecords} TOTAL)`}
              searchPlaceholder="Filter client list..."
              emptyTitle="No clients found"
              emptyMessage="Click '+ Add Client' or 'Upload Bulk Client' to add your first GST client."
            />
          )}
        </Card>
      )}

      {/* Modals */}
      <ClientFormModal
        isOpen={isAddModalOpen || Boolean(clientToEdit)}
        onClose={() => {
          setIsAddModalOpen(false);
          setClientToEdit(null);
        }}
        clientToEdit={clientToEdit}
        onSuccess={fetchClients}
      />

      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={fetchClients}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(clientToDelete)}
        onClose={() => setClientToDelete(null)}
        title="DELETE CLIENT CONFIRMATION"
        maxWidth="md"
      >
        {clientToDelete && (
          <div className="space-y-4 font-mono text-xs">
            <p className="text-sm text-[#111111] font-bold">
              Are you sure you want to delete <span className="underline">{clientToDelete.trade_name}</span> ({clientToDelete.gstin})?
            </p>
            <p className="text-[#666666]">
              This client record will be removed from your active client management database.
            </p>

            <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
              <Button variant="outline" size="md" onClick={() => setClientToDelete(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="danger" size="md" isLoading={isDeleting} onClick={handleDeleteConfirm}>
                Delete Client Record
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
