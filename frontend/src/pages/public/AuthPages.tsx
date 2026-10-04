import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import {
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { loginWithCredentials } from '../../services/authService';

/**
 * ====================================================================
 * GST REPOTIS — PRIVATE CLIENT LOGIN PAGE
 * ====================================================================
 */
export const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your Email or User ID.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginWithCredentials({
        email: email.trim(),
        password,
      });

      if (response.status === 'success') {
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMessage(response.message || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string; errors?: Record<string, string[]> };
      if (apiErr.errors) {
        const firstErr = Object.values(apiErr.errors).flat()[0];
        setErrorMessage(firstErr || 'Invalid email or password.');
      } else {
        setErrorMessage(apiErr.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FBFBFB]">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <img
              src="/gstrepotis.png"
              alt="GST REPOTIS"
              className="h-10 md:h-12 w-auto object-contain drop-shadow-xs"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
            Sign In
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#64748B] max-w-sm mx-auto">
            Enter your authorized client credentials to access your GST workspace
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-6 sm:p-8 bg-white border border-[#E2E8F0] shadow-sm rounded-2xl">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email / User ID Field */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-mono font-bold text-[#334155] uppercase tracking-wider mb-2"
              >
                Email / User ID
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ca.narendrabhai@gmail.com"
                  disabled={isLoading}
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-mono font-bold text-[#334155] uppercase tracking-wider mb-2"
              >
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  className="block w-full pl-10 pr-11 py-2.5 text-sm bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all disabled:bg-slate-50 disabled:cursor-not-allowed font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#475569] cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="sign-in-submit-btn"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-black hover:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all cursor-pointer shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Footer Notice */}
          <div className="mt-6 pt-5 border-t border-[#F1F5F9] flex items-center justify-center gap-2 text-[11px] font-mono text-[#64748B]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>256-BIT ENCRYPTED • AUTHORIZED CLIENT PORTAL</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

/**
 * Compatibility Aliases
 */
export const SignUpPage: React.FC = () => <Navigate to="/login" replace />;
export const ForgotPasswordPage: React.FC = () => <Navigate to="/login" replace />;
