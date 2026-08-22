import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Download } from 'lucide-react';

export const SubscriptionPage: React.FC = () => {
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('business');

  const plans = [
    { slug: 'professional', name: 'Professional', price: '₹999/mo', bankLimit: 200, ecomLimit: 100 },
    { slug: 'business', name: 'Business', price: '₹2,499/mo', bankLimit: 1000, ecomLimit: 500 },
    { slug: 'enterprise', name: 'Enterprise', price: '₹4,999/mo', bankLimit: 'Unlimited', ecomLimit: 'Unlimited' },
  ];

  const handleRazorpayPayment = () => {
    fetch('/api/subscription/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_slug: selectedPlan, billing_cycle: 'monthly' }),
    })
      .then((res) => res.json())
      .then((data) => {
        alert(`Razorpay Order Created: ${data.order_id}\nAmount: ₹${data.amount / 100}\nKey ID: ${data.key_id}`);
        setIsUpgradeOpen(false);
      });
  };

  const billingHistory = [
    { id: 'PAY-904821', date: '2026-08-15', amount: '₹999.00', status: 'Success', method: 'Razorpay (UPI)' },
    { id: 'PAY-810294', date: '2026-07-15', amount: '₹999.00', status: 'Success', method: 'Razorpay (Card)' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E5E5] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-black">Subscription & Usage Meter</h2>
          <p className="text-xs text-[#666666] mt-0.5">Manage your active plan, usage limits, and Razorpay billing.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsUpgradeOpen(true)}>
          Upgrade Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-6 bg-white">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#666666]">Active Subscription</p>
              <h3 className="text-xl font-extrabold text-black mt-1">Professional Plan</h3>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <p className="text-xs text-[#666666]">Renews on Sep 15, 2026 • ₹999/mo</p>
        </Card>

        <Card className="p-6 bg-white">
          <p className="text-xs font-bold uppercase tracking-wider text-[#666666] mb-1">Bank Conversions</p>
          <div className="flex justify-between text-xs font-bold text-black mb-1">
            <span>38 used</span>
            <span>200 limit</span>
          </div>
          <div className="w-full bg-[#F7F7F7] h-2 rounded-full overflow-hidden border border-[#E5E5E5]">
            <div className="bg-black h-full w-[19%]" />
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <p className="text-xs font-bold uppercase tracking-wider text-[#666666] mb-1">E-Commerce Reports</p>
          <div className="flex justify-between text-xs font-bold text-black mb-1">
            <span>14 used</span>
            <span>100 limit</span>
          </div>
          <div className="w-full bg-[#F7F7F7] h-2 rounded-full overflow-hidden border border-[#E5E5E5]">
            <div className="bg-black h-full w-[14%]" />
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-white">
        <h3 className="text-base font-bold text-black mb-4">Billing Invoices History</h3>
        <DataTable
          columns={[
            { key: 'id', header: 'Payment ID' },
            { key: 'date', header: 'Date' },
            { key: 'amount', header: 'Amount' },
            { key: 'method', header: 'Payment Method' },
            { key: 'status', header: 'Status', render: (r) => <Badge variant="success">{r.status}</Badge> },
          ]}
          data={billingHistory}
          actions={() => (
            <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
              Invoice PDF
            </Button>
          )}
        />
      </Card>

      <Modal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        title="Upgrade Your Subscription Plan"
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsUpgradeOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleRazorpayPayment}>Pay via Razorpay</Button>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-3">
          {plans.map((p) => (
            <div
              key={p.slug}
              onClick={() => setSelectedPlan(p.slug)}
              className={`p-4 border rounded-xl cursor-pointer text-center transition-all ${
                selectedPlan === p.slug ? 'border-black bg-neutral-50 ring-2 ring-black' : 'border-[#E5E5E5]'
              }`}
            >
              <h4 className="font-bold text-sm text-black">{p.name}</h4>
              <p className="text-xs font-extrabold text-black mt-1">{p.price}</p>
              <p className="text-[10px] text-[#666666] mt-2">{p.bankLimit} Bank / {p.ecomLimit} Reports</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
