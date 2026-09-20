import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { Lock, Mail, ArrowRight, CheckCircle2, Phone, User as UserIcon, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../services/api';

/* ====================================================================
   SIGN IN PAGE (AUTHENTICATION)
   ==================================================================== */
export const SignInPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [unverifiedData, setUnverifiedData] = useState<{ userId: number; nextStep: string } | null>(null);

  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('gst_token');
    if (token) {
      navigate('/welcome', { replace: true });
    }
  }, [navigate]);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) {
      errs.email = 'Email Address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnverifiedData(null);

    if (!validateForm()) return;

    setIsLoading(true);

    apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
      .then(async (res) => {
        const data = await res.json();
        setIsLoading(false);

        if (!res.ok) {
          if (data.code === 'VERIFICATION_INCOMPLETE') {
            setUnverifiedData({ userId: data.user_id, nextStep: data.next_step });
            setError(data.message || 'Your account verification is incomplete.');
          } else {
            setError(data.message || 'Invalid email address or password.');
          }
          return;
        }

        // Store authenticated session
        localStorage.setItem('gst_token', data.access_token);
        localStorage.setItem('gst_user', JSON.stringify(data.user));
        navigate('/welcome');
      })
      .catch(() => {
        setIsLoading(false);
        setError('Network error. Unable to connect to server.');
      });
  };

  return (
    <div className="bg-[#F7F7F7] min-h-[80vh] flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-xl">
        <div className="text-center mb-6">
          <img src="/gstrepotis.png" alt="GST Suite Logo" className="h-10 w-auto object-contain mx-auto mb-3" />
          <span className="tech-label block mb-1">AUTHENTICATION / 01</span>
          <h2 className="text-2xl font-extrabold text-[#111111] tracking-tight">Sign In to GST Suite</h2>
          <p className="text-xs text-[#555555] mt-1">Access your bank statement conversions and GSTR-1 filings</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-xs text-[#DC2626] rounded-lg mb-5 space-y-2 font-mono">
            <p className="font-bold">{error}</p>
            {unverifiedData && (
              <button
                type="button"
                onClick={() => navigate('/sign-up', { state: { userId: unverifiedData.userId, step: unverifiedData.nextStep } })}
                className="text-xs font-bold text-black underline cursor-pointer"
              >
                Complete Account Verification →
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="EMAIL ADDRESS"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4 text-[#555555]" />}
            error={fieldErrors.email}
          />
          <Input
            label="PASSWORD"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4 text-[#555555]" />}
            error={fieldErrors.password}
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-mono text-[#555555]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-neutral-300 text-black focus:ring-black"
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="font-mono text-xs font-bold text-black hover:underline">
              Forgot Password?
            </Link>
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Sign In to Dashboard
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E5E5E5] text-center text-xs font-mono text-[#555555]">
          Don't have an account?{' '}
          <Link to="/sign-up" className="font-bold text-black hover:underline">
            Start Free Trial
          </Link>
        </div>
      </Card>
    </div>
  );
};

/* ====================================================================
   SIGN UP PAGE WITH EMAIL & MOBILE OTP VERIFICATION
   ==================================================================== */
export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard state: 1 = Details, 2 = Email OTP, 3 = Mobile OTP, 4 = Ready
  const [step, setStep] = useState<number>(1);
  const [userId, setUserId] = useState<number | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('CA');
  const [terms, setTerms] = useState(false);

  // Verification & OTP state
  const [maskedDestination, setMaskedDestination] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const [cooldown, setCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingDestination, setEditingDestination] = useState(false);
  const [newDestinationInput, setNewDestinationInput] = useState('');

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const location = useLocation();

  // Redirect logged in user
  useEffect(() => {
    const token = localStorage.getItem('gst_token');
    if (token) {
      navigate('/welcome', { replace: true });
    }
  }, [navigate]);

  // Handle location state for resumed verification
  useEffect(() => {
    const locState = location.state as { userId?: number; step?: string; maskedDestination?: string } | null;
    if (locState?.userId) {
      setUserId(locState.userId);
      if (locState.step === '03_mobile_verification') {
        setStep(3);
      } else {
        setStep(2);
      }
      if (locState.maskedDestination) {
        setMaskedDestination(locState.maskedDestination);
      }
    }
  }, [location.state]);

  // Cooldown timer countdown effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Handle OTP input change with auto-focus next
  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const updated = [...otpValues];
    updated[index] = val.slice(-1);
    setOtpValues(updated);

    if (val && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  // Handle backspace key in OTP input
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Handle paste in OTP input
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const updated = Array(6).fill('');
      for (let i = 0; i < pasted.length; i++) {
        updated[i] = pasted[i];
      }
      setOtpValues(updated);
      const nextIndex = Math.min(pasted.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
    }
  };

  // Step 1: Client-side Form Validation
  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = 'Full Name is required.';
    } else if (name.trim().length < 2) {
      errs.name = 'Full Name must be at least 2 characters.';
    }

    if (!email.trim()) {
      errs.email = 'Email Address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (!cleanMobile) {
      errs.mobile = 'Mobile Number is required.';
    } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      errs.mobile = 'Please enter a valid 10-digit Indian mobile number.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(password)) {
      errs.password = 'Must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (!terms) {
      errs.terms = 'You must accept the terms and conditions.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 1: Submit Initial Sign Up Details
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsLoading(true);

    apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        user_type: userType,
        password,
        password_confirmation: confirmPassword,
        terms: terms ? 1 : 0,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        setIsLoading(false);

        if (!res.ok) {
          if (data.errors && Object.keys(data.errors).length > 0) {
            const mapped: Record<string, string> = {};
            Object.keys(data.errors).forEach((key) => {
              mapped[key] = Array.isArray(data.errors[key]) ? data.errors[key][0] : data.errors[key];
            });
            setFieldErrors(mapped);
            setError(data.message && data.message !== 'Validation failed' ? data.message : '');
          } else if (data.code === 'OTP_EMAIL_DELIVERY_FAILED' || data.delivery_failed) {
            setError(data.message || 'Unable to send verification code. Please try again.');
            setFieldErrors({});
          } else {
            setError(data.message || 'Registration failed. Please check your inputs and try again.');
            setFieldErrors({});
          }
          return;
        }

        // Move to Email Verification
        setUserId(data.user_id);
        setMaskedDestination(data.masked_destination);
        setStep(2);
        setCooldown(data.cooldown_seconds || 30);
        setOtpValues(Array(6).fill(''));
      })
      .catch(() => {
        setIsLoading(false);
        setError('Network error. Unable to connect to backend server.');
      });
  };

  // Step 2: Submit Email OTP Code
  const handleVerifyEmailOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpValues.join('');
    if (otpCode.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setError('');
    setIsLoading(true);

    apiFetch('/api/auth/verify-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, otp: otpCode }),
    })
      .then(async (res) => {
        const data = await res.json();
        setIsLoading(false);

        if (!res.ok) {
          setError(data.message || 'Invalid email verification code.');
          return;
        }

        if (data.step === '04_account_ready' || data.account_status === 'active') {
          setStep(4);
        } else {
          setMaskedDestination(data.masked_destination);
          setStep(3);
          setCooldown(data.cooldown_seconds || 30);
          setOtpValues(Array(6).fill(''));
        }
      })
      .catch(() => {
        setIsLoading(false);
        setError('Network error during verification.');
      });
  };

  // Step 3: Submit Mobile OTP Code
  const handleVerifyMobileOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpValues.join('');
    if (otpCode.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setError('');
    setIsLoading(true);

    apiFetch('/api/auth/verify-mobile-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, otp: otpCode }),
    })
      .then(async (res) => {
        const data = await res.json();
        setIsLoading(false);

        if (!res.ok) {
          setError(data.message || 'Invalid mobile verification code.');
          return;
        }

        // Account Fully Activated
        setStep(4);
      })
      .catch(() => {
        setIsLoading(false);
        setError('Network error during mobile verification.');
      });
  };

  // Resend OTP Code
  const handleResendOtp = (channel: 'email' | 'mobile') => {
    if (cooldown > 0) return;
    setError('');

    const endpoint = channel === 'email' ? '/api/auth/resend-email-otp' : '/api/auth/resend-mobile-otp';
    const body: any = { user_id: userId };
    if (editingDestination && newDestinationInput) {
      if (channel === 'email') body.new_email = newDestinationInput;
      else body.new_mobile = newDestinationInput;
    }

    setIsLoading(true);

    apiFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json();
        setIsLoading(false);

        if (!res.ok) {
          setError(data.message || 'Unable to resend verification code.');
          return;
        }

        setMaskedDestination(data.masked_destination);
        setCooldown(data.cooldown_seconds || 30);
        setOtpValues(Array(6).fill(''));
        setEditingDestination(false);
        setNewDestinationInput('');
      })
      .catch(() => {
        setIsLoading(false);
        setError('Network error sending verification code.');
      });
  };

  return (
    <div className="bg-[#F7F7F7] min-h-[85vh] flex items-center justify-center py-16 px-4 text-[#111111]">
      <Card className="w-full max-w-lg p-8 bg-white shadow-xl">
        {/* Verification Progress Bar */}
        <div className="mb-6 border-b border-[#E5E5E5] pb-4 font-mono text-[10px]">
          <div className="flex items-center justify-between font-bold text-[#555555]">
            <span className={step >= 1 ? 'text-black font-bold' : ''}>01 DETAILS {step > 1 && '✓'}</span>
            <span>—</span>
            <span className={step >= 2 ? 'text-black font-bold' : ''}>02 EMAIL {step > 2 && '✓'}</span>
            <span>—</span>
            <span className={step >= 3 ? 'text-black font-bold' : ''}>03 MOBILE {step > 3 && '✓'}</span>
            <span>—</span>
            <span className={step === 4 ? 'text-[#16A34A] font-bold' : ''}>04 READY</span>
          </div>
        </div>

        {/* STEP 1: INITIAL SIGN UP DETAILS FORM */}
        {step === 1 && (
          <div>
            <div className="text-center mb-6">
              <img src="/gstrepotis.png" alt="GST Suite Logo" className="h-10 w-auto object-contain mx-auto mb-3" />
              <span className="tech-label block mb-1">REGISTRATION / 01</span>
              <h2 className="text-2xl font-extrabold text-[#111111] tracking-tight">Create Free Trial Account</h2>
              <p className="text-xs text-[#555555] mt-1">Get 50 free credits to test Bank Conversions & GSTR-1 Reports</p>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 text-xs font-mono font-bold text-[#DC2626] rounded-lg mb-4">{error}</div>}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <Input
                label="FULL NAME"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CA Rajesh Sharma"
                leftIcon={<UserIcon className="w-4 h-4 text-[#555555]" />}
                error={fieldErrors.name}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="EMAIL ADDRESS"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                    if (error) setError('');
                  }}
                  placeholder="rajesh@ca-firm.com"
                  leftIcon={<Mail className="w-4 h-4 text-[#555555]" />}
                  error={fieldErrors.email}
                />
                <Input
                  label="MOBILE NUMBER"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    if (fieldErrors.mobile) setFieldErrors((prev) => ({ ...prev, mobile: '' }));
                    if (error) setError('');
                  }}
                  placeholder="+91 9876543210"
                  leftIcon={<Phone className="w-4 h-4 text-[#555555]" />}
                  error={fieldErrors.mobile}
                />
              </div>

              <Select
                label="USER CATEGORY"
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                options={[
                  { value: 'CA', label: 'Chartered Accountant (CA)' },
                  { value: 'Accountant', label: 'Accountant' },
                  { value: 'Tax Professional', label: 'Tax Professional' },
                  { value: 'Seller', label: 'E-Commerce Seller' },
                  { value: 'Business', label: 'Small & Medium Business (SMB)' },
                  { value: 'Other', label: 'Other' },
                ]}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="PASSWORD"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars (A-z, 0-9, @#)"
                  leftIcon={<Lock className="w-4 h-4 text-[#555555]" />}
                  error={fieldErrors.password}
                />
                <Input
                  label="CONFIRM PASSWORD"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  leftIcon={<Lock className="w-4 h-4 text-[#555555]" />}
                  error={fieldErrors.confirmPassword}
                />
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer font-mono text-xs text-[#555555]">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 text-black focus:ring-black"
                  />
                  <span>
                    I agree to the <Link to="/terms" className="text-black font-bold underline">Terms of Service</Link> & <Link to="/privacy" className="text-black font-bold underline">Privacy Policy</Link>
                  </span>
                </label>
                {fieldErrors.terms && <p className="font-mono text-[11px] font-bold text-[#DC2626] mt-1">{fieldErrors.terms}</p>}
              </div>

              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Create Account & Send Verification Code
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#E5E5E5] text-center text-xs font-mono text-[#555555]">
              Already registered?{' '}
              <Link to="/sign-in" className="font-bold text-black hover:underline">
                Sign In Here
              </Link>
            </div>
          </div>
        )}

        {/* STEP 2: EMAIL OTP VERIFICATION SCREEN */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center mx-auto mb-3 font-mono text-xs font-bold">
                <Mail className="w-5 h-5" />
              </div>
              <span className="tech-label block mb-1">EMAIL VERIFICATION / 02</span>
              <h2 className="text-xl font-extrabold text-[#111111]">Verify Your Email Address</h2>
              <p className="text-xs text-[#555555] mt-1">
                We've sent a 6-digit verification code to: <br />
                <span className="font-mono font-bold text-black">{maskedDestination}</span>
              </p>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 text-xs font-mono font-bold text-[#DC2626] rounded-lg">{error}</div>}

            <form onSubmit={handleVerifyEmailOtp} className="space-y-6">
              {/* 6 Digit Box Inputs */}
              <div>
                <label className="tech-label block text-center mb-2">ENTER 6-DIGIT VERIFICATION CODE</label>
                <div className="flex justify-center gap-2">
                  {otpValues.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpInputsRef.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-12 text-center font-mono text-lg font-bold text-[#111111] bg-white border border-[#D4D4D4] rounded-lg outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                disabled={otpValues.join('').length < 6}
              >
                Verify Email Code
              </Button>
            </form>

            <div className="pt-4 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between text-xs font-mono gap-3">
              {cooldown > 0 ? (
                <span className="text-[#888888]">Resend code in {cooldown}s</span>
              ) : (
                <button
                  onClick={() => handleResendOtp('email')}
                  className="font-bold text-black underline cursor-pointer hover:text-neutral-700"
                >
                  Resend Email Code
                </button>
              )}

              <button
                onClick={() => setEditingDestination(!editingDestination)}
                className="text-[#555555] hover:text-black cursor-pointer underline"
              >
                {editingDestination ? 'Cancel' : 'Change Email'}
              </button>
            </div>

            {editingDestination && (
              <div className="p-4 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg space-y-3">
                <Input
                  label="NEW EMAIL ADDRESS"
                  type="email"
                  value={newDestinationInput}
                  onChange={(e) => setNewDestinationInput(e.target.value)}
                  placeholder="Enter new email address"
                />
                <Button variant="outline" size="sm" className="w-full" onClick={() => handleResendOtp('email')}>
                  Update Email & Send OTP
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: MOBILE OTP VERIFICATION SCREEN */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center mx-auto mb-3 font-mono text-xs font-bold">
                <Phone className="w-5 h-5" />
              </div>
              <span className="tech-label block mb-1">MOBILE VERIFICATION / 03</span>
              <h2 className="text-xl font-extrabold text-[#111111]">Verify Your Mobile Number</h2>
              <p className="text-xs text-[#555555] mt-1">
                We've sent a 6-digit verification code to: <br />
                <span className="font-mono font-bold text-black">{maskedDestination}</span>
              </p>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 text-xs font-mono font-bold text-[#DC2626] rounded-lg">{error}</div>}

            <form onSubmit={handleVerifyMobileOtp} className="space-y-6">
              {/* 6 Digit Box Inputs */}
              <div>
                <label className="tech-label block text-center mb-2">ENTER 6-DIGIT VERIFICATION CODE</label>
                <div className="flex justify-center gap-2">
                  {otpValues.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpInputsRef.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-12 text-center font-mono text-lg font-bold text-[#111111] bg-white border border-[#D4D4D4] rounded-lg outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                disabled={otpValues.join('').length < 6}
              >
                Verify Mobile Code & Activate Account
              </Button>
            </form>

            <div className="pt-4 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between text-xs font-mono gap-3">
              {cooldown > 0 ? (
                <span className="text-[#888888]">Resend code in {cooldown}s</span>
              ) : (
                <button
                  onClick={() => handleResendOtp('mobile')}
                  className="font-bold text-black underline cursor-pointer hover:text-neutral-700"
                >
                  Resend Mobile Code
                </button>
              )}

              <button
                onClick={() => setEditingDestination(!editingDestination)}
                className="text-[#555555] hover:text-black cursor-pointer underline"
              >
                {editingDestination ? 'Cancel' : 'Change Mobile'}
              </button>
            </div>

            {editingDestination && (
              <div className="p-4 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg space-y-3">
                <Input
                  label="NEW MOBILE NUMBER"
                  value={newDestinationInput}
                  onChange={(e) => setNewDestinationInput(e.target.value)}
                  placeholder="+91 9876543210"
                />
                <Button variant="outline" size="sm" className="w-full" onClick={() => handleResendOtp('mobile')}>
                  Update Mobile & Send OTP
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: ACCOUNT READY & VERIFIED */}
        {step === 4 && (
          <div className="text-center py-6 space-y-5">
            <div className="w-12 h-12 bg-emerald-100 text-[#16A34A] rounded-xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div>
              <span className="tech-label block mb-1">ACCOUNT READY / 04</span>
              <h2 className="text-2xl font-extrabold text-[#111111]">Account Verified & Activated!</h2>
              <p className="text-xs text-[#555555] mt-1 max-w-sm mx-auto">
                Your email and mobile number have been successfully verified. You can now sign in to your workspace.
              </p>
            </div>

            <div className="pt-4">
              <Link to="/sign-in">
                <Button variant="primary" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Proceed to Sign In
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

/* ====================================================================
   FORGOT PASSWORD PAGE
   ==================================================================== */
export const ForgotPasswordPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setIsLoading(true);

    apiFetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })
      .then((res) => res.json())
      .then(() => {
        setIsLoading(false);
        setSubmitted(true);
      })
      .catch(() => {
        setIsLoading(false);
        setSubmitted(true);
      });
  };

  return (
    <div className="bg-[#F7F7F7] min-h-[70vh] flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-xl text-center">
        <h2 className="text-xl font-extrabold text-[#111111]">Forgot Password</h2>
        <p className="text-xs text-[#555555] mt-1 mb-6">Enter your registered email to receive password reset instructions</p>

        {submitted ? (
          <div className="py-6 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[#16A34A] mx-auto mb-2" />
            <p className="font-mono text-xs font-bold text-black">Reset Link / Instructions Sent!</p>
            <p className="text-[11px] text-[#555555]">Please check your email inbox.</p>
            <div className="pt-4">
              <Link to="/sign-in">
                <Button variant="outline" size="sm" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="font-mono text-xs font-bold text-[#DC2626]">{error}</p>}
            <Input
              label="EMAIL ADDRESS"
              type="email"
              placeholder="rajesh@ca-firm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Send Reset Instructions
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
