import React, { useState, useEffect } from 'react';
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
  Tag,
  Menu,
  X,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // Auto close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile admin drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const adminNav = [
    { label: 'Admin Dashboard', path: '/admin', icon: ShieldAlert },
    { label: 'Pricing Enquiries', path: '/admin/pricing-enquiries', icon: Tag },
    { label: 'User Management', path: '/admin/users', icon: Users },
    { label: 'Bank Master CRUD', path: '/admin/banks', icon: Building2 },
    { label: 'Marketplaces CRUD', path: '/admin/marketplaces', icon: ShoppingCart },
    { label: 'HSN Master Directory', path: '/admin/hsn', icon: BookOpen },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: History },
  ];

  const handleLogout = () => {
    localStorage.removeItem('gst_token');
    localStorage.removeItem('gst_user');
    localStorage.removeItem('gst_admin_authenticated');
    window.location.href = '/ceoadmin';
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col lg:flex-row text-[#111111]">
      {/* Mobile Admin Header */}
      <header className="lg:hidden h-16 bg-black text-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 -ml-1.5 text-white hover:bg-neutral-800 rounded-lg cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Toggle admin navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white block">GST SUITE</span>
            <span className="text-[9px] text-neutral-400 tracking-widest uppercase font-bold block -mt-0.5">
              Admin Console
            </span>
          </div>
        </div>
        <Badge variant="error" size="sm">
          Admin Mode
        </Badge>
      </header>

      {/* Desktop Sidebar (w-64) */}
      <aside className="hidden lg:flex w-64 bg-black text-white flex-col sticky top-0 h-screen z-30 shrink-0">
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
            const isActive =
              item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-white text-black shadow-xs font-bold'
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
            onClick={handleLogout}
          >
            Logout Admin
          </Button>
        </div>
      </aside>

      {/* Mobile Off-Canvas Drawer */}
      {isMobileOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileOpen(false);
          }}
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-72 max-w-[85vw] bg-black text-white h-full shadow-2xl flex flex-col border-r border-neutral-800 animate-in slide-in-from-left duration-200">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <span className="font-extrabold text-base tracking-tight text-white block">GST SUITE</span>
                <span className="text-[9px] text-neutral-400 tracking-widest uppercase font-bold block">
                  Admin Console
                </span>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-lg cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center -mr-1"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === '/admin'
                    ? location.pathname === '/admin'
                    : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-white text-black shadow-xs font-bold'
                        : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
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
                onClick={handleLogout}
              >
                Logout Admin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content View */}
      <div className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
        <Outlet />
      </div>
    </div>
  );
};
