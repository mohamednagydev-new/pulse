import { api } from './api';

/** Fire-and-forget product analytics. Batches events and flushes every few
 *  seconds (or on page hide) so tracking never adds request pressure. */

const queue: { name: string; meta?: string }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  if (!queue.length) return;
  const events = queue.splice(0, 20);
  api.post('/api/events', { events }).catch(() => {});
}

export function track(name: string, meta?: string) {
  queue.push({ name, meta: meta?.slice(0, 200) });
  // void on purpose: track() must never return flush()'s promise — an
  // implicit-return `useEffect(() => track(...))` would hand it to React as a
  // "cleanup" and crash the tree on unmount (the chat-back blank screen).
  if (queue.length >= 15) {
    void flush();
    return;
  }
  if (!timer) timer = setTimeout(flush, 4000);
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
  });
  window.addEventListener('pagehide', flush);

  // Crash telemetry: errors the user never reports still reach the admin
  // analytics (they show up under top events as "client-error"). Rate-limited
  // so an error loop cannot flood the events endpoint.
  let reported = 0;
  // Known junk from scripts we don't own: in-app browsers (FB/TikTok Android
  // webviews) inject their own instrumentation and its failures fire on OUR
  // window. "Script error." is the anonymized cross-origin echo of the same.
  // Reporting these buries real crashes under noise.
  // browser_declutter etc.: browser-extension scripts crashing in OUR telemetry.
  // EmptyRanges: Safari-internal media bug (no file, line "undefined") around
  // <audio>/<video> buffered ranges. AbortError: a share sheet dismissed or a
  // video.play() interrupted by navigation — user actions, not crashes.
  // InvalidStateError with no filename: same WebKit media internals.
  const NOISE = /Java object is gone|navigation_?performance_?logger|webkit\.messageHandlers|^Script error\b|ResizeObserver loop|Failed to register a ServiceWorker|iframeBridge|browser_declutter|extension:\/\/|EmptyRanges|AbortError|InvalidStateError.*@ (undefined|:)/i;
  const report = (msg: string) => {
    if (reported >= 5 || NOISE.test(msg)) return;
    reported += 1;
    // Screen path included — a minified "TypeError @ react-xyz.js:22" without
    // the route is a mystery; with "@/challenge/abc" it's a bug report.
    track('client-error', `${msg} [${window.location.pathname.slice(0, 50)}]`);
  };
  window.addEventListener('error', (e) => report(`${e.message} @ ${e.filename?.split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => report(`unhandled: ${String(e.reason).slice(0, 150)}`));
}
