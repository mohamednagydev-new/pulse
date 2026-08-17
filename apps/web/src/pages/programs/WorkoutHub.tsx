import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CalendarDays, ScanLine, ChevronRight, ListChecks } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, MediaImage } from '../../components/ui';
import TopBar from '../../components/TopBar';
import { MuscleFigure } from '../../components/TrainingAnim';
import WorkoutRoulette from '../../components/WorkoutRoulette';

const MotionLink = motion.create(Link);
const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

export default function WorkoutHub() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const navigate = useNavigate();
  const { data: groups, isLoading } = useQuery({ queryKey: ['muscle-groups'], queryFn: () => api.get('/api/muscle-groups') });
  const { data: coaches } = useQuery({ queryKey: ['coaches', 'WORKOUT'], queryFn: () => api.get('/api/coaches?type=WORKOUT') });

  if (isLoading) return <Loader />;

  return (
    <div className="min-h-screen overflow-x-hidden pb-10">
      <TopBar title={t('nav.workout')} color="fitness-hero" textColor="text-white" />

      <div className="px-4 pb-3">
        <WorkoutRoulette />
      </div>

      <div className="grid grid-cols-2 gap-3 px-4">
        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/schedule')}
          className="card-hover flex min-h-[56px] items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          <CalendarDays className="shrink-0 text-brand-blue" /> <span className="min-w-0 truncate text-start font-semibold">{t('schedule.title')}</span>
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/exercises')}
          className="card-hover flex min-h-[56px] items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          <ScanLine className="shrink-0 text-brand-pink" /> <span className="min-w-0 truncate text-start font-semibold">{t('workout.muscleMap')}</span>
        </motion.button>
        {/* My saved routines — sessions replayed with the weights actually lifted. */}
        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/routines')}
          className="card-hover col-span-2 flex min-h-[56px] items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          <ListChecks className="shrink-0 text-brand-green" />
          <span className="min-w-0 flex-1 truncate text-start font-semibold">{L('My Routines', 'روتيناتي')}</span>
          <span className="truncate text-xs text-gray-400">{L('Saved workouts, ready to go', 'تماريتك المحفوظة جاهزة')}</span>
          <ChevronRight size={16} className="shrink-0 text-gray-300 rtl:rotate-180" />
        </motion.button>
      </div>

      <div className="mt-6 px-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('programs.train')}</p>
        <h2 className="mb-3 text-lg font-bold">{t('workout.startSession')}</h2>
      </div>
      <div className="grid grid-cols-3 gap-3 px-4">
        {(groups ?? []).map((g: any, i: number) => (
          <motion.button
            key={g.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -40px 0px' }}
            transition={{ ...spring, delay: (i % 3) * 0.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => navigate(`/session/${g.id}`)}
            className="card-hover flex flex-col items-center rounded-2xl bg-gradient-to-b from-orange-50 to-white p-2 shadow-sm ring-1 ring-orange-500/15 transition-shadow hover:ring-orange-500/40 focus-visible:ring-2 focus-visible:ring-orange-500/50"
          >
            {/* tone is set here, not in the component: the silhouette draws with
                currentColor so the card decides how warm and how dark it reads */}
            <MuscleFigure side={g.bodySide} posX={g.posX} posY={g.posY} name={g.name} className="h-24 w-full text-orange-900 dark:text-orange-200" />
            <span className="mt-1 line-clamp-2 w-full text-center text-xs font-semibold">{g.name}</span>
          </motion.button>
        ))}
      </div>

      {!!coaches?.length && (
        <>
          <div className="mt-6 px-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('today.explore')}</p>
            <h2 className="mb-3 text-lg font-bold">{t('programs.coaches')}</h2>
          </div>
          <div className="space-y-3 px-4">
            {coaches.map((c: any, idx: number) => (
              <MotionLink
                key={c.id}
                to={`/programs/coach/${c.id}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                transition={{ ...spring, delay: Math.min(idx, 4) * 0.05 }}
                whileTap={{ scale: 0.96 }}
                className="card-hover flex items-center gap-4 rounded-2xl bg-gradient-to-r from-orange-50/70 to-white p-3 shadow-sm ring-1 ring-orange-500/10"
              >
                <MediaImage path={c.avatarUrl} seed={idx} label={c.name} className="h-16 w-16 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-brand-blue">{c.name}</p>
                  {c.headline && <p className="truncate text-xs text-gray-500">{c.headline}</p>}
                </div>
                <ChevronRight className="shrink-0 text-gray-300 rtl:rotate-180" />
              </MotionLink>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
