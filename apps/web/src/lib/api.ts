/**
 * Thin fetch-based API client for the KataCraft backend.
 *
 * - Attaches `Authorization: Bearer <accessToken>` from the auth store.
 * - On a 401, attempts `POST /auth/refresh` (relies on the httpOnly
 *   `kc_refresh` cookie) exactly once, then retries the original request
 *   with the new access token. If refresh also fails, the caller's request
 *   fails with the original 401 and the auth store is cleared.
 * - JSON in, JSON out. Throws `ApiError` on non-2xx responses.
 */

import { useAuthStore } from '@/state/authStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Set to skip attaching the Authorization header (e.g. login/register). */
  skipAuth?: boolean;
  /** Set to skip the automatic 401 -> refresh -> retry dance. */
  skipRefresh?: boolean;
  /** Extra query params to append. */
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

let refreshPromise: Promise<boolean> | null = null;

/** Attempts to refresh the access token exactly once (dedup concurrent 401s). */
async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken: string };
        useAuthStore.getState().setAccessToken(data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, skipRefresh, query, headers, ...rest } = options;

  const doFetch = async (): Promise<Response> => {
    const finalHeaders = new Headers(headers);
    if (body !== undefined && !finalHeaders.has('Content-Type') && !(body instanceof FormData)) {
      finalHeaders.set('Content-Type', 'application/json');
    }
    if (!skipAuth) {
      const token = useAuthStore.getState().accessToken;
      if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
    }
    return fetch(buildUrl(path, query), {
      ...rest,
      credentials: 'include',
      headers: finalHeaders,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !skipAuth && !skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch();
    } else {
      useAuthStore.getState().clear();
    }
  }

  if (!res.ok) {
    let parsedBody: unknown;
    let message = res.statusText;
    try {
      parsedBody = await res.json();
      if (parsedBody && typeof parsedBody === 'object' && 'message' in parsedBody) {
        const m = (parsedBody as { message: unknown }).message;
        message = Array.isArray(m) ? m.join('; ') : String(m);
      }
    } catch {
      // no JSON body
    }
    throw new ApiError(res.status, message || `Request failed with ${res.status}`, parsedBody);
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T = unknown>(path: string, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T = unknown>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};

/** Resolves a storage key returned by the API (e.g. from /files/:key) into an absolute URL. */
export function fileUrl(pathOrKey: string | null | undefined): string {
  if (!pathOrKey) return '';
  if (pathOrKey.startsWith('http')) return pathOrKey;
  return `${BASE_URL}${pathOrKey.startsWith('/') ? '' : '/'}${pathOrKey}`;
}
