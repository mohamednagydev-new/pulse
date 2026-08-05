/**
 * Shared install-state for the PWA. The `beforeinstallprompt` capture must run
 * at module load — the browser often fires it before React mounts — and both
 * the floating FAB and the banner need the same source of truth.
 */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferredPrompt: InstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    window.dispatchEvent(new CustomEvent('pulse:installable'));
  });
  // Once installed, every install affordance should disappear immediately.
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pulse:installed'));
  });
}

export function getDeferredPrompt(): InstallPromptEvent | null {
  return deferredPrompt;
}

export function clearDeferredPrompt() {
  deferredPrompt = null;
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

/** Can we meaningfully offer an install right now? iOS never fires
 *  beforeinstallprompt, so there the offer is the Add-to-Home-Screen guide. */
export function installAvailable() {
  return !isStandalone() && (Boolean(deferredPrompt) || isIOS());
}

/** Open the install flow (native prompt or iOS guide) from anywhere. */
export function openInstall() {
  window.dispatchEvent(new Event('pulse:install-open'));
}
