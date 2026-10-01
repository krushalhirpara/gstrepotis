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
  validateSignup,
  signupWithFirebase,
  loginWithCredentials,
  verifyLoginEmailOtp,
  resendLoginEmailOtp,
  verifyLoginMobileFirebase,
  verifyGoogleToken,
  requestPasswordReset,
  resetPasswordWithOtp,
} from '../../services/authService';
import {
  sendFirebaseSmsOtp,
  confirmFirebasePhoneOtp,
  signInWithGooglePopup,
  mapFirebaseError,
} from '../../services/firebase';
import { parse10DigitIndianMobile } from '../../utils/phone';
import type { ConfirmationResult } from 'firebase/auth';

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

/**
 * Google SVG Icon
 */
const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

/* ====================================================================
   SIGN IN PAGE (EMAIL OR MOBILE + PASSWORD -> DUAL-CHANNEL OTP VERIFICATION)
   ==================================================================== */
export const SignInPage: React.FC = () => {
  const navigate = useNavigate();

  // Step 1 states
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 OTP states
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpChannel, setOtpChannel] = useState<'email' | 'mobile'>('email');
  const [challengeId, setChallengeId] = useState('');
  const [registeredMobile, setRegisteredMobile] = useState('');
  const [destinationMasked, setDestinationMasked] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  // Status & errors
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('gst_token');
    if (token) {
      navigate('/welcome', { replace: true });
    }
  }, [navigate]);

  // Cooldown countdown timer for resend OTP
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

  // Step 1 Submit: Validate credentials with backend
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

      if (res.requires_otp && res.channel === 'email') {
        // EMAIL FLOW: Email OTP already dispatched by backend SMTP
        setIsLoading(false);
        setOtpChannel('email');
        setChallengeId(res.challenge_id);
        setDestinationMasked(res.destination_masked || res.email_masked || 'your registered email');
        setCooldown(res.cooldown_seconds || 60);
        setIsOtpStep(true);
        setOtpDigits(['', '', '', '', '', '']);
      } else if (res.requires_otp && res.channel === 'mobile') {
        // MOBILE FLOW: Trigger real Firebase Phone Auth to send 6-digit SMS OTP
        const targetMobile = res.mobile || login.trim();
        setRegisteredMobile(targetMobile);
        setChallengeId(res.challenge_id);
        setOtpChannel('mobile');
        setDestinationMasked(res.destination_masked || res.mobile_masked || targetMobile);

        try {
          const confirmRes = await sendFirebaseSmsOtp(targetMobile, 'login-recaptcha-container');
          setConfirmationResult(confirmRes);
          setIsLoading(false);
          setCooldown(60);
          setIsOtpStep(true);
          setOtpDigits(['', '', '', '', '', '']);
        } catch (fbErr: any) {
          setIsLoading(false);
          console.error('Firebase SMS OTP send error:', fbErr);
          setError(mapFirebaseError(fbErr));
        }
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
      if (otpChannel === 'email') {
        // Verify 6-digit Email OTP via backend
        await verifyLoginEmailOtp({
          challenge_id: challengeId,
          otp: fullOtp,
        });

        setIsLoading(false);
        navigate('/welcome', { replace: true });
      } else {
        // Verify Mobile Phone OTP via Firebase
        if (!confirmationResult) {
          throw new Error('Verification session expired. Please sign in again.');
        }

        const fbRes = await confirmFirebasePhoneOtp(confirmationResult, fullOtp);

        // Submit verified Firebase ID token to backend
        await verifyLoginMobileFirebase({
          id_token: fbRes.idToken,
          mobile: registeredMobile,
          challenge_id: challengeId,
        });

        setIsLoading(false);
        navigate('/welcome', { replace: true });
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error('OTP verification error:', err);
      const msg =
        err?.response?.data?.message ||
        mapFirebaseError(err) ||
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
      if (otpChannel === 'email') {
        const res = await resendLoginEmailOtp({ challenge_id: challengeId });
        setResending(false);
        setCooldown(res.cooldown_seconds || 60);
        setSuccessNotice('A new verification code has been sent to your registered email.');
        setOtpDigits(['', '', '', '', '', '']);
      } else {
        const confirmRes = await sendFirebaseSmsOtp(registeredMobile, 'login-recaptcha-container');
        setConfirmationResult(confirmRes);
        setResending(false);
        setCooldown(60);
        setSuccessNotice('A new verification code has been sent to your registered mobile number.');
        setOtpDigits(['', '', '', '', '', '']);
      }
    } catch (err: any) {
      setResending(false);
      console.error('Resend OTP error:', err);
      const msg =
        err?.response?.data?.message ||
        mapFirebaseError(err) ||
        'Please wait before requesting another OTP.';
      setError(msg);
    }
  };

  // Google Sign-in handler
  const handleGoogleSignIn = async () => {
    if (isLoading || isGoogleLoading) return;
    setError('');
    setIsGoogleLoading(true);

    try {
      const { idToken, user } = await signInWithGooglePopup();
      const res = await verifyGoogleToken({ id_token: idToken });

      setIsGoogleLoading(false);

      if (res.status === 'success') {
        navigate('/welcome', { replace: true });
      } else if (res.status === 'profile_incomplete') {
        // Save pending Google user profile info and redirect to profile completion
        const googleUserData = res.google_user || {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || '',
          picture: user.photoURL || null,
        };
        sessionStorage.setItem('gst_google_user', JSON.stringify(googleUserData));
        navigate('/complete-profile', { replace: true, state: { google_user: googleUserData } });
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      console.error('Google Sign-in error:', err);
      setError(mapFirebaseError(err));
    }
  };

  const handleBackToLogin = () => {
    setIsOtpStep(false);
    setChallengeId('');
    setConfirmationResult(null);
    setError('');
    setSuccessNotice('');
  };

  return (
    <div className="bg-[#F8F9FA] min-h-[82vh] flex items-center justify-center py-16 px-4">
      {/* Invisible container for Firebase Phone reCAPTCHA */}
      <div id="login-recaptcha-container"></div>

      <Card className="w-full max-w-md p-8 bg-white shadow-xl border border-[#E5E7EB] rounded-2xl">
        {/* Header / Brand */}
        <div className="text-center mb-7">
          <img
            src="/gstrepotis.png"
            alt="GST Repotis Logo"
            className="h-10 w-auto object-contain mx-auto mb-3.5"
          />
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            {isOtpStep
              ? otpChannel === 'email'
                ? 'Verify Your Email'
                : 'Verify Your Mobile Number'
              : 'Sign In'}
          </h2>
          <p className="text-xs text-[#64748B] mt-1.5 font-medium">
            {isOtpStep
              ? otpChannel === 'email'
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
          <div className="space-y-4">
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
                    placeholder="Enter Email or 10-digit Mobile"
                    required
                    disabled={isLoading || isGoogleLoading}
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
                    disabled={isLoading || isGoogleLoading}
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
                  disabled={isLoading || isGoogleLoading || !login.trim() || !password}
                  className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </div>

              {/* Divider: OR SIGN IN WITH GOOGLE */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">
                    OR SIGN IN WITH GOOGLE
                  </span>
                </div>
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#1E293B] font-bold text-xs rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60 flex items-center justify-center"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <GoogleIcon />
                )}
                <span>Continue with Google</span>
              </button>

              <p className="text-xs text-slate-600 text-center pt-2">
                Don't have an account?{' '}
                <Link to="/sign-up" className="font-extrabold text-[#0F172A] hover:underline uppercase tracking-wide">
                  CREATE
                </Link>
              </p>
            </form>
          </div>
        ) : (
          /* STEP 2: OTP VERIFICATION SCREEN */
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
              <p className="text-xs text-slate-600">
                {otpChannel === 'email'
                  ? "We've sent a 6-digit OTP to:"
                  : "We've sent a 6-digit OTP to:"}
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
                  {resending ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
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
   SIGN UP PAGE (MOBILE FIREBASE OTP VERIFICATION ONLY)
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

  // Step 2 Mobile Verification states
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [maskedMobile, setMaskedMobile] = useState('');
  const [canonicalMobile, setCanonicalMobile] = useState('');
  const [mobileOtpDigits, setMobileOtpDigits] = useState(['', '', '', '', '', '']);
  const [mobileCooldown, setMobileCooldown] = useState(60);
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('gst_token');
    if (token) {
      navigate('/welcome', { replace: true });
    }
  }, [navigate]);

  // Cooldown countdown timer for Mobile resend
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isOtpStep && mobileCooldown > 0) {
      timer = setInterval(() => {
        setMobileCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOtpStep, mobileCooldown]);

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

  // Step 1: Pre-validate & start Firebase Phone Authentication
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      name: true,
      mobile: true,
      email: true,
      password: true,
      confirm: true,
    });

    if (!isFormValid || isLoading || isGoogleLoading) return;

    setError('');
    setSuccessNotice('');
    setIsLoading(true);

    const submittedEmail = email.trim().toLowerCase();
    const normalizedNumber = mobileParsed.canonical;

    try {
      // 1. Validate form fields & duplicate email/mobile on backend
      await validateSignup({
        name: trimmedName,
        email: submittedEmail,
        mobile: normalizedNumber,
        password,
        password_confirmation: passwordConfirmation,
      });

      // 2. Start Firebase Phone Authentication -> sends REAL 6-digit SMS OTP to exact mobile
      const confirmRes = await sendFirebaseSmsOtp(normalizedNumber, 'signup-recaptcha-container');

      setIsLoading(false);
      setConfirmationResult(confirmRes);
      setCanonicalMobile(normalizedNumber);
      setMaskedMobile(`+91 ******${normalizedNumber.slice(-4)}`);
      setMobileCooldown(60);
      setIsOtpStep(true);
      setMobileOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setIsLoading(false);
      console.error('Signup validation / SMS send error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.mobile?.[0] ||
        err?.response?.data?.errors?.email?.[0] ||
        err?.response?.data?.errors?.password?.[0] ||
        err?.response?.data?.errors?.name?.[0] ||
        mapFirebaseError(err) ||
        'Could not complete registration. Please check your inputs.';
      setError(msg);
    }
  };

  // Step 2: Verify Firebase Mobile OTP & Finalize Account Creation
  const handleVerifyMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = mobileOtpDigits.join('');

    if (fullOtp.length !== 6 || isLoading) {
      setError('Please enter the 6-digit mobile verification code.');
      return;
    }

    if (!confirmationResult) {
      setError('Registration verification session expired. Please sign up again.');
      return;
    }

    setError('');
    setSuccessNotice('');
    setIsLoading(true);

    try {
      // 1. Confirm OTP with Firebase Phone Auth
      const fbRes = await confirmFirebasePhoneOtp(confirmationResult, fullOtp);

      // 2. Submit verified Firebase ID token to Laravel backend
      await signupWithFirebase({
        name: trimmedName,
        email: email.trim().toLowerCase(),
        mobile: canonicalMobile,
        password,
        password_confirmation: passwordConfirmation,
        id_token: fbRes.idToken,
      });

      setIsLoading(false);
      navigate('/welcome', { replace: true });
    } catch (err: any) {
      setIsLoading(false);
      console.error('Mobile OTP verification error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.mobile?.[0] ||
        mapFirebaseError(err) ||
        'Invalid verification code. Please check and try again.';
      setError(msg);
    }
  };

  // Resend Mobile SMS OTP
  const handleResendMobileOtp = async () => {
    if (mobileCooldown > 0 || resendingMobile || isLoading) return;

    setError('');
    setResendingMobile(true);

    try {
      const confirmRes = await sendFirebaseSmsOtp(canonicalMobile, 'signup-recaptcha-container');
      setConfirmationResult(confirmRes);
      setResendingMobile(false);
      setMobileCooldown(60);
      setSuccessNotice('A new verification code has been sent to your mobile number.');
      setMobileOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setResendingMobile(false);
      console.error('Resend SMS OTP error:', err);
      setError(mapFirebaseError(err) || 'Please wait before requesting another OTP.');
    }
  };

  // Google Sign-up handler
  const handleGoogleSignUp = async () => {
    if (isLoading || isGoogleLoading) return;
    setError('');
    setIsGoogleLoading(true);

    try {
      const { idToken, user } = await signInWithGooglePopup();
      const res = await verifyGoogleToken({ id_token: idToken });

      setIsGoogleLoading(false);

      if (res.status === 'success') {
        navigate('/welcome', { replace: true });
      } else if (res.status === 'profile_incomplete') {
        const googleUserData = res.google_user || {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || '',
          picture: user.photoURL || null,
        };
        sessionStorage.setItem('gst_google_user', JSON.stringify(googleUserData));
        navigate('/complete-profile', { replace: true, state: { google_user: googleUserData } });
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      console.error('Google Sign-up error:', err);
      setError(mapFirebaseError(err));
    }
  };

  const handleBackToSignup = () => {
    setIsOtpStep(false);
    setConfirmationResult(null);
    setError('');
    setSuccessNotice('');
  };

  return (
    <div className="bg-[#F8F9FA] min-h-[82vh] flex items-center justify-center py-16 px-4">
      {/* Invisible container for Firebase Phone reCAPTCHA */}
      <div id="signup-recaptcha-container"></div>

      <Card className="w-full max-w-md p-8 bg-white shadow-xl border border-[#E5E7EB] rounded-2xl">
        {/* Header / Brand */}
        <div className="text-center mb-6">
          <img
            src="/gstrepotis.png"
            alt="GST Repotis Logo"
            className="h-10 w-auto object-contain mx-auto mb-3.5"
          />
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            {isOtpStep ? 'Verify Your Mobile Number' : 'Sign Up'}
          </h2>
          <p className="text-xs text-[#64748B] mt-1.5 font-medium">
            {isOtpStep
              ? "We've sent a 6-digit OTP to your mobile number."
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
          <div className="space-y-4">
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
                    disabled={isLoading || isGoogleLoading}
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
                    disabled={isLoading || isGoogleLoading}
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
                    disabled={isLoading || isGoogleLoading}
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
                    disabled={isLoading || isGoogleLoading}
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
                    disabled={isLoading || isGoogleLoading}
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
                  disabled={isLoading || isGoogleLoading || !isFormValid}
                  className="w-full py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending SMS Verification Code...</span>
                    </>
                  ) : (
                    <span>Sign Up</span>
                  )}
                </button>
              </div>

              {/* Divider: OR SIGN UP WITH GOOGLE */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">
                    OR SIGN UP WITH GOOGLE
                  </span>
                </div>
              </div>

              {/* Google Sign Up Button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isLoading || isGoogleLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#1E293B] font-bold text-xs rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60 flex items-center justify-center"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <GoogleIcon />
                )}
                <span>Continue with Google</span>
              </button>

              <p className="text-xs text-slate-600 text-center pt-2">
                Already have an account?{' '}
                <Link to="/sign-in" className="font-extrabold text-[#0F172A] hover:underline uppercase tracking-wide">
                  LOGIN
                </Link>
              </p>
            </form>
          </div>
        ) : (
          /* STEP 2: MOBILE OTP VERIFICATION SCREEN */
          <form onSubmit={handleVerifyMobileOtp} className="space-y-6">
            {/* Status overview banner */}
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
                  onClick={handleBackToSignup}
                  className="text-[11px] font-bold text-[#0F172A] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Change Mobile Number
                </button>
              </div>
            </div>

            {/* MOBILE VERIFICATION SECTION */}
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

              <OtpBoxGroup
                digits={mobileOtpDigits}
                onChange={(d) => {
                  setMobileOtpDigits(d);
                  if (error) setError('');
                }}
                disabled={isLoading}
                autoFocusFirst={true}
                idPrefix="mobile-signup-otp"
              />

              <div className="flex items-center justify-end text-[11px] text-slate-600 pt-0.5">
                {mobileCooldown > 0 ? (
                  <span className="font-mono font-bold text-slate-700">
                    Resend OTP in {formatCooldown(mobileCooldown)}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendMobileOtp}
                    disabled={resendingMobile || isLoading}
                    className="font-extrabold text-[#0F172A] hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    {resendingMobile && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                    Resend OTP
                  </button>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading || mobileOtpDigits.join('').length !== 6}
                className="w-full py-3.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code & Activating Account...</span>
                  </>
                ) : (
                  <span>Verify OTP</span>
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
   FORGOT PASSWORD PAGE (EMAIL OTP RESET FLOW VIA SMTP)
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
