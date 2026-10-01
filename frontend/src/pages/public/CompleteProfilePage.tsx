import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  AlertCircle,
  User as UserIcon,
  Phone,
  Mail,
  CheckCircle2,
  Lock,
  RotateCw,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import {
  checkMobileAvailable,
  completeGoogleSignup,
  getLocalUser,
} from '../../services/authService';
import {
  sendFirebaseSmsOtp,
  confirmFirebasePhoneOtp,
  mapFirebaseError,
} from '../../services/firebase';
import { parse10DigitIndianMobile } from '../../utils/phone';
import type { ConfirmationResult } from 'firebase/auth';

/**
 * Format seconds into mm:ss format
 */
function formatCooldown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mStr = mins < 10 ? `0${mins}` : `${mins}`;
  const sStr = secs < 10 ? `0${secs}` : `${secs}`;
  return `${mStr}:${sStr}`;
}

export const CompleteProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Pending Google User details
  const [googleUser, setGoogleUser] = useState<{
    uid: string;
    email: string;
    name: string;
    picture?: string | null;
  } | null>(null);

  // Step 1 Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [mobileTouched, setMobileTouched] = useState(false);

  // Step 2 Mobile OTP verification states
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [canonicalMobile, setCanonicalMobile] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  // Status & errors
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize from location.state or sessionStorage
  useEffect(() => {
    // 1. Check if user is already fully authenticated
    const existingToken = localStorage.getItem('gst_token');
    const existingUser = getLocalUser();
    if (existingToken && existingUser && existingUser.mobile && existingUser.mobile_verified_at) {
      navigate('/welcome', { replace: true });
      return;
    }

    // 2. Check pending Google user
    let gUser = location.state?.google_user;
    if (!gUser) {
      try {
        const stored = sessionStorage.getItem('gst_google_user');
        if (stored) {
          gUser = JSON.parse(stored);
        }
      } catch {
        // ignore
      }
    }

    if (gUser && gUser.uid) {
      setGoogleUser(gUser);
      setName(gUser.name || '');
      setEmail(gUser.email || '');
    } else if (existingUser) {
      // Fallback for user who needs to link mobile
      setGoogleUser({
        uid: existingUser.firebase_uid || existingUser.google_id || `user_${existingUser.id}`,
        email: existingUser.email || '',
        name: existingUser.name || '',
        picture: existingUser.avatar || null,
      });
      setName(existingUser.name || '');
      setEmail(existingUser.email || '');
    } else {
      // No Google user found, redirect to sign-in
      navigate('/sign-in', { replace: true });
    }
  }, [location.state, navigate]);

  // Cooldown countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isOtpStep && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOtpStep, cooldown]);

  const trimmedName = name.trim();
  const isNameValid = trimmedName.length >= 2 && trimmedName.length <= 100;
  const mobileParsed = parse10DigitIndianMobile(mobile);
  const isMobileValid = mobileParsed.isValid;
  const isFormValid = isNameValid && isMobileValid;

  // Step 1: Submit Details & Trigger Firebase Phone SMS OTP
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    setMobileTouched(true);

    if (!isFormValid || isLoading) return;

    setError('');
    setSuccessNotice('');
    setIsLoading(true);

    const normalizedNumber = mobileParsed.canonical;

    try {
      // 1. Check if mobile number is already taken
      await checkMobileAvailable({ mobile: normalizedNumber });

      // 2. Start Firebase Phone Authentication -> sends REAL 6-digit SMS OTP
      const confirmRes = await sendFirebaseSmsOtp(normalizedNumber, 'google-profile-recaptcha');

      setIsLoading(false);
      setConfirmationResult(confirmRes);
      setCanonicalMobile(normalizedNumber);
      setMaskedMobile(`+91 ******${normalizedNumber.slice(-4)}`);
      setCooldown(60);
      setIsOtpStep(true);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setIsLoading(false);
      console.error('Google profile mobile OTP send error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.mobile?.[0] ||
        mapFirebaseError(err) ||
        'Could not send verification code. Please check your mobile number.';
      setError(msg);
    }
  };

  // Step 2: Verify Firebase OTP & Complete Account Setup
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');

    if (fullOtp.length !== 6 || isLoading) {
      setError('Please enter the 6-digit mobile verification code.');
      return;
    }

    if (!confirmationResult || !googleUser) {
      setError('Verification session expired. Please try again.');
      return;
    }

    setError('');
    setSuccessNotice('');
    setIsLoading(true);

    try {
      // 1. Confirm OTP with Firebase Phone Auth
      const fbRes = await confirmFirebasePhoneOtp(confirmationResult, fullOtp);

      // 2. Send phone ID token + Google profile details to Laravel
      await completeGoogleSignup({
        phone_id_token: fbRes.idToken,
        google_uid: googleUser.uid,
        name: trimmedName,
        email: email.trim().toLowerCase(),
        mobile: canonicalMobile,
        avatar: googleUser.picture || null,
      });

      sessionStorage.removeItem('gst_google_user');
      setIsLoading(false);
      navigate('/welcome', { replace: true });
    } catch (err: any) {
      setIsLoading(false);
      console.error('Complete Google registration error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.mobile?.[0] ||
        mapFirebaseError(err) ||
        'Invalid verification code. Please check and try again.';
      setError(msg);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || resending || isLoading) return;

    setError('');
    setResending(true);

    try {
      const confirmRes = await sendFirebaseSmsOtp(canonicalMobile, 'google-profile-recaptcha');
      setConfirmationResult(confirmRes);
      setResending(false);
      setCooldown(60);
      setSuccessNotice('A new verification code has been sent to your mobile number.');
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setResending(false);
      console.error('Resend OTP error:', err);
      setError(mapFirebaseError(err) || 'Please wait before requesting another OTP.');
    }
  };

  const handleBackToForm = () => {
    setIsOtpStep(false);
    setConfirmationResult(null);
    setError('');
    setSuccessNotice('');
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleanValue = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = cleanValue;
    setOtpDigits(updated);
    if (error) setError('');

    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pastedData[i] || '';
    }
    setOtpDigits(updated);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="bg-[#F8F9FA] min-h-[82vh] flex items-center justify-center py-16 px-4">
      {/* Invisible container for Firebase Phone reCAPTCHA */}
      <div id="google-profile-recaptcha"></div>

      <Card className="w-full max-w-md p-8 bg-white shadow-xl border border-[#E5E7EB] rounded-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="/gstrepotis.png"
            alt="GST Repotis Logo"
            className="h-10 w-auto object-contain mx-auto mb-3"
          />
          <span className="tech-label block mb-1">ACCOUNT ONBOARDING</span>
          <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">
            {isOtpStep ? 'Verify Your Mobile Number' : 'Complete Your Profile'}
          </h2>
          <p className="text-xs text-[#64748B] mt-1.5 max-w-xs mx-auto leading-relaxed">
            {isOtpStep
              ? "We've sent a 6-digit OTP to your Contact Number."
              : 'Please enter your Contact Number to activate your GST workspace access.'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-xs text-[#DC2626] rounded-xl mb-5 flex items-start gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="flex-1 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Success Notice */}
        {successNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl mb-5 flex items-start gap-2.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="flex-1 leading-relaxed">{successNotice}</p>
          </div>
        )}

        {/* STEP 1: FORM */}
        {!isOtpStep ? (
          <form onSubmit={handleSubmitProfile} className="space-y-4">
            {/* Full Name Input */}
            <div>
              <label htmlFor="profile-fullname" className="block text-xs font-bold text-[#1E293B] mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
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
                      : 'border-[#CBD5E1] focus:border-[#0F172A] focus:ring-[#0F172A]'
                  } rounded-xl shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 transition-colors`}
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

            {/* Email Field (Read-only from Google) */}
            <div>
              <label htmlFor="profile-email" className="block text-xs font-bold text-[#1E293B] mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-[#CBD5E1] rounded-xl text-slate-600 font-mono select-none cursor-not-allowed"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Verified via Google Authentication
              </p>
            </div>

            {/* Contact Number Input */}
            <div>
              <label htmlFor="profile-mobile" className="block text-xs font-bold text-[#1E293B] mb-1.5">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <div className="relative flex rounded-xl shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#CBD5E1] bg-[#F8FAFC] text-slate-700 text-xs font-bold font-mono">
                  <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" />
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
                      : 'border-[#CBD5E1] focus:border-[#0F172A] focus:ring-[#0F172A]'
                  } rounded-r-xl placeholder:text-slate-400 focus:outline-none focus:ring-1 transition-colors font-mono`}
                />
              </div>
              {mobileTouched && !isMobileValid && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">
                  {mobile.length === 0
                    ? 'Contact Number is required.'
                    : 'Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).'}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-bold rounded-xl cursor-pointer"
                disabled={!isFormValid || isLoading}
                isLoading={isLoading}
              >
                Continue
              </Button>
            </div>
          </form>
        ) : (
          /* STEP 2: MOBILE OTP SCREEN */
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  We've sent a 6-digit OTP to:{' '}
                  <strong className="font-mono text-slate-900">{maskedMobile}</strong>
                </span>
              </div>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleBackToForm}
                  className="text-[11px] font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Change Contact Number
                </button>
              </div>
            </div>

            {/* OTP BOXES */}
            <div className="space-y-2.5 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-[#0F172A] uppercase tracking-wide">
                    Verify Your Mobile Number
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Enter the 6-digit SMS code received on your phone.
                  </p>
                </div>
                <Phone className="w-4 h-4 text-slate-400" />
              </div>

              <div className="flex items-center justify-between gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`complete-otp-${idx}`}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={isLoading}
                    autoComplete="one-time-code"
                    className="w-11 sm:w-12 h-12 sm:h-13 text-center text-xl font-bold font-mono bg-white border border-[#CBD5E1] rounded-xl text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/20 transition-all shadow-sm"
                  />
                ))}
              </div>

              <div className="flex items-center justify-end text-[11px] text-slate-600 pt-0.5">
                {cooldown > 0 ? (
                  <span className="font-mono font-bold text-slate-700">
                    Resend OTP in {formatCooldown(cooldown)}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending || isLoading}
                    className="font-extrabold text-[#0F172A] hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    {resending && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                    Resend OTP
                  </button>
                )}
              </div>
            </div>

            {/* Verify Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading || otpDigits.join('').length !== 6}
                className="w-full py-3.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code & Activating Account...</span>
                  </>
                ) : (
                  <span>Verify OTP & Complete Registration</span>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-[#E5E7EB] flex items-center justify-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Your contact number is verified directly via Firebase SMS OTP.</span>
        </div>
      </Card>
    </div>
  );
};
