import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Modal';
import { ChevronDown, Menu, ArrowRight } from 'lucide-react';
import { logout } from '../../services/authService';

export const Header: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const location = useLocation();

  const token = localStorage.getItem('gst_token');
  const storedUserRaw = localStorage.getItem('gst_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const isLoggedIn = !!token && !!user;

  const handleLogout = async () => {
    setIsUserDropdownOpen(false);
    await logout();
    window.location.href = '/login';
  };

  const isDashboard = ['/dashboard', '/admin', '/pdftotally', '/clients', '/gst-audit'].some(path => location.pathname.startsWith(path));

  if (isDashboard) return null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E5E5] transition-all h-16 sm:h-20 flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
        {/* Logo Left */}
        <Link to="/" className="flex items-center group">
          <img src="/gstrepotis.png" alt="GSTRepotis Logo" className="h-8 md:h-[38px] w-auto object-contain drop-shadow-xs transition-transform hover:scale-105" />
        </Link>

        {/* Navigation Center */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#111111]">
          {/* Products Dropdown */}
          <div className="relative" onMouseEnter={() => setIsProductsOpen(true)} onMouseLeave={() => setIsProductsOpen(false)}>
            <button className="flex items-center gap-1.5 hover:text-black py-2 cursor-pointer transition-colors font-medium text-xs tracking-tight">
              Products <ChevronDown className="w-3.5 h-3.5 text-[#555555]" />
            </button>
            {isProductsOpen && (
              <div className="absolute top-full left-0 w-80 bg-white border border-[#E5E5E5] rounded-xl shadow-xl p-2 animate-in fade-in duration-150 z-50">
                <Link
                  to="/bank-statement-to-tally"
                  className="block p-2.5 rounded-lg hover:bg-[#F7F7F7] transition-colors"
                >
                  <p className="font-mono text-[10px] text-[#555555] uppercase tracking-wider font-bold mb-0.5">BANK CONVERTER / 01</p>
                  <p className="text-xs font-bold text-[#111111]">Bank Statement to Tally</p>
                  <p className="text-[11px] text-[#555555] mt-0.5">18+ Indian Banks & Direct Tally XML</p>
                </Link>
                <Link
                  to="/gstr-2b-reconciliation"
                  className="block p-2.5 rounded-lg hover:bg-[#F7F7F7] transition-colors mt-0.5"
                >
                  <p className="font-mono text-[10px] text-[#555555] uppercase tracking-wider font-bold mb-0.5">ITC OPTIMIZATION / 02</p>
                  <p className="text-xs font-bold text-[#111111]">GSTR-2B Reconciliation</p>
                  <p className="text-[11px] text-[#555555] mt-0.5">Purchase register vs 2B matching</p>
                </Link>
                <Link
                  to="/gstr-1-software"
                  className="block p-2.5 rounded-lg hover:bg-[#F7F7F7] transition-colors mt-0.5"
                >
                  <p className="font-mono text-[10px] text-[#555555] uppercase tracking-wider font-bold mb-0.5">OUTWARD SUPPLIES / 03</p>
                  <p className="text-xs font-bold text-[#111111]">GSTR-1 Software</p>
                  <p className="text-[11px] text-[#555555] mt-0.5">Marketplace sales to GST JSON</p>
                </Link>
                <Link
                  to="/gst-audit-software"
                  className="block p-2.5 rounded-lg hover:bg-[#F7F7F7] transition-colors mt-0.5"
                >
                  <p className="font-mono text-[10px] text-[#555555] uppercase tracking-wider font-bold mb-0.5">AUDIT WORKSPACE / 04</p>
                  <p className="text-xs font-bold text-[#111111]">GST Audit Software</p>
                  <p className="text-[11px] text-[#555555] mt-0.5">Working papers & compliance review</p>
                </Link>
              </div>
            )}
          </div>

          {/* Solutions Dropdown */}
          <div className="relative" onMouseEnter={() => setIsSolutionsOpen(true)} onMouseLeave={() => setIsSolutionsOpen(false)}>
            <button className="flex items-center gap-1.5 hover:text-black py-2 cursor-pointer transition-colors font-medium text-xs tracking-tight">
              Solutions <ChevronDown className="w-3.5 h-3.5 text-[#555555]" />
            </button>
            {isSolutionsOpen && (
              <div className="absolute top-full left-0 w-72 bg-white border border-[#E5E5E5] rounded-xl shadow-xl p-2 animate-in fade-in duration-150 z-50">
                <Link
                  to="/gst-software-for-ca"
                  className="block p-2.5 rounded-lg hover:bg-[#F7F7F7] transition-colors"
                >
                  <p className="text-xs font-bold text-[#111111]">For CA Firms</p>
                  <p className="text-[11px] text-[#555555] mt-0.5">Manage multi-client GST compliance</p>
                </Link>
                <Link
                  to="/gst-software-for-accountants"
                  className="block p-2.5 rounded-lg hover:bg-[#F7F7F7] transition-colors mt-0.5"
                >
                  <p className="text-xs font-bold text-[#111111]">For Accountants</p>
                  <p className="text-[11px] text-[#555555] mt-0.5">Speed up bank conversion & returns</p>
                </Link>
                <Link
                  to="/gst-software-for-business"
                  className="block p-2.5 rounded-lg hover:bg-[#F7F7F7] transition-colors mt-0.5"
                >
                  <p className="text-xs font-bold text-[#111111]">For Businesses & SMEs</p>
                  <p className="text-[11px] text-[#555555] mt-0.5">Protect ITC and automate Tally</p>
                </Link>
              </div>
            )}
          </div>

          <Link to="/gst-reconciliation" className="hover:text-black transition-colors text-xs font-medium tracking-tight">
            Reconciliation
          </Link>
          <Link to="/pricing" className="hover:text-black transition-colors text-xs font-medium tracking-tight">
            Pricing
          </Link>
          <Link to="/blog" className="hover:text-black transition-colors text-xs font-medium tracking-tight">
            Blog & Guides
          </Link>
          <Link to="/about" className="hover:text-black transition-colors text-xs font-medium tracking-tight">
            About
          </Link>
        </nav>

        {/* Actions Right */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <div className="relative flex items-center">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 mr-2 cursor-pointer hover:opacity-85 transition-opacity py-2 focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-lg bg-black text-white font-mono font-bold text-xs flex items-center justify-center">
                    {user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-[#111111]">{user.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#555555] transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isUserDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E5E5E5] rounded-xl shadow-xl p-2 z-50 animate-in fade-in duration-150">
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="block w-full text-left px-3 py-2 text-xs font-semibold text-[#111111] hover:bg-[#F7F7F7] rounded-lg transition-colors"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-3 py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors mt-0.5 cursor-pointer"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
              <Link to="/dashboard">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <Link to="/login">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Sign In
              </Button>
            </Link>
          )}
        </div>

        <button
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden p-2 rounded-lg text-[#111111] hover:bg-[#F7F7F7] cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center -mr-1"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <Drawer isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} title="NAVIGATION">
        <div className="flex flex-col gap-2.5 text-xs font-mono font-medium">
          <Link
            to="/gst-software"
            onClick={() => setIsMobileOpen(false)}
            className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl font-bold text-[#111111] hover:bg-neutral-100 transition-colors"
          >
            01 / GST SOFTWARE OVERVIEW
          </Link>
          <Link
            to="/bank-statement-to-tally"
            onClick={() => setIsMobileOpen(false)}
            className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl font-bold text-[#111111] hover:bg-neutral-100 transition-colors"
          >
            02 / BANK STATEMENT CONVERTER
          </Link>
          <Link
            to="/gstr-2b-reconciliation"
            onClick={() => setIsMobileOpen(false)}
            className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl font-bold text-[#111111] hover:bg-neutral-100 transition-colors"
          >
            03 / GSTR-2B RECONCILIATION
          </Link>
          <Link
            to="/gst-audit-software"
            onClick={() => setIsMobileOpen(false)}
            className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl font-bold text-[#111111] hover:bg-neutral-100 transition-colors"
          >
            04 / GST AUDIT SOFTWARE
          </Link>
          <Link to="/pricing" onClick={() => setIsMobileOpen(false)} className="py-3 px-1 border-b border-[#E5E5E5] font-bold text-[#111111]">
            05 / PRICING & PLANS
          </Link>
          <Link to="/blog" onClick={() => setIsMobileOpen(false)} className="py-3 px-1 border-b border-[#E5E5E5] font-bold text-[#111111]">
            06 / BLOG & GUIDES
          </Link>
          <Link to="/about" onClick={() => setIsMobileOpen(false)} className="py-3 px-1 border-b border-[#E5E5E5] font-bold text-[#111111]">
            07 / ABOUT GSTREPOTIS
          </Link>
          <Link to="/contact" onClick={() => setIsMobileOpen(false)} className="py-3 px-1 border-b border-[#E5E5E5] font-bold text-[#111111]">
            08 / CONTACT SUPPORT
          </Link>

          <div className="pt-4 flex flex-col gap-3">
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-3 p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-xl mb-1">
                  <div className="w-10 h-10 rounded-lg bg-black text-white font-mono font-bold text-sm flex items-center justify-center shrink-0">
                    {user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-[#111111] truncate">{user.name}</p>
                    <p className="text-xs text-[#555555] truncate">{user.email}</p>
                  </div>
                </div>
                <Link to="/dashboard" onClick={() => setIsMobileOpen(false)}>
                  <Button variant="primary" className="w-full py-3">
                    Go to Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsMobileOpen(false)}>
                <Button variant="primary" className="w-full py-3">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Drawer>
    </header>
  );
};

export const Footer: React.FC = () => {
  const location = useLocation();
  const isDashboard = ['/dashboard', '/admin', '/pdftotally', '/clients', '/gst-audit'].some(path => location.pathname.startsWith(path));
  if (isDashboard) return null;

  return (
    <footer className="bg-white border-t border-[#E5E5E5] pt-16 pb-12 text-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <img src="/gstrepotis.png" alt="GSTRepotis Logo" className="h-9 w-auto object-contain" />
            </div>
            <p className="text-xs text-[#555555] leading-relaxed max-w-sm">
              All-in-one GST compliance and accounting automation software built for Indian Chartered Accountants, tax practitioners, and growing businesses.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-[#555555] bg-[#F7F7F7] border border-[#E5E5E5] px-3 py-1.5 rounded-lg w-fit">
              TALLY PRIME READY • SECTION 16(2)(AA) COMPLIANT
            </div>
          </div>

          {/* Product Col */}
          <div>
            <h4 className="tech-label mb-4">PRODUCT</h4>
            <ul className="space-y-2.5 text-xs text-[#555555]">
              <li>
                <Link to="/gst-software" className="hover:text-black transition-colors">
                  GST Software
                </Link>
              </li>
              <li>
                <Link to="/gst-reconciliation" className="hover:text-black transition-colors">
                  GST Reconciliation
                </Link>
              </li>
              <li>
                <Link to="/gstr-1-software" className="hover:text-black transition-colors">
                  GSTR-1 Software
                </Link>
              </li>
              <li>
                <Link to="/gstr-3b-software" className="hover:text-black transition-colors">
                  GSTR-3B Software
                </Link>
              </li>
              <li>
                <Link to="/gstr-2b-reconciliation" className="hover:text-black transition-colors">
                  GSTR-2B Reconciliation
                </Link>
              </li>
              <li>
                <Link to="/gst-audit-software" className="hover:text-black transition-colors">
                  GST Audit Software
                </Link>
              </li>
              <li>
                <Link to="/bank-statement-to-tally" className="hover:text-black transition-colors">
                  Bank Statement to Tally
                </Link>
              </li>
              <li>
                <Link to="/tally-integration" className="hover:text-black transition-colors">
                  Tally Integration
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Col */}
          <div>
            <h4 className="tech-label mb-4">COMPANY</h4>
            <ul className="space-y-2.5 text-xs text-[#555555]">
              <li>
                <Link to="/about" className="hover:text-black transition-colors">
                  About GSTRepotis
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-black transition-colors">
                  Pricing & Plans
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-black transition-colors">
                  Tax & GST Blog
                </Link>
              </li>
              <li>
                <Link to="/tutorials" className="hover:text-black transition-colors">
                  Tutorials & Guides
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-black transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link to="/request-demo" className="hover:text-black transition-colors">
                  Request Live Demo
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Col */}
          <div>
            <h4 className="tech-label mb-4">LEGAL</h4>
            <ul className="space-y-2.5 text-xs text-[#555555]">
              <li>
                <Link to="/privacy-policy" className="hover:text-black transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-and-conditions" className="hover:text-black transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="hover:text-black transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" className="hover:text-black transition-colors">
                  Legal Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between text-xs text-[#555555] gap-4 font-mono">
          <p>© {new Date().getFullYear()} GSTRepotis. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[#888888]">
            <span>BANK PARSER v2.4</span>
            <span>|</span>
            <span>GSTR SCHEMA 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
