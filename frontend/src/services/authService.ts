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

export interface LoginChallengeResponse {
  status: string;
  requires_otp: boolean;
  challenge_id: string;
  email_masked: string;
  expires_in_seconds?: number;
  cooldown_seconds?: number;
  message?: string;
}

/**
 * Direct Signup (Option 1: Name + Mobile + Email + Password)
 * NO OTP during signup. Creates user account immediately.
 */
export async function signup(data: {
  name: string;
  email: string;
  mobile: string;
  password: string;
  password_confirmation: string;
}): Promise<AuthResponse> {
  const response: AuthResponse = await apiClient.post('/api/auth/register', data);

  if (response.access_token) {
    localStorage.setItem('gst_token', response.access_token);
  }
  if (response.user) {
    localStorage.setItem('gst_user', JSON.stringify(response.user));
  }

  return response;
}

/**
 * Step 1 Login: Verify Email/Mobile + Password -> Trigger Email OTP Challenge
 */
export async function loginWithCredentials(data: {
  login: string;
  password: string;
}): Promise<LoginChallengeResponse> {
  const response: LoginChallengeResponse = await apiClient.post('/api/auth/login', data);
  return response;
}

/**
 * Step 2 Login: Verify 6-digit Email OTP & Complete Authentication
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
 * Resend Login Email OTP
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
