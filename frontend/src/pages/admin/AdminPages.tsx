import React, { useState, useEffect } from 'react';
import { KpiCard } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Users, ShoppingCart, Plus } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    total_users: 1240,
    active_users: 1180,
    trial_users: 420,
    total_revenue: '₹18,45,000',
    files_processed: 48920,
    processing_failures: 38,
    active_subscriptions: 840,
  });

  useEffect(() => {
    fetch('/api/admin/metrics')
      .then((res) => res.json())
      .then((data) => setMetrics(data.metrics))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-black">Administrator Control Console</h2>
          <p className="text-xs text-[#666666] mt-0.5">Platform overview, user accounts, system rules, and audit history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard title="Total Registered Users" value={metrics.total_users} subtitle={`${metrics.active_users} Active Accounts`} icon={<Users className="w-5 h-5" />} />
        <KpiCard title="Active Subscriptions" value={metrics.active_subscriptions} trend={{ value: 'Revenue: ' + metrics.total_revenue, isPositive: true }} />
        <KpiCard title="Total Files Processed" value={metrics.files_processed} subtitle="Across Bank & E-Commerce" icon={<ShoppingCart className="w-5 h-5" />} />
        <KpiCard title="System Error Rate" value={`${metrics.processing_failures} Failures`} badge={<Badge variant="success">99.92% Health</Badge>} />
      </div>
    </div>
  );
};

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => {});
  }, []);

  const toggleStatus = (id: number) => {
    fetch(`/api/admin/users/${id}/toggle-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        setUsers(users.map((u) => (u.id === id ? { ...u, status: data.user.status } : u)));
      })
      .catch(() => {});
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-semibold text-black">{r.name}</span> },
    { key: 'email', header: 'Email' },
    { key: 'mobile', header: 'Mobile' },
    { key: 'user_type', header: 'Role', render: (r) => <Badge variant="outline">{r.user_type}</Badge> },
    { key: 'credits', header: 'Credits', render: (r) => `${r.credits} left` },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'error'}>{r.status}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-black">User Management Console</h2>
      </div>

      <DataTable
        columns={columns}
        data={users}
        searchPlaceholder="Search users by name or email..."
        actions={(row) => (
          <Button
            variant={row.status === 'active' ? 'danger' : 'outline'}
            size="sm"
            onClick={() => toggleStatus(row.id)}
          >
            {row.status === 'active' ? 'Suspend' : 'Activate'}
          </Button>
        )}
      />
    </div>
  );
};

export const AdminBanks: React.FC = () => {
  const [banks, setBanks] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBank, setNewBank] = useState({ name: '', code: '', parser_type: 'pdf_standard' });

  useEffect(() => {
    fetch('/api/admin/banks')
      .then((res) => res.json())
      .then((data) => setBanks(data.banks || []))
      .catch(() => {});
  }, []);

  const handleAdd = () => {
    if (newBank.name && newBank.code) {
      fetch('/api/admin/banks', {
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
    fetch('/api/admin/marketplaces')
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
    fetch('/api/admin/hsn')
      .then((res) => res.json())
      .then((data) => setHsnList(data.hsn_code || data.hsn_master || []))
      .catch(() => {});
  }, []);

  const handleAdd = () => {
    if (newHsn.hsn_code && newHsn.description) {
      fetch('/api/admin/hsn', {
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
    fetch('/api/admin/audit-logs')
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
