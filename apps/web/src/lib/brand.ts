/**
 * PULSE brand constants. Values come from apps/web/.env (committed — brand
 * identity, not secrets); the fallbacks here mean even an env-less build is
 * still PULSE. App code imports names/origins from here — never hardcode.
 */
export const BRAND = (import.meta.env.VITE_BRAND as string) || 'pulse';
export const BRAND_NAME = (import.meta.env.VITE_BRAND_NAME as string) || 'PULSE';
/** 'en' pins i18n to English (no language toggle) on English-only builds. */
export const BRAND_LANG = (import.meta.env.VITE_BRAND_LANG as string) || 'ar';
export const SITE_ORIGIN = (import.meta.env.VITE_SITE_ORIGIN as string) || 'https://pulse.geddo.online';
export const ENGLISH_ONLY = BRAND_LANG === 'en';
