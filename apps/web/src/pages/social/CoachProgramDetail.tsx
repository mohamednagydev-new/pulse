import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Play, Dumbbell, CalendarDays } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, EmptyState } from '../../components/ui';
import TopBar from '../../components/TopBar';

export default function CoachProgramDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: prog, isLoading } = useQuery({ queryKey: ['coach-program', id], queryFn: () => api.get(`/api/coach/programs/${id}`) });

  if (isLoading) return <Loader />;
  if (!prog) {
    return (
      <div className="min-h-screen">
        <TopBar title="Program" color="fitness-hero" textColor="text-white" />
        <EmptyState icon={<Dumbbell size={40} />} title={t('coach.programMissing')} hint={t('coach.programMissingHint')} />
      </div>
    );
  }

  const days: { label: string; workoutId: string; workout: { id: string; title: string; muscleFocus?: string } | null }[] = prog.days ?? [];

  return (
    <div className="min-h-screen pb-10">
      <TopBar title={prog.title} color="fitness-hero" textColor="text-white" />

      {prog.description && <p className="px-4 text-sm text-gray-500">{prog.description}</p>}

      <div className="mt-3 flex items-center gap-2 px-4 text-xs font-semibold text-gray-400">
        <CalendarDays size={14} /> {days.length}-day program
      </div>

      <div className="mt-3 space-y-2 px-4">
        {days.map((d, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 260, damping: 24 }}
            className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-fitness-hero/10 text-sm font-bold text-brand-blue">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{d.label}</p>
              {d.workout ? (
                <>
                  <p className="truncate font-semibold">{d.workout.title}</p>
                  {d.workout.muscleFocus && <p className="truncate text-xs text-gray-400">{d.workout.muscleFocus}</p>}
                </>
              ) : (
                <p className="text-sm text-gray-300">Workout unavailable</p>
              )}
            </div>
            {d.workout && (
              <button
                onClick={() => navigate(`/session/w/${d.workout!.id}`)}
                className="flex h-10 w-10 items-center justify-center rounded-full btn-primary"
                aria-label={`Start ${d.workout.title}`}
              >
                <Play size={16} />
              </button>
            )}
          </motion.div>
        ))}
        {!days.length && <EmptyState icon={<Dumbbell size={40} />} title={t('coach.noDays')} hint={t('coach.noDaysHint')} />}
      </div>

      <div className="mt-6 px-4">
        <Link to={`/u/${prog.coachUserId}`} className="btn-pill btn-ghost w-full justify-center">View coach</Link>
      </div>
    </div>
  );
}
