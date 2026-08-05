import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Dumbbell } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../store/auth';
import TopBar from '../../components/TopBar';
import { toast } from '../../lib/toast';

export default function CoachProfileEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });

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
      toast(isCoach ? 'Coach profile updated' : "You're now a coach! 🎉", 'success');
      navigate(`/u/${me.id}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const isCoach = me?.isCoach;

  return (
    <div className="min-h-screen pb-10">
      <TopBar title={isCoach ? 'Coach Profile' : 'Become a Coach'} color="fitness-hero" textColor="text-white" />
      <div className="px-5">
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <Dumbbell className="text-brand-blue" />
          <p className="text-sm text-gray-500">Share your expertise, publish content, and coach the community.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs text-gray-500">Headline</span>
            <input className="input-field mt-1" placeholder="e.g. Strength & mobility coach" value={headline} onChange={(e) => setHeadline(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">{t('coach.about')}</span>
            <textarea className="input-field mt-1 rounded-2xl" rows={4} placeholder={t('coach.bioPh')} value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Specialties (comma separated)</span>
            <input className="input-field mt-1" placeholder="Strength, HIIT, Yoga, Nutrition" value={specialties} onChange={(e) => setSpecialties(e.target.value)} />
          </label>
          {msg && <p className="text-center text-sm text-red-500">{msg}</p>}
          <button type="submit" disabled={busy} className="btn-pill btn-primary w-full">
            {busy ? 'Saving…' : isCoach ? 'Update coach profile' : 'Become a coach'}
          </button>
        </form>
      </div>
    </div>
  );
}
