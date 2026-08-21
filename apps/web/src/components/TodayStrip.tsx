import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Flame, Megaphone, Flower2, Droplets, Wind } from 'lucide-react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { sameMuscle } from '../lib/muscleNames';
import { MediaImage } from './ui';
import { toast } from '../lib/toast';
import { tapFeedback } from '../lib/haptics';

const DAY_INDEX = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TodayStrip() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language.startsWith('ar');
  const { data: progress } = useQuery({ queryKey: ['progress'], queryFn: () => api.get('/api/tracker/progress') });
  const { data: presence } = useQuery({ queryKey: ['presence'], queryFn: () => api.get('/api/social/presence') });
  const { data: sched } = useQuery({ queryKey: ['schedule'], queryFn: () => api.get('/api/me/schedule') });
  const { data: groups } = useQuery({ queryKey: ['muscle-groups'], queryFn: () => api.get('/api/muscle-groups') });
  const { data: buddies } = useQuery({ queryKey: ['buddies'], queryFn: () => api.get('/api/social/buddies') });
  const { data: path } = useQuery({ queryKey: ['path-current'], queryFn: () => api.get('/api/path/current') });
  const { data: plan } = useQuery({ queryKey: ['assessment'], queryFn: () => api.get('/api/assessment'), staleTime: 5 * 60_000 });
  // Rest-of-the-day chips share the Tracker's / WaterCard's caches (same keys),
  // so a Home visit after either screen renders instantly from cache.
  const { data: day } = useQuery({ queryKey: ['tracker-day'], queryFn: () => api.get('/api/tracker/day') });
  const { data: water } = useQuery({ queryKey: ['water'], queryFn: () => api.get('/api/daily/water'), staleTime: 60_000 });
  const { data: journey } = useQuery({ queryKey: ['diet-journey'], queryFn: () => api.get('/api/tracker/diet-journey') });
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const onPresence = (p: { online: number }) => setOnline(p.online);
    socket.on('presence', onPresence);
    return () => { socket.off('presence', onPresence); };
  }, []);

  const cheer = useMutation({
    mutationFn: (id: string) => api.post(`/api/social/buddies/${id}/cheer`),
    onSuccess: (_d, id) => {
      tapFeedback();
      toast(t('buddies.cheered'), 'success');
      markCheered(id); // rotate to the next buddy right away
    },
  });

  const streak = progress?.currentStreak ?? 0;
  const week = progress?.weekActivity ?? [];
  const todayCount = week.length ? week[week.length - 1].count : 0;
  const goal = 1;
  const pct = Math.min(100, (todayCount / goal) * 100);
  const liveOnline = online ?? presence?.online ?? 0;

  // Today's plan from the user's saved schedule → one-tap start.
  const todayName = DAY_INDEX[new Date().getDay()];
  const today = (sched?.schedule ?? []).find((d: any) => d.day === todayName);
  const isRest = today && today.groups.length === 0;
  // scheduleJson stores English focus/group names — localize via the API's own
  // localized muscle groups («Triceps» read as English inside the Arabic hero).
  const focusLabel =
    today && i18n.language.startsWith('ar') && today.groups?.length
      ? today.groups.map((n: string) => (groups ?? []).find((g: any) => sameMuscle(g.name, n))?.name ?? n).join(' + ')
      : today?.focus;
  /**
   * Start follows the path first. The schedule and the program used to be two
   * systems answering "what now" differently — this button opened a muscle-group
   * session while the program quietly waited on another screen. The program is the
   * plan the user agreed to, so it wins; the schedule's muscle groups remain the
   * fallback for anyone not enrolled.
   */
  const startToday = () => {
    if (path?.enrolled && path.next?.id) return navigate(`/lesson/${path.next.id}`);
    const id = (today?.groups ?? [])
      .map((name: string) => (groups ?? []).find((g: any) => sameMuscle(g.name, name))?.id)
      .find(Boolean);
    navigate(id ? `/session/${id}` : '/programs');
  };

  // The cheer row rotates through ALL buddies, quiet ones first — and a buddy
  // you already cheered today leaves the slot immediately so the next one
  // shows (it used to sit "stuck" on the same person — user report).
  const todayKey = new Date().toISOString().slice(0, 10);
  const [cheeredIds, setCheeredIds] = useState<string[]>(() => {
    try {
      const j = JSON.parse(localStorage.getItem(`cheered_${todayKey}`) ?? '[]');
      return Array.isArray(j) ? j : [];
    } catch { return []; }
  });
  const buddyList: any[] = (buddies ?? []).filter((b: any) => !cheeredIds.includes(b.id));
  const quiet = buddyList.filter((b) => !(b.weeklyXp > 0));
  const cheerPool = quiet.length ? quiet : buddyList;
  const buddy = cheerPool.length ? cheerPool[new Date().getDate() % cheerPool.length] : undefined;
  const markCheered = (id: string) => {
    const next = [...cheeredIds, id];
    setCheeredIds(next);
    try { localStorage.setItem(`cheered_${todayKey}`, JSON.stringify(next)); } catch { /* storage full */ }
  };

  // Water chip logs a glass in place — WaterCard's optimistic mutation verbatim,
  // because deep-linking to '/' would just land on the collapsed card.
  const logWater = useMutation<any, Error, { delta: number }, { prev?: any }>({
    mutationFn: (body) => api.post('/api/daily/water', body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ['water'] });
      const prev = qc.getQueryData<any>(['water']);
      if (prev) qc.setQueryData(['water'], { ...prev, glasses: Math.max(0, prev.glasses + body.delta) });
      return { prev };
    },
    onError: (err, _body, ctx) => {
      if (ctx?.prev) qc.setQueryData(['water'], ctx.prev);
      toast(err?.message ?? 'Something went wrong', 'error');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['water'] });
      qc.invalidateQueries({ queryKey: ['quests'] });
    },
  });

  // Rest of the day at a glance: food, water, and (when due) the weigh-in.
  const kcal = day?.totals?.calories ?? 0;
  const kcalGoal = day?.goals?.calories ?? 0;
  // Same honesty thresholds as the Tracker's bar: amber at goal, red past 115%.
  const kcalPct = kcalGoal ? Math.round((kcal / kcalGoal) * 100) : 0;
  const kcalTone = kcalPct > 115 ? 'text-red-500' : kcalPct >= 100 ? 'text-amber-600' : 'text-ink';
  const glasses = water?.glasses ?? 0;
  const waterGoal = Math.max(1, water?.goal ?? 8);
  const waterDone = glasses >= waterGoal;
  // Weigh-in nudge only while a diet journey is live AND the scale went quiet
  // for 3+ days — weights ride the progress payload the strip already fetches.
  const weights: { date: string }[] = progress?.weights ?? [];
  const lastWeigh = weights.length ? new Date(weights[weights.length - 1].date).getTime() : 0;
  const weighInDue = !!journey?.active && Date.now() - lastWeigh > 3 * 86400000;
  const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

  return (
    <div className="animate-fade-up mx-4 -mt-3 rounded-2xl glass p-4">
      <div className="flex items-center gap-4">
        <Ring pct={pct} done={todayCount >= goal} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {todayCount >= goal
              ? t('today.goalDone')
              : path?.enrolled && path.next
                ? path.next.title
                : today
                  ? isRest
                    ? t('today.restDay')
                    : t('today.todayFocus', { focus: focusLabel })
                  : t('today.goal')}
          </p>
          <p className="truncate text-xs text-gray-400">
            {path?.enrolled && path.total
              ? t('path.dayOf', { n: Math.min((path.completed ?? 0) + 1, path.total), total: path.total })
              : `${todayCount}/${goal} ${t('today.workouts', { count: goal })}`}
          </p>
          {/* One line, always: smaller type + truncation — this row was wrapping
              and pushing the hero taller (user feedback). */}
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            <span className="flex shrink-0 items-center gap-1 font-semibold text-orange-500"><Flame size={12} /> {t('today.streakDays', { n: streak })}</span>
          </div>
        </div>
        <button onClick={startToday} className="btn-pill btn-primary shrink-0 px-6 py-2.5 text-sm">
          {isRest && !path?.enrolled ? t('today.explore') : t('today.start')}
        </button>
      </div>

      {/* Online now, on its own line: five real faces beat a cramped number
          (the inline text used to truncate unreadably — user report). */}
      {liveOnline > 0 && (
        <div className="mt-2.5 flex items-center gap-2 border-t border-gray-200/40 pt-2.5">
          <span className="live-dot relative inline-block h-2 w-2 shrink-0 rounded-full bg-brand-green text-brand-green" />
          <div className="flex -space-x-2 rtl:space-x-reverse">
            {(presence?.sample ?? []).slice(0, 5).map((u: any) => (
              <MediaImage key={u.id} path={u.avatarUrl} label={u.firstName} className="h-6 w-6 rounded-full ring-2 ring-white" />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-brand-green">{t('today.trainingNow', { n: liveOnline })}</span>
        </div>
      )}

      {/* Rest of the day: the weight-loss half of the day (food, water, weigh-in)
          lived on three screens — one glance here covers it. Chips render only
          once their cached query has data, so loading shows nothing (no flash);
          Home sits behind RequireAuth, so guests never reach this. */}
      {(day || water || weighInDue) && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto border-t border-gray-200/40 pt-3">
          {day && (
            <button
              onClick={() => navigate('/tracker')}
              className="flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-full bg-white/60 px-3 text-[11px] font-bold text-gray-600 transition active:scale-95"
              aria-label={isAr ? 'سعرات النهارده' : "Today's calories"}
            >
              🍽{' '}
              <span className={`tabular-nums ${kcalTone}`}>
                {kcalGoal ? `${fmt(kcal)} / ${fmt(kcalGoal)}` : `${fmt(kcal)} ${isAr ? 'سعرة' : 'kcal'}`}
              </span>
            </button>
          )}
          {water && (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                tapFeedback();
                // At goal the chip stops adding (same guard as WaterCard's "+").
                if (!waterDone) logWater.mutate({ delta: 1 });
              }}
              className={`flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition ${
                waterDone ? 'bg-sky-100 text-sky-600' : 'bg-white/60 text-gray-600'
              }`}
              aria-label={isAr ? 'سجّل كوباية مية' : 'Log a glass of water'}
            >
              💧{' '}
              {/* Keyed pop: the count re-mounts on each glass, so the optimistic
                  bump reads as a tiny celebration instead of a silent redraw. */}
              <motion.span
                key={glasses}
                initial={{ scale: 1.45 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className={`tabular-nums ${waterDone ? '' : 'text-ink'}`}
              >
                {glasses}/{waterGoal}
              </motion.span>
            </motion.button>
          )}
          {/* Log-food shortcut: the calories chip only *shows* the number —
              this is the one-tap way to add to it (user: "only two buttons?"). */}
          <button
            onClick={() => navigate('/tracker')}
            className="flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 text-[11px] font-bold text-emerald-700 transition active:scale-95"
          >
            ➕ {isAr ? 'سجّل أكل' : 'Log food'}
          </button>
          {/* Weigh-in is always reachable; it only turns violet-loud when due. */}
          <button
            onClick={() => navigate('/progress')}
            className={`flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition active:scale-95 ${
              weighInDue ? 'bg-violet-100 text-violet-600' : 'bg-white/60 text-gray-600'
            }`}
          >
            ⚖️ {isAr ? 'اتوزن' : 'Weigh-in'}
          </button>
        </div>
      )}

      {/* Next-step chips folded INTO the hero. "New here? Week Zero", "Get my
          plan" and "Pick a program" were each a full-width card — three stacked
          CTAs all answering the same question this strip already owns. */}
      {!path?.enrolled && ((progress?.totalCompletions ?? 1) === 0 || plan?.hasPlan === false) && (
        <div className="mt-3 flex gap-2 border-t border-gray-200/40 pt-3">
          {(progress?.totalCompletions ?? 1) === 0 && (
            <button
              onClick={() => navigate('/week-zero')}
              className="flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-100 px-3 text-xs font-bold text-emerald-700 transition active:scale-95"
            >
              🌱 {t('today.chipWeekZero')}
            </button>
          )}
          {plan?.hasPlan === false ? (
            <button
              onClick={() => navigate('/my-plan')}
              className="flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-full bg-orange-100 px-3 text-xs font-bold text-orange-600 transition active:scale-95"
            >
              📋 {t('assess.cta')}
            </button>
          ) : (
            <button
              onClick={() => navigate('/programs')}
              className="flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-full bg-blue-100 px-3 text-xs font-bold text-brand-blue transition active:scale-95"
            >
              🧭 {t('path.pickTitle')}
            </button>
          )}
        </div>
      )}

      {/* Rest day: offer recovery actions instead of a dead end — this is where streaks die */}
      {isRest && !path?.enrolled && todayCount < goal && (
        <div className="mt-3 border-t border-gray-200/40 pt-3">
          <p className="mb-2 text-[11px] font-semibold text-gray-400">{t('daily.restDaySub')}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { to: '/yoga', icon: Flower2, label: t('daily.stretch') },
              { to: '/', icon: Droplets, label: t('daily.water') },
              { to: '/wellness', icon: Wind, label: t('daily.breathe') },
            ].map(({ to, icon: Icon, label }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="flex flex-col items-center gap-1 rounded-xl bg-white/60 px-2 py-2.5 text-center transition active:scale-95"
              >
                <Icon size={16} className="text-brand-green" />
                <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-gray-600">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Buddy nudge — accountability is the best motivation */}
      {buddy && (
        <div className="mt-3 flex items-center gap-2.5 border-t border-gray-200/40 pt-3">
          <MediaImage path={buddy.avatarUrl} label={buddy.firstName} className="h-8 w-8 shrink-0 rounded-full" />
          <p className="min-w-0 flex-1 truncate text-xs text-gray-500">
            <span className="font-semibold text-ink">{buddy.firstName}</span>
            {' '}· {buddy.weeklyXp > 0 ? t('today.xpThisWeek', { xp: buddy.weeklyXp }) : t('today.quietWeek')}
          </p>
          <button
            onClick={() => cheer.mutate(buddy.id)}
            disabled={cheer.isPending}
            className="flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-600 transition active:scale-90 disabled:opacity-60"
          >
            <Megaphone size={12} /> {t('buddies.cheer')}
          </button>
        </div>
      )}
    </div>
  );
}

function Ring({ pct, done }: { pct: number; done: boolean }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const [p, setP] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setP(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <svg width={64} height={64} viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#efefef" strokeWidth="7" />
      <circle
        cx="32" cy="32" r={r} fill="none"
        stroke={done ? '#16A34A' : '#F97316'}
        strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (p / 100) * c}
        transform="rotate(-90 32 32)"
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)' }}
      />
      <text x="32" y="37" textAnchor="middle" className="fill-ink text-sm font-bold">{Math.round(p)}%</text>
    </svg>
  );
}
