import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, FileText, ArrowRight } from 'lucide-react';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [_isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Retrieve authenticated user info
  const storedUserRaw = localStorage.getItem('gst_user');
  const user = storedUserRaw ? JSON.parse(storedUserRaw) : { name: 'User', email: '' };

  const userName = user.name || 'User';

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

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col text-[#111111]">

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
                  Client Management & GSTR-1
                </h3>

                <p className="text-xs sm:text-sm text-[#555555] leading-relaxed mb-8">
                  Manage GST client records, filing frequencies, and e-commerce seller GSTR-1 reporting workflows. Automatically import Amazon, Flipkart, TCS, and Section 9(5) marketplace reports.
                </p>
              </div>

              <div className="pt-6 border-t border-[#E5E5E5] flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Open Client Database <ArrowRight className="w-4 h-4" />
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
