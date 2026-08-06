import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/auth';
import LanguageToggle from '../components/LanguageToggle';
import { track } from '../lib/track';
import { utmMeta } from '../lib/utm';
import { isInAppBrowser } from '../lib/install';

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
    </svg>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Funnel step: ad click → landing → this screen.
  useEffect(() => track('funnel-login-view', utmMeta()), []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password, remember);
      track('funnel-login', utmMeta());
      // Deep links survive the login bounce: RequireAuth put the original
      // destination in state.from — land there, not on Home.
      const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
      navigate(from?.pathname ? `${from.pathname}${from.search ?? ''}` : '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const oauthStatus = searchParams.get('oauth');

  return (
    <div className="min-h-screen">
      <div className="relative rounded-b-[40%] fitness-hero pb-14 pt-16 text-center text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4rem)' }}>
        <div className="absolute end-5 top-6"><LanguageToggle variant="compact" /></div>
        <div className="text-4xl font-extrabold italic">PULSE</div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.25em] opacity-90">{t('auth.tagline')}</div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 px-7 pt-8">
        <div className="relative">
          <Mail size={18} className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field ps-12"
            type="email"
            autoComplete="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="relative">
          <Lock size={18} className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field ps-12"
            type="password"
            autoComplete="current-password"
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <Link to="/forgot-password" className="hover:text-brand-pink">{t('auth.forgot')}</Link>
          <label className="flex items-center gap-2">
            {t('auth.remember')}
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-brand-pink" />
          </label>
        </div>

        {error && <p className="text-center text-sm text-red-500">{error}</p>}
        {oauthStatus === 'unconfigured' && (
          <p className="text-center text-sm text-amber-600">{t('auth.oauthOff')}</p>
        )}
        {oauthStatus === 'email_conflict' && (
          <p className="text-center text-sm text-amber-600">{t('auth.oauthEmailConflict')}</p>
        )}
        {oauthStatus === 'error' && (
          <p className="text-center text-sm text-red-500">{t('auth.oauthError')}</p>
        )}

        <div className="flex items-center gap-3 py-2 text-brand-teal">
          <span className="h-px flex-1 bg-gray-200" /> {t('auth.or')} <span className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Google BLOCKS OAuth inside in-app webviews (403 disallowed_useragent) —
            exactly where FB/TikTok ad traffic lands. Showing the button there sends
            people into a dead end; steer them to email (or a real browser) instead. */}
        {isInAppBrowser() ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-700">
            {t('auth.webviewGoogle')}
          </p>
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => (window.location.href = '/api/auth/google')}
            className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full border border-gray-200 bg-white px-6 py-3 font-semibold text-ink shadow-sm shadow-gray-200/60"
          >
            <GoogleLogo />
            {t('auth.google')}
          </motion.button>
        )}

        <motion.button
          type="submit"
          disabled={busy}
          whileTap={{ scale: 0.97 }}
          className="btn-pill btn-primary w-full gap-2 text-lg disabled:opacity-60"
        >
          {busy ? t('auth.signingIn') : t('auth.signIn')}
          {/* The nudge animation always slid toward +x, which points backwards in RTL —
              a static, mirrored chevron is right in both directions. */}
          <span aria-hidden className="inline-flex">
            <ChevronRight size={20} className="rtl:rotate-180" />
          </span>
        </motion.button>

        <p className="text-center text-sm text-gray-500">
          <Link to="/register" className="font-semibold text-brand-teal underline">{t('auth.noAccount')}</Link> {t('auth.createOne')}
        </p>
        {/* Look-before-you-commit: the biggest post-onboarding drop is people who
            can't see inside. Guests browse content; actions still require an account. */}
        <button
          type="button"
          onClick={() => { track('funnel-guest-browse', utmMeta()); navigate('/programs'); }}
          className="mx-auto block text-center text-sm font-semibold text-brand-pink underline"
        >
          {t('auth.browseFirst')}
        </button>
        {/* Escape hatch for people stuck at the door — goes to the admin inbox. */}
        <p className="pb-8 text-center text-xs text-gray-400">
          <Link to="/contact" className="underline">{t('auth.needHelp')}</Link>
        </p>
      </form>
    </div>
  );
}
