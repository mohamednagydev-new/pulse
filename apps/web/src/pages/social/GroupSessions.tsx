import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Plus, Calendar } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, MediaImage, EmptyState, ErrorMsg } from '../../components/ui';
import TopBar from '../../components/TopBar';
import CoachBadge from '../../components/CoachBadge';
import AmbientBg from '../../components/AmbientBg';
import { toast } from '../../lib/toast';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

export default function GroupSessions() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });
  const meId = me?.id;

  const { data: sessions, isLoading, isError, error, refetch } = useQuery({ queryKey: ['group-upcoming'], queryFn: () => api.get('/api/group/upcoming') });
  const { data: myWorkouts } = useQuery({
    queryKey: ['coach-workouts', meId],
    queryFn: () => api.get(`/api/coach/${meId}/workouts`),
    enabled: !!meId && !!me?.isCoach,
  });

  const [title, setTitle] = useState('');
  const [focus, setFocus] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [workoutId, setWorkoutId] = useState('');

  const create = useMutation({
    mutationFn: () => api.post('/api/group', {
      title,
      muscleFocus: focus || undefined,
      coachWorkoutId: workoutId || undefined,
      scheduledAt: new Date(scheduledAt).toISOString(),
    }),
    onSuccess: () => {
      setTitle(''); setFocus(''); setScheduledAt(''); setWorkoutId('');
      qc.invalidateQueries({ queryKey: ['group-upcoming'] });
      toast(t('group.scheduled'), 'success');
    },
  });

  const join = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => (on ? api.post(`/api/group/${id}/join`) : api.post(`/api/group/${id}/leave`)),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['group-upcoming'] }); toast(v.on ? t('group.joinedToast') : t('group.leftToast'), 'success'); },
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <AmbientBg tone="warm" />
      <TopBar title={t('group.sessionsTitle')} color="fitness-hero" textColor="text-white" />

      {me?.isCoach && (
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="px-4 pt-4">
          <h2 className="mb-2 font-bold">🔴 {t('group.host')}</h2>
          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gray-500">{t('group.fieldTitle')}</span>
              <input className="input-field" placeholder={t('group.titlePh')} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gray-500">{t('group.fieldFocus')}</span>
              <input className="input-field" placeholder={t('group.focusPh')} value={focus} onChange={(e) => setFocus(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gray-500">📅 {t('group.fieldWhen')}</span>
              <input className="input-field" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-gray-500">🎬 {t('group.fieldWorkout')}</span>
              <select className="input-field" value={workoutId} onChange={(e) => setWorkoutId(e.target.value)}>
                <option value="">{t('group.linkWorkout')}</option>
                {(myWorkouts ?? []).map((w: any) => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-gray-400">{t('group.workoutHint')}</span>
            </label>
            <button
              onClick={() => title.trim() && scheduledAt && create.mutate()}
              disabled={create.isPending || !title.trim() || !scheduledAt}
              className="btn-pill btn-primary w-full disabled:opacity-50"
            >
              <Plus size={16} /> {t('group.schedule')}
            </button>
          </div>
        </motion.section>
      )}

      <section className="mt-5 px-4">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
          <span className="live-dot relative inline-block h-2 w-2 rounded-full bg-brand-green text-brand-green" /> {t('group.live')}
        </p>
        <h2 className="mb-2 font-bold">{t('group.upcoming')}</h2>
        {isLoading ? (
          <Loader />
        ) : isError ? (
          <ErrorMsg error={error} onRetry={() => refetch()} />
        ) : !sessions?.length ? (
          <EmptyState icon={<Users size={40} />} title={t('group.empty')} hint={t('group.emptyHint')} />
        ) : (
          <div className="space-y-3">
            {sessions.map((s: any, i: number) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                transition={{ ...spring, delay: Math.min(i, 4) * 0.05 }}
                whileTap={{ scale: 0.98 }}
                className="card-hover rounded-2xl bg-white p-4 shadow-sm"
              >
                <Link to={`/group/${s.id}`} className="block">
                  <p className="break-words font-bold">{s.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <MediaImage path={s.coach?.avatarUrl} label={s.coach?.firstName} className="h-6 w-6 shrink-0 rounded-full" seed={2} />
                    <span className="min-w-0 truncate text-sm text-gray-600">{s.coach?.firstName} {s.coach?.lastName}</span>
                    {s.coach?.isCoach && <CoachBadge verified={s.coach?.coachVerified} />}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Calendar size={13} /> {new Date(s.scheduledAt).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Users size={13} /> {s.participantCount}</span>
                  </div>
                </Link>
                <button
                  onClick={() => join.mutate({ id: s.id, on: !s.isJoined })}
                  disabled={join.isPending}
                  className={`btn-pill mt-3 w-full ${s.isJoined ? 'btn-ghost text-gray-600' : 'btn-primary'}`}
                >
                  {s.isJoined ? t('group.joinedShort') : t('group.joinShort')}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
