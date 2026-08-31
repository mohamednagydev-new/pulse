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

/** The native Android app on Google Play — a TWA wrapping this site, so the
 *  content is always current. On Android the store app beats the PWA: real
 *  push delivery, auto-updates, a guaranteed launcher icon, store reviews. */
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=online.geddo.pulse';

/** Set to the real App Store URL the day Apple approves — every "coming soon"
 *  badge flips to a live install link automatically. */
export const APP_STORE_URL: string | null = null;

export function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

/** Android browser (or even an in-app webview — the Play link escapes those
 *  fine, it opens the Play app) that hasn't installed yet → send to the store. */
export function preferPlayStore() {
  return isAndroid() && installAvailable();
}

// The Play (TWA) app announces itself only on its FIRST navigation via the
// android-app:// referrer — remember it, or later loads look like a plain PWA.
const TWA_KEY = 'pulse_twa';
if (typeof document !== 'undefined' && document.referrer.startsWith('android-app://')) {
  try { localStorage.setItem(TWA_KEY, '1'); } catch { /* private mode */ }
}

/** Which surface is running — feeds the platform analytics.
 *  ios-app = App Store build · twa = Google Play app · pwa = installed
 *  web app · web = plain browser tab. */
export function detectPlatform(): 'ios-app' | 'twa' | 'pwa' | 'web' {
  if ((window as any).Capacitor?.isNativePlatform?.()) return 'ios-app';
  let twa = false;
  try { twa = localStorage.getItem(TWA_KEY) === '1'; } catch { /* private mode */ }
  if (twa) return 'twa';
  if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true) return 'pwa';
  return 'web';
}

export function openPlayStore() {
  window.location.href = PLAY_STORE_URL;
}

/** What to call the install action for THIS device, so the button says where
 *  it actually goes instead of a vague "install". */
export function installLabel(isAr: boolean): string {
  if (isAndroid()) return isAr ? 'نزّل التطبيق من Google Play' : 'Get it on Google Play';
  if (isIOS()) return APP_STORE_URL
    ? (isAr ? 'نزّل التطبيق من App Store' : 'Download on the App Store')
    : (isAr ? 'ضيف PULSE على شاشتك' : 'Add PULSE to your Home Screen');
  return isAr ? 'نزّل تطبيق PULSE' : 'Install the PULSE app';
}

/** Where THIS platform's users can leave a store review — null when nowhere
 *  (desktop web, or iPhone before the App Store release goes live). */
export function storeReviewUrl(): string | null {
  if (isAndroid()) return PLAY_STORE_URL;
  if (isIOS() && APP_STORE_URL) return APP_STORE_URL;
  return null;
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
  // The Capacitor iOS/Android app IS the installed app — but its WKWebView
  // reports neither display-mode:standalone nor navigator.standalone, so
  // without this check every install banner showed INSIDE the native app.
  if ((window as any).Capacitor?.isNativePlatform?.()) return true;
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
