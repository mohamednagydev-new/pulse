import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';

const FIELD =
  'w-full rounded-2xl border border-white/15 bg-white/10 py-3.5 pe-4 ps-11 text-[15px] text-white outline-none transition placeholder:text-white/45 focus:border-orange-400/70 focus:bg-white/15';
const CTA =
  'flex min-h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-pink-600 text-lg font-extrabold shadow-lg shadow-orange-500/30 disabled:opacity-60';

export default function ResetPassword() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError(L('Password must be at least 6 characters.', 'كلمة السر لازم تبقى ٦ حروف على الأقل.'));
      return;
    }
    if (password !== confirm) {
      setError(L('Passwords do not match.', 'كلمتا السر مش متطابقتين.'));
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
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
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 size={48} className="text-emerald-300" />
              <p className="font-bold">{t('auth.pwUpdated')}</p>
              <p className="text-sm text-white/70">{t('auth.pwUpdatedSub')}</p>
              <Link to="/login" className={`${CTA} mt-3 px-8`}>{t('auth.backToSignIn')}</Link>
            </div>
          ) : !token ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="font-bold">{t('auth.badLinkTitle')}</p>
              <p className="text-sm text-white/70">{t('auth.badLink')}</p>
              <Link to="/forgot-password" className={`${CTA} mt-3 px-8`}>{t('auth.requestNew')}</Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold">{t('auth.setNewTitle')}</h1>
              <p className="mt-1 text-sm text-white/70">{t('auth.setNewSub')}</p>
              <form onSubmit={onSubmit} className="mt-5 space-y-3">
                <div className="relative">
                  <Lock size={17} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-white/50" />
                  <input className={FIELD} type="password" autoComplete="new-password" placeholder={t('auth.newPassword')} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <div className="relative">
                  <Lock size={17} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-white/50" />
                  <input className={FIELD} type="password" autoComplete="new-password" placeholder={t('auth.confirmPassword')} value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
                </div>
                {error && <p className="rounded-xl bg-red-500/20 px-3 py-2 text-center text-sm font-semibold text-red-200">{error}</p>}
                <button type="submit" disabled={busy} className={CTA}>
                  {busy ? L('Saving…', 'بيتحفظ…') : L('Reset password', 'غيّر كلمة السر')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
