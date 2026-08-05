import type { Request } from 'express';

/**
 * Country scoping for the local half of the app.
 *
 * PULSE has two kinds of content and they behave differently:
 *
 *   GLOBAL  — programmes, lessons, exercises, articles, recipes, challenges.
 *             A squat is a squat in Cairo and in Riyadh. Never filtered.
 *   LOCAL   — gyms, deals, store products, events, partners.
 *             A gym in Giza is noise to someone in Jeddah, and a coupon they can
 *             never redeem is worse than noise — it is a broken promise.
 *
 * Only the second list is filtered. Getting this backwards would quietly hide the
 * entire library from anyone outside Egypt, which is the opposite of the intent.
 */

/** Countries we actively serve. Others still work — they just see everything. */
export const SUPPORTED = ['EG', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'MA', 'DZ', 'TN'] as const;

/** Default currency per country. Used when a partner has not set its own. */
export const COUNTRY_CURRENCY: Record<string, string> = {
  EG: 'EGP', SA: 'SAR', AE: 'AED', KW: 'KWD', QA: 'QAR', BH: 'BHD',
  OM: 'OMR', JO: 'JOD', MA: 'MAD', DZ: 'DZD', TN: 'TND',
};

export const COUNTRY_NAME: Record<string, { en: string; ar: string }> = {
  EG: { en: 'Egypt', ar: 'مصر' },
  SA: { en: 'Saudi Arabia', ar: 'السعودية' },
  AE: { en: 'United Arab Emirates', ar: 'الإمارات' },
  KW: { en: 'Kuwait', ar: 'الكويت' },
  QA: { en: 'Qatar', ar: 'قطر' },
  BH: { en: 'Bahrain', ar: 'البحرين' },
  OM: { en: 'Oman', ar: 'عُمان' },
  JO: { en: 'Jordan', ar: 'الأردن' },
  MA: { en: 'Morocco', ar: 'المغرب' },
  DZ: { en: 'Algeria', ar: 'الجزائر' },
  TN: { en: 'Tunisia', ar: 'تونس' },
};

export function isCountry(code: unknown): code is string {
  return typeof code === 'string' && /^[A-Z]{2}$/.test(code);
}

export function normalizeCountry(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const c = raw.trim().toUpperCase();
  return isCountry(c) ? c : null;
}

/**
 * Which country's local content to show, in priority order:
 *   1. an explicit ?country= on the request  (the user is browsing elsewhere)
 *   2. the country saved on their profile
 *   3. a CDN/proxy geo header, if the edge sets one
 *   4. nothing — show everything rather than guess and hide
 *
 * Falling back to "everything" instead of to Egypt matters: a wrong guess that hides
 * content is invisible to us and infuriating to them.
 */
export function resolveCountry(req: Request, profileCountry?: string | null): string | null {
  const explicit = normalizeCountry((req.query as Record<string, unknown>)?.country);
  if (explicit) return explicit;

  const saved = normalizeCountry(profileCountry);
  if (saved) return saved;

  const header =
    req.headers['cf-ipcountry'] ?? // Cloudflare
    req.headers['x-vercel-ip-country'] ??
    req.headers['x-geo-country'];
  const geo = normalizeCountry(Array.isArray(header) ? header[0] : header);
  // "XX" and "T1" are Cloudflare's "unknown / Tor" answers, not places.
  return geo && geo !== 'XX' && geo !== 'T1' ? geo : null;
}

/**
 * A Prisma `where` fragment scoping to a country.
 *
 * `country` is non-nullable with a default of EG on every local model, so there is
 * no "unset" case to allow through — every row belongs somewhere, and everything
 * that existed before this feature is Egyptian, which is true.
 *
 * A null argument means "we do not know where this person is", and then we filter
 * nothing. Guessing and hiding would be invisible to us and maddening to them.
 */
export function countryFilter(country: string | null): { country?: string } {
  return country ? { country } : {};
}

export function currencyFor(country: string | null): string {
  return (country && COUNTRY_CURRENCY[country]) || 'EGP';
}

/**
 * The country to scope this request to, reading the signed-in user's saved choice.
 *
 * One primary-key lookup, and only when the request is authenticated and has not
 * already answered the question via ?country= or an edge header — so the common
 * cases cost nothing.
 */
export async function countryForRequest(
  req: Request & { userId?: string },
  prisma: { user: { findUnique: (a: any) => Promise<{ country: string | null } | null> } },
): Promise<string | null> {
  const explicit = normalizeCountry((req.query as Record<string, unknown>)?.country);
  if (explicit) return explicit;

  if (req.userId) {
    const u = await prisma.user.findUnique({ where: { id: req.userId }, select: { country: true } });
    const saved = normalizeCountry(u?.country);
    if (saved) return saved;
  }

  return resolveCountry(req, null);
}
