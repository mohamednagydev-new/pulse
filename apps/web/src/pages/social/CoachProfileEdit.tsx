import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Dumbbell } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { Loader, ErrorMsg } from '../../components/ui';
import TopBar from '../../components/TopBar';
import { toast } from '../../lib/toast';

export default function CoachProfileEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { data: me, isLoading, isError, error, refetch } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });

  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!me) return;
    setHeadline(me.coachHeadline ?? '');
    setBio(me.coachBio ?? '');
    try {
      setSpecialties((JSON.parse(me.coachSpecialties ?? '[]') as string[]).join(', '));
    } catch {
      /* ignore */
    }
  }, [me]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await api.patch('/api/me/coach-profile', {
        coachHeadline: headline,
        coachBio: bio,
        coachSpecialties: specialties.split(',').map((s) => s.trim()).filter(Boolean),
      });
      await refreshUser();
      toast(isCoach ? t('coach.profileUpdated') : t('coach.nowCoach'), 'success');
      navigate(`/u/${me.id}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const isCoach = me?.isCoach;

  // Wait for the profile before showing the form — otherwise it renders empty
  // and the fields snap to their saved values a moment later.
  if (isLoading)
    return (
      <div className="min-h-screen pb-10">
        <TopBar title={t('coach.profileTitle')} color="fitness-hero" textColor="text-white" />
        <Loader />
      </div>
    );
  if (isError)
    return (
      <div className="min-h-screen pb-10">
        <TopBar title={t('coach.profileTitle')} color="fitness-hero" textColor="text-white" />
        <ErrorMsg error={error} onRetry={() => refetch()} />
      </div>
    );

  return (
    <div className="min-h-screen pb-10">
      <TopBar title={isCoach ? t('coach.profileTitle') : t('coach.become')} color="fitness-hero" textColor="text-white" />
      <div className="px-5">
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <Dumbbell className="text-brand-blue" />
          <p className="text-sm text-gray-500">{t('coach.editIntro')}</p>
        </div>
        {/* Approval status: coaches are public only after admin verification. */}
        {isCoach && !me?.coachVerified && (
          <div className="mb-4 rounded-2xl border border-amber-300/40 bg-amber-500/10 p-4 text-sm">
            <p className="font-bold text-amber-600">{t('coach.pendingTitle')}</p>
            <p className="mt-1 text-xs text-gray-500">{t('coach.pendingBody')}</p>
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs text-gray-500">{t('coach.headline')}</span>
            <input className="input-field mt-1" placeholder={t('coach.headlinePh')} value={headline} onChange={(e) => setHeadline(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">{t('coach.about')}</span>
            <textarea className="input-field mt-1 rounded-2xl" rows={4} placeholder={t('coach.bioPh')} value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">{t('coach.specialties')}</span>
            <input className="input-field mt-1" placeholder={t('coach.specialtiesPh')} value={specialties} onChange={(e) => setSpecialties(e.target.value)} />
          </label>
          {msg && <p className="text-center text-sm text-red-500">{msg}</p>}
          <button type="submit" disabled={busy} className="btn-pill btn-primary w-full">
            {busy ? t('common.saving') : isCoach ? t('coach.updateProfile') : t('coach.become')}
          </button>
        </form>
      </div>
    </div>
  );
}
