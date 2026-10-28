/**
 * Typed API client for Celebra backend.
 * Handles CSRF tokens, session cookies, error normalization.
 */

const rawApiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const API_BASE = rawApiBase.replace(/\/api\/?$/, '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly data: unknown,
  ) {
    super(`API error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Network error — please check your connection.');
    this.name = 'NetworkError';
    if (cause) this.cause = cause;
  }
}

let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('csrftoken');
      if (stored) {
        csrfToken = stored;
        return csrfToken;
      }
    } catch {}
  }

  // Try to get CSRF token from cookie first
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    if (match) {
      csrfToken = match[1];
      return csrfToken;
    }
  }

  // Fetch it from server
  try {
    const res = await fetch(`${API_BASE}/api/csrf/`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && typeof data === 'object' && typeof (data as Record<string, unknown>).csrftoken === 'string') {
        const receivedToken = (data as Record<string, unknown>).csrftoken as string;
        csrfToken = receivedToken;
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('csrftoken', receivedToken);
          } catch {}
        }
        return receivedToken;
      }
      const match = res.headers.get('set-cookie')?.match(/csrftoken=([^;]+)/);
      if (match) csrfToken = match[1];
      // Also check cookie after fetch
      if (typeof document !== 'undefined') {
        const cookieMatch = document.cookie.match(/csrftoken=([^;]+)/);
        if (cookieMatch) csrfToken = cookieMatch[1];
      }
    }
  } catch {
    // ignore — CSRF token may not be needed for GET
  }
  return csrfToken ?? '';
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, headers: extraHeaders = {} } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...extraHeaders,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  if (isMutating) {
    const token = await getCsrfToken();
    if (token) headers['X-CSRFToken'] = token;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal,
    });
  } catch (err) {
    throw new NetworkError(err);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  let data: unknown;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    data = await response.json();
    if (data && typeof data === 'object' && 'csrftoken' in data && typeof (data as Record<string, unknown>).csrftoken === 'string') {
      csrfToken = (data as Record<string, unknown>).csrftoken as string;
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('csrftoken', csrfToken);
        } catch {}
      }
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    // Refresh CSRF on 403
    if (response.status === 403) {
      csrfToken = null;
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('csrftoken');
        } catch {}
      }
    }
    throw new ApiError(response.status, response.statusText, data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
};

export function getFieldErrors(err: unknown): Record<string, string[]> {
  if (err instanceof ApiError && typeof err.data === 'object' && err.data !== null) {
    return err.data as Record<string, string[]>;
  }
  return {};
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const d = err.data;
    if (typeof d === 'object' && d !== null) {
      const obj = d as Record<string, unknown>;
      if (typeof obj.detail === 'string') return obj.detail;
      if (typeof obj.non_field_errors === 'object' && Array.isArray(obj.non_field_errors)) {
        return obj.non_field_errors.join(' ');
      }
      // Return first field error
      const firstKey = Object.keys(obj)[0];
      if (firstKey) {
        const val = obj[firstKey];
        if (Array.isArray(val)) return `${firstKey}: ${val.join(' ')}`;
        if (typeof val === 'string') return `${firstKey}: ${val}`;
      }
    }
    if (err.status === 401) return 'You must be logged in to do that.';
    if (err.status === 403) return 'You do not have permission to do that.';
    if (err.status === 404) return 'Not found.';
    if (err.status === 429) return 'Too many requests. Please wait a moment.';
    return `Error ${err.status}: ${err.statusText}`;
  }
  if (err instanceof NetworkError) return err.message;
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}
