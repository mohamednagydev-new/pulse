import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { trackAd } from '../lib/ads';
import { Search, ChevronRight, Play, Clapperboard, X, Bell, Flame, HeartHandshake, ScanLine, Users } from 'lucide-react';
import { api } from '../lib/api';
import { Loader, ErrorMsg, MediaImage, HScroll, formatDuration } from '../components/ui';
import TodayStrip from '../components/TodayStrip';
import ComebackCard from '../components/ComebackCard';
import DailyReset from '../components/DailyReset';
import DailyQuests from '../components/DailyQuests';
import WaterCard from '../components/WaterCard';
import SpinWheel from '../components/SpinWheel';
import HallOfFame from '../components/HallOfFame';
import { LeagueCard } from './Leagues';
import PathCard from '../components/PathCard';
import CheckInCard from '../components/CheckInCard';
import MenuDrawer from '../components/MenuDrawer';
import ScreenHeader from '../components/ScreenHeader';
import VideoPlayer from '../components/VideoPlayer';
import CountUp from '../components/CountUp';
import { CurlAnim } from '../components/TrainingAnim';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({ queryKey: ['home'], queryFn: () => api.get('/api/home') });
  const [playing, setPlaying] = useState<{ videoId: string; title?: string } | null>(null);

  // Featured cards: play their video, follow their link, or fall back to the section hub.
  const openFeatured = (f: any, fallback: string) => {
    if (f.videoId) return setPlaying({ videoId: f.videoId, title: f.title });
    if (f.url) {
      if (/^https?:\/\//.test(f.url)) return void window.open(f.url, '_blank', 'noopener');
      return navigate(f.url);
    }
    navigate(fallback);
  };

  useEffect(() => {
    const b = data?.banners?.[0];
    if (b) trackAd(b.id, 'impression');
  }, [data]);

  if (isLoading) return <Loader label={t('common.loading')} />;
  if (error) return <ErrorMsg error={error} />;

  const { banners = [], coaches = [], fitForLife = [], mealPrep = [], challenges = [] } = data ?? {};

  return (
    <div className="pb-6">
      <ScreenHeader tone="hero" padBottom="pb-6" className="animate-fade-up shadow-lg">
        <div className="flex items-center justify-between">
          <MenuDrawer />
          <span className="text-2xl font-extrabold italic tracking-tight">PULSE</span>
          <div className="flex items-center gap-4">
            <NotifBell />
            <button onClick={() => navigate('/search')} aria-label={t('common.search')}><Search size={24} /></button>
          </div>
        </div>
        <Greeting />
      </ScreenHeader>

      {/* Warm re-entry after 3+ idle days — sits above the strip so a returning
          user sees the easy way back before anything asks for effort. */}
      <ComebackCard />

      <TodayStrip />

      <WeekZeroEntryCard />

      <CheckInCard />

      <PathCard />

      <QuickActions />

      {/* Was a 144px slab sitting below the meal section — a billboard for a link, and
          the third "start" call to action on one screen. Same destination, ~72px. */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={spring}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/workout')}
        className="card-hover fitness-hero mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-start text-white shadow-sm"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <CurlAnim className="h-7 w-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold">{t('home2.startTraining')}</span>
          <span className="block truncate text-xs text-white/70">{t('home2.pickMuscle')}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 opacity-70 rtl:rotate-180" />
      </motion.button>

      {/* Today's habits — the things that reset every morning */}
      <DailyQuests />

      {/* A 2-minute micro-routine for the non-training moments of the day */}
      <DailyReset />

      <SpinWheel />

      <WaterCard />

      {/* Progress and competition — how the week is going */}
      <LeagueCard />

      <WeekActivityCard />

      {challenges.length > 0 && (
        <Section title={t('home.challenges')} onSeeAll={() => navigate('/achievements')}>
          <HScroll>
            {challenges.map((c: any, idx: number) => (
              // Links to the challenge itself. Every card here used to point at the
              // same generic page, so tapping any of them did the same thing.
              <Link
                key={c.id}
                to={`/challenge/${c.id}`}
                className="card-hover w-44 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <div className="relative">
                  <MediaImage path={c.coverImage} seed={idx + 1} label={c.title} className="h-28 w-full" />
                  {c.difficulty && (
                    <span className={`absolute start-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white ${
                      c.difficulty === 'hard' ? 'bg-red-500' : c.difficulty === 'easy' ? 'bg-brand-green' : 'bg-orange-500'
                    }`}>
                      {t(`home.diff.${c.difficulty}`)}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 text-sm font-bold leading-tight">{c.title}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><Users size={11} /> {c.participants ?? 0}</span>
                    {c.rewardXp > 0 && <span className="font-bold text-orange-500">+{c.rewardXp} XP</span>}
                  </div>
                </div>
              </Link>
            ))}
          </HScroll>
        </Section>
      )}

      <HallOfFame />

      {banners[0] && (
        <a
          href={banners[0].url ?? undefined}
          target={banners[0].url ? '_blank' : undefined}
          rel="noreferrer sponsored"
          onClick={() => trackAd(banners[0].id, 'click')}
          className="card-hover mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-5 text-white"
        >
          {banners[0].image && <MediaImage path={banners[0].image} className="h-14 w-14 rounded-xl" />}
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">{t('ads.sponsored')} · {banners[0].subtitle ?? ''}</div>
            <div className="text-lg font-bold">{banners[0].title}</div>
          </div>
        </a>
      )}

      <Section title={t('home.fitForLife')}>
        <HScroll>
          {fitForLife.map((f: any, idx: number) => (
            <motion.button whileTap={{ scale: 0.97 }} key={f.id} onClick={() => openFeatured(f, '/programs')} className="w-64 shrink-0 text-start">
              <div className="relative">
                <MediaImage path={f.image} seed={idx} label={f.title} className="h-40 w-full rounded-2xl" />
                {f.videoId && <PlayBadge />}
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-semibold">{f.title}</p>
              <p className="text-xs text-gray-400">{formatDuration(f.durationSec)}</p>
            </motion.button>
          ))}
        </HScroll>
      </Section>

      {/* PULSE Reels */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/reels')}
        className="card-hover mx-4 mt-6 flex w-[calc(100%-2rem)] items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-600 via-rose-500 to-orange-500 p-5 text-start text-white shadow-lg"
      >
        <span className="animate-float flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
          <Clapperboard size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-extrabold">PULSE Reels</span>
          <span className="block truncate text-sm text-white/80">{t('home2.reelsSub')}</span>
        </span>
        <ChevronRight className="shrink-0 opacity-80 rtl:rotate-180" />
      </motion.button>

      <Section title={t('home.coaches')} onSeeAll={() => navigate('/programs')}>
        <HScroll>
          {coaches.map((c: any, idx: number) => (
            <Link key={c.id} to={`/programs/coach/${c.id}`} className="w-28 shrink-0 text-center">
              <MediaImage path={c.avatarUrl} seed={idx + 2} label={c.name} className="mx-auto h-24 w-24 rounded-full" />
              <p className="mt-2 truncate text-sm font-semibold text-brand-pink">{c.name}</p>
            </Link>
          ))}
        </HScroll>
      </Section>

      <Section title={t('home.prepareMeal')} onSeeAll={() => navigate('/wellness/kitchen')}>
        <HScroll>
          {mealPrep.map((m: any, idx: number) => (
            <motion.button whileTap={{ scale: 0.97 }} key={m.id} onClick={() => openFeatured(m, '/wellness/kitchen')} className="w-56 shrink-0 text-start">
              <div className="relative">
                <MediaImage path={m.image} seed={idx + 4} label={m.title} className="h-32 w-full rounded-2xl" />
                {m.videoId && <PlayBadge />}
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-semibold text-brand-green">{m.title}</p>
            </motion.button>
          ))}
        </HScroll>
      </Section>


      {/* Inline video player for featured cards with an uploaded video */}
      <AnimatePresence>
        {playing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
            onClick={() => setPlaying(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between text-white">
                <p className="truncate pe-3 font-semibold">{playing.title}</p>
                <button onClick={() => setPlaying(null)} aria-label={t('common.close')} className="rounded-full bg-white/15 p-2"><X size={18} /></button>
              </div>
              <VideoPlayer videoId={playing.videoId} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Time-aware greeting + level / streak glass pills under the PULSE row. */
function Greeting() {
  const { t } = useTranslation();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  const streak = me?.currentStreak ?? 0;
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="min-w-0 truncate text-lg font-bold">
        {t(`home2.${part}`)}{me?.firstName ? `, ${me.firstName}` : ''} 👋
      </p>
      {me && (
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">{t('common.lv', { n: me.level ?? 1 })}</span>
          {streak > 0 && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">{streak}🔥</span>
          )}
        </div>
      )}
    </div>
  );
}

/** Four one-tap shortcuts to the most-used corners of the app. */
function QuickActions() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const actions = [
    { label: t('home2.tracker'), icon: <Flame size={22} />, to: '/tracker', tint: 'bg-orange-100 text-orange-600' },
    { label: t('home2.reels'), icon: <Clapperboard size={22} />, to: '/reels', tint: 'bg-fuchsia-100 text-fuchsia-600' },
    { label: t('home2.buddies'), icon: <HeartHandshake size={22} />, to: '/buddies', tint: 'bg-emerald-100 text-emerald-600' },
    { label: t('home2.muscleMap'), icon: <ScanLine size={22} />, to: '/exercises', tint: 'bg-sky-100 text-sky-600' },
  ];
  return (
    <div className="mx-4 mt-4 grid grid-cols-4 gap-2">
      {actions.map((a, i) => (
        <motion.button
          key={a.to}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...spring, delay: i * 0.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate(a.to)}
          className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl bg-white py-3 shadow-sm"
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.tint}`}>{a.icon}</span>
          <span className="w-full truncate px-1 text-center text-[11px] font-semibold text-gray-600">{a.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

/** First-timer on-ramp — shown only while the user has zero completed workouts. */
function WeekZeroEntryCard() {
  const { t } = useTranslation();
  const { data: progress } = useQuery({ queryKey: ['progress'], queryFn: () => api.get('/api/tracker/progress') });
  if (progress?.totalCompletions !== 0) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={spring}
      className="mx-4 mt-4 rounded-2xl bg-white shadow-sm"
    >
      <Link to="/week-zero" className="card-hover flex items-center gap-3 rounded-2xl p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-2xl" aria-hidden>
          🌱
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold">{t('weekzero.cardTitle')}</span>
          <span className="block truncate text-xs text-gray-400">{t('weekzero.cardSub')}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-gray-300 rtl:rotate-180" />
      </Link>
    </motion.section>
  );
}

/** Compact 7-day activity card — mini bars + weekly total + link to full progress. */
function WeekActivityCard() {
  const { t, i18n } = useTranslation();
  const { data: progress } = useQuery({ queryKey: ['progress'], queryFn: () => api.get('/api/tracker/progress') });
  const week: { day: string; count: number }[] = progress?.weekActivity ?? [];
  if (week.length === 0) return null;
  const maxCount = Math.max(1, ...week.map((w) => w.count));
  const total = week.reduce((s, w) => s + w.count, 0);
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={spring}
      className="mx-4 mt-4 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
    >
      <div className="min-w-0 shrink-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('home2.thisWeek')}</p>
        <p className="text-2xl font-extrabold leading-tight">
          <CountUp value={total} />
          <span className="ms-1 text-xs font-semibold text-gray-400">{t('today.workouts', { count: total })}</span>
        </p>
        <Link to="/progress" className="text-xs font-semibold text-orange-500">{t('home2.viewProgress')} →</Link>
      </div>
      <div className="flex h-16 min-w-0 flex-1 items-end justify-between gap-1.5">
        {week.map((w, i) => {
          const isToday = i === week.length - 1;
          return (
            <div key={w.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ ...spring, delay: 0.1 + i * 0.05 }}
                className={`w-full origin-bottom rounded-t-md ${isToday ? 'bg-orange-500' : 'bg-orange-200'}`}
                style={{ height: `${(w.count / maxCount) * 44 + 4}px`, opacity: w.count || isToday ? 1 : 0.4 }}
              />
              <span className={`text-[9px] ${isToday ? 'font-bold text-orange-500' : 'text-gray-400'}`}>
                {new Date(w.day).toLocaleDateString(i18n.language, { weekday: 'narrow' })}
              </span>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

/** Bell with live unread badge → notifications center. */
function NotifBell() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get('/api/notifications/unread'),
    refetchInterval: 60_000,
  });
  const unread = data?.unread ?? 0;
  return (
    <button onClick={() => navigate('/notifications')} aria-label="Notifications" className="relative">
      <Bell size={23} />
      {unread > 0 && (
        <span className="absolute -end-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

function Section({ title, children, onSeeAll }: { title: string; children: React.ReactNode; onSeeAll?: () => void }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {onSeeAll && (
          <button onClick={onSeeAll} className="text-gray-400"><ChevronRight size={22} className="rtl:rotate-180" /></button>
        )}
      </div>
      {children}
    </section>
  );
}

function PlayBadge() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/30 backdrop-blur">
        <Play size={20} fill="white" className="text-white" />
      </div>
    </div>
  );
}
