import React, { useState } from 'react';
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
} from 'lucide-react';

import { logout } from '../../services/authService';

export const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const storedUserRaw = localStorage.getItem('gst_user');
  const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : { name: "Rajesh Sharma (CA)", email: "demo@gstsuite.com", user_type: "CA" };

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, code: '01' },
    { label: 'Client Master', path: '/clients', icon: Users, code: '02' },
    { label: 'Bank Statement Converter', path: '/dashboard/bank-converter', icon: FileText, code: '03' },
    { label: 'E-Commerce GSTR-1', path: '/dashboard/ecommerce-gstr1', icon: ShoppingCart, code: '04' },
    { label: 'Processed Files', path: '/dashboard/files', icon: FolderOpen, code: '05' },
    { label: 'Reports Output', path: '/dashboard/reports', icon: FileSpreadsheet, code: '06' },
    { label: 'Subscription & Billing', path: '/dashboard/subscription', icon: CreditCard, code: '07' },
    { label: 'Profile Settings', path: '/dashboard/profile', icon: User, code: '08' },
    { label: 'Help Desk', path: '/dashboard/support', icon: HelpCircle, code: '09' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/sign-in');
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex text-[#111111]">
      {/* Desktop Sidebar (240px - 260px) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#E5E5E5] sticky top-0 h-screen z-30">
        <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/gstrepotis.png" alt="GST Suite Logo" className="h-10 md:h-12 w-auto object-contain py-0.5" />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

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
              <div className="w-7 h-7 rounded bg-black text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                {storedUser.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-[#111111] truncate">{storedUser.name}</p>
                <p className="font-mono text-[10px] text-[#888888] truncate">{storedUser.user_type} TIER</p>
              </div>
            </div>
            <button onClick={handleLogout} title="Sign Out" className="p-1.5 text-[#555555] hover:text-black cursor-pointer">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#E5E5E5] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-[#111111] hover:bg-[#F7F7F7]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 font-mono text-xs text-[#555555]">
              <span>WORKSPACE</span>
              <span>/</span>
              <span className="font-bold text-[#111111] uppercase">{location.pathname.replace('/dashboard/', '').replace('/dashboard', 'OVERVIEW')}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg font-mono text-xs">
              <span className="text-[#888888]">SEARCH:</span>
              <span className="font-bold text-[#111111]">Ctrl + K</span>
            </div>
            <Badge variant="outline" className="bg-[#F7F7F7] border-[#E5E5E5] font-mono text-[11px] font-bold py-1 px-3">
              ⚡ 150 CREDITS
            </Badge>
            <Link to="/dashboard/subscription">
              <Button size="sm" variant="primary">
                Upgrade
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
