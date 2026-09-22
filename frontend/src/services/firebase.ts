import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import type { Auth } from 'firebase/auth';

/**
 * Sanitizes environment variable strings:
 * - Trims whitespace
 * - Strips accidental surrounding double quotes (") or single quotes (')
 * - Returns empty string if undefined or non-string
 */
function cleanEnv(value: unknown): string {
  if (typeof value !== 'string') return '';
  let trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Retrieve environment variable cleanly:
 * Checks window.__ENV__ (runtime injected in production) then import.meta.env (build-time Vite)
 */
function getEnv(key: string): string {
  const windowEnv =
    typeof window !== 'undefined'
      ? (window as unknown as { __ENV__?: Record<string, string> }).__ENV__?.[key]
      : undefined;
  const viteEnv = (import.meta.env as Record<string, any>)[key];
  return cleanEnv(windowEnv || viteEnv);
}

/**
 * Get the exact Firebase configuration from environment variables.
 * Uses strict variable names without fallback, placeholder, or extra quotes.
 */
export function getFirebaseConfig() {
  return {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID'),
  };
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

/**
 * Initialize or retrieve the Firebase App instance.
 * Validates that VITE_FIREBASE_API_KEY is present.
 */
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  if (!appInstance) {
    const config = getFirebaseConfig();
    if (!config.apiKey) {
      throw new Error(
        'Missing VITE_FIREBASE_API_KEY: Please configure VITE_FIREBASE_API_KEY in your production environment variables.'
      );
    }
    appInstance = initializeApp(config);
  }
  return appInstance;
}

/**
 * Initialize or retrieve the Firebase Auth instance.
 */
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
}

// Initialized auth instance if API key is present at load time
if (typeof window !== 'undefined') {
  try {
    const config = getFirebaseConfig();
    if (config.apiKey) {
      appInstance = getApps().length === 0 ? initializeApp(config) : getApp();
      authInstance = getAuth(appInstance);
    }
  } catch (e) {
    console.warn('Firebase initial load warning:', e);
  }
}

/**
 * Auth export: Proxies calls to getFirebaseAuth() to ensure safe lazy initialization
 * without throwing on initial module evaluation.
 */
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const realAuth = getFirebaseAuth();
    const val = (realAuth as any)[prop];
    return typeof val === 'function' ? val.bind(realAuth) : val;
  },
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});
