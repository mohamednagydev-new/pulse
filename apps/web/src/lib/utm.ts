import { track } from './track';

/** Ad-attribution capture. TikTok/Facebook append utm_* (or ttclid/fbclid) to
 *  the landing URL; we keep FIRST-touch in localStorage so every later funnel
 *  event (onboarding viewed, register done) still knows which ad brought this
 *  person — even days later when they come back direct. */

const KEY = 'pulse_utm';

export function captureUtm() {
  try {
    const p = new URLSearchParams(window.location.search);
    const source =
      p.get('utm_source') || (p.get('ttclid') ? 'tiktok' : p.get('fbclid') ? 'facebook' : null);
    if (source && !localStorage.getItem(KEY)) {
      localStorage.setItem(
        KEY,
        JSON.stringify({ s: source.slice(0, 40), c: p.get('utm_campaign')?.slice(0, 60) ?? null }),
      );
    }
    // One landing event per browser session — the top of the funnel.
    if (!sessionStorage.getItem('pulse_landed')) {
      sessionStorage.setItem('pulse_landed', '1');
      track('funnel-landing', utmMeta());
    }
  } catch {
    /* storage unavailable (private mode) — tracking is best-effort */
  }
}

/** "source" or "source/campaign", "direct" when the visit had no ad tags. */
export function utmMeta(): string {
  try {
    const u = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!u?.s) return 'direct';
    return u.c ? `${u.s}/${u.c}` : u.s;
  } catch {
    return 'direct';
  }
}
