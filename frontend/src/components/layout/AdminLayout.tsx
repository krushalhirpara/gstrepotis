import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  ShieldAlert,
  Users,
  Building2,
  ShoppingCart,
  BookOpen,
  History,
  LogOut,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const location = useLocation();

  const adminNav = [
    { label: 'Admin Dashboard', path: '/admin', icon: ShieldAlert },
    { label: 'User Management', path: '/admin/users', icon: Users },
    { label: 'Bank Master CRUD', path: '/admin/banks', icon: Building2 },
    { label: 'Marketplaces CRUD', path: '/admin/marketplaces', icon: ShoppingCart },
    { label: 'HSN Master Directory', path: '/admin/hsn', icon: BookOpen },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex text-[#111111]">
      <aside className="w-64 bg-black text-white flex flex-col sticky top-0 h-screen z-30">
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <span className="font-extrabold text-base tracking-tight text-white">GST SUITE</span>
            <span className="block text-[9px] text-neutral-400 tracking-widest uppercase font-bold">Admin Console</span>
          </div>
          <Badge variant="error" size="sm">
            Admin Mode
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-white text-black shadow-xs'
                    : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-neutral-800">
          <Button
            variant="outline"
            className="w-full text-[#DC2626] border-neutral-800 hover:bg-red-950/20"
            leftIcon={<LogOut className="w-4 h-4" />}
            onClick={() => {
              localStorage.removeItem('gst_token');
              localStorage.removeItem('gst_user');
              localStorage.removeItem('gst_admin_authenticated');
              window.location.href = '/ceoadmin';
            }}
          >
            Logout Admin
          </Button>
        </div>
      </aside>

      <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </div>
    </div>
  );
};
