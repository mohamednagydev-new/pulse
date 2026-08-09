import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';
import { setApiLang } from './lib/api';

// Arabic-first: the audience is Egyptian — a new device opens in Arabic and
// the toggle switches to English for those who prefer it.
const saved = localStorage.getItem('fitit_lang') || 'ar';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: saved,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function applyDir(lang: string) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
}

export function changeLanguage(lang: string) {
  localStorage.setItem('fitit_lang', lang);
  setApiLang(lang);
  i18n.changeLanguage(lang);
  applyDir(lang);
  // Reload so all cached content re-fetches in the new locale.
  window.location.reload();
}

// Apply direction on first load.
applyDir(saved);
setApiLang(saved);

export default i18n;
