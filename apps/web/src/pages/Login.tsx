import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/auth';
import LanguageToggle from '../components/LanguageToggle';

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
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password, remember);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

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
        {new URLSearchParams(window.location.search).get('oauth') === 'unconfigured' && (
          <p className="text-center text-sm text-amber-600">{t('auth.oauthOff')}</p>
        )}

        <div className="flex items-center gap-3 py-2 text-brand-teal">
          <span className="h-px flex-1 bg-gray-200" /> {t('auth.or')} <span className="h-px flex-1 bg-gray-200" />
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => (window.location.href = '/api/auth/google')}
          className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full border border-gray-200 bg-white px-6 py-3 font-semibold text-ink shadow-sm shadow-gray-200/60"
        >
          <GoogleLogo />
          {t('auth.google')}
        </motion.button>

        <motion.button
          type="submit"
          disabled={busy}
          whileTap={{ scale: 0.97 }}
          className="btn-pill btn-primary w-full gap-2 text-lg disabled:opacity-60"
        >
          {busy ? t('auth.signingIn') : t('auth.signIn')}
          <motion.span
            aria-hidden
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex"
          >
            <ChevronRight size={20} />
          </motion.span>
        </motion.button>

        <p className="pb-8 text-center text-sm text-gray-500">
          <Link to="/register" className="font-semibold text-brand-teal underline">{t('auth.noAccount')}</Link> {t('auth.createOne')}
        </p>
      </form>
    </div>
  );
}
