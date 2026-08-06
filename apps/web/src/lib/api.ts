let accessToken: string | null = null;
let lang: string = localStorage.getItem('fitit_lang') || 'en';

export function setAccessToken(t: string | null) {
  accessToken = t;
}
export function getAccessToken() {
  return accessToken;
}
export function setApiLang(l: string) {
  lang = l;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

function extractError(payload: any, fallback: string): string {
  if (!payload) return fallback;
  if (typeof payload.error === 'string') return payload.error;
  const zod = payload.error?.formErrors ?? payload.error?.fieldErrors;
  if (zod) return 'Please check the form and try again.';
  return fallback;
}

async function request(path: string, options: RequestInit = {}, retry = true): Promise<any> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-lang': lang,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers ?? {}),
    },
    credentials: 'include',
  });

  if (res.status === 401 && !path.includes('/api/auth/')) {
    if (retry && (await tryRefresh())) return request(path, options, false);
    // Refresh failed: the session is gone. Tell the shell to reset to guest so
    // the user lands on /login instead of a half-broken screen of error toasts.
    // (Event, not a store import — store/auth already imports this module.)
    setAccessToken(null);
    window.dispatchEvent(new Event('pulse:session-expired'));
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    // Status travels on the error so callers can react to WHAT failed (403 gate
    // vs 500) instead of pattern-matching message strings — Safari's transient
    // "The network connection was lost" must never be mistaken for a server rule.
    const err = new Error(extractError(payload, res.statusText)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (p: string) => request(p),
  post: (p: string, body?: unknown) => request(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: (p: string, body?: unknown) => request(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: (p: string, body?: unknown) =>
    request(p, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
  refresh: tryRefresh,
};
