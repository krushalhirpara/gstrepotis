import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirebaseAuth, googleProvider } from './firebase';
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
}

export interface AuthResponse {
  status: string;
  message: string;
  access_token: string;
  token_type: string;
  requires_profile_completion?: boolean;
  user: AuthUser;
}

/**
 * Perform Google Authentication using Firebase Popup SDK
 * and exchange ID token (+ optional name & mobile) with Laravel backend.
 */
export async function signInWithGoogle(extra?: {
  name?: string;
  mobile?: string;
}): Promise<{ user: AuthUser; requires_profile_completion: boolean }> {
  // 1. Obtain clean Firebase Auth instance
  const auth = getFirebaseAuth();

  // 2. Trigger Firebase Google Popup
  const userCredential = await signInWithPopup(auth, googleProvider);
  const firebaseUser = userCredential.user;

  // 3. Obtain fresh Firebase ID Token
  const idToken = await firebaseUser.getIdToken(true);

  // 4. Send Firebase ID token + entered details to backend for server-side verification and user creation/update
  const payload: { id_token: string; name?: string; mobile?: string } = {
    id_token: idToken,
  };

  if (extra?.name && extra.name.trim()) {
    payload.name = extra.name.trim();
  }
  if (extra?.mobile && extra.mobile.trim()) {
    payload.mobile = extra.mobile.trim();
  }

  const response: AuthResponse = await apiClient.post('/api/auth/google', payload);

  // 5. Store authenticated session and user info
  if (response.access_token) {
    localStorage.setItem('gst_token', response.access_token);
  }
  if (response.user) {
    localStorage.setItem('gst_user', JSON.stringify(response.user));
  }

  const requiresProfileCompletion = Boolean(
    response.requires_profile_completion || !response.user?.mobile
  );

  return {
    user: response.user,
    requires_profile_completion: requiresProfileCompletion,
  };
}

/**
 * Complete user profile (Full Name & Mobile Number)
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
 * Complete Logout: Signs out from Firebase and invalidates backend session
 */
export async function logout(): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('Firebase signout warning:', err);
  }

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
