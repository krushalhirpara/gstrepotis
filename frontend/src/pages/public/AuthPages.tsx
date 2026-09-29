import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  ArrowLeft,
  RotateCw,
} from 'lucide-react';
import {
  signup,
  verifySignup,
  resendSignupEmailOtp,
  resendSignupMobileOtp,
  loginWithCredentials,
  verifyLoginOtp,
  resendLoginOtp,
  requestPasswordReset,
  resetPasswordWithOtp,
} from '../../services/authService';
import { parse10DigitIndianMobile } from '../../utils/phone';

/**
 * Format seconds into mm:ss format (e.g. 59 -> "00:59")
 */
function formatCooldown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mStr = mins < 10 ? `0${mins}` : `${mins}`;
  const sStr = secs < 10 ? `0${secs}` : `${secs}`;
  return `${mStr}:${sStr}`;
}

/**
 * Reusable 6-digit OTP Box Input Component
 */
interface OtpBoxProps {
  digits: string[];
  onChange: (newDigits: string[]) => void;
  disabled?: boolean;
  autoFocusFirst?: boolean;
  idPrefix: string;
}

const OtpBoxGroup: React.FC<OtpBoxProps> = ({
  digits,
  onChange,
  disabled = false,
  autoFocusFirst = false,
  idPrefix,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocusFirst) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocusFirst]);

  const handleChange = (index: number, val: string) => {
    const cleanValue = val.replace(/\D/g, '').slice(-1);
    const updated = [...digits];
    updated[index] = cleanValue;
    onChange(updated);

    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const updated = [...digits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pastedData[i] || '';
    }
    onChange(updated);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-2.5" onPaste={handlePaste}>
      {digits.map((digit, idx) => (
        <input
          key={idx}
          id={`${idPrefix}-${idx}`}
          ref={(el) => {
            inputRefs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          disabled={disabled}
          autoComplete="one-time-code"
          className="w-11 sm:w-12 h-12 sm:h-13 text-center text-xl font-bold font-mono bg-white border border-[#CBD5E1] rounded-xl text-slate-900 focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/20 transition-all shadow-sm"
        />
      ))}
    </div>
  );
};

/* ====================================================================
   SIGN IN PAGE (EMAIL / MOBILE + PASSWORD -> TARGETED CHANNEL OTP)
   ==================================================================== */
export const SignInPage: React.FC = () => {
  const navigate = useNavigate();

  // Step 1 states
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 OTP states
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [destinationMasked, setDestinationMasked] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  // Status & errors
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('gst_token');
    if (token) {
      navigate('/welcome', { replace: true });
    }
  }, [navigate]);

  // Restore active login challenge on refresh if present
  useEffect(() => {
    try {
      const savedChallenge = sessionStorage.getItem('gst_login_challenge');
      if (savedChallenge) {
        const parsed = JSON.parse(savedChallenge);
        if (parsed.challenge_id) {
          setChallengeId(parsed.challenge_id);
          setChannel(parsed.channel || 'email');
          setDestinationMasked(parsed.destination_masked || '');
          setCooldown(parsed.cooldown || 60);
          setIsOtpStep(true);
        }
      }
    } catch {
      sessionStorage.removeItem('gst_login_challenge');
    }
  }, []);

  // Cooldown countdown timer for resend OTP
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isOtpStep && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => {
          const next = prev - 1;
          try {
            const saved = sessionStorage.getItem('gst_login_challenge');
            if (saved) {
              const parsed = JSON.parse(saved);
              parsed.cooldown = next;
              sessionStorage.setItem('gst_login_challenge', JSON.stringify(parsed));
            }
          } catch {
            // ignore
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOtpStep, cooldown]);

  // Step 1 Submit: Validate credentials & request targeted OTP
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password || isLoading) return;

    setError('');
    setSuccessNotice('');
    setIsLoading(true);

    try {
      const res = await loginWithCredentials({
        login: login.trim(),
        password,
      });

      setIsLoading(false);

      if (res.requires_otp && res.challenge_id) {
        const selectedChannel = res.channel || (login.includes('@') ? 'email' : 'sms');
        const masked = res.destination_masked || res.email_masked || 'your registered contact';

        setChallengeId(res.challenge_id);
        setChannel(selectedChannel);
        setDestinationMasked(masked);
        setCooldown(res.cooldown_seconds || 60);
        setIsOtpStep(true);
        setOtpDigits(['', '', '', '', '', '']);

        sessionStorage.setItem(
          'gst_login_challenge',
          JSON.stringify({
            challenge_id: res.challenge_id,
            channel: selectedChannel,
            destination_masked: masked,
            cooldown: res.cooldown_seconds || 60,
          })
        );
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error('Sign-in error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.login?.[0] ||
        err?.response?.data?.errors?.password?.[0] ||
        err?.message ||
        'Invalid email/mobile or password.';
      setError(msg);
    }
  };

  // Step 2 Submit: Verify 6-digit OTP & Complete Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6 || isLoading) return;

    setError('');
    setIsLoading(true);

    try {
      await verifyLoginOtp({
        challenge_id: challengeId,
        otp: fullOtp,
      });

      sessionStorage.removeItem('gst_login_challenge');
      setIsLoading(false);
      navigate('/welcome', { replace: true });
    } catch (err: any) {
      setIsLoading(false);
      console.error('OTP verification error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.otp?.[0] ||
        err?.message ||
        'Invalid OTP. Please check and try again.';
      setError(msg);
    }
  };

  // Resend Login OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || resending || isLoading) return;

    setError('');
    setResending(true);

    try {
      const res = await resendLoginOtp({
        challenge_id: challengeId,
      });
      setResending(false);
      const newCooldown = res.cooldown_seconds || 60;
      setCooldown(newCooldown);
      setSuccessNotice(
        channel === 'email'
          ? 'A new verification code has been sent to your registered email.'
          : 'A new verification code has been sent to your registered mobile number.'
      );
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setResending(false);
      console.error('Resend OTP error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Please wait before requesting another OTP.';
      setError(msg);
    }
  };

  const handleBackToLogin = () => {
    sessionStorage.removeItem('gst_login_challenge');
    setIsOtpStep(false);
    setChallengeId('');
    setError('');
    setSuccessNotice('');
  };

  return (
    <div className="bg-[#F8F9FA] min-h-[82vh] flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-xl border border-[#E5E7EB] rounded-2xl">
        {/* Header / Brand */}
        <div className="text-center mb-7">
          <img
            src="/gstrepotis.png"
            alt="GST Repotis Logo"
            className="h-10 w-auto object-contain mx-auto mb-3.5"
          />
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            {isOtpStep ? 'Verify Login' : 'Sign In'}
          </h2>
          <p className="text-xs text-[#64748B] mt-1.5 font-medium">
            {isOtpStep
              ? channel === 'email'
                ? "We've sent a 6-digit OTP to your registered email."
                : "We've sent a 6-digit OTP to your registered mobile number."
              : 'Access your Bank Statement Converter & GSTR-1 filings'}
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

        {/* STEP 1: EMAIL/MOBILE + PASSWORD FORM */}
        {!isOtpStep ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            {/* Email / Mobile Field */}
            <div>
              <label htmlFor="login-input" className="block text-xs font-bold text-[#1E293B] mb-1.5">
                Email ID / Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="login-input"
                  type="text"
                  value={login}
                  onChange={(e) => {
                    setLogin(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter Email or Mobile Number"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-bold text-[#1E293B]">
                  Password <span className="text-red-500">*</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-[#0F172A] hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-11 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !login.trim() || !password}
                className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>Login</span>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-600 text-center pt-2">
              Don't have an account?{' '}
              <Link to="/sign-up" className="font-extrabold text-[#0F172A] hover:underline uppercase tracking-wide">
                CREATE
              </Link>
            </p>
          </form>
        ) : (
          /* STEP 2: TARGETED LOGIN OTP VERIFICATION SCREEN */
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
              <p className="text-xs text-slate-600">
                {channel === 'email'
                  ? "We've sent a 6-digit OTP to your registered email:"
                  : "We've sent a 6-digit OTP to your registered mobile number:"}
              </p>
              <p className="text-base font-black text-[#0F172A] font-mono tracking-wider">
                {destinationMasked}
              </p>
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-[11px] font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1 mt-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> Change login credentials
              </button>
            </div>

            {/* 6 OTP Input Boxes */}
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-2 text-center">
                Enter 6-Digit Verification Code
              </label>
              <OtpBoxGroup
                digits={otpDigits}
                onChange={(d) => {
                  setOtpDigits(d);
                  if (error) setError('');
                }}
                disabled={isLoading}
                autoFocusFirst={true}
                idPrefix="login-otp"
              />
            </div>

            {/* Verify & Login Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading || otpDigits.join('').length !== 6}
                className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code & Logging In...</span>
                  </>
                ) : (
                  <span>Verify OTP</span>
                )}
              </button>
            </div>

            {/* Resend OTP */}
            <div className="text-center text-xs text-slate-600 font-medium">
              Didn't receive code?{' '}
              {cooldown > 0 ? (
                <span className="font-mono font-bold text-slate-800">
                  Resend OTP in {formatCooldown(cooldown)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending || isLoading}
                  className="font-extrabold text-[#0F172A] hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  {resending ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        )}

        {/* Benefits */}
        <div className="mt-7 pt-5 border-t border-slate-200 space-y-2.5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Convert 18+ Indian Banks PDF to Tally XML & Excel</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Generate Amazon, Flipkart & Meesho GSTR-1 JSON filings</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Secure Two-Factor OTP authentication</span>
          </div>
        </div>

        {/* Terms footer */}
        <div className="mt-5 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-500 leading-relaxed font-mono">
          By signing in, you agree to our{' '}
          <Link to="/terms" className="text-slate-800 font-bold underline hover:text-black">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-slate-800 font-bold underline hover:text-black">
            Privacy Policy
          </Link>.
        </div>
      </Card>
    </div>
  );
};

/* ====================================================================
   SIGN UP PAGE (DUAL OTP VERIFICATION: EMAIL OTP + MOBILE OTP)
   ==================================================================== */
export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();

  // Step 1 Form states
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2 Verification states
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [signupToken, setSignupToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');

  const [emailOtpDigits, setEmailOtpDigits] = useState(['', '', '', '', '', '']);
  const [mobileOtpDigits, setMobileOtpDigits] = useState(['', '', '', '', '', '']);

  const [emailCooldown, setEmailCooldown] = useState(60);
  const [mobileCooldown, setMobileCooldown] = useState(60);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendingMobile, setResendingMobile] = useState(false);

  // Interaction tracking
  const [touched, setTouched] = useState({
    name: false,
    mobile: false,
    email: false,
    password: false,
    confirm: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('gst_token');
    if (token) {
      navigate('/welcome', { replace: true });
    }
  }, [navigate]);

  // Restore active signup challenge on refresh if present
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('gst_signup_challenge');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.signup_token) {
          setSignupToken(parsed.signup_token);
          setMaskedEmail(parsed.email_masked || '');
          setMaskedMobile(parsed.mobile_masked || '');
          setEmailCooldown(parsed.email_cooldown || 60);
          setMobileCooldown(parsed.mobile_cooldown || 60);
          setIsOtpStep(true);
        }
      }
    } catch {
      sessionStorage.removeItem('gst_signup_challenge');
    }
  }, []);

  // Cooldown countdown timers for Email & Mobile resend
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isOtpStep && (emailCooldown > 0 || mobileCooldown > 0)) {
      timer = setInterval(() => {
        setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        setMobileCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOtpStep, emailCooldown, mobileCooldown]);

  // Validations
  const trimmedName = name.trim();
  const isNameValid = trimmedName.length >= 2 && trimmedName.length <= 100;
  const mobileParsed = parse10DigitIndianMobile(mobile);
  const isMobileValid = mobileParsed.isValid;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = password.length >= 8;
  const isConfirmValid = passwordConfirmation.length > 0 && password === passwordConfirmation;

  const isFormValid =
    isNameValid && isMobileValid && isEmailValid && isPasswordValid && isConfirmValid;

  // Step 1: Submit signup form & request Dual OTPs
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      name: true,
      mobile: true,
      email: true,
      password: true,
      confirm: true,
    });

    if (!isFormValid || isLoading) return;

    setError('');
    setSuccessNotice('');
    setIsLoading(true);

    try {
      const res = await signup({
        name: trimmedName,
        email: email.trim().toLowerCase(),
        mobile: mobileParsed.canonical,
        password,
        password_confirmation: passwordConfirmation,
      });

      setIsLoading(false);

      if (res.requires_verification && res.signup_token) {
        setSignupToken(res.signup_token);
        setMaskedEmail(res.email_masked || email.trim().toLowerCase());
        setMaskedMobile(res.mobile_masked || mobileParsed.canonical);
        setEmailCooldown(res.cooldown_seconds || 60);
        setMobileCooldown(res.cooldown_seconds || 60);
        setIsOtpStep(true);
        setEmailOtpDigits(['', '', '', '', '', '']);
        setMobileOtpDigits(['', '', '', '', '', '']);

        sessionStorage.setItem(
          'gst_signup_challenge',
          JSON.stringify({
            signup_token: res.signup_token,
            email_masked: res.email_masked,
            mobile_masked: res.mobile_masked,
            email_cooldown: res.cooldown_seconds || 60,
            mobile_cooldown: res.cooldown_seconds || 60,
          })
        );
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error('Signup error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.email?.[0] ||
        err?.response?.data?.errors?.mobile?.[0] ||
        err?.response?.data?.errors?.password?.[0] ||
        err?.response?.data?.errors?.name?.[0] ||
        err?.message ||
        'Could not complete registration. Please check your inputs.';
      setError(msg);
    }
  };

  // Step 2: Verify Dual OTPs & Activate Account
  const handleVerifyDualOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullEmailOtp = emailOtpDigits.join('');
    const fullMobileOtp = mobileOtpDigits.join('');

    if (fullEmailOtp.length !== 6 || fullMobileOtp.length !== 6 || isLoading) {
      setError('Please enter both 6-digit verification codes (Email and Mobile).');
      return;
    }

    setError('');
    setSuccessNotice('');
    setIsLoading(true);

    try {
      await verifySignup({
        signup_token: signupToken,
        email_otp: fullEmailOtp,
        mobile_otp: fullMobileOtp,
      });

      sessionStorage.removeItem('gst_signup_challenge');
      setIsLoading(false);
      navigate('/welcome', { replace: true });
    } catch (err: any) {
      setIsLoading(false);
      console.error('Dual OTP verification error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.email_otp?.[0] ||
        err?.response?.data?.errors?.mobile_otp?.[0] ||
        err?.message ||
        'Invalid verification code. Please check and try again.';
      setError(msg);
    }
  };

  // Resend Email OTP
  const handleResendEmailOtp = async () => {
    if (emailCooldown > 0 || resendingEmail || isLoading) return;

    setError('');
    setResendingEmail(true);

    try {
      const res = await resendSignupEmailOtp({ signup_token: signupToken });
      setResendingEmail(false);
      setEmailCooldown(res.cooldown_seconds || 60);
      setSuccessNotice('A new verification code has been sent to your email.');
      setEmailOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setResendingEmail(false);
      console.error('Resend email OTP error:', err);
      setError(err?.response?.data?.message || err?.message || 'Please wait before requesting another OTP.');
    }
  };

  // Resend Mobile OTP
  const handleResendMobileOtp = async () => {
    if (mobileCooldown > 0 || resendingMobile || isLoading) return;

    setError('');
    setResendingMobile(true);

    try {
      const res = await resendSignupMobileOtp({ signup_token: signupToken });
      setResendingMobile(false);
      setMobileCooldown(res.cooldown_seconds || 60);
      setSuccessNotice('A new verification code has been sent to your mobile number.');
      setMobileOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setResendingMobile(false);
      console.error('Resend mobile OTP error:', err);
      setError(err?.response?.data?.message || err?.message || 'Please wait before requesting another OTP.');
    }
  };

  const handleBackToSignup = () => {
    sessionStorage.removeItem('gst_signup_challenge');
    setIsOtpStep(false);
    setSignupToken('');
    setError('');
    setSuccessNotice('');
  };

  return (
    <div className="bg-[#F8F9FA] min-h-[82vh] flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-xl border border-[#E5E7EB] rounded-2xl">
        {/* Header / Brand */}
        <div className="text-center mb-6">
          <img
            src="/gstrepotis.png"
            alt="GST Repotis Logo"
            className="h-10 w-auto object-contain mx-auto mb-3.5"
          />
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            {isOtpStep ? 'Verify Your Account' : 'Sign Up'}
          </h2>
          <p className="text-xs text-[#64748B] mt-1.5 font-medium">
            {isOtpStep
              ? 'Please verify both your email and mobile number to activate your account'
              : 'Create your account and start your automated GST workflows'}
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

        {/* STEP 1: SIGNUP FORM */}
        {!isOtpStep ? (
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            {/* Full Name Field */}
            <div>
              <label htmlFor="signup-name" className="block text-xs font-bold text-[#1E293B] mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  onBlur={() => setTouched({ ...touched, name: true })}
                  placeholder="Enter your full name"
                  required
                  disabled={isLoading}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm bg-white border ${
                    touched.name && !isNameValid
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                      : 'border-[#CBD5E1] focus:border-[#0F172A] focus:ring-[#0F172A]'
                  } rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 transition-colors`}
                />
              </div>
              {touched.name && !isNameValid && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">
                  {trimmedName.length === 0
                    ? 'Please enter your full name.'
                    : 'Name must be between 2 and 100 characters.'}
                </p>
              )}
            </div>

            {/* Mobile Number Field */}
            <div>
              <label htmlFor="signup-mobile" className="block text-xs font-bold text-[#1E293B] mb-1.5">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative flex rounded-xl shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#CBD5E1] bg-[#F8FAFC] text-slate-700 text-xs font-bold font-mono">
                  <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  +91
                </span>
                <input
                  id="signup-mobile"
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setMobile(cleaned);
                    if (error) setError('');
                  }}
                  onBlur={() => setTouched({ ...touched, mobile: true })}
                  placeholder="Enter 10-digit mobile number"
                  required
                  disabled={isLoading}
                  className={`flex-1 min-w-0 block w-full px-3.5 py-2.5 text-sm bg-white border ${
                    touched.mobile && !isMobileValid
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                      : 'border-[#CBD5E1] focus:border-[#0F172A] focus:ring-[#0F172A]'
                  } rounded-r-xl placeholder:text-slate-400 focus:outline-none focus:ring-1 transition-colors font-mono`}
                />
              </div>
              {touched.mobile && !isMobileValid && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">
                  Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).
                </p>
              )}
            </div>

            {/* Email ID Field */}
            <div>
              <label htmlFor="signup-email" className="block text-xs font-bold text-[#1E293B] mb-1.5">
                Email ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  onBlur={() => setTouched({ ...touched, email: true })}
                  placeholder="Enter your email address"
                  required
                  disabled={isLoading}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm bg-white border ${
                    touched.email && !isEmailValid
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                      : 'border-[#CBD5E1] focus:border-[#0F172A] focus:ring-[#0F172A]'
                  } rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 transition-colors`}
                />
              </div>
              {touched.email && !isEmailValid && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">
                  Please enter a valid email address.
                </p>
              )}
            </div>

            {/* Create Password Field */}
            <div>
              <label htmlFor="signup-password" className="block text-xs font-bold text-[#1E293B] mb-1.5">
                Create Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  onBlur={() => setTouched({ ...touched, password: true })}
                  placeholder="Enter password (min. 8 characters)"
                  required
                  disabled={isLoading}
                  className={`w-full pl-10 pr-11 py-2.5 text-sm bg-white border ${
                    touched.password && !isPasswordValid
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                      : 'border-[#CBD5E1] focus:border-[#0F172A] focus:ring-[#0F172A]'
                  } rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.password && !isPasswordValid && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">
                  Password must be at least 8 characters.
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="signup-confirm-password" className="block text-xs font-bold text-[#1E293B] mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordConfirmation}
                  onChange={(e) => {
                    setPasswordConfirmation(e.target.value);
                    if (error) setError('');
                  }}
                  onBlur={() => setTouched({ ...touched, confirm: true })}
                  placeholder="Confirm your password"
                  required
                  disabled={isLoading}
                  className={`w-full pl-10 pr-11 py-2.5 text-sm bg-white border ${
                    touched.confirm && !isConfirmValid
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                      : 'border-[#CBD5E1] focus:border-[#0F172A] focus:ring-[#0F172A]'
                  } rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.confirm && !isConfirmValid && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">
                  Passwords do not match.
                </p>
              )}
            </div>

            {/* Sign Up Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Verification Codes...</span>
                  </>
                ) : (
                  <span>Sign Up</span>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-600 text-center pt-2">
              Already have an account?{' '}
              <Link to="/sign-in" className="font-extrabold text-[#0F172A] hover:underline uppercase tracking-wide">
                LOGIN
              </Link>
            </p>
          </form>
        ) : (
          /* STEP 2: DUAL OTP VERIFICATION SCREEN */
          <form onSubmit={handleVerifyDualOtp} className="space-y-6">
            {/* Status overview banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Email OTP sent to <strong className="font-mono text-slate-900">{maskedEmail}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Mobile OTP sent to <strong className="font-mono text-slate-900">{maskedMobile}</strong>
                </span>
              </div>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleBackToSignup}
                  className="text-[11px] font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Change registration details
                </button>
              </div>
            </div>

            {/* 1. EMAIL VERIFICATION SECTION */}
            <div className="space-y-2.5 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-[#0F172A] uppercase tracking-wide">
                    Email Verification
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    We've sent a 6-digit OTP to your email.
                  </p>
                </div>
                <Mail className="w-4 h-4 text-slate-400" />
              </div>

              <OtpBoxGroup
                digits={emailOtpDigits}
                onChange={(d) => {
                  setEmailOtpDigits(d);
                  if (error) setError('');
                }}
                disabled={isLoading}
                autoFocusFirst={true}
                idPrefix="email-otp"
              />

              <div className="flex items-center justify-end text-[11px] text-slate-600 pt-0.5">
                {emailCooldown > 0 ? (
                  <span className="font-mono font-bold text-slate-700">
                    Resend Email OTP in {formatCooldown(emailCooldown)}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendEmailOtp}
                    disabled={resendingEmail || isLoading}
                    className="font-extrabold text-[#0F172A] hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    {resendingEmail && <RotateCw className="w-3 h-3 animate-spin" />}
                    Resend Email OTP
                  </button>
                )}
              </div>
            </div>

            {/* 2. MOBILE VERIFICATION SECTION */}
            <div className="space-y-2.5 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-[#0F172A] uppercase tracking-wide">
                    Mobile Verification
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    We've sent a 6-digit OTP to your mobile number.
                  </p>
                </div>
                <Phone className="w-4 h-4 text-slate-400" />
              </div>

              <OtpBoxGroup
                digits={mobileOtpDigits}
                onChange={(d) => {
                  setMobileOtpDigits(d);
                  if (error) setError('');
                }}
                disabled={isLoading}
                idPrefix="mobile-otp"
              />

              <div className="flex items-center justify-end text-[11px] text-slate-600 pt-0.5">
                {mobileCooldown > 0 ? (
                  <span className="font-mono font-bold text-slate-700">
                    Resend Mobile OTP in {formatCooldown(mobileCooldown)}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendMobileOtp}
                    disabled={resendingMobile || isLoading}
                    className="font-extrabold text-[#0F172A] hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    {resendingMobile && <RotateCw className="w-3 h-3 animate-spin" />}
                    Resend Mobile OTP
                  </button>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={
                  isLoading ||
                  emailOtpDigits.join('').length !== 6 ||
                  mobileOtpDigits.join('').length !== 6
                }
                className="w-full py-3.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying & Creating Account...</span>
                  </>
                ) : (
                  <span>Verify & Create Account</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Terms footer */}
        <div className="mt-7 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-500 leading-relaxed font-mono">
          By signing up, you agree to our{' '}
          <Link to="/terms" className="text-slate-800 font-bold underline hover:text-black">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-slate-800 font-bold underline hover:text-black">
            Privacy Policy
          </Link>.
        </div>
      </Card>
    </div>
  );
};

/* ====================================================================
   FORGOT PASSWORD PAGE (EMAIL OTP RESET FLOW)
   ==================================================================== */
export const ForgotPasswordPage: React.FC = () => {
  const [login, setLogin] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || isLoading) return;

    setError('');
    setIsLoading(true);

    try {
      const res = await requestPasswordReset({ login: login.trim() });
      setIsLoading(false);
      setIsOtpSent(true);
      setSuccessMsg(res.message || 'Verification code sent to your registered email.');
    } catch (err: any) {
      setIsLoading(false);
      console.error('Password reset request error:', err);
      setError(err?.response?.data?.message || err?.message || 'Could not send verification code.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6 || newPassword.length < 8 || newPassword !== confirmPassword || isLoading) return;

    setError('');
    setIsLoading(true);

    try {
      const res = await resetPasswordWithOtp({
        login: login.trim(),
        otp: fullOtp,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      setIsLoading(false);
      setSuccessMsg(res.message || 'Password reset successfully. Redirecting to login...');
      setTimeout(() => {
        navigate('/sign-in');
      }, 1500);
    } catch (err: any) {
      setIsLoading(false);
      console.error('Password reset error:', err);
      setError(err?.response?.data?.message || err?.message || 'Invalid verification code or password mismatch.');
    }
  };

  return (
    <div className="bg-[#F8F9FA] min-h-[75vh] flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-xl border border-[#E5E7EB] rounded-2xl">
        <div className="text-center mb-6">
          <img
            src="/gstrepotis.png"
            alt="GST Repotis Logo"
            className="h-10 w-auto object-contain mx-auto mb-3.5"
          />
          <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">
            Reset Password
          </h2>
          <p className="text-xs text-[#64748B] mt-1.5 font-medium">
            {isOtpSent
              ? 'Enter the 6-digit code sent to your email and your new password'
              : 'Enter your registered Email ID or Mobile Number'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-xs text-[#DC2626] rounded-xl mb-5 flex items-start gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="flex-1 leading-relaxed">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl mb-5 flex items-start gap-2.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="flex-1 leading-relaxed">{successMsg}</p>
          </div>
        )}

        {!isOtpSent ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label htmlFor="reset-login" className="block text-xs font-bold text-[#1E293B] mb-1.5">
                Email ID / Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                id="reset-login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Enter registered Email or Mobile"
                required
                disabled={isLoading}
                className="w-full px-4 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !login.trim()}
              className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Verification Code...</span>
                </>
              ) : (
                <span>Send Verification Code</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link to="/sign-in" className="text-xs font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1.5">
                6-Digit Verification Code <span className="text-red-500">*</span>
              </label>
              <OtpBoxGroup
                digits={otpDigits}
                onChange={(d) => {
                  setOtpDigits(d);
                  if (error) setError('');
                }}
                disabled={isLoading}
                autoFocusFirst={true}
                idPrefix="reset-otp"
              />
            </div>

            <div>
              <label htmlFor="reset-new-password" className="block text-xs font-bold text-[#1E293B] mb-1.5">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  className="w-full px-4 pr-11 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reset-confirm-password" className="block text-xs font-bold text-[#1E293B] mb-1.5">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                id="reset-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full px-4 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-xl"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otpDigits.join('').length !== 6 || newPassword.length < 8 || newPassword !== confirmPassword}
              className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Resetting Password...</span>
                </>
              ) : (
                <span>Save New Password</span>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsOtpSent(false)}
                className="text-xs font-bold text-slate-600 hover:text-black inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Re-enter Email/Mobile
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
