import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Users,
  LayoutDashboard,
  FileText,
  ShoppingCart,
  FolderOpen,
  FileSpreadsheet,
  CreditCard,
  User,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

import { logout } from '../../services/authService';

export const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile sidebar whenever location changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  const storedUserRaw = localStorage.getItem('gst_user');
  const storedUser = storedUserRaw
    ? JSON.parse(storedUserRaw)
    : { name: 'Rajesh Sharma (CA)', email: 'demo@gstsuite.com', user_type: 'CA' };

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, code: '01' },
    { label: 'Client Master', path: '/clients', icon: Users, code: '02' },
    { label: 'GST Audit', path: '/gst-audit', icon: ShieldCheck, code: '03' },
    { label: 'Bank Statement Converter', path: '/dashboard/bank-converter', icon: FileText, code: '04' },
    { label: 'E-Commerce GSTR-1', path: '/dashboard/ecommerce-gstr1', icon: ShoppingCart, code: '05' },
    { label: 'Processed Files', path: '/dashboard/files', icon: FolderOpen, code: '06' },
    { label: 'Reports Output', path: '/dashboard/reports', icon: FileSpreadsheet, code: '07' },
    { label: 'Subscription & Billing', path: '/dashboard/subscription', icon: CreditCard, code: '08' },
    { label: 'Profile Settings', path: '/dashboard/profile', icon: User, code: '09' },
    { label: 'Help Desk', path: '/dashboard/support', icon: HelpCircle, code: '10' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentPathLabel = () => {
    if (location.pathname.startsWith('/clients')) return 'CLIENT MASTER';
    if (location.pathname.startsWith('/gst-audit')) return 'GST AUDIT';
    if (location.pathname === '/dashboard') return 'OVERVIEW';
    return location.pathname.replace('/dashboard/', '').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex text-[#111111]">
      {/* Desktop Sidebar (240px - 260px) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#E5E5E5] sticky top-0 h-screen z-30 shrink-0">
        <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img
              src="/gstrepotis.png"
              alt="GSTRepotis Logo"
              className="h-10 md:h-12 w-auto object-contain py-0.5"
            />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors ${
                  isActive
                    ? 'bg-[#F7F7F7] text-black font-bold border border-[#E5E5E5]'
                    : 'text-[#555555] font-medium hover:bg-[#F7F7F7] hover:text-[#111111]'
                }`}
              >
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-black rounded-r" />}
                <Icon className="w-4 h-4 shrink-0 text-black" />
                <span className="truncate">{item.label}</span>
                <span className="font-mono text-[10px] text-[#888888] ml-auto">{item.code}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-[#E5E5E5] bg-white space-y-3">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-black text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                {storedUser.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-[#111111] truncate">{storedUser.name}</p>
                <p className="font-mono text-[10px] text-[#888888] truncate">
                  {storedUser.user_type || 'CA'} TIER
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-[#555555] hover:text-black hover:bg-[#F7F7F7] rounded-lg cursor-pointer transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSidebarOpen(false);
          }}
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col border-r border-[#E5E5E5] animate-in slide-in-from-left duration-200">
            <div className="p-4 sm:p-5 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
              <Link to="/" onClick={() => setIsSidebarOpen(false)} className="flex items-center">
                <img
                  src="/gstrepotis.png"
                  alt="GSTRepotis Logo"
                  className="h-8 sm:h-9 w-auto object-contain"
                />
              </Link>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg text-[#555555] hover:text-black hover:bg-[#F7F7F7] cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center -mr-1"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === '/dashboard'
                    ? location.pathname === '/dashboard'
                    : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-black text-white font-bold shadow-xs'
                        : 'text-[#444444] hover:bg-[#F7F7F7] hover:text-black'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-black'}`} />
                    <span className="truncate">{item.label}</span>
                    <span
                      className={`font-mono text-[10px] ml-auto ${
                        isActive ? 'text-neutral-300' : 'text-[#888888]'
                      }`}
                    >
                      {item.code}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="p-4 border-t border-[#E5E5E5] bg-[#FAFAFA] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-black text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {storedUser.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-[#111111] truncate">{storedUser.name}</p>
                    <p className="font-mono text-[10px] text-[#888888] truncate">{storedUser.email}</p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-[#DC2626] border-red-200 hover:bg-red-50 hover:border-red-300"
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#E5E5E5] px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 -ml-1.5 rounded-lg text-[#111111] hover:bg-[#F7F7F7] cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs text-[#555555] truncate">
              <span className="hidden sm:inline">WORKSPACE</span>
              <span className="hidden sm:inline">/</span>
              <span className="font-bold text-[#111111] uppercase truncate">
                {currentPathLabel()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg font-mono text-xs">
              <span className="text-[#888888]">SEARCH:</span>
              <span className="font-bold text-[#111111]">Ctrl + K</span>
            </div>
            <Badge
              variant="outline"
              className="bg-[#F7F7F7] border-[#E5E5E5] font-mono text-[10px] sm:text-[11px] font-bold py-1 px-2.5 sm:px-3"
            >
              ⚡ 150 CREDITS
            </Badge>
            <Link to="/dashboard/subscription">
              <Button size="sm" variant="primary" className="text-xs">
                Upgrade
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
