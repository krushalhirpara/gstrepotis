import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AlertCircle, User, Phone, CheckCircle2 } from 'lucide-react';
import { completeUserProfile, getLocalUser } from '../../services/authService';
import { extract10DigitIndianMobile } from './AuthPages';

export const CompleteProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [mobileTouched, setMobileTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Prepopulate from existing local user if present
  useEffect(() => {
    const user = getLocalUser();
    if (!user) {
      navigate('/sign-in', { replace: true });
      return;
    }

    if (user.mobile && user.mobile.trim()) {
      // User already has mobile completed, redirect to welcome
      navigate('/welcome', { replace: true });
      return;
    }

    if (user.name && user.name !== 'User') {
      setName(user.name);
    }
  }, [navigate]);

  const trimmedName = name.trim();
  const isNameValid = trimmedName.length >= 2 && trimmedName.length <= 100;
  const mobileParsed = extract10DigitIndianMobile(mobile);
  const isMobileValid = mobileParsed.isValid;
  const isFormValid = isNameValid && isMobileValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    setError('');
    setIsLoading(true);

    try {
      await completeUserProfile({
        name: trimmedName,
        mobile: mobileParsed.canonical,
      });
      setIsLoading(false);
      navigate('/welcome', { replace: true });
    } catch (err: any) {
      setIsLoading(false);
      console.error('Profile completion error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.mobile?.[0] ||
        err?.response?.data?.errors?.name?.[0] ||
        err?.message ||
        'Could not save profile details. Please try again.';
      setError(msg);
    }
  };

  return (
    <div className="bg-[#F7F7F7] min-h-[82vh] flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-xl border border-[#E5E5E5] rounded-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="/gstrepotis.png"
            alt="GST Repotis Logo"
            className="h-10 w-auto object-contain mx-auto mb-3"
          />
          <span className="tech-label block mb-1">ACCOUNT ONBOARDING</span>
          <h2 className="text-2xl font-extrabold text-[#111111] tracking-tight">
            Complete Your Profile
          </h2>
          <p className="text-xs text-[#555555] mt-1.5 max-w-xs mx-auto leading-relaxed">
            Please provide your Full Name and Mobile Number to access your GST workspaces.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-xs text-[#DC2626] rounded-xl mb-5 flex items-start gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name Input */}
          <div>
            <label htmlFor="profile-fullname" className="block text-xs font-bold text-[#222222] mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="profile-fullname"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                onBlur={() => setNameTouched(true)}
                placeholder="Enter your full name"
                disabled={isLoading}
                className={`w-full pl-10 pr-4 py-2.5 text-sm bg-white border ${
                  nameTouched && !isNameValid
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-[#D1D5DB] focus:border-black focus:ring-black'
                } rounded-xl shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 transition-colors`}
              />
            </div>
            {nameTouched && !isNameValid && (
              <p className="text-[11px] text-red-600 mt-1 font-medium">
                {trimmedName.length === 0
                  ? 'Full Name is required.'
                  : 'Name must be between 2 and 100 characters.'}
              </p>
            )}
          </div>

          {/* Mobile Number Input */}
          <div>
            <label htmlFor="profile-mobile" className="block text-xs font-bold text-[#222222] mb-1.5">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="relative flex rounded-xl shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#D1D5DB] bg-[#F9FAFB] text-neutral-600 text-xs font-bold font-mono">
                <Phone className="w-3.5 h-3.5 mr-1 text-neutral-400" />
                +91
              </span>
              <input
                id="profile-mobile"
                type="tel"
                maxLength={10}
                value={mobile}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setMobile(cleaned);
                  if (error) setError('');
                }}
                onBlur={() => setMobileTouched(true)}
                placeholder="Enter 10-digit mobile number"
                disabled={isLoading}
                className={`flex-1 min-w-0 block w-full px-3.5 py-2.5 text-sm bg-white border ${
                  mobileTouched && !isMobileValid
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-[#D1D5DB] focus:border-black focus:ring-black'
                } rounded-r-xl placeholder:text-neutral-400 focus:outline-none focus:ring-1 transition-colors font-mono`}
              />
            </div>
            {mobileTouched && !isMobileValid && (
              <p className="text-[11px] text-red-600 mt-1 font-medium">
                {mobile.length === 0
                  ? 'Mobile number is required.'
                  : 'Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).'}
              </p>
            )}
            {!mobileTouched && (
              <p className="text-[10px] text-neutral-500 mt-1 font-mono">
                Canonical format: +91XXXXXXXXXX
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 text-sm font-semibold rounded-xl cursor-pointer"
              disabled={!isFormValid || isLoading}
              isLoading={isLoading}
            >
              Save & Continue
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-[#E5E5E5] flex items-center justify-center gap-2 text-xs text-[#555555]">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Your mobile number is securely stored in your account database.</span>
        </div>
      </Card>
    </div>
  );
};
