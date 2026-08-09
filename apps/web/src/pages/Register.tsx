import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Phone, Mail, Lock, MapPin, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/auth';
import { track } from '../lib/track';
import { utmMeta } from '../lib/utm';
import { pixelRegistration } from '../lib/pixels';
import LanguageToggle from '../components/LanguageToggle';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useAuth((s) => s.register);
  // Funnel step: how many ad clicks make it to the register form.
  useEffect(() => track('funnel-register-view', utmMeta()), []);
  const [searchParams] = useSearchParams();
  const [ref] = useState(() => searchParams.get('ref') ?? '');
  const [form, setForm] = useState({ firstName: '', lastName: '', mobile: '', email: '', password: '', zip: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = ref ? { ...form, ref } : form;
      await register(payload);
      track('funnel-registered', utmMeta());
      pixelRegistration();
      /**
       * Land on Home, not on the intake.
       *
       * Sending a brand-new account straight into nine questions asks for commitment
       * before the app has shown anything worth committing to. Home leads with the
       * "build my plan" card, and the intake is asked for again the moment they try
       * to start a programme — by which point the question makes sense to them.
       */
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.signUpFailed'));
    } finally {
      setBusy(false);
    }
  };

  const fields = [
    { k: 'firstName' as const, ph: t('auth.firstName'), icon: User, type: 'text', ac: 'given-name' },
    { k: 'lastName' as const, ph: t('auth.lastName'), icon: User, type: 'text', ac: 'family-name' },
    { k: 'mobile' as const, ph: t('auth.mobile'), icon: Phone, type: 'tel', ac: 'tel' },
    { k: 'email' as const, ph: t('auth.email'), icon: Mail, type: 'email', ac: 'email' },
    { k: 'password' as const, ph: t('auth.password'), icon: Lock, type: 'password', ac: 'new-password' },
    { k: 'zip' as const, ph: t('auth.zip'), icon: MapPin, type: 'text', ac: 'postal-code' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* Real training photo behind a dark grade — the form floats over the
          life you're signing up for, not over a blank page. */}
      <img src="/landing/scene-coach.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-[#14100c]" aria-hidden />

      <div className="relative flex min-h-screen flex-col px-5 pb-8" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/pwa-192.png" alt="" className="h-9 w-9 rounded-xl shadow-lg" />
            <span className="text-2xl font-extrabold italic">PULSE</span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-extrabold tracking-wide backdrop-blur">
              {t('guest.cta')}
            </span>
          </div>
          <LanguageToggle variant="compact" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="mx-auto mt-6 w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl"
        >
          <h1 className="text-2xl font-extrabold">{t('auth.startJourney')}</h1>
          <p className="mt-1 text-sm text-white/70">{t('auth.startJourneySub')}</p>

          {ref && (
            <div className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-400/15 p-3 text-center text-sm font-semibold text-emerald-200">
              {t('auth.invitedBonus')}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            {fields.map(({ k, ph, icon: Icon, type, ac }) => (
              <div key={k} className="relative">
                <Icon size={17} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-white/50" />
                <input
                  className="w-full rounded-2xl border border-white/15 bg-white/10 py-3.5 pe-4 ps-11 text-[15px] text-white outline-none transition placeholder:text-white/45 focus:border-orange-400/70 focus:bg-white/15"
                  type={type}
                  autoComplete={ac}
                  placeholder={ph}
                  value={form[k]}
                  onChange={set(k)}
                  required={k !== 'mobile' && k !== 'zip'}
                />
              </div>
            ))}

            {error && <p className="rounded-xl bg-red-500/20 px-3 py-2 text-center text-sm font-semibold text-red-200">{error}</p>}

            <motion.button
              type="submit"
              disabled={busy}
              whileTap={{ scale: 0.97 }}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 text-lg font-extrabold shadow-lg shadow-orange-500/30 transition disabled:opacity-60"
            >
              {busy ? t('auth.creating') : t('auth.signUp')}
              <motion.span
                aria-hidden
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex"
              >
                <ChevronRight size={20} className="rtl:rotate-180" />
              </motion.span>
            </motion.button>
          </form>
        </motion.div>

        <p className="mt-5 text-center text-sm text-white/70">
          <Link to="/login" className="font-bold text-white underline">{t('auth.haveAccount')}</Link> {t('auth.signIn')}
        </p>
      </div>
    </div>
  );
}
