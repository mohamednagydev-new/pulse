import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ScanLine, ChevronRight, Users, Flame, Play } from 'lucide-react';
import { api } from '../../lib/api';
import { MediaImage, HScroll, Loader, ErrorMsg } from '../../components/ui';
import MenuDrawer from '../../components/MenuDrawer';
import ScreenHeader from '../../components/ScreenHeader';
import { sameMuscle } from '../../lib/muscleNames';
import { useAuth } from '../../store/auth';
import { CurlAnim, BreatheAnim, exerciseAnim } from '../../components/TrainingAnim';

const rise = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};
const inView = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '0px 0px -40px 0px' },
} as const;
const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

const DAY_INDEX = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ProgramsHome() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Guests browse this tab: personal queries stay off for them (they can only
  // 401 — churn in the console and noise on flaky connections, never data).
  const authed = useAuth((s) => s.status === 'authed');

  const { data: sched } = useQuery({ queryKey: ['schedule'], queryFn: () => api.get('/api/me/schedule'), enabled: authed });
  const { data: progress } = useQuery({ queryKey: ['progress'], queryFn: () => api.get('/api/tracker/progress'), enabled: authed });
  const {
    data: groups,
    isLoading: groupsLoading,
    refetch: refetchGroups,
  } = useQuery({ queryKey: ['muscle-groups'], queryFn: () => api.get('/api/muscle-groups') });
  const {
    data: programs,
    isLoading: programsLoading,
    isError: programsError,
    refetch: refetchPrograms,
  } = useQuery({ queryKey: ['programs'], queryFn: () => api.get('/api/programs') });
  // Ranked by the goal and experience captured at onboarding, so a first-time user
  // is pointed somewhere sensible instead of choosing from eighteen cards blind.
  const { data: rec } = useQuery({ queryKey: ['path-recommended'], queryFn: () => api.get('/api/path/recommended'), enabled: authed });
  const { data: reelsData } = useQuery({
    queryKey: ['reels', 'workout'],
    queryFn: () => api.get('/api/reels?topic=workout'),
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled: authed,
  });

  // Today's plan from the saved schedule → one-tap start (same mapping as TodayStrip).
  const todayName = DAY_INDEX[new Date().getDay()];
  const today = (sched?.schedule ?? []).find((d: any) => d.day === todayName);
  const isRest = today && today.groups.length === 0;
  const streak = progress?.currentStreak ?? 0;
  const startToday = () => {
    const id = (today?.groups ?? [])
      .map((name: string) => (groups ?? []).find((g: any) => sameMuscle(g.name, name))?.id)
      .find(Boolean);
    navigate(id ? `/session/${id}` : '/workout');
  };

  // Reels are provider embeds now. Filtering on the retired 'tiktok' source silently
  // emptied this strip, so it matches on having a cover instead of on a source name.
  const reels = (reelsData?.reels ?? [])
    .filter((r: any) => r.coverUrl)
    .slice(0, 6);

  return (
    <div className="min-h-screen overflow-x-hidden pb-8">
      {/* Section tone: Programs owns blue (per the original per-section design). */}
      <ScreenHeader tone="blue" padBottom="pb-6">
        {/* Burger INLINE with the title — the stacked version wasted a full row
            and pushed content below the fold. */}
        <div className="flex items-center gap-3">
          <MenuDrawer />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold">{t('programs.title')}</h1>
            <p className="truncate text-xs text-white/75">{t('programs.motto')}</p>
          </motion.div>
        </div>
      </ScreenHeader>

      {/* Today — pulled from the user's schedule, one-tap start */}
      {today && (
        <motion.div {...rise} transition={spring} className="glass mx-4 -mt-4 flex items-center gap-3 rounded-2xl p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {isRest ? t('today.restDay') : t('today.todayFocus', { focus: today.focus })}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-orange-500">
              <Flame size={13} /> {t('today.streakDays', { n: streak })}
            </p>
          </div>
          <button onClick={startToday} className="btn-pill btn-primary shrink-0 px-6 py-2.5 text-sm">
            {isRest ? t('today.explore') : t('today.start')}
          </button>
        </motion.div>
      )}

      {/* Hero tiles — full-bleed backgrounds with floating training figures */}
      <p className="mt-5 px-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('programs.train')}</p>
      <div className="mt-2 grid grid-cols-2 gap-3 px-4">
        <motion.button
          {...rise}
          transition={{ ...spring, delay: 0.05 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/workout')}
          className="card-hover relative h-48 overflow-hidden rounded-3xl text-white shadow-lg"
        >
          <div className="hero-blue absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="relative flex h-full flex-col items-center justify-center gap-2">
            <CurlAnim className="animate-float h-20 w-20 drop-shadow-lg" />
            <span className="text-xl font-extrabold drop-shadow">{t('programs.workout')}</span>
            <span className="text-[11px] font-semibold text-white/70">{t('programs.workoutSub')}</span>
          </div>
        </motion.button>
        <motion.button
          {...rise}
          transition={{ ...spring, delay: 0.1 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/yoga')}
          className="card-hover relative h-48 overflow-hidden rounded-3xl text-white shadow-lg"
        >
          <div className="hero-pink absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="relative flex h-full flex-col items-center justify-center gap-2">
            <BreatheAnim className="animate-float h-20 w-20 drop-shadow-lg" />
            <span className="text-xl font-extrabold drop-shadow">{t('programs.yoga')}</span>
            <span className="text-[11px] font-semibold text-white/70">{t('programs.yogaSub')}</span>
          </div>
        </motion.button>
      </div>

      {/* Network states for the catalogue-driven sections below — they render
          nothing while their data is absent, so without this the page is blank. */}
      {(programsLoading || groupsLoading) && <Loader />}
      {programsError && !programsLoading && (
        <ErrorMsg
          onRetry={() => {
            refetchPrograms();
            refetchGroups();
          }}
        />
      )}

      {/* Where to start — ranked for this user, ahead of the full catalogue */}
      {!!rec?.programs?.length && (
        <section className="mt-6">
          <div className="mb-1 flex items-baseline justify-between gap-3 px-4">
            <h2 className="text-lg font-bold">{t('path.forYou')}</h2>
            {rec.level && (
              <span className="shrink-0 rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-600">
                {String(rec.level).toLowerCase()}
              </span>
            )}
          </div>
          <p className="mb-3 px-4 text-xs text-gray-400">{t('path.forYouSub')}</p>
          <HScroll>
            {rec.programs.slice(0, 4).map((p: any, idx: number) => (
              <motion.button
                key={p.id}
                {...inView}
                transition={{ ...spring, delay: Math.min(idx, 4) * 0.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/programs/${p.id}`)}
                className="w-56 shrink-0 rounded-2xl bg-white p-2 text-start shadow-sm"
              >
                <div className="relative">
                  <MediaImage path={p.coverImage} seed={idx} label={p.title} className="h-28 w-full rounded-xl" />
                  {idx === 0 && (
                    <span className="absolute start-2 top-2 rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      {t('path.bestMatch')}
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-semibold">{p.title}</p>
                <p className="truncate text-xs text-gray-400">
                  {p._count?.lessons ?? 0} {t('path.lessons')}{p.coach?.name ? ` · ${p.coach.name}` : ''}
                </p>
              </motion.button>
            ))}
          </HScroll>
        </section>
      )}

      {/* Full catalogue */}
      {!!programs?.length && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between px-4">
            <h2 className="text-lg font-bold">{t('path.allPrograms')}</h2>
          </div>
          <HScroll>
            {programs.map((p: any, idx: number) => (
              <motion.button
                key={p.id}
                {...inView}
                transition={{ ...spring, delay: Math.min(idx, 4) * 0.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/programs/${p.id}`)}
                className="w-60 shrink-0 text-start"
              >
                <div className="relative">
                  <MediaImage path={p.coverImage} seed={idx} label={p.title} className="h-36 w-full rounded-2xl" />
                  {p.level && (
                    <span className="absolute start-2 top-2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
                      {String(p.level).toLowerCase()}
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-semibold">{p.title}</p>
                {p.coach?.name && <p className="truncate text-xs text-gray-400">{p.coach.name}</p>}
              </motion.button>
            ))}
          </HScroll>
        </section>
      )}

      {/* Quick sessions — jump straight into a muscle group */}
      {!!groups?.length && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between px-4">
            <h2 className="text-lg font-bold">{t('programs.quickSessions')}</h2>
            <button onClick={() => navigate('/workout')} className="flex items-center text-sm font-semibold text-gray-400">
              {t('common.seeAll')} <ChevronRight size={18} className="rtl:rotate-180" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3 px-4">
            {groups.slice(0, 8).map((g: any, i: number) => {
              const Anim = exerciseAnim(g.name);
              return (
                <motion.button
                  key={g.id}
                  {...inView}
                  transition={{ ...spring, delay: (i % 4) * 0.05 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => navigate(`/session/${g.id}`)}
                  className="card-hover flex flex-col items-center rounded-2xl bg-white p-2 shadow-sm"
                >
                  <Anim className="h-12 w-12" />
                  <span className="mt-1 w-full truncate text-center text-[11px] font-semibold">{g.name}</span>
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      {/* Reels rail — quick hits to get moving */}
      {!!reels.length && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between px-4">
            <h2 className="text-lg font-bold">{t('programs.reelsTitle')}</h2>
            <button onClick={() => navigate('/reels')} className="flex items-center text-sm font-semibold text-gray-400">
              {t('common.seeAll')} <ChevronRight size={18} className="rtl:rotate-180" />
            </button>
          </div>
          <HScroll>
            {reels.map((r: any, idx: number) => (
              <motion.button
                key={r.key ?? idx}
                {...inView}
                transition={{ ...spring, delay: Math.min(idx, 4) * 0.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/reels')}
                className="relative w-28 shrink-0 overflow-hidden rounded-2xl text-start"
              >
                <img src={r.coverUrl} alt={r.title ?? t('reels.workout')} loading="lazy" className="h-44 w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/25 backdrop-blur">
                  <Play size={13} fill="white" className="text-white" />
                </span>
                {r.title && (
                  <p className="absolute bottom-2 start-2 end-2 line-clamp-2 text-[11px] font-semibold leading-tight text-white">
                    {r.title}
                  </p>
                )}
              </motion.button>
            ))}
          </HScroll>
        </section>
      )}

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-3 gap-3 px-4">
        {[
          { icon: CalendarDays, label: t('schedule.title'), color: 'text-brand-blue', to: '/schedule' },
          { icon: ScanLine, label: t('workout.muscleMap'), color: 'text-brand-pink', to: '/exercises' },
          { icon: Users, label: t('programs.group'), color: 'text-brand-green', to: '/group' },
        ].map((l, i) => (
          <motion.button
            key={l.to}
            {...inView}
            transition={{ ...spring, delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(l.to)}
            className="card-hover flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3.5 shadow-sm"
          >
            <l.icon className={`shrink-0 ${l.color}`} size={22} />
            <span className="w-full truncate text-center text-xs font-semibold">{l.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
