import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Phone, Mail, Lock, MapPin, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/auth';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useAuth((s) => s.register);
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
    { k: 'firstName' as const, ph: 'First Name', icon: User, type: 'text' },
    { k: 'lastName' as const, ph: 'Last Name', icon: User, type: 'text' },
    { k: 'mobile' as const, ph: 'Mobile Number', icon: Phone, type: 'tel' },
    { k: 'email' as const, ph: 'Email', icon: Mail, type: 'email' },
    { k: 'password' as const, ph: 'Password', icon: Lock, type: 'password' },
    { k: 'zip' as const, ph: 'Zip/ Postal Code', icon: MapPin, type: 'text' },
  ];

  return (
    <div className="min-h-screen">
      <div className="rounded-b-[40%] fitness-hero pb-12 pt-14 text-center text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}>
        <div className="text-4xl font-extrabold italic">PULSE</div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.25em] opacity-90">A Fresh Start To Get Healthy</div>
      </div>

      {ref && (
        <div className="mx-7 mt-6 rounded-2xl border border-brand-teal/30 bg-brand-teal/10 p-3 text-center text-sm font-semibold text-brand-teal">
          🎁 You were invited — you'll start with a bonus streak freeze!
        </div>
      )}

      <form onSubmit={onSubmit} className={`space-y-3.5 px-7 ${ref ? 'pt-4' : 'pt-7'}`}>
        {fields.map(({ k, ph, icon: Icon, type }) => (
          <div key={k} className="relative">
            <Icon size={18} className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field ps-12"
              type={type}
              placeholder={ph}
              value={form[k]}
              onChange={set(k)}
              required={k !== 'mobile' && k !== 'zip'}
            />
          </div>
        ))}

        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        <motion.button
          type="submit"
          disabled={busy}
          whileTap={{ scale: 0.97 }}
          className="btn-pill btn-primary w-full gap-2 text-lg disabled:opacity-60"
        >
          {busy ? 'Creating…' : t('auth.signUp')}
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
          <Link to="/login" className="font-semibold text-brand-teal underline">{t('auth.haveAccount')}</Link> {t('auth.signIn')}
        </p>
      </form>
    </div>
  );
}
