import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Modal';
import { ChevronDown, Menu, ArrowRight } from 'lucide-react';
import { logout } from '../../services/authService';

export const Header: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const location = useLocation();

  const token = localStorage.getItem('gst_token');
  const storedUserRaw = localStorage.getItem('gst_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : null;
  const isLoggedIn = !!token && !!user;

  const handleLogout = async () => {
    setIsUserDropdownOpen(false);
    await logout();
    window.location.href = '/sign-in';
  };

  const isDashboard = ['/dashboard', '/admin', '/pdftotally', '/clients'].some(path => location.pathname.startsWith(path));

  if (isDashboard) return null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E5E5] transition-all h-20 flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
        {/* Logo Left */}
        <Link to="/" className="flex items-center group">
          <img src="/gstrepotis.png" alt="GST Suite Logo" className="h-8 md:h-[38px] w-auto object-contain drop-shadow-xs transition-transform hover:scale-105" />
        </Link>

        {/* Navigation Center */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#111111]">
          <div className="relative" onMouseEnter={() => setIsProductsOpen(true)} onMouseLeave={() => setIsProductsOpen(false)}>
            <button className="flex items-center gap-1.5 hover:text-black py-2 cursor-pointer transition-colors font-medium text-xs tracking-tight">
              Products <ChevronDown className="w-3.5 h-3.5 text-[#555555]" />
            </button>
            {isProductsOpen && (
              <div className="absolute top-full left-0 w-72 bg-white border border-[#E5E5E5] rounded-xl shadow-xl p-2 animate-in fade-in duration-150">
                <Link
                  to="/products/bank-statement-converter"
                  className="block p-3 rounded-lg hover:bg-[#F7F7F7] transition-colors"
                >
                  <p className="font-mono text-[10px] text-[#555555] uppercase tracking-wider font-bold mb-0.5">BANK STATEMENT / 01</p>
                  <p className="text-xs font-bold text-[#111111]">PDF to Excel & Tally XML</p>
                  <p className="text-[11px] text-[#555555] mt-0.5">18+ Indian Banks & Password PDF</p>
                </Link>
                <Link
                  to="/products/ecommerce-gstr1"
                  className="block p-3 rounded-lg hover:bg-[#F7F7F7] transition-colors mt-1"
                >
                  <p className="font-mono text-[10px] text-[#555555] uppercase tracking-wider font-bold mb-0.5">GSTR-1 ENGINE / 02</p>
                  <p className="text-xs font-bold text-[#111111]">Marketplace Sales to GST JSON</p>
                  <p className="text-[11px] text-[#555555] mt-0.5">Amazon, Flipkart, TCS & Sec 9(5)</p>
                </Link>
              </div>
            )}
          </div>
          <Link to="/products/ecommerce-gstr1" className="hover:text-black transition-colors text-xs font-medium tracking-tight">
            Solutions
          </Link>
          <Link to="/#how-it-works" className="hover:text-black transition-colors text-xs font-medium tracking-tight">
            How It Works
          </Link>
          <Link to="/pricing" className="hover:text-black transition-colors text-xs font-medium tracking-tight">
            Pricing
          </Link>
          <Link to="/tutorials" className="hover:text-black transition-colors text-xs font-medium tracking-tight">
            Resources
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
                  <div className="w-8 h-8 rounded bg-black text-white font-mono font-bold text-xs flex items-center justify-center">
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
            <>
              <Link to="/sign-in">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/sign-up">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Start Free
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden p-2 rounded-lg text-[#111111] hover:bg-[#F7F7F7] cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <Drawer isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} title="NAVIGATION">
        <div className="flex flex-col gap-4 text-xs font-mono font-medium">
          <Link
            to="/products/bank-statement-converter"
            onClick={() => setIsMobileOpen(false)}
            className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg font-bold text-[#111111]"
          >
            01 / BANK STATEMENT CONVERTER
          </Link>
          <Link
            to="/products/ecommerce-gstr1"
            onClick={() => setIsMobileOpen(false)}
            className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg font-bold text-[#111111]"
          >
            02 / E-COMMERCE GSTR-1 ENGINE
          </Link>
          <Link to="/pricing" onClick={() => setIsMobileOpen(false)} className="py-2.5 border-b border-[#E5E5E5] font-bold">
            03 / PRICING & PLANS
          </Link>
          <Link to="/tutorials" onClick={() => setIsMobileOpen(false)} className="py-2.5 border-b border-[#E5E5E5] font-bold">
            04 / TUTORIALS & RESOURCES
          </Link>
          <Link to="/about" onClick={() => setIsMobileOpen(false)} className="py-2.5 border-b border-[#E5E5E5] font-bold">
            05 / ABOUT GST SUITE
          </Link>

          <div className="pt-6 flex flex-col gap-3">
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-3 p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg mb-2">
                  <div className="w-10 h-10 rounded bg-black text-white font-mono font-bold text-sm flex items-center justify-center shrink-0">
                    {user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-[#111111] truncate">{user.name}</p>
                    <p className="text-xs text-[#555555] truncate">{user.email}</p>
                  </div>
                </div>
                <Link to="/dashboard" onClick={() => setIsMobileOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/sign-in" onClick={() => setIsMobileOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/sign-up" onClick={() => setIsMobileOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Start Free Trial
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </Drawer>
    </header>
  );
};

export const Footer: React.FC = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin')) return null;

  return (
    <footer className="bg-white border-t border-[#E5E5E5] pt-16 pb-12 text-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <img src="/gstrepotis.png" alt="GST Suite Logo" className="h-9 w-auto object-contain" />
            </div>
            <p className="text-xs text-[#555555] leading-relaxed max-w-sm">
              Professional financial accounting infrastructure for Indian Chartered Accountants, tax professionals, and e-commerce merchants.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-[#555555] bg-[#F7F7F7] border border-[#E5E5E5] px-3 py-1.5 rounded-lg w-fit">
              ISO 27001 ENCRYPTION • TALLY PRIME READY
            </div>
          </div>

          <div>
            <h4 className="tech-label mb-4">PRODUCTS</h4>
            <ul className="space-y-2.5 text-xs text-[#555555]">
              <li>
                <Link to="/products/bank-statement-converter" className="hover:text-black transition-colors">
                  Bank Converter
                </Link>
              </li>
              <li>
                <Link to="/products/ecommerce-gstr1" className="hover:text-black transition-colors">
                  E-Commerce GSTR-1
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-black transition-colors">
                  Tally XML Engine
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-black transition-colors">
                  TCS Reconciliation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="tech-label mb-4">COMPANY</h4>
            <ul className="space-y-2.5 text-xs text-[#555555]">
              <li>
                <Link to="/about" className="hover:text-black transition-colors">
                  About Infrastructure
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

          <div>
            <h4 className="tech-label mb-4">LEGAL & SAFETY</h4>
            <ul className="space-y-2.5 text-xs text-[#555555]">
              <li>
                <Link to="/terms" className="hover:text-black transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-black transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="hover:text-black transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between text-xs text-[#555555] gap-4 font-mono">
          <p>© {new Date().getFullYear()} GST Suite Infrastructure. Light Theme Only.</p>
          <div className="flex items-center gap-4 text-[#888888]">
            <span>PDF ENGINE v2.4</span>
            <span>|</span>
            <span>GSTR-1 JSON SCHEMA 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
