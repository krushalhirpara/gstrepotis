import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, FileText, ArrowRight, User, LogOut, Settings, ChevronDown, CheckCircle2 } from 'lucide-react';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Retrieve authenticated user info
  const storedUserRaw = localStorage.getItem('gst_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : { name: 'User', email: '' };

  const userName = user.name || 'User';
  const userEmail = user.email || '';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('gst_token') || ''}`,
      },
    }).catch(() => {});

    localStorage.removeItem('gst_token');
    localStorage.removeItem('gst_user');
    navigate('/sign-in');
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col text-[#111111]">
      {/* 1. TOP HEADER */}
      <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-40 h-20 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
          <Link to="/welcome" className="flex items-center">
            <img src="/gstrepotis.png" alt="GST Suite Logo" className="h-12 w-auto object-contain py-1" />
          </Link>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] hover:bg-[#F0F0F0] text-xs font-bold text-[#111111] transition-all cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-mono text-[10px]">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[140px]">{userName}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#555555] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E5E5E5] rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-[#E5E5E5] bg-[#FAFAFA] rounded-xl mb-1">
                  <p className="font-bold text-xs text-[#111111] truncate">{userName}</p>
                  <p className="font-mono text-[11px] text-[#666666] truncate mt-0.5">{userEmail}</p>
                  <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-mono font-bold uppercase">
                    <CheckCircle2 className="w-3 h-3 text-green-600" /> Account Active
                  </span>
                </div>

                <div className="space-y-0.5 text-xs font-medium">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/dashboard/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#111111] hover:bg-[#F7F7F7] transition-colors cursor-pointer text-left"
                  >
                    <User className="w-4 h-4 text-[#555555]" />
                    <span>My Account</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/dashboard/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#111111] hover:bg-[#F7F7F7] transition-colors cursor-pointer text-left"
                  >
                    <Settings className="w-4 h-4 text-[#555555]" />
                    <span>Settings</span>
                  </button>

                  <div className="pt-1 mt-1 border-t border-[#E5E5E5]">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer text-left font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1150px] mx-auto">
          {/* Welcome Heading */}
          <div className="text-center mb-12 sm:mb-16">
            <span className="font-mono text-xs text-[#666666] uppercase tracking-widest font-bold block mb-3">
              POST-LOGIN WORKSPACE / PRODUCT SELECTION
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#111111] tracking-tight">
              Welcome To GST Suite, {userName}! 🎉
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#555555] max-w-xl mx-auto font-normal">
              Select a product below to launch your automated accounting, bank statement conversion, or GSTR-1 filing workflow.
            </p>
          </div>

          {/* Product Cards (Exactly 2 Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {/* CARD 1: File Ecommerce seller's GSTR-1 */}
            <div
              onClick={() => navigate('/clients')}
              className="group relative bg-white border border-[#E5E5E5] rounded-2xl p-8 shadow-sm hover:shadow-xl hover:border-black transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center shadow-md">
                    <ShoppingCart className="w-7 h-7" />
                  </div>
                  <span className="font-mono text-[10px] font-extrabold uppercase px-3 py-1 bg-[#FAFAFA] border border-[#E5E5E5] text-[#555555] rounded-full tracking-wider">
                    MODULE 01
                  </span>
                </div>

                <h3 className="text-2xl font-extrabold text-[#111111] tracking-tight mb-3 group-hover:text-black transition-colors">
                  File Ecommerce seller's GSTR-1
                </h3>

                <p className="text-xs sm:text-sm text-[#555555] leading-relaxed mb-8">
                  Manage e-commerce seller GSTR-1 reporting and filing workflows. Automatically import Amazon, Flipkart, TCS, and Section 9(5) marketplace reports directly into GST JSON format.
                </p>
              </div>

              <div className="pt-6 border-t border-[#E5E5E5] flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Open GSTR-1 <ArrowRight className="w-4 h-4" />
                </span>
                <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* CARD 2: PDF Bank Statement To Tally XML and CSV */}
            <div
              onClick={() => navigate('/pdftotally')}
              className="group relative bg-white border border-[#E5E5E5] rounded-2xl p-8 shadow-sm hover:shadow-xl hover:border-black transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center shadow-md">
                    <FileText className="w-7 h-7" />
                  </div>
                  <span className="font-mono text-[10px] font-extrabold uppercase px-3 py-1 bg-[#FAFAFA] border border-[#E5E5E5] text-[#555555] rounded-full tracking-wider">
                    MODULE 02
                  </span>
                </div>

                <h3 className="text-2xl font-extrabold text-[#111111] tracking-tight mb-3 group-hover:text-black transition-colors">
                  PDF Bank Statement To Tally XML and CSV
                </h3>

                <p className="text-xs sm:text-sm text-[#555555] leading-relaxed mb-8">
                  Convert bank statement PDFs into structured CSV and Tally XML data. Supports 18+ Indian banks, multi-page PDFs, and password-protected bank statements.
                </p>
              </div>

              <div className="pt-6 border-t border-[#E5E5E5] flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Open Bank Statement Converter <ArrowRight className="w-4 h-4" />
                </span>
                <div className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. SIMPLE FOOTER */}
      <footer className="bg-white border-t border-[#E5E5E5] py-6 text-center text-xs font-mono text-[#666666]">
        © {new Date().getFullYear()} GST Suite Infrastructure. Professional Financial Automation Platform.
      </footer>
    </div>
  );
};
