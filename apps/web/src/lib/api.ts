/** Base URL for every API/media/socket request. Empty on the web build (same-
 *  origin relative URLs, behavior unchanged); set to the absolute origin
 *  (https://pulse.geddo.online) for the Capacitor iOS build, where the WebView
 *  runs at capacitor://localhost and relative '/api' would go nowhere. */
export const API_BASE = (import.meta.env.VITE_API_BASE as string) || '';

/** True when running inside the Capacitor native shell (iOS/Android app). */
export const IS_NATIVE = !!(window as any).Capacitor?.isNativePlatform?.();

/** Prefix a server-issued media path ('/media/...') with the API origin.
 *  Absolute http(s) URLs and bundled assets pass through untouched. */
export function mediaUrl(p: string): string {
  return p.startsWith('/media') ? `${API_BASE}${p}` : p;
}

// ---------------------------------------------------------------------------
// Native refresh-token transport. Inside Capacitor, WKWebView + ITP make the
// httpOnly refresh COOKIE unreliable (cross-site to the API origin), so native
// clients carry the refresh token themselves: the API returns it in the JSON
// body when the request has the `x-client: native` header, and accepts it back
// in the refresh/logout body. localStorage is app-scoped in Capacitor —
// acceptable for v1.
// ---------------------------------------------------------------------------
const NATIVE_RT_KEY = 'pulse-native-rt';

export function getNativeRefreshToken(): string | null {
  return IS_NATIVE ? localStorage.getItem(NATIVE_RT_KEY) : null;
}

/** Persist (rotate) or clear the native refresh token. No-op on the web. */
export function setNativeRefreshToken(t: string | null | undefined) {
  if (!IS_NATIVE) return;
  if (t) localStorage.setItem(NATIVE_RT_KEY, t);
  else localStorage.removeItem(NATIVE_RT_KEY);
}

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

/** Single-flight: parallel 401s (Home mounts ~6 queries) must share ONE
 *  refresh. The server rotates the token on first use, so concurrent refresh
 *  calls with the same cookie made the losers look "denied" → random logouts. */
let refreshInFlight: Promise<RefreshResult> | null = null;

async function tryRefreshEx(): Promise<RefreshResult> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = doRefresh().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

async function doRefresh(): Promise<RefreshResult> {
  // Native: no stored refresh token means there is no session to refresh —
  // short-circuit instead of a doomed network round-trip at every app open.
  if (IS_NATIVE && !getNativeRefreshToken()) return 'denied';
  try {
    // 10s cap: a cold server or dead network must degrade to 'offline', not
    // hold the installed app on its splash screen indefinitely.
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      ...(IS_NATIVE
        ? {
            headers: { 'Content-Type': 'application/json', 'x-client': 'native' },
            body: JSON.stringify({ refreshToken: getNativeRefreshToken() }),
          }
        : {}),
      signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(10000) : undefined,
    });
    if (res.status === 401 || res.status === 403) {
      if (IS_NATIVE) setNativeRefreshToken(null); // the server rejected it — it's dead
      return 'denied';
    }
    if (!res.ok) return 'offline';
    const data = await res.json();
    setAccessToken(data.accessToken);
    if (IS_NATIVE) setNativeRefreshToken(data.refreshToken); // rotated on every refresh
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
  // Arabic UI shows the Arabic variant when the server sent one — a guard
  // message in English-only reads like a bug to an Arabic user.
  if (typeof payload.errorAr === 'string' && document.documentElement.dir === 'rtl') return payload.errorAr;
  if (typeof payload.error === 'string') return payload.error;
  const zod = payload.error?.formErrors ?? payload.error?.fieldErrors;
  if (zod) return 'Please check the form and try again.';
  return fallback;
}

async function request(path: string, options: RequestInit = {}, retry = true): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-lang': lang,
      ...(IS_NATIVE ? { 'x-client': 'native' } : {}),
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
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-lang': lang,
        ...(IS_NATIVE ? { 'x-client': 'native' } : {}),
      },
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
