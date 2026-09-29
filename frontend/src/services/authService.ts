import { apiClient, apiFetch } from './api';

export interface AuthUser {
  id: number;
  firebase_uid?: string | null;
  name: string;
  email: string;
  avatar?: string | null;
  mobile?: string | null;
  user_type?: string;
  role?: string;
  status?: string;
  account_status?: string;
  credits?: number;
  is_admin?: boolean;
  provider?: string;
  last_login_at?: string | null;
  created_at?: string | null;
  email_verified_at?: string | null;
  mobile_verified_at?: string | null;
}

export interface AuthResponse {
  status: string;
  message: string;
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface SignupChallengeResponse {
  status: string;
  requires_verification: boolean;
  signup_token: string;
  email_masked: string;
  mobile_masked: string;
  expires_in_seconds?: number;
  cooldown_seconds?: number;
  message?: string;
}

export interface LoginChallengeResponse {
  status: string;
  requires_otp: boolean;
  challenge_id: string;
  channel?: 'email' | 'sms';
  destination_masked: string;
  email_masked?: string;
  expires_in_seconds?: number;
  cooldown_seconds?: number;
  message?: string;
}

/**
 * Step 1 Signup: Submit Full Name, Email, Mobile, Password -> Generate Dual OTPs
 */
export async function signup(data: {
  name: string;
  email: string;
  mobile: string;
  password: string;
  password_confirmation: string;
}): Promise<SignupChallengeResponse> {
  const response: SignupChallengeResponse = await apiClient.post('/api/auth/signup', data);
  return response;
}

/**
 * Step 2 Signup: Verify Email OTP & Mobile OTP -> Activate Account & Authenticate
 */
export async function verifySignup(data: {
  signup_token: string;
  email_otp: string;
  mobile_otp: string;
}): Promise<AuthResponse> {
  const response: AuthResponse = await apiClient.post('/api/auth/signup/verify', data);

  if (response.access_token) {
    localStorage.setItem('gst_token', response.access_token);
  }
  if (response.user) {
    localStorage.setItem('gst_user', JSON.stringify(response.user));
  }

  return response;
}

/**
 * Resend Signup Email OTP
 */
export async function resendSignupEmailOtp(data: {
  signup_token: string;
}): Promise<{ status: string; message: string; cooldown_seconds?: number }> {
  return await apiClient.post('/api/auth/signup/resend-email-otp', data);
}

/**
 * Resend Signup Mobile OTP
 */
export async function resendSignupMobileOtp(data: {
  signup_token: string;
}): Promise<{ status: string; message: string; cooldown_seconds?: number }> {
  return await apiClient.post('/api/auth/signup/resend-mobile-otp', data);
}

/**
 * Step 1 Login: Verify Email/Mobile + Password -> Trigger Targeted OTP Challenge
 */
export async function loginWithCredentials(data: {
  login: string;
  password: string;
}): Promise<LoginChallengeResponse> {
  const response: LoginChallengeResponse = await apiClient.post('/api/auth/login', data);
  return response;
}

/**
 * Step 2 Login: Verify 6-digit OTP & Complete Authentication
 */
export async function verifyLoginOtp(data: {
  challenge_id: string;
  otp: string;
}): Promise<AuthResponse> {
  const response: AuthResponse = await apiClient.post('/api/auth/login/verify-otp', data);

  if (response.access_token) {
    localStorage.setItem('gst_token', response.access_token);
  }
  if (response.user) {
    localStorage.setItem('gst_user', JSON.stringify(response.user));
  }

  return response;
}

/**
 * Resend Login OTP (Email or Mobile depending on challenge channel)
 */
export async function resendLoginOtp(data: {
  challenge_id: string;
}): Promise<{ status: string; message: string; cooldown_seconds?: number }> {
  return await apiClient.post('/api/auth/login/resend-otp', data);
}

/**
 * Request Password Reset Email OTP
 */
export async function requestPasswordReset(data: {
  login: string;
}): Promise<{ status: string; message: string; destination_masked?: string }> {
  return await apiClient.post('/api/auth/forgot-password/request', data);
}

/**
 * Verify Reset OTP and Set New Password
 */
export async function resetPasswordWithOtp(data: {
  login: string;
  otp: string;
  password: string;
  password_confirmation: string;
}): Promise<{ status: string; message: string }> {
  return await apiClient.post('/api/auth/forgot-password/reset', data);
}

/**
 * Complete user profile
 */
export async function completeUserProfile(data: {
  name: string;
  mobile: string;
}): Promise<AuthUser> {
  const response = await apiClient.post('/api/user/complete-profile', data);
  if (response.user) {
    localStorage.setItem('gst_user', JSON.stringify(response.user));
    return response.user;
  }
  return response;
}

/**
 * Complete Logout: Invalidates backend session and clears local storage
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.warn('Backend logout warning:', err);
  }

  localStorage.removeItem('gst_token');
  localStorage.removeItem('gst_user');
  localStorage.removeItem('gst_admin_authenticated');
  sessionStorage.removeItem('gst_signup_challenge');
  sessionStorage.removeItem('gst_login_challenge');
}

/**
 * Retrieve local cached user
 */
export function getLocalUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('gst_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Check if current session is authenticated
 */
export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem('gst_token'));
}

/**
 * Fetch fresh DB user profile from backend
 */
export async function fetchUserProfile(): Promise<AuthUser | null> {
  try {
    const res = await apiFetch('/api/user/profile');
    if (res.ok) {
      const data = await res.json();
      const user = data.user || data;
      if (user) {
        localStorage.setItem('gst_user', JSON.stringify(user));
        return user;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch user profile:', err);
  }
  return getLocalUser();
}
