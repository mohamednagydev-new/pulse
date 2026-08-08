import { api } from './api';

/**
 * Offline write queue for the moments that matter most: finishing a workout or
 * logging a set in a basement gym with no signal. Failed POSTs park in
 * localStorage and flush when the connection returns — the workout is never
 * lost, the streak still counts.
 */

type Queued = { url: string; body: unknown; ts: number };
const KEY = 'pulse_offline_queue';

function read(): Queued[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function write(q: Queued[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q.slice(-50)));
  } catch {
    /* storage full/unavailable — best effort */
  }
}

export function enqueue(url: string, body: unknown) {
  write([...read(), { url, body, ts: Date.now() }]);
}

/** Server said no on the merits (validation, duplicate) → drop. 401/403 mean
 *  "not signed in right now" — keep those for after the next sign-in. */
const permanentlyRejected = (status?: number) =>
  typeof status === 'number' && status >= 400 && status < 500 && status !== 401 && status !== 403;

let flushing = false;
export async function flushQueue() {
  if (flushing) return;
  const q = read();
  if (!q.length) return;
  flushing = true;
  try {
    const remaining: Queued[] = [];
    for (const item of q) {
      try {
        await api.post(item.url, item.body);
      } catch (e: any) {
        if (!permanentlyRejected(e?.status)) remaining.push(item);
      }
    }
    write(remaining);
  } finally {
    flushing = false;
  }
}

/** Try now; queue on network failure. Throws only on real server rejections. */
export async function postResilient(url: string, body: unknown): Promise<'sent' | 'queued'> {
  try {
    await api.post(url, body);
    return 'sent';
  } catch (e: any) {
    if (permanentlyRejected(e?.status)) throw e;
    enqueue(url, body);
    return 'queued';
  }
}

export function initOfflineQueue() {
  window.addEventListener('online', () => {
    void flushQueue();
  });
  // One delayed flush at startup — after bootstrap has had time to restore auth.
  setTimeout(() => {
    void flushQueue();
  }, 4000);
}
