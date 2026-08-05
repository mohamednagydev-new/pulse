import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';

export default function ResetPassword() {
  const { t } = useTranslation();
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
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen fitness-hero text-white">
      <div className="px-6 pt-14" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}>
        <Link to="/login" className="inline-flex items-center gap-1 text-sm opacity-90"><ArrowLeft size={18} className="rtl:rotate-180" /> {t('auth.backToSignIn')}</Link>
        <h1 className="mt-8 text-3xl font-extrabold">{t('auth.setNewTitle')}</h1>
        <p className="mt-2 text-white/80">{t('auth.setNewSub')}</p>
      </div>

      <div className="mt-8 min-h-[60vh] rounded-t-[32px] bg-white p-7 text-ink">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 size={48} className="text-brand-green" />
            <p className="font-semibold">{t('auth.pwUpdated')}</p>
            <p className="text-sm text-gray-500">{t('auth.pwUpdatedSub')}</p>
            <Link to="/login" className="btn-pill btn-primary mt-4 px-8">{t('auth.backToSignIn')}</Link>
          </div>
        ) : !token ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="font-semibold">{t('auth.badLinkTitle')}</p>
            <p className="text-sm text-gray-500">{t('auth.badLink')}</p>
            <Link to="/forgot-password" className="btn-pill btn-primary mt-4 px-8">{t('auth.requestNew')}</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-field ps-12" type="password" placeholder={t('auth.newPassword')} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-field ps-12" type="password" placeholder={t('auth.confirmPassword')} value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
            </div>
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={busy} className="btn-pill btn-primary w-full">
              {busy ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
