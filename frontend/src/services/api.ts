/**
 * ====================================================================
 * GST Suite - Centralized API Service Configuration
 * ====================================================================
 *
 * Resolves API URL based on environment:
 * - Production default: https://api.gstrepotis.com
 * - Local dev default:  http://localhost:8000
 * - Overridden by:      import.meta.env.VITE_API_URL
 */

/**
 * Safely sanitizes an API URL string:
 * - Trims whitespace and non-breaking spaces
 * - Strips quotes (", ', `) and trailing slashes
 */
export function sanitizeApiUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let val = raw.trim().replace(/^[\u00A0\s]+|[\u00A0\s]+$/g, '');
  const quotePattern = /^["'`“”‘’](.*)["'`“”‘’]$/;
  while (quotePattern.test(val)) {
    val = val.replace(quotePattern, '$1').trim();
  }
  if (val.startsWith('\\"') && val.endsWith('\\"') && val.length >= 4) {
    val = val.slice(2, -2).trim();
  }
  if (val.endsWith(',') || val.endsWith(';')) {
    val = val.slice(0, -1).trim();
  }
  return val.replace(/\/+$/, '');
}

/**
 * Resolves the active API Base URL:
 * 1. Runtime window.__ENV__.VITE_API_URL (injected by server.cjs in production)
 * 2. Static build-time import.meta.env.VITE_API_URL
 * 3. Fallback: 'http://localhost:8000' in DEV, 'https://api.gstrepotis.com' in PROD
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const runtimeUrl = sanitizeApiUrl((window as unknown as { __ENV__?: { VITE_API_URL?: string } }).__ENV__?.VITE_API_URL);
    if (runtimeUrl) {
      return runtimeUrl;
    }
  }

  const buildUrl = sanitizeApiUrl(import.meta.env.VITE_API_URL);
  if (buildUrl) {
    return buildUrl;
  }

  return import.meta.env.DEV ? 'http://localhost:8000' : 'https://api.gstrepotis.com';
}

// Central API Base URL (dynamic fallback)
export const API_BASE_URL: string = getApiBaseUrl();

/**
 * Construct absolute API URL for a given relative endpoint path
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  if (!endpoint) return baseUrl;
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Retrieve current authentication headers from localStorage
 */
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('gst_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Centralized fetch wrapper
 * - Resolves full API URL via API_BASE_URL
 * - Automatically attaches Bearer token from localStorage
 * - Preserves FormData boundary by NOT setting Content-Type when sending FormData
 * - Automatically adds Content-Type: application/json for raw objects/strings
 * - Handles 401 Unauthorized sessions
 */
export async function apiFetch(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const url = getApiUrl(endpoint);
  const baseUrl = getApiBaseUrl();

  // Temporary production-safe diagnostic logging (NEVER logs tokens or secrets)
  console.info('[API Request Safe Diagnostic]', {
    apiBaseUrl: baseUrl,
    requestUrl: url,
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    hostname: typeof window !== 'undefined' ? window.location.hostname : '',
  });

  const headers = new Headers(options.headers || {});

  // Attach authorization token unless explicitly skipped
  if (!options.skipAuth && !headers.has('Authorization')) {
    const token = localStorage.getItem('gst_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Set JSON content-type if body is not FormData and header not explicitly defined
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle session expiration
  if (response.status === 401) {
    const publicPaths = [
      '/',
      '/sign-in',
      '/sign-up',
      '/forgot-password',
      '/pricing',
      '/about',
      '/tutorials',
      '/contact',
      '/request-demo',
      '/terms',
      '/privacy',
      '/refund-policy',
      '/ceoadmin',
    ];
    const currentPath = window.location.pathname;
    const isPublic = publicPaths.some(
      (p) => p === currentPath || (p !== '/' && currentPath.startsWith(p))
    );

    if (!isPublic) {
      localStorage.removeItem('gst_token');
      localStorage.removeItem('gst_user');
      localStorage.removeItem('gst_admin_authenticated');
      window.location.href = '/sign-in';
    }
  }

  return response;
}

/**
 * Standard REST API Client helpers
 */
export const apiClient = {
  get: async <T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> => {
    const res = await apiFetch(endpoint, { ...options, method: 'GET' });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.statusText || 'Request failed' }));
      throw errorData;
    }
    return res.json();
  },

  post: async <T = any>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<T> => {
    const isFormData = body instanceof FormData;
    const res = await apiFetch(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.statusText || 'Request failed' }));
      throw errorData;
    }
    return res.json();
  },

  put: async <T = any>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<T> => {
    const isFormData = body instanceof FormData;
    const res = await apiFetch(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.statusText || 'Request failed' }));
      throw errorData;
    }
    return res.json();
  },

  patch: async <T = any>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<T> => {
    const isFormData = body instanceof FormData;
    const res = await apiFetch(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.statusText || 'Request failed' }));
      throw errorData;
    }
    return res.json();
  },

  delete: async <T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> => {
    const res = await apiFetch(endpoint, { ...options, method: 'DELETE' });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.statusText || 'Request failed' }));
      throw errorData;
    }
    return res.json();
  },

  upload: async <T = any>(endpoint: string, formData: FormData, options?: ApiRequestOptions): Promise<T> => {
    const res = await apiFetch(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.statusText || 'Upload failed' }));
      throw errorData;
    }
    return res.json();
  },

  downloadBlob: async (endpoint: string, options?: ApiRequestOptions): Promise<Blob> => {
    const res = await apiFetch(endpoint, options);
    if (!res.ok) {
      throw new Error(`Download failed with status ${res.status}`);
    }
    return res.blob();
  },
};
