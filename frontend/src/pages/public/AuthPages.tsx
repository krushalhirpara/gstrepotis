import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { ShieldCheck, CheckCircle2, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { signInWithGoogle } from '../../services/authService';
import { getSafeFirebaseDiagnostic } from '../../services/firebase';

/* ====================================================================
   OFFICIAL GOOGLE "G" LOGO SVG COMPONENT
   ==================================================================== */
export const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
    />
  </svg>
);

/* ====================================================================
   REUSABLE GOOGLE BUTTON COMPONENT
   ==================================================================== */
interface GoogleButtonProps {
  onClick: () => void;
  isLoading: boolean;
  text?: string;
}

export const GoogleAuthButton: React.FC<GoogleButtonProps> = ({
  onClick,
  isLoading,
  text = 'Continue with Google',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white text-[#3C4043] font-medium text-sm rounded-xl border border-[#DADCE0] shadow-sm hover:shadow-md hover:bg-[#F8F9FA] active:bg-[#F1F3F4] transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none focus:outline-none focus:ring-2 focus:ring-black/10`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin text-[#555555]" />
          <span className="font-semibold text-[#3C4043]">Connecting to Google...</span>
        </>
      ) : (
        <>
          <GoogleIcon className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold text-[#3C4043] text-[15px]">{text}</span>
        </>
      )}
    </button>
  );
};

/* ====================================================================
   SAFE ERROR FORMATTER
   ==================================================================== */
function formatAuthError(err: any): string {
  const errorCode = err?.code || '';
  const errorMessage = err?.message || '';

  if (
    errorCode === 'auth/popup-closed-by-user' ||
    errorCode === 'auth/cancelled-popup-request'
  ) {
    return 'Authentication cancelled. Please click the button below to try again.';
  }

  if (errorCode === 'auth/network-request-failed') {
    return 'Network error. Please check your internet connection and try again.';
  }

  if (
    errorCode === 'auth/unauthorized-domain' ||
    errorCode.includes('unauthorized-domain') ||
    errorMessage.toLowerCase().includes('unauthorized-domain') ||
    errorMessage.toLowerCase().includes('unauthorized domain')
  ) {
    const diag = getSafeFirebaseDiagnostic();
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
    return `Firebase domain authorization error (auth/unauthorized-domain): The domain '${currentHost}' is not authorized for the Firebase project linked to your API key (Configured authDomain: '${diag.authDomain.value}', Project: '${diag.projectId.value}'). Checklist: 1) Verify that VITE_FIREBASE_API_KEY belongs to Firebase project '${diag.projectId.value || 'gstrepotis'}' (and not another GCP project), 2) Ensure '${currentHost}' is listed in Firebase Console -> Authentication -> Settings -> Authorized Domains, and 3) Allow up to 10 minutes for Google's cache to propagate.`;
  }

  if (
    errorCode === 'auth/invalid-api-key' ||
    errorCode.includes('api-key-not-valid') ||
    errorMessage.toLowerCase().includes('api-key-not-valid') ||
    errorMessage.toLowerCase().includes('api key not valid')
  ) {
    const diag = getSafeFirebaseDiagnostic();
    if (diag.apiKey.isPlaceholder) {
      return "Firebase configuration error: The API key in environment variables is a placeholder ('AIzaSy...'). Please update VITE_FIREBASE_API_KEY with your real Web App API key from Firebase Console (Project: gstrepotis).";
    }
    if (!diag.apiKey.exists) {
      return 'Firebase configuration error: VITE_FIREBASE_API_KEY is not set or empty in environment variables. Please configure it in your Railway dashboard.';
    }
    if (!diag.apiKey.startsWithAIza) {
      return `Firebase API key error: Key does not start with 'AIza' (length: ${diag.apiKey.length}). Please copy the exact apiKey from Firebase Console.`;
    }
    return `Google rejected the Firebase API key (length: ${diag.apiKey.length}, startsWithAIza: true, source: ${diag.apiKey.source}). Please verify in Firebase Console (Project: gstrepotis -> Web App: GSTSUITES) that this exact Web API Key is active and has Identity Toolkit API enabled.`;
  }

  return errorMessage || 'Unable to authenticate with Google. Please try again.';
}

/* ====================================================================
   SIGN IN PAGE (GOOGLE-ONLY AUTHENTICATION)
   ==================================================================== */
export const SignInPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('gst_token');
    if (token) {
      navigate('/welcome', { replace: true });
    }
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      await signInWithGoogle();
      setIsLoading(false);
      navigate('/welcome');
    } catch (err: any) {
      setIsLoading(false);
      console.error('Google Sign-in error:', err);
      setError(formatAuthError(err));
    }
  };

  return (
    <div className="bg-[#F7F7F7] min-h-[82vh] flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-xl border border-[#E5E5E5] rounded-2xl">
        {/* Header / Brand */}
        <div className="text-center mb-6">
          <img
            src="/gstrepotis.png"
            alt="GST Repotis Logo"
            className="h-10 w-auto object-contain mx-auto mb-3"
          />
          <span className="tech-label block mb-1">AUTHENTICATION</span>
          <h2 className="text-2xl font-extrabold text-[#111111] tracking-tight">
            Sign In to GST Repotis
          </h2>
          <p className="text-xs text-[#555555] mt-1.5 max-w-xs mx-auto leading-relaxed">
            Fast, secure access to your Bank Statement Converter and E-Commerce GSTR-1 filings
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-xs text-[#DC2626] rounded-xl mb-5 flex items-start gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        {/* Google Authentication Button */}
        <div className="space-y-4 pt-2">
          <GoogleAuthButton onClick={handleGoogleLogin} isLoading={isLoading} text="Continue with Google" />

          <p className="text-[11px] text-[#666666] text-center font-mono">
            New user? We'll create your account automatically.
          </p>
        </div>

        {/* Features / Badges */}
        <div className="mt-8 pt-6 border-t border-[#E5E5E5] space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-[#444444]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Instant sign-in with your verified Google account</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#444444]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>50 free trial credits included for bank & GST conversion</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#444444]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Enterprise-grade OpenID Connect security — no passwords</span>
          </div>
        </div>

        {/* Terms footer */}
        <div className="mt-6 pt-4 border-t border-[#E5E5E5] text-center text-[11px] text-[#777777] font-mono leading-relaxed">
          By signing in, you agree to our{' '}
          <Link to="/terms" className="text-black font-semibold underline hover:text-neutral-700">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-black font-semibold underline hover:text-neutral-700">
            Privacy Policy
          </Link>.
        </div>
      </Card>
    </div>
  );
};

/* ====================================================================
   SIGN UP PAGE (GOOGLE-ONLY REGISTRATION)
   ==================================================================== */
export const SignUpPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('gst_token');
    if (token) {
      navigate('/welcome', { replace: true });
    }
  }, [navigate]);

  const handleGoogleSignup = async () => {
    setError('');
    setIsLoading(true);

    try {
      await signInWithGoogle();
      setIsLoading(false);
      navigate('/welcome');
    } catch (err: any) {
      setIsLoading(false);
      console.error('Google Sign-up error:', err);
      setError(formatAuthError(err));
    }
  };

  return (
    <div className="bg-[#F7F7F7] min-h-[82vh] flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-xl border border-[#E5E5E5] rounded-2xl">
        {/* Header / Brand */}
        <div className="text-center mb-6">
          <img
            src="/gstrepotis.png"
            alt="GST Repotis Logo"
            className="h-10 w-auto object-contain mx-auto mb-3"
          />
          <span className="tech-label block mb-1">FREE TRIAL REGISTRATION</span>
          <h2 className="text-2xl font-extrabold text-[#111111] tracking-tight">
            Create Your Account
          </h2>
          <p className="text-xs text-[#555555] mt-1.5 max-w-xs mx-auto leading-relaxed">
            Get 50 free credits to test Bank Conversions & GSTR-1 Reports in seconds
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-xs text-[#DC2626] rounded-xl mb-5 flex items-start gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        {/* Google Authentication Button */}
        <div className="space-y-4 pt-2">
          <GoogleAuthButton
            onClick={handleGoogleSignup}
            isLoading={isLoading}
            text="Continue with Google"
          />

          <p className="text-[11px] text-[#666666] text-center font-mono">
            Already have an account?{' '}
            <Link to="/sign-in" className="font-bold text-black hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        {/* Trial Feature Highlights */}
        <div className="mt-8 pt-6 border-t border-[#E5E5E5] space-y-3 bg-[#FBFBFB] -mx-4 px-4 py-4 rounded-xl border border-neutral-100">
          <div className="flex items-center gap-2.5 text-xs text-[#222222]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">50 complimentary conversion credits included</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#222222]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">18+ Indian Banks PDF to Tally XML & Excel</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#222222]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">Amazon, Flipkart, Meesho GSTR-1 JSON Generator</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#222222]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">No credit card or OTP verification required</span>
          </div>
        </div>

        {/* Terms footer */}
        <div className="mt-6 pt-4 border-t border-[#E5E5E5] text-center text-[11px] text-[#777777] font-mono leading-relaxed">
          By signing up, you agree to our{' '}
          <Link to="/terms" className="text-black font-semibold underline hover:text-neutral-700">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-black font-semibold underline hover:text-neutral-700">
            Privacy Policy
          </Link>.
        </div>
      </Card>
    </div>
  );
};

/* ====================================================================
   FORGOT PASSWORD REDIRECT PAGE
   (Google OAuth handles password recovery through Google Account)
   ==================================================================== */
export const ForgotPasswordPage: React.FC = () => {
  return (
    <div className="bg-[#F7F7F7] min-h-[70vh] flex items-center justify-center py-16 px-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-xl text-center rounded-2xl border border-[#E5E5E5]">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <GoogleIcon className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-extrabold text-[#111111]">Google Authentication</h2>
        <p className="text-xs text-[#555555] mt-2 mb-6 leading-relaxed">
          GST Repotis uses Google Authentication. Your password and account security are managed directly by your Google account.
        </p>

        <Link to="/sign-in">
          <button className="w-full py-3 bg-black text-white font-medium text-xs rounded-xl hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <span>Continue with Google</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </Card>
    </div>
  );
};
