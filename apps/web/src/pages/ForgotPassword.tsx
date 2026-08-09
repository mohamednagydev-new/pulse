import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';

export default function ForgotPassword() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
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
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* Same photo-glass family as Login/Register. */}
      <img src="/landing/scene-coach.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-[#14100c]" aria-hidden />

      <div className="relative px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
        <Link to="/login" className="inline-flex items-center gap-1 text-sm opacity-90">
          <ArrowLeft size={18} className="rtl:rotate-180" /> {t('auth.backToSignIn')}
        </Link>

        <div className="mx-auto mt-10 w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={48} className="text-emerald-300" />
              <p className="font-bold">{t('auth.checkInbox')}</p>
              <p className="text-sm text-white/70">
                {L(`If an account exists for ${email}, you'll get reset instructions shortly.`, `لو فيه حساب بالإيميل ${email}، هيوصلك لينك الاسترجاع خلال شوية.`)}
              </p>
              <Link to="/login" className="mt-3 flex min-h-[48px] items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-pink-600 px-8 font-extrabold shadow-lg shadow-orange-500/30">
                {t('auth.backToSignIn')}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold">{t('auth.resetTitle')}</h1>
              <p className="mt-1 text-sm text-white/70">
                {L("Enter your email and we'll send you a link to get back in.", 'اكتب إيميلك وهنبعتلك لينك ترجع بيه لحسابك.')}
              </p>
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
                <button
                  type="submit"
                  disabled={busy}
                  className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-pink-600 text-lg font-extrabold shadow-lg shadow-orange-500/30 disabled:opacity-60"
                >
                  {busy ? L('Sending…', 'بيتبعت…') : L('Send reset link', 'ابعت اللينك')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
