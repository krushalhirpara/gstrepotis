import React, { useState, useEffect } from 'react';
import { KpiCard } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import {
  Users,
  ShoppingCart,
  Plus,
  RefreshCw,
  Activity,
  Building2,
  ShieldCheck,
  FileText,
  Clock,
  Eye,
  Phone,
  Mail,
  Calendar,
  Key,
  CreditCard,
  Tag,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import {
  getPricingEnquiries,
  getPricingEnquiry,
  updatePricingEnquiryStatus,
  deletePricingEnquiry,
  type PricingEnquiryRecord,
  type PricingEnquiryMetrics,
} from '../../services/pricingEnquiryService';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    total_users: 0,
    active_users: 0,
    trial_users: 0,
    total_clients: 0,
    total_revenue: '₹0',
    files_processed: 0,
    processing_failures: 0,
    active_subscriptions: 0,
    health_rate: '100%',
    breakdown: {
      bank_statements: 0,
      marketplace_reports: 0,
      gst_audit_cases: 0,
      gst_audit_files: 0,
      clients: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');

  const fetchMetrics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await apiFetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        if (data && data.metrics) {
          setMetrics(data.metrics);
          setLastSync(
            new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
        }
      }
    } catch (err) {
      console.error('Error fetching admin metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Live synchronization: poll every 15 seconds so registrations & file processing reflect automatically
    const interval = setInterval(() => {
      fetchMetrics();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with Live Sync Controls */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-black">Administrator Control Console</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync Active
            </span>
          </div>
          <p className="text-xs text-[#666666] mt-1">
            Real-time platform overview: user registrations, client records, and Main Panel file processing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-[11px] text-neutral-400 font-mono hidden md:inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> Last Synced: {lastSync}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMetrics(true)}
            isLoading={refreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            className="text-xs font-semibold hover:bg-neutral-50"
          >
            Refresh Live Data
          </Button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          title="Total Registered Users"
          value={loading ? '...' : metrics.total_users}
          subtitle={`${metrics.active_users} Active Accounts`}
          icon={<Users className="w-5 h-5 text-black" />}
        />
        <KpiCard
          title="Client Master Records"
          value={loading ? '...' : (metrics.total_clients || metrics.breakdown?.clients || 0)}
          subtitle="Managed in Main Panel"
          icon={<Building2 className="w-5 h-5 text-black" />}
        />
        <KpiCard
          title="Total Files Processed"
          value={loading ? '...' : metrics.files_processed}
          subtitle="Across Bank, E-Com & GST Audits"
          icon={<ShoppingCart className="w-5 h-5 text-black" />}
        />
        <KpiCard
          title="System Health & Status"
          value={loading ? '...' : `${metrics.processing_failures} Failures`}
          badge={<Badge variant="success">{metrics.health_rate || '100%'} Health</Badge>}
          subtitle={`Subscriptions: ${metrics.active_subscriptions} | ${metrics.total_revenue}`}
        />
      </div>

      {/* Main Panel Modules Activity Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-black flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              Main Panel Live Modules Activity
            </h3>
            <p className="text-xs text-[#666666]">
              Real-time activity synchronized across all Main Panel workspaces.
            </p>
          </div>
          <Badge variant="outline" size="sm">
            Automatic Sync
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Bank Statement Converter */}
          <div className="p-4 rounded-xl border border-neutral-100 bg-[#FAFAFA] flex flex-col justify-between hover:border-neutral-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500">Bank Converter</span>
              <FileText className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-black text-black">
              {metrics.breakdown?.bank_statements || 0}
            </div>
            <span className="text-[11px] text-neutral-500 mt-1">Statements Parsed</span>
          </div>

          {/* E-Commerce GSTR-1 */}
          <div className="p-4 rounded-xl border border-neutral-100 bg-[#FAFAFA] flex flex-col justify-between hover:border-neutral-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500">E-Commerce GSTR-1</span>
              <ShoppingCart className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-black text-black">
              {metrics.breakdown?.marketplace_reports || 0}
            </div>
            <span className="text-[11px] text-neutral-500 mt-1">Marketplace Reports</span>
          </div>

          {/* GST Audit Module */}
          <div className="p-4 rounded-xl border border-neutral-100 bg-[#FAFAFA] flex flex-col justify-between hover:border-neutral-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500">GST Audit Workspace</span>
              <ShieldCheck className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-black text-black">
              {metrics.breakdown?.gst_audit_cases || 0}
            </div>
            <span className="text-[11px] text-neutral-500 mt-1">
              {metrics.breakdown?.gst_audit_files || 0} Audit Files Uploaded
            </span>
          </div>

          {/* Client Master */}
          <div className="p-4 rounded-xl border border-neutral-100 bg-[#FAFAFA] flex flex-col justify-between hover:border-neutral-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500">Client Directory</span>
              <Building2 className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-black text-black">
              {metrics.breakdown?.clients || metrics.total_clients || 0}
            </div>
            <span className="text-[11px] text-neutral-500 mt-1">CA & Tax Clients</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchUsers = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await apiFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Periodically sync users
    const interval = setInterval(() => {
      fetchUsers();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleStatus = (id: number) => {
    apiFetch(`/api/admin/users/${id}/toggle-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        setUsers(users.map((u) => (u.id === id ? { ...u, status: data.user.status } : u)));
        if (selectedUser && selectedUser.id === id) {
          setSelectedUser({ ...selectedUser, status: data.user.status });
        }
      })
      .catch(() => {});
  };

  const handleViewDetails = async (user: any) => {
    setIsDetailsOpen(true);
    setDetailsLoading(true);
    setSelectedUser(user);

    try {
      const res = await apiFetch(`/api/admin/users/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          setSelectedUser(data.user);
        }
      }
    } catch (err) {
      console.error('Error loading user details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Filtered dataset
  const filteredUsers = users.filter((u) => {
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (roleFilter !== 'all') {
      if (roleFilter === 'Admin' && !u.is_admin) return false;
      if (roleFilter !== 'Admin' && u.user_type !== roleFilter && u.role !== roleFilter) return false;
    }
    return true;
  });

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (r) => (
        <div>
          <button
            type="button"
            onClick={() => handleViewDetails(r)}
            className="font-bold text-black hover:underline text-left block cursor-pointer"
          >
            {r.name || 'Anonymous User'}
          </button>
          {r.is_admin ? (
            <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Owner / Admin</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'mobile',
      header: 'Mobile',
      render: (r) =>
        r.mobile ? (
          <span className="font-mono text-xs font-semibold text-neutral-800">{r.mobile}</span>
        ) : (
          <span className="text-neutral-400 text-xs italic">Missing</span>
        ),
    },
    {
      key: 'mobile_verified_at',
      header: 'Mobile Verified',
      render: (r) =>
        r.mobile_verified_at ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            Unverified
          </span>
        ),
    },
    { key: 'email', header: 'Email', render: (r) => <span className="font-mono text-xs text-neutral-700">{r.email}</span> },
    {
      key: 'auth_provider',
      header: 'Auth Provider',
      render: (r) => {
        const prov = r.auth_provider || r.provider || 'email_password';
        if (prov === 'google') {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              google
            </span>
          );
        }
        if (prov === 'phone') {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              phone
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            email_password
          </span>
        );
      },
    },
    {
      key: 'firebase_uid',
      header: 'Firebase UID',
      render: (r) => {
        const uid = r.firebase_uid || r.google_id;
        return uid ? (
          <span
            title={uid}
            className="font-mono text-[11px] bg-neutral-100 px-2 py-0.5 rounded text-neutral-600 max-w-[120px] truncate block"
          >
            {uid.length > 14 ? `${uid.substring(0, 12)}...` : uid}
          </span>
        ) : (
          <span className="text-neutral-400 text-xs">-</span>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (r) => (
        <Badge variant={r.is_admin ? 'neutral' : 'outline'}>
          {r.is_admin ? 'Admin' : (r.role || r.user_type || 'User')}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'error'}>{r.account_status || r.status || 'active'}</Badge>,
    },
    {
      key: 'created_at',
      header: 'Registration Date',
      render: (r) => (
        <span className="text-xs text-neutral-600 font-mono">
          {r.created_at
            ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Live'}
        </span>
      ),
    },
    {
      key: 'last_login_at',
      header: 'Last Login',
      render: (r) => (
        <span className="text-xs text-neutral-600 font-mono">
          {r.last_login_at
            ? new Date(r.last_login_at).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Never'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-black">User Management Console</h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Real-time registered users, verified database accounts, mobile contacts, and credits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsers(true)}
            isLoading={refreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh Users
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-[#D1D5DB] rounded-lg bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-600">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 border border-[#D1D5DB] rounded-lg bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="all">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="CA">CA</option>
            <option value="Accountant">Accountant</option>
            <option value="Tax Professional">Tax Professional</option>
            <option value="Seller">Seller</option>
          </select>
        </div>

        <div className="ml-auto text-neutral-500 font-mono text-[11px]">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {users.length === 0 && !loading ? (
        <div className="bg-white p-12 rounded-2xl border border-[#E5E5E5] text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 text-neutral-500">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">Waiting for User Registrations</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Whenever any user signs up on <span className="font-mono text-black">https://gstrepotis.com</span>, their verified details will immediately appear here in real time.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredUsers}
          searchPlaceholder="Search users by name, email, mobile, or UID..."
          actions={(row) => (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewDetails(row)}
                leftIcon={<Eye className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Details
              </Button>
              <Button
                variant={row.status === 'active' ? 'danger' : 'outline'}
                size="sm"
                onClick={() => toggleStatus(row.id)}
                className="text-xs"
              >
                {row.status === 'active' ? 'Suspend' : 'Activate'}
              </Button>
            </div>
          )}
        />
      )}

      {/* User Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedUser(null);
        }}
        title="Registered User Profile & Workspace Records"
      >
        {detailsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-500">
            <RefreshCw className="w-6 h-6 animate-spin text-black" />
            <span className="text-xs font-semibold">Loading real-time user records...</span>
          </div>
        ) : selectedUser ? (
          <div className="space-y-5">
            {/* Identity Banner */}
            <div className="flex items-center gap-3.5 p-4 bg-[#FAFAFA] rounded-xl border border-neutral-100">
              <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-black text-base">
                {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-black text-base truncate">{selectedUser.name || 'Anonymous'}</h4>
                  <Badge variant={selectedUser.status === 'active' ? 'success' : 'error'} size="sm">
                    {selectedUser.status || 'active'}
                  </Badge>
                </div>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">{selectedUser.email}</p>
              </div>
            </div>

            {/* Profile Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-neutral-100 flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[11px] text-neutral-500 font-medium block">Mobile Number</span>
                  <span className="font-mono font-bold text-black text-sm">
                    {selectedUser.mobile || 'Not provided'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-neutral-100 flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[11px] text-neutral-500 font-medium block">Email Address</span>
                  <span className="font-mono text-xs font-semibold text-black break-all">
                    {selectedUser.email}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-neutral-100 flex items-start gap-2.5 sm:col-span-2">
                <Key className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-neutral-500 font-medium block">Verified Firebase UID</span>
                  <span className="font-mono text-[11px] text-neutral-800 break-all select-all block bg-white px-2 py-1 rounded border border-neutral-200 mt-0.5">
                    {selectedUser.firebase_uid || selectedUser.google_id || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-neutral-100 flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[11px] text-neutral-500 font-medium block">Registration Date</span>
                  <span className="font-mono text-xs text-black">
                    {selectedUser.created_at
                      ? new Date(selectedUser.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Live'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-neutral-100 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[11px] text-neutral-500 font-medium block">Last Login Timestamp</span>
                  <span className="font-mono text-xs text-black">
                    {selectedUser.last_login_at
                      ? new Date(selectedUser.last_login_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Real DB Module Activity Breakdown */}
            <div className="border-t border-[#E5E5E5] pt-4 space-y-3">
              <h5 className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider">
                Database Workspace Activity
              </h5>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 bg-[#F9FAFB] rounded-lg text-center border border-neutral-100">
                  <span className="text-[10px] text-neutral-500 block">Clients</span>
                  <span className="text-base font-black text-black">
                    {selectedUser.metrics?.clients_count ?? 0}
                  </span>
                </div>
                <div className="p-2.5 bg-[#F9FAFB] rounded-lg text-center border border-neutral-100">
                  <span className="text-[10px] text-neutral-500 block">Bank Files</span>
                  <span className="text-base font-black text-black">
                    {selectedUser.metrics?.bank_statements_count ?? 0}
                  </span>
                </div>
                <div className="p-2.5 bg-[#F9FAFB] rounded-lg text-center border border-neutral-100">
                  <span className="text-[10px] text-neutral-500 block">GSTR-1 Files</span>
                  <span className="text-base font-black text-black">
                    {selectedUser.metrics?.marketplace_files_count ?? 0}
                  </span>
                </div>
                <div className="p-2.5 bg-[#F9FAFB] rounded-lg text-center border border-neutral-100">
                  <span className="text-[10px] text-neutral-500 block">GST Audits</span>
                  <span className="text-base font-black text-black">
                    {selectedUser.metrics?.gst_audits_count ?? 0}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-emerald-950">Conversion Credits</span>
                </div>
                <span className="font-mono font-extrabold text-emerald-800 text-sm">
                  {selectedUser.credits ?? 50} Available
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex justify-between gap-3 border-t border-[#E5E5E5]">
              <Button
                variant={selectedUser.status === 'active' ? 'danger' : 'outline'}
                size="sm"
                onClick={() => toggleStatus(selectedUser.id)}
              >
                {selectedUser.status === 'active' ? 'Suspend Account' : 'Activate Account'}
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export const AdminBanks: React.FC = () => {
  const [banks, setBanks] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBank, setNewBank] = useState({ name: '', code: '', parser_type: 'pdf_standard' });

  useEffect(() => {
    apiFetch('/api/admin/banks')
      .then((res) => res.json())
      .then((data) => setBanks(data.banks || []))
      .catch(() => {});
  }, []);

  const handleAdd = () => {
    if (newBank.name && newBank.code) {
      apiFetch('/api/admin/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBank),
      })
        .then((res) => res.json())
        .then((data) => {
          setBanks([...banks, { id: data.id, ...newBank, status: 'active' }]);
          setIsAddOpen(false);
          setNewBank({ name: '', code: '', parser_type: 'pdf_standard' });
        })
        .catch(() => {});
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-black">Bank Master Directory & Parsers</h2>
          <p className="text-xs text-[#666666] mt-0.5">Manage bank statement parsers across 18+ Indian banking systems.</p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsAddOpen(true)}>
          Add New Bank
        </Button>
      </div>

      <DataTable
        columns={[
          { key: 'name', header: 'Bank Name', render: (r) => <span className="font-semibold text-black">{r.name}</span> },
          { key: 'code', header: 'Code', render: (r) => <span className="font-mono font-bold">{r.code}</span> },
          { key: 'parser_type', header: 'Parser Engine', render: (r) => <Badge variant="outline">{r.parser_type}</Badge> },
          { key: 'status', header: 'Status', render: (r) => <Badge variant="success">{r.status}</Badge> },
        ]}
        data={banks}
      />

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Supported Bank">
        <div className="space-y-4">
          <Input label="Bank Name" value={newBank.name} onChange={(e) => setNewBank({ ...newBank, name: e.target.value })} placeholder="e.g. Canara Bank" />
          <Input label="Bank Code" value={newBank.code} onChange={(e) => setNewBank({ ...newBank, code: e.target.value })} placeholder="e.g. CANARA" />
          <Select
            label="Parser Type"
            value={newBank.parser_type}
            onChange={(e) => setNewBank({ ...newBank, parser_type: e.target.value })}
            options={[
              { value: 'pdf_standard', label: 'PDF Standard Column Reader' },
              { value: 'pdf_hdfc', label: 'HDFC Layout Parser' },
              { value: 'pdf_sbi', label: 'SBI Layout Parser' },
            ]}
          />
          <Button variant="primary" className="w-full" onClick={handleAdd}>Save Bank Master</Button>
        </div>
      </Modal>
    </div>
  );
};

export const AdminMarketplaces: React.FC = () => {
  const [marketplaces, setMarketplaces] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/api/admin/marketplaces')
      .then((res) => res.json())
      .then((data) => setMarketplaces(data.marketplaces || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-black">Marketplace Masters & Parsers</h2>
      </div>
      <DataTable
        columns={[
          { key: 'name', header: 'Marketplace' },
          { key: 'slug', header: 'Slug', render: (r) => <span className="font-mono">{r.slug}</span> },
          { key: 'parser', header: 'Parser Class', render: (r) => <Badge variant="outline">{r.parser}</Badge> },
          { key: 'status', header: 'Status', render: (r) => <Badge variant="success">{r.status}</Badge> },
        ]}
        data={marketplaces}
      />
    </div>
  );
};

export const AdminHsn: React.FC = () => {
  const [hsnList, setHsnList] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newHsn, setNewHsn] = useState({ hsn_code: '', description: '', gst_rate: 18 });

  useEffect(() => {
    apiFetch('/api/admin/hsn')
      .then((res) => res.json())
      .then((data) => setHsnList(data.hsn_code || data.hsn_master || []))
      .catch(() => {});
  }, []);

  const handleAdd = () => {
    if (newHsn.hsn_code && newHsn.description) {
      apiFetch('/api/admin/hsn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHsn),
      })
        .then((res) => res.json())
        .then((data) => {
          setHsnList([...hsnList, { id: data.id, ...newHsn, gst_rate: Number(newHsn.gst_rate) }]);
          setIsAddOpen(false);
          setNewHsn({ hsn_code: '', description: '', gst_rate: 18 });
        })
        .catch(() => {});
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-black">HSN Master Directory</h2>
          <p className="text-xs text-[#666666] mt-0.5">Manage official GST rate rules and HSN descriptions.</p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsAddOpen(true)}>
          Add HSN Code
        </Button>
      </div>

      <DataTable
        columns={[
          { key: 'hsn_code', header: 'HSN Code', render: (r) => <span className="font-mono font-bold text-black">{r.hsn_code}</span> },
          { key: 'description', header: 'Description' },
          { key: 'gst_rate', header: 'GST Rate', render: (r) => `${r.gst_rate}%` },
        ]}
        data={hsnList}
      />

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add HSN Code to Master">
        <div className="space-y-4">
          <Input label="HSN Code" value={newHsn.hsn_code} onChange={(e) => setNewHsn({ ...newHsn, hsn_code: e.target.value })} placeholder="e.g. 9403" />
          <Input label="Description" value={newHsn.description} onChange={(e) => setNewHsn({ ...newHsn, description: e.target.value })} placeholder="Furniture & wooden parts" />
          <Input label="GST Rate (%)" type="number" value={newHsn.gst_rate} onChange={(e) => setNewHsn({ ...newHsn, gst_rate: Number(e.target.value) })} />
          <Button variant="primary" className="w-full" onClick={handleAdd}>Save HSN Code</Button>
        </div>
      </Modal>
    </div>
  );
};

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/api/admin/audit-logs')
      .then((res) => res.json())
      .then((data) => setLogs(data.audit_logs || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5]">
        <h2 className="text-xl font-extrabold text-black">System Audit Trail Logs</h2>
      </div>

      <DataTable
        columns={[
          { key: 'user', header: 'User' },
          { key: 'action', header: 'Action', render: (r) => <Badge variant="outline">{r.action}</Badge> },
          { key: 'module', header: 'Module' },
          { key: 'record', header: 'Target Record' },
          { key: 'ip', header: 'IP Address', render: (r) => <span className="font-mono text-[11px]">{r.ip}</span> },
          { key: 'timestamp', header: 'Timestamp' },
        ]}
        data={logs}
      />
    </div>
  );
};

export const AdminPricingEnquiries: React.FC = () => {
  const [enquiries, setEnquiries] = useState<PricingEnquiryRecord[]>([]);
  const [metrics, setMetrics] = useState<PricingEnquiryMetrics>({
    total: 0,
    new: 0,
    contacted: 0,
    in_discussion: 0,
    converted: 0,
    closed: 0,
    plans: {
      free_trial: 0,
      professional: 0,
      business: 0,
      enterprise: 0,
    },
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    has_more: false,
  });

  // Query state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState('');
  const [selectedEnquiry, setSelectedEnquiry] = useState<PricingEnquiryRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [enquiryToDelete, setEnquiryToDelete] = useState<PricingEnquiryRecord | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchEnquiries = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await getPricingEnquiries({
        search: search.trim(),
        status: statusFilter,
        plan: planFilter,
        sort: sortBy,
        page: currentPage,
        per_page: perPage,
      });

      setEnquiries(res.data || []);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
      if (res.pagination) {
        setPagination(res.pagination);
      }
      setLastSync(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch (err: any) {
      console.error('Failed to load pricing enquiries:', err);
      setAlertBanner({
        type: 'error',
        message: err?.message || 'Unable to load pricing enquiries. Please refresh.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [search, statusFilter, planFilter, sortBy, currentPage, perPage]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setCurrentPage(1);
  };

  // Open Detail Modal
  const handleViewDetail = async (enquiry: PricingEnquiryRecord) => {
    setSelectedEnquiry(enquiry);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await getPricingEnquiry(enquiry.id);
      if (res.data) {
        setSelectedEnquiry(res.data);
      }
    } catch (err) {
      console.error('Failed to load enquiry details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Update Status
  const handleStatusChange = async (
    id: number,
    newStatus: 'new' | 'contacted' | 'in_discussion' | 'converted' | 'closed'
  ) => {
    setStatusUpdating(true);
    try {
      const res = await updatePricingEnquiryStatus(id, newStatus);
      if (res.data) {
        setEnquiries((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: newStatus, updated_at: res.data.updated_at } : item
          )
        );
        if (selectedEnquiry && selectedEnquiry.id === id) {
          setSelectedEnquiry((prev) => (prev ? { ...prev, status: newStatus, updated_at: res.data.updated_at } : null));
        }
        setAlertBanner({
          type: 'success',
          message: `Enquiry status updated to "${formatStatus(newStatus)}".`,
        });
        // Refresh metrics
        fetchEnquiries();
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setAlertBanner({
        type: 'error',
        message: err?.message || 'Failed to update enquiry status.',
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  // Delete Enquiry
  const handleDeleteEnquiry = async () => {
    if (!enquiryToDelete) return;
    setDeleting(true);
    try {
      await deletePricingEnquiry(enquiryToDelete.id);
      setIsDeleteOpen(false);
      if (selectedEnquiry?.id === enquiryToDelete.id) {
        setIsDetailOpen(false);
        setSelectedEnquiry(null);
      }
      setEnquiryToDelete(null);
      setAlertBanner({
        type: 'success',
        message: 'Enquiry deleted successfully.',
      });
      fetchEnquiries();
    } catch (err: any) {
      console.error('Failed to delete enquiry:', err);
      setAlertBanner({
        type: 'error',
        message: err?.message || 'Failed to delete enquiry.',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Helper badge renderers
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            New
          </span>
        );
      case 'contacted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Contacted
          </span>
        );
      case 'in_discussion':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
            <MessageSquare className="w-3 h-3" />
            In Discussion
          </span>
        );
      case 'converted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Converted
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-600 border border-neutral-200">
            Closed
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const renderPlanBadge = (plan: string) => {
    switch (plan) {
      case 'Free Trial':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-300">
            Free Trial
          </span>
        );
      case 'Professional':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            Professional
          </span>
        );
      case 'Business':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            Business
          </span>
        );
      case 'Enterprise':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-900 text-white border border-black">
            Enterprise
          </span>
        );
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  const formatStatus = (s: string) => {
    switch (s) {
      case 'new':
        return 'New';
      case 'contacted':
        return 'Contacted';
      case 'in_discussion':
        return 'In Discussion';
      case 'converted':
        return 'Converted';
      case 'closed':
        return 'Closed';
      default:
        return s;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert banner if any */}
      {alertBanner && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold ${
            alertBanner.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {alertBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{alertBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertBanner(null)}
            className="text-neutral-500 hover:text-black"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header with live sync */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-black">Pricing Plan Sales Enquiries</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Database
            </span>
          </div>
          <p className="text-xs text-[#666666] mt-1">
            Real prospective client leads captured from visitor plan selections on the pricing page.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-[11px] text-neutral-400 font-mono hidden md:inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> Last Synced: {lastSync}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEnquiries(true)}
            isLoading={refreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            className="text-xs font-semibold hover:bg-neutral-50"
          >
            Refresh Enquiries
          </Button>
        </div>
      </div>

      {/* Real-time Summary Cards (Real DB metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Enquiries"
          value={loading ? '...' : metrics.total}
          subtitle="All incoming leads"
          icon={<Tag className="w-5 h-5 text-black" />}
        />
        <KpiCard
          title="New Leads"
          value={loading ? '...' : metrics.new}
          subtitle="Awaiting first contact"
          icon={<AlertCircle className="w-5 h-5 text-blue-600" />}
          badge={<Badge variant="info">Action Req.</Badge>}
        />
        <KpiCard
          title="Contacted"
          value={loading ? '...' : metrics.contacted}
          subtitle="Outreach initiated"
          icon={<Phone className="w-5 h-5 text-amber-600" />}
        />
        <KpiCard
          title="In Discussion"
          value={loading ? '...' : metrics.in_discussion}
          subtitle="Active sales pipeline"
          icon={<MessageSquare className="w-5 h-5 text-purple-600" />}
        />
        <KpiCard
          title="Converted"
          value={loading ? '...' : metrics.converted}
          subtitle={`${metrics.closed} closed leads`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          badge={<Badge variant="success">Won</Badge>}
        />
      </div>

      {/* Plan Breakdown Pill Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-neutral-700 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-neutral-500" /> Plan Distribution:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-100 text-neutral-700 font-semibold border border-neutral-200">
            Free Trial: <span className="font-bold text-black">{metrics.plans?.free_trial || 0}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-semibold border border-blue-200">
            Professional: <span className="font-bold text-blue-900">{metrics.plans?.professional || 0}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 text-purple-800 font-semibold border border-purple-200">
            Business: <span className="font-bold text-purple-900">{metrics.plans?.business || 0}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-900 text-white font-semibold">
            Enterprise: <span className="font-bold text-amber-400">{metrics.plans?.enterprise || 0}</span>
          </span>
        </div>
      </div>

      {/* Search, Filters, and Sorting Controls */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E5E5] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, email, phone, or plan..."
                className="w-full bg-[#FAFAFA] border border-neutral-300 rounded-xl pl-9 pr-8 py-2 text-xs text-black placeholder-neutral-400 outline-none focus:border-black transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" variant="outline" size="sm" className="shrink-0 text-xs">
              Search
            </Button>
          </form>

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-600">
              <Filter className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#FAFAFA] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black outline-none focus:border-black"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="in_discussion">In Discussion</option>
                <option value="converted">Converted</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Plan Filter */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-600">
              <select
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#FAFAFA] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black outline-none focus:border-black"
              >
                <option value="all">All Plans</option>
                <option value="Free Trial">Free Trial</option>
                <option value="Professional">Professional</option>
                <option value="Business">Business</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-600">
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'newest' | 'oldest');
                  setCurrentPage(1);
                }}
                className="bg-[#FAFAFA] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black outline-none focus:border-black"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            {/* Rows Per Page */}
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#FAFAFA] border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-700 outline-none focus:border-black"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F7F7] border-b border-[#E5E5E5] font-mono text-[10px] font-bold uppercase tracking-wider text-[#555555]">
                  <th className="p-3.5">Lead / Contact Name</th>
                  <th className="p-3.5">Email ID</th>
                  <th className="p-3.5">Contact Number</th>
                  <th className="p-3.5">Selected Plan</th>
                  <th className="p-3.5">Lead Status</th>
                  <th className="p-3.5">Date Received</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] text-xs text-[#111111]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-400 mb-2" />
                      Loading enquiries from database...
                    </td>
                  </tr>
                ) : enquiries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="max-w-xs mx-auto">
                        <Tag className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                        <p className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider">
                          No pricing enquiries found
                        </p>
                        <p className="text-xs text-[#666666] mt-1">
                          {search || statusFilter !== 'all' || planFilter !== 'all'
                            ? 'Try adjusting your search keywords or filter options.'
                            : 'No customer pricing enquiries have been submitted yet.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  enquiries.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="p-3.5 font-bold text-black">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(row)}
                          className="hover:underline text-left font-bold text-black flex items-center gap-1.5"
                        >
                          {row.first_name} {row.last_name}
                        </button>
                      </td>
                      <td className="p-3.5 font-mono text-xs text-neutral-700">
                        <a
                          href={`mailto:${row.email}`}
                          className="hover:underline hover:text-black flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                          {row.email}
                        </a>
                      </td>
                      <td className="p-3.5 font-mono text-xs text-neutral-800">
                        <a
                          href={`tel:${row.contact_number}`}
                          className="hover:underline hover:text-black flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                          {row.contact_number}
                        </a>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {renderPlanBadge(row.selected_plan)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {renderStatusBadge(row.status)}
                          {/* Quick inline status update select */}
                          <select
                            value={row.status}
                            onChange={(e) =>
                              handleStatusChange(
                                row.id,
                                e.target.value as 'new' | 'contacted' | 'in_discussion' | 'converted' | 'closed'
                              )
                            }
                            disabled={statusUpdating}
                            aria-label={`Change status for ${row.first_name} ${row.last_name}`}
                            className="text-[11px] bg-white border border-neutral-200 rounded px-1.5 py-0.5 text-neutral-600 hover:border-black cursor-pointer"
                          >
                            <option value="new">Mark New</option>
                            <option value="contacted">Mark Contacted</option>
                            <option value="in_discussion">Mark In Discussion</option>
                            <option value="converted">Mark Converted</option>
                            <option value="closed">Mark Closed</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-xs text-neutral-600 whitespace-nowrap">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetail(row)}
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            className="text-xs px-2.5 py-1"
                          >
                            Details
                          </Button>
                          <button
                            type="button"
                            onClick={() => {
                              setEnquiryToDelete(row);
                              setIsDeleteOpen(true);
                            }}
                            title="Delete Enquiry"
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Footer */}
          {pagination.total > 0 && (
            <div className="p-3.5 border-t border-[#E5E5E5] bg-[#F7F7F7] flex flex-col sm:flex-row items-center justify-between font-mono text-[11px] text-[#555555] gap-3">
              <span>
                SHOWING {(pagination.current_page - 1) * pagination.per_page + 1} -{' '}
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} OF{' '}
                {pagination.total} ENQUIRIES
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current_page <= 1 || loading}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  PREV
                </Button>
                <span className="px-2 font-bold text-[#111111]">
                  Page {pagination.current_page} of {pagination.last_page || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.current_page >= pagination.last_page || loading}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, pagination.last_page))}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  NEXT
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enquiry Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={
          selectedEnquiry
            ? `Enquiry Details — ${selectedEnquiry.first_name} ${selectedEnquiry.last_name}`
            : 'Enquiry Details'
        }
      >
        {selectedEnquiry && (
          <div className="space-y-5">
            {detailLoading && (
              <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" /> Syncing latest details...
              </div>
            )}

            {/* Top Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAFAFA] p-4 rounded-xl border border-neutral-200 text-xs">
              <div>
                <span className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                  Customer / Lead Name
                </span>
                <span className="font-bold text-sm text-black block">
                  {selectedEnquiry.first_name} {selectedEnquiry.last_name}
                </span>
                <span className="text-neutral-500 text-[11px]">
                  First: {selectedEnquiry.first_name} | Last: {selectedEnquiry.last_name}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                  Selected Pricing Plan
                </span>
                <div>{renderPlanBadge(selectedEnquiry.selected_plan)}</div>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                  Contact Number
                </span>
                <a
                  href={`tel:${selectedEnquiry.contact_number}`}
                  className="font-mono text-black font-semibold hover:underline flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-neutral-500" />
                  {selectedEnquiry.contact_number}
                </a>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                  Email ID
                </span>
                <a
                  href={`mailto:${selectedEnquiry.email}`}
                  className="font-mono text-black font-semibold hover:underline flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-neutral-500" />
                  {selectedEnquiry.email}
                </a>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                  Submission Date
                </span>
                <span className="font-mono text-neutral-700">
                  {selectedEnquiry.created_at
                    ? new Date(selectedEnquiry.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase text-neutral-400 font-bold block mb-1">
                  Current Status
                </span>
                <div>{renderStatusBadge(selectedEnquiry.status)}</div>
              </div>
            </div>

            {/* Message Box */}
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                Client Requirement / Message:
              </label>
              <div className="bg-white p-4 rounded-xl border border-neutral-300 text-xs text-neutral-900 whitespace-pre-wrap font-sans leading-relaxed min-h-[100px] shadow-inner">
                {selectedEnquiry.message || <span className="text-neutral-400 italic">No message text provided.</span>}
              </div>
            </div>

            {/* Status Management Workflow Buttons */}
            <div className="space-y-2 pt-2 border-t border-neutral-200">
              <label className="text-xs font-bold text-neutral-700 block">
                Update Lead Status:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(['new', 'contacted', 'in_discussion', 'converted', 'closed'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={statusUpdating || selectedEnquiry.status === st}
                    onClick={() => handleStatusChange(selectedEnquiry.id, st)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 border ${
                      selectedEnquiry.status === st
                        ? 'bg-black text-white border-black ring-2 ring-neutral-400'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {formatStatus(st)}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => {
                  setEnquiryToDelete(selectedEnquiry);
                  setIsDeleteOpen(true);
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Enquiry
              </button>

              <Button variant="primary" size="sm" onClick={() => setIsDetailOpen(false)}>
                Close Details
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Delete Enquiry"
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Are you sure you want to delete this enquiry?</p>
              <p className="mt-1 text-red-700">
                Enquiry from{' '}
                <span className="font-bold">
                  {enquiryToDelete?.first_name} {enquiryToDelete?.last_name}
                </span>{' '}
                for the <span className="font-bold">{enquiryToDelete?.selected_plan}</span> plan will be permanently removed from MySQL.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeleteEnquiry}
              isLoading={deleting}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600"
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

