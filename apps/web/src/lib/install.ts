/**
 * Shared install-state for the PWA. The `beforeinstallprompt` capture must run
 * at module load — the browser often fires it before React mounts — and both
 * the floating FAB and the banner need the same source of truth.
 */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferredPrompt: InstallPromptEvent | null = null;

/** Browser tab and installed app are separate windows — inside the tab there is
 *  no universal "already installed" API, so we remember every signal we get:
 *  the appinstalled event, ever having run standalone, the user finishing the
 *  manual guide, and (on Chrome) getInstalledRelatedApps. */
const INSTALLED_KEY = 'pulse_installed';

export function markInstalled() {
  try { localStorage.setItem(INSTALLED_KEY, '1'); } catch { /* private mode */ }
  deferredPrompt = null;
  window.dispatchEvent(new CustomEvent('pulse:installed'));
}

function knownInstalled() {
  try { return localStorage.getItem(INSTALLED_KEY) === '1'; } catch { return false; }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    window.dispatchEvent(new CustomEvent('pulse:installable'));
  });
  // Once installed, every install affordance should disappear immediately —
  // and stay gone on future browser-tab visits, not just this session.
  window.addEventListener('appinstalled', markInstalled);
  // Running inside the installed app is itself proof (storage is shared with
  // the browser profile on Android, so the tab benefits too).
  if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true) {
    try { localStorage.setItem(INSTALLED_KEY, '1'); } catch { /* private mode */ }
  }
  // Chrome Android can answer directly when the manifest lists itself as a
  // related webapp. Fire-and-forget; browsers without the API just skip it.
  (navigator as any).getInstalledRelatedApps?.()
    .then((apps: unknown[]) => { if (apps?.length) markInstalled(); })
    .catch(() => {});
}

export function getDeferredPrompt(): InstallPromptEvent | null {
  return deferredPrompt;
}

export function clearDeferredPrompt() {
  deferredPrompt = null;
}

export function isIOS() {
  // iPadOS 13+ reports a Macintosh UA — the touch check catches it.
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

/** In-app browsers (Instagram/Facebook/Messenger/TikTok webviews) cannot add
 *  to the home screen at all — the user must escape to a real browser first. */
export function isInAppBrowser() {
  return /instagram|fban|fbav|fb_iab|messenger|tiktok|snapchat|line\//i.test(navigator.userAgent);
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

/** Can we meaningfully offer an install right now? Every non-installed mobile
 *  browser has a path: the native prompt (Chrome/Android), the share-menu
 *  guide (iOS — Apple exposes no install API, by design), the browser-menu
 *  guide (Firefox/others), or the escape-to-a-real-browser guide (in-app
 *  webviews). Desktop is behind the QR gate anyway. */
export function installAvailable() {
  return !isStandalone() && !knownInstalled();
}

/** Open the install flow (native prompt or iOS guide) from anywhere. */
export function openInstall() {
  window.dispatchEvent(new Event('pulse:install-open'));
}
