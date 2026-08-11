let accessToken: string | null = null;
let lang: string = localStorage.getItem('fitit_lang') || 'ar';

export function setAccessToken(t: string | null) {
  accessToken = t;
}
export function getAccessToken() {
  return accessToken;
}
export function setApiLang(l: string) {
  lang = l;
}

/** 'denied' = the server rejected the session (log out). 'offline' = the
 *  network failed us (KEEP the session — a dropped packet on a mobile
 *  connection must never sign anyone out). */
type RefreshResult = 'ok' | 'denied' | 'offline';

async function tryRefreshEx(): Promise<RefreshResult> {
  try {
    // 10s cap: a cold server or dead network must degrade to 'offline', not
    // hold the installed app on its splash screen indefinitely.
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(10000) : undefined,
    });
    if (res.status === 401 || res.status === 403) return 'denied';
    if (!res.ok) return 'offline';
    const data = await res.json();
    setAccessToken(data.accessToken);
    return 'ok';
  } catch {
    return 'offline';
  }
}

async function tryRefresh(): Promise<boolean> {
  return (await tryRefreshEx()) === 'ok';
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
    const r = retry ? await tryRefreshEx() : ('denied' as RefreshResult);
    if (r === 'ok') return request(path, options, false);
    if (r === 'denied') {
      // The server itself said no: the session is truly gone. Reset to guest so
      // the user lands on /login instead of a half-broken screen of error toasts.
      // (Event, not a store import — store/auth already imports this module.)
      setAccessToken(null);
      window.dispatchEvent(new Event('pulse:session-expired'));
    }
    // 'offline': transient network failure — the request below still errors,
    // but the session survives and the next successful call recovers.
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

/** Multipart upload with the same 401→refresh→retry the JSON layer gets.
 *  Raw fetch call sites made every upload fail once the access token aged —
 *  a page-reload-fixes-it bug users can't diagnose. */
export async function uploadWithAuth(path: string, form: FormData): Promise<Response> {
  const doFetch = () =>
    fetch(path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'x-lang': lang },
      credentials: 'include',
      body: form,
    });
  let res = await doFetch();
  if (res.status === 401 && (await tryRefresh())) res = await doFetch();
  return res;
}

export const api = {
  get: (p: string) => request(p),
  post: (p: string, body?: unknown) => request(p, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: (p: string, body?: unknown) => request(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: (p: string, body?: unknown) =>
    request(p, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
  // Bootstrap refresh retries once on a transient failure: a single dropped
  // request at app-open must not dump a signed-in user onto the login screen.
  refresh: async () => {
    let r = await tryRefreshEx();
    if (r === 'offline') {
      await new Promise((resolve) => setTimeout(resolve, 900));
      r = await tryRefreshEx();
    }
    return r === 'ok';
  },
};
