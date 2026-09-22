import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import type { Auth } from 'firebase/auth';

/**
 * Static build-time references to Vite environment variables.
 * Note: Vite requires literal `import.meta.env.VITE_*` expressions for build-time inlining.
 */
const buildTimeEnv = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};

export interface SanitizedEnvMeta {
  clean: string;
  hasQuotes: boolean;
  hasWhitespace: boolean;
  isPlaceholder: boolean;
}

/**
 * Sanitizes environment variable values:
 * - Trims all whitespace (including non-breaking spaces \u00A0)
 * - Strips accidental surrounding double quotes ("), single quotes ('), backticks (`), or smart quotes (“ ” ‘ ’)
 * - Strips escaped quotes (\"...\") and trailing commas or semicolons
 * - Identifies obvious placeholders (e.g. "AIzaSy..." ending with dots)
 */
export function sanitizeEnvValue(raw: unknown): SanitizedEnvMeta {
  if (typeof raw !== 'string') {
    return { clean: '', hasQuotes: false, hasWhitespace: false, isPlaceholder: false };
  }

  const original = raw;
  let val = raw.trim().replace(/^[\u00A0\s]+|[\u00A0\s]+$/g, '');
  const hasWhitespace = original !== val;

  let hasQuotes = false;
  const quotePattern = /^["'`“”‘’](.*)["'`“”‘’]$/;
  while (quotePattern.test(val)) {
    hasQuotes = true;
    val = val.replace(quotePattern, '$1').trim();
  }

  if (val.startsWith('\\"') && val.endsWith('\\"') && val.length >= 4) {
    hasQuotes = true;
    val = val.slice(2, -2).trim();
  }

  if (val.endsWith(',') || val.endsWith(';')) {
    val = val.slice(0, -1).trim();
  }

  // Detect literal placeholder values like "AIzaSy..."
  const isPlaceholder =
    val.endsWith('...') ||
    val.endsWith('…') ||
    (val.startsWith('AIza') && val.length < 20) ||
    val === 'YOUR_API_KEY';

  return {
    clean: val,
    hasQuotes,
    hasWhitespace,
    isPlaceholder,
  };
}

/**
 * Resolve an environment variable by checking:
 * 1. Runtime window.__ENV__ (injected by Node production server on Railway)
 * 2. Static build-time import.meta.env (inlined during vite build)
 */
export function resolveConfigField(key: keyof typeof buildTimeEnv): {
  value: string;
  source: 'runtime window.__ENV__' | 'build-time import.meta.env' | 'none';
  meta: SanitizedEnvMeta;
} {
  // 1. Check runtime window.__ENV__
  const runtimeRaw =
    typeof window !== 'undefined'
      ? (window as unknown as { __ENV__?: Record<string, string> }).__ENV__?.[key]
      : undefined;

  const runtimeSanitized = sanitizeEnvValue(runtimeRaw);
  if (runtimeSanitized.clean) {
    return {
      value: runtimeSanitized.clean,
      source: 'runtime window.__ENV__',
      meta: runtimeSanitized,
    };
  }

  // 2. Fallback to build-time import.meta.env
  const buildRaw = buildTimeEnv[key];
  const buildSanitized = sanitizeEnvValue(buildRaw);
  if (buildSanitized.clean) {
    return {
      value: buildSanitized.clean,
      source: 'build-time import.meta.env',
      meta: buildSanitized,
    };
  }

  return {
    value: '',
    source: 'none',
    meta: { clean: '', hasQuotes: false, hasWhitespace: false, isPlaceholder: false },
  };
}

/**
 * Exact Firebase Configuration for project gstrepotis.
 * Strict mappings with NO hardcoded fallbacks or placeholders.
 */
export function getFirebaseConfig() {
  return {
    apiKey: resolveConfigField('VITE_FIREBASE_API_KEY').value,
    authDomain: resolveConfigField('VITE_FIREBASE_AUTH_DOMAIN').value,
    projectId: resolveConfigField('VITE_FIREBASE_PROJECT_ID').value,
    storageBucket: resolveConfigField('VITE_FIREBASE_STORAGE_BUCKET').value,
    messagingSenderId: resolveConfigField('VITE_FIREBASE_MESSAGING_SENDER_ID').value,
    appId: resolveConfigField('VITE_FIREBASE_APP_ID').value,
  };
}

export interface SafeFirebaseDiagnostic {
  apiKey: {
    exists: boolean;
    length: number;
    startsWithAIza: boolean;
    source: string;
    isPlaceholder: boolean;
    hasQuotes: boolean;
    hasWhitespace: boolean;
  };
  authDomain: {
    value: string;
    exists: boolean;
    source: string;
  };
  projectId: {
    value: string;
    exists: boolean;
    source: string;
  };
  storageBucket: {
    value: string;
    exists: boolean;
    source: string;
  };
  messagingSenderId: {
    exists: boolean;
    length: number;
    source: string;
  };
  appId: {
    exists: boolean;
    length: number;
    startsWithOneColon: boolean;
    source: string;
  };
}

/**
 * Safe Diagnostic that inspects Firebase configuration health.
 * NEVER prints, logs, or exposes the actual API key.
 */
export function getSafeFirebaseDiagnostic(): SafeFirebaseDiagnostic {
  const apiKeyRes = resolveConfigField('VITE_FIREBASE_API_KEY');
  const authDomainRes = resolveConfigField('VITE_FIREBASE_AUTH_DOMAIN');
  const projectIdRes = resolveConfigField('VITE_FIREBASE_PROJECT_ID');
  const storageBucketRes = resolveConfigField('VITE_FIREBASE_STORAGE_BUCKET');
  const senderIdRes = resolveConfigField('VITE_FIREBASE_MESSAGING_SENDER_ID');
  const appIdRes = resolveConfigField('VITE_FIREBASE_APP_ID');

  const keyVal = apiKeyRes.value;

  return {
    apiKey: {
      exists: Boolean(keyVal),
      length: keyVal.length,
      startsWithAIza: keyVal.startsWith('AIza'),
      source: apiKeyRes.source,
      isPlaceholder: apiKeyRes.meta.isPlaceholder,
      hasQuotes: apiKeyRes.meta.hasQuotes,
      hasWhitespace: apiKeyRes.meta.hasWhitespace,
    },
    authDomain: {
      value: authDomainRes.value,
      exists: Boolean(authDomainRes.value),
      source: authDomainRes.source,
    },
    projectId: {
      value: projectIdRes.value,
      exists: Boolean(projectIdRes.value),
      source: projectIdRes.source,
    },
    storageBucket: {
      value: storageBucketRes.value,
      exists: Boolean(storageBucketRes.value),
      source: storageBucketRes.source,
    },
    messagingSenderId: {
      exists: Boolean(senderIdRes.value),
      length: senderIdRes.value.length,
      source: senderIdRes.source,
    },
    appId: {
      exists: Boolean(appIdRes.value),
      length: appIdRes.value.length,
      startsWithOneColon: appIdRes.value.startsWith('1:'),
      source: appIdRes.source,
    },
  };
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

/**
 * Initialize or retrieve the Firebase App instance.
 * Performs validation before calling Firebase SDK.
 */
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  if (!appInstance) {
    const config = getFirebaseConfig();
    const diagnostic = getSafeFirebaseDiagnostic();

    if (!config.apiKey) {
      throw new Error(
        'Missing VITE_FIREBASE_API_KEY: The environment variable is empty or not loaded. Please set VITE_FIREBASE_API_KEY in your production environment variables.'
      );
    }

    if (diagnostic.apiKey.isPlaceholder) {
      throw new Error(
        "VITE_FIREBASE_API_KEY is a placeholder ('AIzaSy...'). Please update it with your actual Web App API key from Firebase Console."
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

// Log safe diagnostic in browser environment for troubleshooting without exposing secrets
if (typeof window !== 'undefined') {
  try {
    const diagnostic = getSafeFirebaseDiagnostic();
    (window as unknown as { __FIREBASE_DIAGNOSTIC__?: SafeFirebaseDiagnostic }).__FIREBASE_DIAGNOSTIC__ = diagnostic;

    console.info('[Firebase Safe Diagnostic]', {
      apiKey: {
        exists: diagnostic.apiKey.exists,
        length: diagnostic.apiKey.length,
        startsWithAIza: diagnostic.apiKey.startsWithAIza,
        source: diagnostic.apiKey.source,
        isPlaceholder: diagnostic.apiKey.isPlaceholder,
        hasQuotes: diagnostic.apiKey.hasQuotes,
        hasWhitespace: diagnostic.apiKey.hasWhitespace,
      },
      authDomain: diagnostic.authDomain,
      projectId: diagnostic.projectId,
      storageBucket: diagnostic.storageBucket,
      appId: {
        exists: diagnostic.appId.exists,
        length: diagnostic.appId.length,
        startsWithOneColon: diagnostic.appId.startsWithOneColon,
        source: diagnostic.appId.source,
      },
    });

    const config = getFirebaseConfig();
    if (config.apiKey && !diagnostic.apiKey.isPlaceholder) {
      appInstance = getApps().length === 0 ? initializeApp(config) : getApp();
      authInstance = getAuth(appInstance);
    }
  } catch (err) {
    console.warn('[Firebase Load Warning]', err);
  }
}

/**
 * Proxy export for auth to ensure safe lazy access.
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
