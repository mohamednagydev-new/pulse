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
  useEffect(() => { track('funnel-login-view', utmMeta()); }, []);

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
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* Same glass-over-photo language as Register — one visual family. */}
      <img src="/landing/scene-coach.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-[#14100c]" aria-hidden />

      <div className="relative flex min-h-screen flex-col px-5 pb-8" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/pwa-192.png" alt="" className="h-9 w-9 rounded-xl shadow-lg" />
            <span className="text-2xl font-extrabold italic">PULSE</span>
          </div>
          <LanguageToggle variant="compact" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="mx-auto mt-8 w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl"
        >
          <h1 className="text-2xl font-extrabold">{t('auth.welcomeBack')}</h1>
          <p className="mt-1 text-sm text-white/70">{t('auth.welcomeBackSub')}</p>

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <div className="relative">
              <Mail size={17} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                className="w-full rounded-2xl border border-white/15 bg-white/10 py-3.5 pe-4 ps-11 text-[15px] text-white outline-none transition placeholder:text-white/45 focus:border-orange-400/70 focus:bg-white/15"
                type="email"
                autoComplete="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock size={17} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                className="w-full rounded-2xl border border-white/15 bg-white/10 py-3.5 pe-4 ps-11 text-[15px] text-white outline-none transition placeholder:text-white/45 focus:border-orange-400/70 focus:bg-white/15"
                type="password"
                autoComplete="current-password"
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm text-white/70">
              <Link to="/forgot-password" className="underline">{t('auth.forgot')}</Link>
              <label className="flex items-center gap-2">
                {t('auth.remember')}
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-orange-500" />
              </label>
            </div>

            {error && <p className="rounded-xl bg-red-500/20 px-3 py-2 text-center text-sm font-semibold text-red-200">{error}</p>}
            {oauthStatus === 'unconfigured' && (
              <p className="rounded-xl bg-amber-400/20 px-3 py-2 text-center text-sm text-amber-200">{t('auth.oauthOff')}</p>
            )}
            {oauthStatus === 'email_conflict' && (
              <p className="rounded-xl bg-amber-400/20 px-3 py-2 text-center text-sm text-amber-200">{t('auth.oauthEmailConflict')}</p>
            )}
            {oauthStatus === 'error' && (
              <p className="rounded-xl bg-red-500/20 px-3 py-2 text-center text-sm text-red-200">{t('auth.oauthError')}</p>
            )}

            <motion.button
              type="submit"
              disabled={busy}
              whileTap={{ scale: 0.97 }}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 text-lg font-extrabold shadow-lg shadow-orange-500/30 transition disabled:opacity-60"
            >
              {busy ? t('auth.signingIn') : t('auth.signIn')}
              {/* Static mirrored chevron — a +x nudge points backwards in RTL. */}
              <span aria-hidden className="inline-flex">
                <ChevronRight size={20} className="rtl:rotate-180" />
              </span>
            </motion.button>

            <div className="flex items-center gap-3 py-1 text-sm text-white/50">
              <span className="h-px flex-1 bg-white/20" /> {t('auth.or')} <span className="h-px flex-1 bg-white/20" />
            </div>

            {/* Google BLOCKS OAuth inside in-app webviews (403 disallowed_useragent) —
                exactly where FB/TikTok ad traffic lands. Steer them to email there. */}
            {isInAppBrowser() ? (
              <p className="rounded-xl bg-amber-400/20 px-4 py-3 text-center text-xs text-amber-200">
                {t('auth.webviewGoogle')}
              </p>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => (window.location.href = '/api/auth/google')}
                className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-3 font-semibold text-ink shadow-lg"
              >
                <GoogleLogo />
                {t('auth.google')}
              </motion.button>
            )}
          </form>
        </motion.div>

        <div className="mt-5 space-y-2.5 text-center">
          <p className="text-sm text-white/80">
            <Link to="/register" className="font-bold text-white underline">{t('auth.noAccount')}</Link> {t('auth.createOne')}
          </p>
          {/* Look-before-you-commit: guests browse content; actions need an account. */}
          <button
            type="button"
            onClick={() => { track('funnel-guest-browse', utmMeta()); navigate('/programs'); }}
            className="mx-auto block text-center text-sm font-semibold text-orange-300 underline"
          >
            {t('auth.browseFirst')}
          </button>
          {/* Escape hatch for people stuck at the door — goes to the admin inbox. */}
          <p className="text-xs text-white/50">
            <Link to="/contact" className="underline">{t('auth.needHelp')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
