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
} from 'lucide-react';
import { apiFetch } from '../../services/api';

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
      header: 'Status',
      render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'error'}>{r.status || 'active'}</Badge>,
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
            Real-time registered users, verified Google Authentication credentials, mobile contacts, and credits.
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
            Whenever any user signs up or signs in using <strong>"Continue with Google"</strong> on{' '}
            <span className="font-mono text-black">https://gstrepotis.com</span>, their verified details will immediately appear here in real time.
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
