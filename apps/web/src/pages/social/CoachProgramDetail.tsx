import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Play, Dumbbell, CalendarDays, Check, Lock } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, EmptyState } from '../../components/ui';
import TopBar from '../../components/TopBar';

export default function CoachProgramDetail() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: prog, isLoading } = useQuery({ queryKey: ['coach-program', id], queryFn: () => api.get(`/api/coach/programs/${id}`) });

  // Day toggles write to the enrollment (auto-created server-side) so the
  // program finally REMEMBERS where you are between visits.
  const dayDone = useMutation({
    mutationFn: ({ day, done }: { day: number; done: boolean }) =>
      api.post(`/api/coach/programs/${id}/day-done`, { day, done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coach-program', id] }),
  });

  if (isLoading) return <Loader />;
  if (!prog) {
    return (
      <div className="min-h-screen">
        <TopBar title={t('coach.program')} color="fitness-hero" textColor="text-white" />
        <EmptyState icon={<Dumbbell size={40} />} title={t('coach.programMissing')} hint={t('coach.programMissingHint')} />
      </div>
    );
  }

  const days: { label: string; workoutId: string; workout: { id: string; title: string; muscleFocus?: string } | null }[] = prog.days ?? [];
  const done: number[] = prog.completedDays ?? [];
  const doneSet = new Set(done);
  const nextDay = days.findIndex((_, i) => !doneSet.has(i));

  return (
    <div className="min-h-screen pb-10">
      <TopBar title={prog.title} color="fitness-hero" textColor="text-white" />

      {/* Private-programming badge: this program never shows on the open directory. */}
      {prog.visibility === 'clients' && (
        <div className="px-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
            <Lock size={11} /> {L('Clients only', 'للعملاء فقط')}
          </span>
        </div>
      )}
      {prog.description && <p className="mt-2 px-4 text-sm text-gray-500">{prog.description}</p>}

      {/* Progress header: Day X of N + bar. */}
      <div className="mx-4 mt-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
          <span className="flex items-center gap-1.5"><CalendarDays size={14} /> {t('coach.dayProgram', { n: days.length })}</span>
          <span className="font-bold text-brand-blue">
            {done.length >= days.length && days.length > 0
              ? t('coach.programDone')
              : t('coach.dayOf', { x: Math.min(done.length + 1, days.length), n: days.length })}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${days.length ? (done.length / days.length) * 100 : 0}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-gradient-to-r from-brand-blue to-indigo-500"
          />
        </div>
      </div>

      <div className="mt-3 space-y-2 px-4">
        {days.map((d, i) => {
          const isDone = doneSet.has(i);
          const isNext = i === nextDay;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 260, damping: 24 }}
              className={`flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ${isNext ? 'ring-2 ring-brand-blue/40' : ''} ${isDone ? 'opacity-70' : ''}`}
            >
              {/* Tap the day number to toggle done — the enrollment's memory. */}
              <button
                onClick={() => dayDone.mutate({ day: i, done: !isDone })}
                aria-label={isDone ? t('coach.markUndone') : t('coach.markDayDone')}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold transition ${
                  isDone ? 'bg-emerald-500 text-white' : 'bg-brand-blue/10 text-brand-blue'
                }`}
              >
                {isDone ? <Check size={18} strokeWidth={3} /> : i + 1}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {d.label} {isNext && <span className="ms-1 rounded bg-brand-blue/10 px-1.5 text-[9px] font-bold text-brand-blue">{t('coach.upNext')}</span>}
                </p>
                {d.workout ? (
                  <>
                    <p className={`truncate font-semibold ${isDone ? 'line-through' : ''}`}>{d.workout.title}</p>
                    {d.workout.muscleFocus && <p className="truncate text-xs text-gray-400">{d.workout.muscleFocus}</p>}
                  </>
                ) : (
                  <p className="text-sm text-gray-300">{t('coach.workoutUnavailable')}</p>
                )}
              </div>
              {d.workout && (
                <button
                  onClick={() => navigate(`/session/w/${d.workout!.id}`)}
                  className="flex h-10 w-10 items-center justify-center rounded-full btn-primary"
                  aria-label={`${t('today.start')} ${d.workout.title}`}
                >
                  <Play size={16} />
                </button>
              )}
            </motion.div>
          );
        })}
        {!days.length && <EmptyState icon={<Dumbbell size={40} />} title={t('coach.noDays')} hint={t('coach.noDaysHint')} />}
      </div>

      <div className="mt-6 px-4">
        <Link to={`/u/${prog.coachUserId}`} className="btn-pill btn-ghost w-full justify-center">{t('coach.viewCoach')}</Link>
      </div>
    </div>
  );
}
