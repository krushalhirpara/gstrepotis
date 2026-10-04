import { apiClient, apiFetch } from './api';

export interface AuthUser {
  id: number;
  name: string;
  full_name?: string;
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
  auth_provider?: string;
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

/**
 * Client Login: Authenticate with Email / User ID + Password
 */
export async function loginWithCredentials(data: {
  login?: string;
  email?: string;
  password: string;
}): Promise<AuthResponse> {
  const payload = {
    email: data.email || data.login,
    login: data.login || data.email,
    password: data.password,
  };

  const response: AuthResponse = await apiClient.post('/api/auth/login', payload);

  if (response.access_token) {
    localStorage.setItem('gst_token', response.access_token);
  }
  if (response.user) {
    localStorage.setItem('gst_user', JSON.stringify(response.user));
  }

  return response;
}

/**
 * Logout: Invalidates backend session and clears local storage
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
  sessionStorage.clear();
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
