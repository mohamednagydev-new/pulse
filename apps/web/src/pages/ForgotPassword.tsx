import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen fitness-hero text-white">
      <div className="px-6 pt-14" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}>
        <Link to="/login" className="inline-flex items-center gap-1 text-sm opacity-90"><ArrowLeft size={18} className="rtl:rotate-180" /> {t('auth.backToSignIn')}</Link>
        <h1 className="mt-8 text-3xl font-extrabold">{t('auth.resetTitle')}</h1>
        <p className="mt-2 text-white/80">Enter your email and we'll send you a link to get back in.</p>
      </div>

      <div className="mt-8 min-h-[60vh] rounded-t-[32px] bg-white p-7 text-ink">
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 size={48} className="text-brand-green" />
            <p className="font-semibold">{t('auth.checkInbox')}</p>
            <p className="text-sm text-gray-500">If an account exists for {email}, you'll get reset instructions shortly.</p>
            <Link to="/login" className="btn-pill btn-primary mt-4 px-8">{t('auth.backToSignIn')}</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={18} className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-field ps-12" type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" disabled={busy} className="btn-pill btn-primary w-full">
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
