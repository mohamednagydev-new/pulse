/**
 * Ad-platform pixels (Meta + TikTok). Without these, campaigns can only be
 * optimized for views/clicks — the platforms never learn WHO registers, so
 * they keep buying cheap eyeballs. With them, campaigns optimize for
 * CompleteRegistration and the algorithm finds people who actually sign up.
 *
 * IDs are public by nature (visible in any page source), configured at build
 * time via apps/web/.env.production:
 *   VITE_FB_PIXEL_ID=...      (Meta Events Manager → Data sources → your pixel)
 *   VITE_TIKTOK_PIXEL_ID=...  (TikTok Ads Manager → Assets → Events)
 * Empty/missing = that pixel never loads (no scripts, no requests).
 */

const FB_ID = (import.meta.env.VITE_FB_PIXEL_ID as string | undefined)?.trim();
const TT_ID = (import.meta.env.VITE_TIKTOK_PIXEL_ID as string | undefined)?.trim();
// Google Ads: AW-XXXXXXXXX plus the signup conversion LABEL from
// Google Ads → Goals → Conversions → your action → tag setup.
const GADS_ID = (import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined)?.trim();
const GADS_SIGNUP = (import.meta.env.VITE_GOOGLE_ADS_SIGNUP_LABEL as string | undefined)?.trim();

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (e: string, p?: object) => void; page: () => void; load: (id: string) => void };
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function initPixels() {
  if (FB_ID) {
    // Standard Meta pixel bootstrap, minified.
    const f = window as any;
    if (!f.fbq) {
      const n: any = (f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(s);
    }
    f.fbq('init', FB_ID);
    f.fbq('track', 'PageView');
  }

  if (TT_ID) {
    const w = window as any;
    if (!w.ttq) {
      // Standard TikTok pixel bootstrap.
      w.TiktokAnalyticsObject = 'ttq';
      const ttq: any = (w.ttq = w.ttq || []);
      ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
      ttq.setAndDefer = function (t: any, e: string) {
        t[e] = function () {
          t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (const m of ttq.methods) ttq.setAndDefer(ttq, m);
      ttq.load = function (id: string) {
        const s = document.createElement('script');
        s.async = true;
        s.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${id}&lib=ttq`;
        document.head.appendChild(s);
        ttq._i = ttq._i || {};
        ttq._i[id] = [];
        ttq._t = ttq._t || {};
        ttq._t[id] = +new Date();
        ttq._o = ttq._o || {};
      };
      ttq.load(TT_ID);
      ttq.page();
    }
  }

  if (GADS_ID) {
    // Google Ads (gtag) — for search/YouTube/display campaigns pointed at the
    // website. Play App Campaigns need NO tag: Google counts installs itself.
    const w = window as any;
    if (!w.gtag) {
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${GADS_ID}`;
      document.head.appendChild(s);
      w.dataLayer = w.dataLayer || [];
      w.gtag = function () { w.dataLayer.push(arguments); };
      w.gtag('js', new Date());
      w.gtag('config', GADS_ID);
    }
  }
}

/** PROXY values in EGP: the app is free, but Meta's event diagnostics demand
 *  value+currency, and value-based optimization needs SOME consistent scale.
 *  These are our own lead-value estimates, not prices — a registration is
 *  simply worth ~20x a page view to us. */
const CURRENCY = 'EGP';
const VALUE_VIEW = 0.25;
const VALUE_REGISTRATION = 5;

/** The one event that matters: an account was created. Both platforms use it
 *  as the optimization goal for signup campaigns. */
export function pixelRegistration() {
  try {
    window.fbq?.('track', 'CompleteRegistration', { value: VALUE_REGISTRATION, currency: CURRENCY });
    window.ttq?.track('CompleteRegistration', { value: VALUE_REGISTRATION, currency: CURRENCY });
    if (GADS_ID && GADS_SIGNUP) {
      window.gtag?.('event', 'conversion', { send_to: `${GADS_ID}/${GADS_SIGNUP}`, value: VALUE_REGISTRATION, currency: CURRENCY });
    }
  } catch {
    /* ad blockers — never break the app for tracking */
  }
}

/** Softer intent signals — useful for retargeting audiences. */
export function pixelViewContent(name: string) {
  try {
    window.fbq?.('track', 'ViewContent', { content_name: name, value: VALUE_VIEW, currency: CURRENCY });
    window.ttq?.track('ViewContent', { content_name: name, value: VALUE_VIEW, currency: CURRENCY });
  } catch {
    /* ignore */
  }
}
