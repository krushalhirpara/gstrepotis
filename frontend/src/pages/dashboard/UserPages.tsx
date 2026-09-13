import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import { Download, Mail, Phone } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const reports: any[] = [];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5]">
        <h2 className="text-xl font-extrabold text-black">Generated Reports Engine</h2>
        <p className="text-xs text-[#666666] mt-0.5">Download GST JSON, Tally XML, and CSV accounting summaries.</p>
      </div>

      <Card className="p-6 bg-white">
        <DataTable
          columns={[
            { key: 'name', header: 'Report Name', render: (r) => <span className="font-semibold text-black">{r.name}</span> },
            { key: 'type', header: 'Format', render: (r) => <Badge variant="outline">{r.type}</Badge> },
            { key: 'date', header: 'Generated Date' },
            { key: 'size', header: 'Size' },
          ]}
          data={reports}
          actions={() => (
            <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
              Download
            </Button>
          )}
        />
      </Card>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('gst_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        name: parsed.name || '',
        email: parsed.email || '',
        mobile: parsed.mobile || '',
        user_type: 'CA',
        firm: parsed.firm || '',
        address: parsed.address || '',
      };
    }
    return {
      name: '',
      email: '',
      mobile: '',
      user_type: 'CA',
      firm: '',
      address: '',
    };
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const stored = localStorage.getItem('gst_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.name = user.name;
      parsed.email = user.email;
      parsed.mobile = user.mobile;
      parsed.firm = user.firm;
      parsed.address = user.address;
      localStorage.setItem('gst_user', JSON.stringify(parsed));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5]">
        <h2 className="text-xl font-extrabold text-black">User Profile Settings</h2>
        <p className="text-xs text-[#666666] mt-0.5">Manage your credentials, CA firm info, and contact details.</p>
      </div>

      <Card className="p-6 bg-white space-y-4">
        {saved && <Badge variant="success">Profile saved successfully!</Badge>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
          <Input label="Email Address" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Mobile Number" value={user.mobile} onChange={(e) => setUser({ ...user, mobile: e.target.value })} />
          <Input label="Firm / Office Name" value={user.firm} onChange={(e) => setUser({ ...user, firm: e.target.value })} />
        </div>
        <div>
          <Input label="Office Address" value={user.address} onChange={(e) => setUser({ ...user, address: e.target.value })} />
        </div>

        <div className="pt-4 border-t border-[#E5E5E5] flex justify-end">
          <Button variant="primary" onClick={handleSave}>
            Save Profile Changes
          </Button>
        </div>
      </Card>
    </div>
  );
};

export const SupportPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5]">
        <h2 className="text-xl font-extrabold text-black">Priority Help & Technical Support</h2>
        <p className="text-xs text-[#666666] mt-0.5">Contact our CA support desk for statement layout issues or GSTR-1 help.</p>
      </div>

      <Card className="p-6 bg-white space-y-4 text-xs">
        <div className="flex items-center gap-3 p-3 bg-[#F7F7F7] rounded-xl border border-[#E5E5E5]">
          <Mail className="w-5 h-5 text-black" />
          <div>
            <p className="font-bold text-black">Email Support</p>
            <p className="text-[#666666]">support@gstsuite.com (2 Hour SLA)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-[#F7F7F7] rounded-xl border border-[#E5E5E5]">
          <Phone className="w-5 h-5 text-black" />
          <div>
            <p className="font-bold text-black">CA Helpline</p>
            <p className="text-[#666666]">1800-123-GST-SUITE (Mon-Sat 9am - 8pm)</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
