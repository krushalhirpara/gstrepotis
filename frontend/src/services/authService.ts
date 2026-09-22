import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirebaseAuth, googleProvider } from './firebase';
import { apiClient, apiFetch } from './api';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  mobile?: string | null;
  user_type?: string;
  credits?: number;
  is_admin?: boolean;
  provider?: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  access_token: string;
  token_type: string;
  user: AuthUser;
}

/**
 * Perform Google Authentication using Firebase Popup SDK
 * and exchange ID token with Laravel backend.
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  // 1. Obtain clean Firebase Auth instance
  const auth = getFirebaseAuth();

  // 2. Trigger Firebase Google Popup
  const userCredential = await signInWithPopup(auth, googleProvider);
  const firebaseUser = userCredential.user;

  // 3. Obtain fresh Firebase ID Token
  const idToken = await firebaseUser.getIdToken(true);

  // 4. Send Firebase ID token to backend for server-side verification and user login/creation
  const response: AuthResponse = await apiClient.post('/api/auth/google', {
    id_token: idToken,
  });

  // 5. Store authenticated session and user info
  if (response.access_token) {
    localStorage.setItem('gst_token', response.access_token);
  }
  if (response.user) {
    localStorage.setItem('gst_user', JSON.stringify(response.user));
  }

  return response.user;
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
