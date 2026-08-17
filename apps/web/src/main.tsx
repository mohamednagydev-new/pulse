import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './index.css';
import { initTheme } from './lib/theme';
import { toast } from './lib/toast';
import { captureUtm } from './lib/utm';
import { initOfflineQueue } from './lib/offlineQueue';
import { initPixels } from './lib/pixels';

initTheme();
// Ad pixels (no-ops until VITE_FB_PIXEL_ID / VITE_TIKTOK_PIXEL_ID are set) —
// they let campaigns optimize for REGISTRATIONS instead of cheap views.
initPixels();
// Before anything renders: remember which ad brought this visit (utm_*/ttclid/
// fbclid) and log the funnel's first step.
captureUtm();
// Replay any workout completions / set logs that were made offline.
initOfflineQueue();

// Service worker, registered manually (vite.config injectRegister:false) so
// environmental failures are SWALLOWED: in-app browsers abort/time-out SW
// installs routinely, the app works fine without one, and unhandled aborts
// were flooding the crash telemetry.
import('virtual:pwa-register')
  .then(({ registerSW }) => registerSW({ onRegisterError() {} }))
  .catch(() => {});

/**
 * Stale-deploy recovery. Pages are code-split, so after a deploy an installed
 * app (worst on iOS, which aggressively kills/restarts PWAs) can hold an old
 * shell that requests chunk files which no longer exist — the page then simply
 * fails to open. Vite reports that as `vite:preloadError`; one reload fetches
 * the fresh shell and fixes it. The sessionStorage flag stops a reload loop if
 * the network itself is the problem.
 */
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const KEY = 'pulse_chunk_reload';
  if (sessionStorage.getItem(KEY)) return; // already tried once this session
  try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode */ }
  window.location.reload();
});
window.addEventListener('load', () => {
  // A successful load clears the guard so the *next* deploy can also recover.
  setTimeout(() => { try { sessionStorage.removeItem('pulse_chunk_reload'); } catch { /* ignore */ } }, 10_000);
});

// Update checks normally run only at page load — an installed app left open for
// days would never see a deploy. Re-check whenever the app returns to the
// foreground (rate-limited to once per 10 minutes).
let lastUpdateCheck = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden || Date.now() - lastUpdateCheck < 10 * 60_000) return;
  lastUpdateCheck = Date.now();
  navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {});
});

/**
 * Make deploys VISIBLE. registerType 'autoUpdate' swaps the service worker,
 * but the running page keeps the JS/CSS it already loaded — installed-app
 * users kept seeing the old design for days ("the update isn't reflected").
 * When a NEW worker takes control (and one was controlling before — first
 * install also fires this), reload once so the fresh shell actually shows.
 * Mid-workout reloads would destroy a session, so there we defer to the next
 * time the app is backgrounded.
 */
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let refreshed = false;
  const applyUpdate = () => {
    if (refreshed) return;
    refreshed = true;
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // first-ever install claiming the page — nothing stale
    if (window.location.pathname.startsWith('/session')) {
      document.addEventListener('visibilitychange', () => document.hidden && applyUpdate());
      return;
    }
    applyUpdate();
  });
}

const queryClient = new QueryClient({
  // Any failed mutation surfaces a toast automatically — unless the mutation
  // defines its own onError handler, which then owns the error UX (avoids
  // double toasts for the same failure).
  mutationCache: new MutationCache({
    onError: (e, _variables, _context, mutation) => {
      if (mutation.options.onError) return;
      toast(e instanceof Error ? e.message : 'Something went wrong', 'error');
    },
  }),
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
