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
  if (queue.length >= 15) return flush();
  if (!timer) timer = setTimeout(flush, 4000);
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
  });
  window.addEventListener('pagehide', flush);
}
