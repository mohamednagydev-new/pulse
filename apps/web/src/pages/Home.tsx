import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { trackAd, pickAd } from '../lib/ads';
import { track } from '../lib/track';
import { Search, ChevronRight, Play, Clapperboard, X, Bell, Flame, HeartHandshake, ScanLine, Users, HelpCircle, Sun, Moon } from 'lucide-react';
import { currentTheme, toggleTheme } from '../lib/theme';
import { api } from '../lib/api';
import { Loader, ErrorMsg, MediaImage, HScroll, formatDuration } from '../components/ui';
import TodayStrip from '../components/TodayStrip';
import GettingStarted from '../components/GettingStarted';
import PushNudge from '../components/PushNudge';
import ComebackCard from '../components/ComebackCard';
import DailyReset from '../components/DailyReset';
import DailyQuests from '../components/DailyQuests';
import WaterCard from '../components/WaterCard';
import SpinWheel from '../components/SpinWheel';
import HallOfFame from '../components/HallOfFame';
import PathCard from '../components/PathCard';
import CheckInCard from '../components/CheckInCard';
import MenuDrawer from '../components/MenuDrawer';
import ScreenHeader from '../components/ScreenHeader';
import VideoPlayer from '../components/VideoPlayer';
import CountUp from '../components/CountUp';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

/* Progressive disclosure: the calm default shows only the core (today's action,
 * quests). Everything else lives behind one-tap chips — expanded on demand,
 * pinnable so each user builds the Home THEY want. This is the direction for
 * every busy screen: fewer things visible, the user decides. */
const PINS_KEY = 'pulse-home-pins';
const loadPins = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(PINS_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({ queryKey: ['home'], queryFn: () => api.get('/api/home') });
  const [playing, setPlaying] = useState<{ videoId: string; title?: string } | null>(null);
  const [pins, setPins] = useState<string[]>(loadPins);
  // The first chip starts selected: an open example teaches the row's whole
  // interaction model without a tutorial.
  const [expanded, setExpanded] = useState<string | null>('week');
  const [chipScrolled, setChipScrolled] = useState(false);

  const togglePin = (key: string) => {
    setPins((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try { localStorage.setItem(PINS_KEY, JSON.stringify(next)); } catch { /* fine */ }
      track(`chip/${key}/${next.includes(key) ? 'pin' : 'unpin'}`, 'home');
      return next;
    });
  };

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
    const b = pickAd<any>(data?.banners);
    if (b) trackAd(b.id, 'impression');
  }, [data]);

  if (isLoading) return <Loader label={t('common.loading')} />;
  if (error) return <ErrorMsg error={error} />;

  const { banners = [], coaches = [], fitForLife = [], mealPrep = [], challenges = [] } = data ?? {};
  // One sponsor slot, rotating daily among active home_sponsor banners.
  const banner = pickAd<any>(banners);

  return (
    <div className="pb-6">
      <ScreenHeader tone="hero" padBottom="pb-6" className="animate-fade-up shadow-lg">
        <div className="relative flex items-center justify-between">
          <MenuDrawer />
          {/* Brand truly centered (logo + wordmark), independent of the uneven
              icon counts on either side. */}
          <span className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center justify-center">
            <img src="/pwa-192.png" alt="" className="h-7 w-7 rounded-lg shadow" />
            <span className="mt-0.5 text-[11px] font-extrabold italic tracking-[0.2em]">PULSE</span>
          </span>
          <div className="relative flex items-center gap-3.5">
            <ThemeToggle />
            {/* The guide, visible from day one — "what is all this?" has a home. */}
            <button onClick={() => navigate('/help')} aria-label={t('nav.help', { defaultValue: 'Help' })}>
              <HelpCircle size={23} />
            </button>
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

      {/* First-session orientation — users said they log in and don't know
          what's here or where to start. Gone once the four steps are done. */}
      <GettingStarted />
      <PushNudge />

      {/* WeekZeroEntryCard and the "Start training" slab are gone: Week Zero
          lives as a chip inside the Today strip, and Start/Muscle Map are both
          one tap away (hero Start button + quick action). Fewer stacked CTAs,
          same destinations. */}
      <CheckInCard />

      <PathCard />

      <QuickActions />

      {/* A LIVE prize challenge outranks the calm default: real money on the
          table is the one thing that always earns a core slot. Auto-appears
          when a prize challenge is in its window, gone when it ends. */}
      {(() => {
        const prizeChal = (challenges as any[]).find((c) => c.prizeText);
        if (!prizeChal) return null;
        return (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/challenge/${prizeChal.id}`)}
            className="scene-tex mx-4 mt-2 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3.5 text-start text-white shadow-md shadow-amber-500/30"
          >
            <span className="text-2xl" aria-hidden>🏆</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">{prizeChal.title}</span>
              <span className="block truncate text-[11px] text-white/85">🎁 {prizeChal.prizeText}</span>
            </span>
            <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-orange-600">
              {t('challenge.enterNow')}
            </span>
          </motion.button>
        );
      })()}

      {/* Today's habits — the things that reset every morning */}
      <DailyQuests />

      {/* Everything below is OPT-IN. One chip = one tap away; pin what you love. */}
      {(() => {
        const challengesNode = challenges.length > 0 && (
          <Section title={t('home.challenges')} onSeeAll={() => navigate('/achievements')}>
            <HScroll>
              {challenges.map((c: any, idx: number) => (
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
                    {/* Real prizes = the loudest badge on the card. */}
                    {c.prizeText && (
                      <span className="absolute end-2 top-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[9px] font-extrabold text-white shadow">
                        🎁 {t('challenge.prizesBadge')}
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
        );
        const discoverNode = (
          <>
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
            <Section title={t('home.coaches')} onSeeAll={() => navigate('/programs')}>
              <HScroll>
                {coaches.map((c: any, idx: number) => (
                  <Link key={c.id} to={`/programs/coach/${c.id}`} className="w-28 shrink-0 text-center">
                    <MediaImage path={c.avatarUrl} seed={idx + 2} label={c.name} className="mx-auto h-24 w-24 rounded-full" />
                    <p className="mt-2 truncate text-sm font-semibold">{c.name}</p>
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
                    <p className="mt-2 line-clamp-2 text-sm font-semibold">{m.title}</p>
                  </motion.button>
                ))}
              </HScroll>
            </Section>
          </>
        );

        const OPTIONAL: { key: string; emoji: string; label: string; grad: string; node: React.ReactNode }[] = [
          { key: 'week', emoji: '📊', label: t('homeSlim.week'), grad: 'from-teal-500 to-cyan-600', node: <WeekActivityCard /> },
          { key: 'water', emoji: '💧', label: t('homeSlim.water'), grad: 'from-sky-400 to-blue-600', node: <WaterCard /> },
          { key: 'spin', emoji: '🎁', label: t('homeSlim.spin'), grad: 'from-fuchsia-500 to-pink-600', node: <SpinWheel /> },
          { key: 'reset', emoji: '🧘', label: t('homeSlim.reset'), grad: 'from-emerald-500 to-green-600', node: <DailyReset /> },
          ...(challengesNode ? [{ key: 'challenges', emoji: '🏆', label: t('homeSlim.challenges'), grad: 'from-amber-500 to-orange-600', node: challengesNode }] : []),
          { key: 'discover', emoji: '🎬', label: t('homeSlim.discover'), grad: 'from-rose-500 to-red-600', node: discoverNode },
        ];
        const pinned = OPTIONAL.filter((s) => pins.includes(s.key));
        const unpinned = OPTIONAL.filter((s) => !pins.includes(s.key));
        const open = unpinned.find((s) => s.key === expanded) ?? null;

        return (
          <>
            {pinned.map((s) => (
              <div key={s.key}>
                <div className="mx-5 mt-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">{s.emoji} {s.label}</span>
                  <button onClick={() => togglePin(s.key)} className="text-xs font-bold text-gray-300">{t('homeSlim.unpin')}</button>
                </div>
                <div className="-mt-2">{s.node}</div>
              </div>
            ))}

            {unpinned.length > 0 && (
              <div className="mt-5 px-4">
                <p className="px-1 text-xs font-bold uppercase tracking-wide text-gray-400">{t('homeSlim.more')}</p>
                {/* pt-1: the active ring draws OUTSIDE the button — without the
                    padding the scroll container clips its top edge. */}
                <div className="relative">
                  <div
                    onScroll={() => !chipScrolled && setChipScrolled(true)}
                    className="chip-row mt-1 flex gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar"
                  >
                    {unpinned.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => {
                          if (expanded !== s.key) track(`chip/${s.key}/open`, 'home');
                          setExpanded(expanded === s.key ? null : s.key);
                        }}
                        className={`flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br px-4 py-2.5 text-sm font-bold text-white shadow-md transition ${s.grad} ${
                          expanded === s.key ? 'ring-2 ring-white/90' : 'opacity-90'
                        }`}
                      >
                        {s.emoji} {s.label}
                      </button>
                    ))}
                  </div>
                  {!chipScrolled && unpinned.length > 3 && <span className="chip-hint" aria-hidden />}
                </div>
              </div>
            )}

            {open && (
              <div>
                <div className="mx-5 mt-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">{open.emoji} {open.label}</span>
                  <button onClick={() => { togglePin(open.key); setExpanded(null); }} className="text-xs font-bold text-brand-blue">📌 {t('homeSlim.pin')}</button>
                </div>
                <div className="-mt-2">{open.node}</div>
              </div>
            )}
          </>
        );
      })()}

      {/* Hall of fame stays visible in the body — seeing real people at the top
          is the motivation loop, not an optional widget (user decision). */}
      <HallOfFame />

      {banner && (
        <a
          href={banner.url ?? undefined}
          target={banner.url ? '_blank' : undefined}
          rel="noreferrer sponsored"
          onClick={() => banner.url && trackAd(banner.id, 'click')}
          className="card-hover mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          {banner.image && <MediaImage path={banner.image} label={banner.title} className="h-14 w-14 shrink-0 rounded-xl" />}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-bold uppercase tracking-wide text-orange-500">{t('ads.sponsored')}{banner.subtitle ? ` · ${banner.subtitle}` : ''}</div>
            <div className="truncate text-base font-bold">{banner.title}</div>
          </div>
        </a>
      )}

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

/** Four one-tap shortcuts to the most-used corners of the app.
 *  Same tile language as the Wellness quick tiles: the whole card wears its
 *  gradient (scene texture blended in), icon on a white/20 chip. Tracker keeps
 *  the exact Calories gradient so the same feature reads the same everywhere. */
function QuickActions() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const actions = [
    { label: t('home2.tracker'), icon: <Flame size={22} />, to: '/tracker', g: 'from-orange-500/90 to-amber-600/80' },
    { label: t('home2.reels'), icon: <Clapperboard size={22} />, to: '/reels', g: 'from-fuchsia-500/90 to-pink-700/80' },
    { label: t('home2.buddies'), icon: <HeartHandshake size={22} />, to: '/buddies', g: 'from-emerald-500/90 to-teal-700/80' },
    { label: t('home2.muscleMap'), icon: <ScanLine size={22} />, to: '/exercises', g: 'from-sky-500/90 to-blue-700/80' },
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
          className={`scene-tex flex min-w-0 flex-col items-center gap-1.5 rounded-2xl bg-gradient-to-br ${a.g} py-3.5 text-white shadow-md`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">{a.icon}</span>
          <span className="w-full truncate px-1 text-center text-[11px] font-bold">{a.label}</span>
        </motion.button>
      ))}
    </div>
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

/** Sun/moon switch right in the header — dark is the default and the glassy
 *  look is the brand, but daylight readers flip to light in one tap. */
function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme());
  return (
    <button
      onClick={() => setTheme(toggleTheme())}
      aria-label="Theme"
      className="transition active:scale-90"
    >
      {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
    </button>
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
    <section className="mt-4">
      <div className="mb-2 flex items-center justify-between px-4">
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
