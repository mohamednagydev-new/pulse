import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, SkipForward, Music, Play, Pause, X, Timer, ChevronRight, Trophy, Dumbbell, Share2, Volume2, VolumeX, AlertTriangle, PlayCircle, Pencil, Trash2, ListChecks, Bookmark } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import { shareMilestone } from '../../lib/shareCard';
import { WaIcon, waOpen } from '../../components/WaShare';
import { enqueue, postResilient } from '../../lib/offlineQueue';
import HrMonitor from '../../components/HrMonitor';
import { useAuth } from '../../store/auth';
import { Loader } from '../../components/ui';
import ExerciseVisual, { exercisePoster } from '../../components/ExerciseVisual';
import HumanMove, { patternFor } from '../../components/HumanMove';
import ContentVideo from '../../components/ContentVideo';
import Confetti from '../../components/Confetti';
import { signedMediaUrl } from '../../lib/media';
import { successFeedback, celebrateFeedback, tapFeedback } from '../../lib/haptics';
import { coach, cancel as cancelVoice, voiceEnabled, setVoiceEnabled } from '../../lib/voice';
import { getRestTip } from '../../lib/restTips';

/** Easier/harder progression link — present only on muscle-group exercises. */
type ProgressionLink = { id: string; name: string; nameAr?: string | null } | null | undefined;

const DEFAULT_REST_SECONDS = 45;
const REST_CHOICES = [30, 45, 60, 90, 120];
const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

/** Hevy-style set flavors — warm-ups never count toward PRs (server-enforced). */
type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';
const SET_TYPE_OPTS: { v: SetType; en: string; ar: string; cls: string }[] = [
  { v: 'normal', en: 'Normal', ar: 'عادي', cls: 'bg-white/15 text-white' },
  { v: 'warmup', en: 'Warm-up', ar: 'تسخين', cls: 'bg-sky-400/25 text-sky-200' },
  { v: 'dropset', en: 'Drop', ar: 'دروب', cls: 'bg-violet-400/25 text-violet-200' },
  { v: 'failure', en: 'Failure', ar: 'للفشل', cls: 'bg-red-400/25 text-red-200' },
];

/** A set logged in THIS session (offline-queued ones have no server id yet). */
type SessionSet = { id?: string; weightKg: number; reps: number; setType: SetType; offline?: boolean };

/** Buddy talk — rotates per exercise so every screen feels like someone's cheering. */
const HYPE: { en: string; ar: string }[] = [
  { en: "You've got this 💪", ar: 'انت قدها 💪' },
  { en: 'Own every rep 🔥', ar: 'خلي كل عدة تتحس 🔥' },
  { en: 'Slow down, feel the muscle 🎯', ar: 'بالراحة، حس بالعضلة 🎯' },
  { en: 'Breathe — then push ⚡', ar: 'خد نفسك وبعدين ادفع ⚡' },
  { en: 'Stronger than last week 📈', ar: 'أقوى من الأسبوع اللي فات 📈' },
  { en: 'Last ones count double 🏆', ar: 'الأخيرة بتحسب بضعف 🏆' },
];

function beep() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 720;
    g.gain.value = 0.06;
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, 180);
  } catch { /* ignore */ }
}

/** Thin bars that dance while the track plays and freeze the moment it pauses. */
function Equalizer({ active }: { active: boolean }) {
  const bars = [0, 1, 2, 3];
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
      {bars.map((b) => (
        <motion.span
          key={b}
          className="h-3.5 w-[2.5px] rounded-full bg-white"
          style={{ transformOrigin: 'bottom' }}
          initial={{ scaleY: 0.35 }}
          animate={active ? { scaleY: [0.3, 1, 0.45, 0.85, 0.3] } : { scaleY: 0.35 }}
          transition={
            active
              ? { duration: 0.85 + b * 0.13, repeat: Infinity, ease: 'easeInOut', delay: b * 0.09 }
              : { duration: 0.25 }
          }
        />
      ))}
    </span>
  );
}

/** Soft blurred blobs that breathe with the music — decorative only. */
function AmbientGlow({ active }: { active: boolean }) {
  const blobs = [
    { cls: 'bg-brand-pink -start-24 top-[6%] h-64 w-64', dur: 6.0, delay: 0, peak: 0.2 },
    { cls: 'bg-brand-blue -end-28 top-[38%] h-72 w-72', dur: 7.4, delay: 0.7, peak: 0.16 },
    { cls: 'bg-brand-pink start-[18%] -bottom-16 h-56 w-56', dur: 6.6, delay: 1.4, peak: 0.14 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden="true">
      {blobs.map((b, k) => (
        <motion.div
          key={k}
          className={`absolute rounded-full blur-3xl ${b.cls}`}
          initial={{ opacity: 0, scale: 1 }}
          animate={active ? { opacity: [b.peak * 0.6, b.peak, b.peak * 0.6], scale: [1, 1.22, 1] } : { opacity: 0, scale: 1 }}
          transition={
            active
              ? { duration: b.dur, repeat: Infinity, ease: 'easeInOut', delay: b.delay }
              : { duration: 0.6 }
          }
        />
      ))}
    </div>
  );
}

export default function WorkoutSession() {
  const { groupId, workoutId, routineId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Comeback mode — Home's comeback card links here with ?short=1 for a
  // 4-exercise session that gets a lapsed user a win without the full grind.
  const shortMode = searchParams.get('short') === '1';
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const { data: source, isLoading } = useQuery({
    queryKey: routineId ? ['routine', routineId] : workoutId ? ['coach-workout', workoutId] : ['muscle-group', groupId],
    queryFn: () =>
      api.get(
        routineId
          ? `/api/routines/${routineId}`
          : workoutId
            ? `/api/coach/workouts/${workoutId}`
            : `/api/muscle-groups/${groupId}`,
      ),
  });
  const group = source ? { name: source.name ?? source.title, exercises: source.exercises ?? [] } : undefined;
  const { data: tracks } = useQuery({ queryKey: ['music'], queryFn: () => api.get('/api/music') });
  // For the done-screen WhatsApp CTA — invites carry the user's referral link.
  const { data: referral } = useQuery({ queryKey: ['referral'], queryFn: () => api.get('/api/me/referral'), staleTime: Infinity });

  const queryClient = useQueryClient();
  const firstName = useAuth((s) => s.user?.firstName);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'exercise' | 'rest' | 'done'>('exercise');
  // Form demo opens on demand: a video autoplaying mid-set would fight the timer,
  // but not being able to check the movement at all is worse.
  const [showForm, setShowForm] = useState(false);
  const [rest, setRest] = useState(DEFAULT_REST_SECONDS);
  const [doneList, setDoneList] = useState<string[]>([]);
  const [musicOn, setMusicOn] = useState(false);
  const [trackIdx, setTrackIdx] = useState<number | null>(null);
  // Set logging — entries keyed by exercise name so next/prev doesn't wipe them
  const [entries, setEntries] = useState<Record<string, { kg: string; reps: string; setType?: SetType }>>({});
  // Sets already logged THIS session, per exercise — the Hevy-style numbered list.
  const [sessionSets, setSessionSets] = useState<Record<string, SessionSet[]>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);
  const [voiceOn, setVoiceOn] = useState(voiceEnabled());
  const [prWeight, setPrWeight] = useState<number | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [sessionSecs, setSessionSecs] = useState(0);
  // Save-as-routine on the done screen — one shot per session.
  const [routineSaved, setRoutineSaved] = useState(false);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timer = useRef<ReturnType<typeof setInterval>>();
  // One auto-opened share sheet per session, max — a dismissed sheet stays dismissed.
  const autoShared = useRef(false);

  // A lighter week must actually be lighter, and a flagged movement must be
  // flagged where the user is about to do it — not only on the plan screen.
  const { data: checkin } = useQuery({
    queryKey: ['checkin'],
    queryFn: () => api.get('/api/assessment/checkin'),
    staleTime: 10 * 60_000,
  });
  const deloading = !!checkin?.deload;

  /** Halve the prescribed sets during a deload, keeping the reps as written. */
  const easedSets = (raw?: string | null) => {
    if (!raw) return raw;
    if (!deloading) return raw;
    return String(raw).replace(/\d+/, (n) => String(Math.max(1, Math.ceil(Number(n) / 2))));
  };

  /** The sets/reps/level chips come as English DB strings ("3 sets", "8-12
   *  reps", "Intermediate") — translate the units in place for Arabic users. */
  const meta = (raw?: string | null) => {
    if (!raw || !isAr) return raw ?? '';
    return String(raw)
      .replace(/sets?/i, 'مجموعات')
      .replace(/reps?/i, 'عدة')
      .replace(/each side/i, 'لكل جانب')
      .replace(/sec(ond)?s?/i, 'ثانية')
      .replace(/min(ute)?s?/i, 'دقيقة')
      .replace(/hold/i, 'ثبات')
      .replace(/beginner/i, 'مبتدئ')
      .replace(/intermediate/i, 'متوسط')
      .replace(/advanced/i, 'متقدم');
  };

  const allExercises: any[] = group?.exercises ?? [];
  const exercises: any[] = shortMode ? allExercises.slice(0, 4) : allExercises;
  const current = exercises[i];
  const easier: ProgressionLink = current?.easier;
  const harder: ProgressionLink = current?.harder;
  const next = exercises[i + 1];
  const isLast = i >= exercises.length - 1;
  const trackList: any[] = Array.isArray(tracks) ? tracks : [];
  const track = trackIdx !== null ? trackList[trackIdx] : undefined;
  const hype = HYPE[i % HYPE.length];

  // Their own history for THIS exercise — "last time: 40kg × 10" next to the
  // log inputs is the single most motivating number in a session.
  const { data: liftHistory } = useQuery({
    queryKey: ['lifts', current?.name],
    queryFn: () => api.get(`/api/tracker/lifts?exercise=${encodeURIComponent(current!.name)}`),
    enabled: !!current?.name,
    staleTime: 60_000,
  });
  const lastLift = Array.isArray(liftHistory) && liftHistory.length ? liftHistory[0] : null;
  // Best excludes warm-ups — same rule the server applies to PRs.
  const workLifts = Array.isArray(liftHistory) ? liftHistory.filter((l: any) => l.setType !== 'warmup') : [];
  const bestLift = workLifts.length
    ? workLifts.reduce((a: any, b: any) => (b.weightKg > a.weightKg ? b : a))
    : null;

  // Configurable rest — the user's saved preference, overridable mid-session.
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me'), staleTime: 60_000 });
  const [restOverride, setRestOverride] = useState<number | null>(null);
  const restTotal = restOverride ?? (typeof me?.restSeconds === 'number' && me.restSeconds >= 15 ? me.restSeconds : DEFAULT_REST_SECONDS);
  const restTotalRef = useRef(restTotal);
  restTotalRef.current = restTotal;

  /** Pick a new rest length: applies to the running countdown NOW and persists. */
  const pickRest = (v: number) => {
    tapFeedback();
    setRestOverride(v);
    setRest(v); // the ticking interval simply continues from the new value
    api.patch('/api/me', { restSeconds: v })
      .then(() => queryClient.invalidateQueries({ queryKey: ['me'] }))
      .catch(() => {}); // preference save is best-effort; the session keeps the override
  };

  // Rest countdown — with spoken cues when the voice coach is on.
  useEffect(() => {
    if (phase !== 'rest') return;
    setRest(restTotalRef.current);
    coach('rest', i18n.language);
    timer.current = setInterval(() => {
      setRest((r) => {
        if (r <= 1) {
          clearInterval(timer.current);
          beep();
          coach('restOver', i18n.language);
          setPhase('exercise');
          setI((x) => x + 1);
          return 0;
        }
        if (r <= 4) coach('countdown', i18n.language, r - 1); // 3…2…1
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timer.current);
  }, [phase]);

  // Announce each exercise as it comes up.
  useEffect(() => {
    if (phase === 'exercise' && current?.name) coach('exercise', i18n.language, current.name);
  }, [i, phase, current?.name]);

  // Stop any speech when leaving the session.
  useEffect(() => () => cancelVoice(), []);

  // Moving to another exercise must drop any in-flight edit — otherwise the
  // Save button would patch the previous exercise's set with the new one's numbers.
  useEffect(() => { setEditingId(null); }, [i]);

  const entry = (current && entries[current.name]) ?? { kg: '', reps: '' };
  const setType: SetType = entry.setType ?? 'normal';
  const setEntry = (patch: Partial<{ kg: string; reps: string; setType: SetType }>) => {
    if (!current) return;
    setEntries((e) => {
      const prev = e[current.name] ?? { kg: '', reps: '' };
      return { ...e, [current.name]: { ...prev, ...patch } };
    });
  };
  const currentSets: SessionSet[] = (current && sessionSets[current.name]) ?? [];
  const pushSessionSet = (name: string, s: SessionSet) =>
    setSessionSets((m) => ({ ...m, [name]: [...(m[name] ?? []), s] }));

  /** After any server-side change, the history strip + PR list must not go stale. */
  const refreshLiftQueries = (name: string) => {
    queryClient.invalidateQueries({ queryKey: ['lifts', name] });
    queryClient.invalidateQueries({ queryKey: ['prs'] });
  };

  const logSet = async () => {
    if (!current || logging) return;
    const weightKg = parseFloat(entry.kg);
    const reps = parseInt(entry.reps, 10);
    if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(reps) || reps <= 0) {
      toast(t('session.enterFirst'), 'error');
      return;
    }
    setLogging(true);
    try {
      if (editingId) {
        // Fixing a just-logged set — no PR fanfare on an edit.
        const name = current.name;
        await api.patch(`/api/tracker/lifts/${editingId}`, { weightKg, reps, setType });
        setSessionSets((m) => ({
          ...m,
          [name]: (m[name] ?? []).map((s) => (s.id === editingId ? { ...s, weightKg, reps, setType } : s)),
        }));
        setEditingId(null);
        setEntry({ reps: '' });
        refreshLiftQueries(name);
        toast(isAr ? 'اتعدلت ✔' : 'Set updated ✔', 'success');
        return;
      }
      const res = await api.post('/api/tracker/lifts', { exercise: current.name, weightKg, reps, setType });
      pushSessionSet(current.name, { id: res?.id, weightKg, reps, setType });
      setEntry({ reps: '' }); // clear reps; keep weight handy for the next set
      refreshLiftQueries(current.name);
      if (res?.isPR) {
        celebrateFeedback();
        coach('pr', i18n.language);
        setPrWeight(weightKg);
        queryClient.invalidateQueries({ queryKey: ['prs'] });
        // Auto-open the share sheet at the emotional peak — once per session.
        if (!autoShared.current) {
          autoShared.current = true;
          void shareMilestone({ kind: 'pr', title: t('share.pr'), value: `${weightKg} ${t('session.kg').toUpperCase()}`, subtitle: current.name, userName: firstName, emoji: '🏆', savedMsg: t('share.saved') });
        }
      } else {
        toast(t('session.logged'), 'success');
      }
    } catch (e: any) {
      // Real rejection (validation) → tell them. Network death mid-gym → queue
      // it and move on; the set syncs when the signal comes back.
      if (e?.status && e.status >= 400 && e.status < 500) {
        toast(e?.message || 'Could not log set', 'error');
      } else if (editingId) {
        // Edits can't be queued offline (no id-independent replay) — ask to retry.
        toast(isAr ? 'النت قطع — جرب تاني' : 'No connection — try again', 'error');
      } else {
        enqueue('/api/tracker/lifts', { exercise: current.name, weightKg, reps, setType });
        pushSessionSet(current.name, { weightKg, reps, setType, offline: true });
        setEntry({ reps: '' });
        toast(t('session.savedOffline'), 'info');
      }
    } finally {
      setLogging(false);
    }
  };

  const startEditSet = (s: SessionSet) => {
    if (!s.id) return; // offline-queued: not on the server yet
    tapFeedback();
    setEditingId(s.id);
    setEntry({ kg: String(s.weightKg), reps: String(s.reps), setType: s.setType });
  };

  const deleteSet = async (s: SessionSet) => {
    if (!current || !s.id) return;
    const name = current.name;
    try {
      await api.del(`/api/tracker/lifts/${s.id}`);
      setSessionSets((m) => ({ ...m, [name]: (m[name] ?? []).filter((x) => x.id !== s.id) }));
      if (editingId === s.id) { setEditingId(null); setEntry({ reps: '' }); }
      refreshLiftQueries(name);
      toast(isAr ? 'اتشالت' : 'Set removed', 'success');
    } catch {
      toast(isAr ? 'معرفناش نشيلها — جرب تاني' : 'Could not remove — try again', 'error');
    }
  };

  const finishExercise = () => {
    setDoneList((d) => (current ? [...d, current.name] : d));
    if (isLast) {
      finishSession(); // celebrates on its own
    } else {
      successFeedback();
      setPhase('rest');
    }
  };

  const skipRest = () => {
    clearInterval(timer.current);
    setPhase('exercise');
    setI((x) => x + 1);
  };

  const finishSession = async () => {
    celebrateFeedback();
    coach('done', i18n.language);
    setSessionSecs(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
    setPhase('done');
    // The completion is the streak/XP — a dead connection must never eat it.
    try {
      const r = await postResilient('/api/me/workout-done', { name: group?.name, exercises: exercises.length });
      if (r === 'queued') toast(t('session.savedOffline'), 'info');
    } catch { /* rejected on the merits — nothing to retry */ }
    // Milestone auto-share: first-ever workout or a landmark streak (7/30/100).
    // Fetched fresh so the just-finished session counts; at most one per session.
    if (!autoShared.current) {
      try {
        const progress = await queryClient.fetchQuery({
          queryKey: ['progress'],
          queryFn: () => api.get('/api/tracker/progress'),
          staleTime: 0,
        });
        const total = Number(progress?.totalWorkouts ?? progress?.totalCompletions ?? 0);
        const streak = Number(progress?.currentStreak ?? 0);
        if (total === 1) {
          autoShared.current = true;
          void shareMilestone({ kind: 'workout', title: isAr ? 'أول تمرين ليا 🎉' : 'My first workout!', value: isAr ? 'البداية' : 'DAY ONE', subtitle: group?.name, userName: firstName, emoji: '🎉', savedMsg: t('share.saved') });
        } else if (streak === 7 || streak === 30 || streak === 100) {
          autoShared.current = true;
          void shareMilestone({ kind: 'streak', title: isAr ? 'سلسلة مولعة 🔥' : 'Streak unlocked!', value: `${streak} ${isAr ? 'يوم' : 'DAYS'}`, subtitle: group?.name, userName: firstName, emoji: '🔥', savedMsg: t('share.saved') });
        }
      } catch { /* best effort — never block the celebration */ }
    }
  };

  /** Turn what actually happened this session into a reusable routine:
   *  per exercise, sets = how many were logged, weight/reps = the best
   *  working set (warm-ups excluded, same rule as PRs). Falls back to the
   *  plan as written when nothing was logged (bodyweight sessions). */
  const saveAsRoutine = async () => {
    if (savingRoutine || routineSaved) return;
    const logged = Object.entries(sessionSets).filter(([, sets]) => sets.length > 0);
    const fromSets = logged.map(([name, sets]) => {
      const work = sets.filter((s) => s.setType !== 'warmup');
      const pool = work.length ? work : sets;
      const best = pool.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
      return { name, sets: sets.length, reps: best.reps, ...(best.weightKg > 0 ? { weightKg: best.weightKg } : {}) };
    });
    const exs = fromSets.length
      ? fromSets
      : exercises.map((e: any) => ({
          name: String(e.name ?? ''),
          sets: parseInt(String(e.sets ?? '').match(/\d+/)?.[0] ?? '3', 10),
          reps: parseInt(String(e.reps ?? '').match(/\d+/)?.[0] ?? '10', 10),
        })).filter((e) => e.name);
    if (!exs.length) {
      toast(isAr ? 'مفيش تمارين نحفظها' : 'Nothing to save yet', 'error');
      return;
    }
    setSavingRoutine(true);
    try {
      await api.post('/api/routines', {
        title: group?.name || (isAr ? 'روتيني' : 'My routine'),
        exercises: exs.slice(0, 15),
        ...(group?.name ? { muscleFocus: group.name } : {}),
      });
      setRoutineSaved(true);
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      toast(isAr ? 'اتحفظ روتين — تلاقيه في روتيناتك 📌' : 'Saved — find it in My Routines 📌', 'success');
    } catch (e: any) {
      toast(e?.message || (isAr ? 'معرفناش نحفظه — جرب تاني' : 'Could not save — try again'), 'error');
    } finally {
      setSavingRoutine(false);
    }
  };

  /* ---------------- Music mini-player ---------------- */

  const defaultIdx = () => {
    const fav = trackList.findIndex((tr: any) => tr.favorite);
    return fav >= 0 ? fav : 0;
  };

  /** Loads a fresh signed URL for `idx` and starts it. */
  const playIndex = async (idx: number) => {
    const el = audioRef.current;
    const tr = trackList[idx];
    if (!el || !tr) return;
    try {
      el.src = await signedMediaUrl('audio', tr.id);
    } catch {
      return;
    }
    el.loop = true;
    setTrackIdx(idx);
    el.play().then(() => setMusicOn(true)).catch(() => setMusicOn(false));
  };

  /** Pause/resume — resumes from the same position, never re-loads the src. */
  const toggleMusic = async () => {
    const el = audioRef.current;
    if (!el || trackList.length === 0) {
      navigate('/music'); // no tracks yet — go add some
      return;
    }
    if (musicOn) {
      el.pause();
      setMusicOn(false);
      return;
    }
    if (trackIdx === null || !el.src) {
      await playIndex(defaultIdx());
      return;
    }
    el.play().then(() => setMusicOn(true)).catch(() => {});
  };

  const nextTrack = () => {
    if (trackList.length < 2) return;
    void playIndex(((trackIdx ?? defaultIdx()) + 1) % trackList.length);
  };

  const miniPlayer = (
    <div className="relative z-10 flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/10 p-1 backdrop-blur">
      <button
        onClick={toggleMusic}
        aria-label={musicOn ? 'Pause music' : 'Play music'}
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors ${musicOn ? 'bg-brand-pink text-white' : 'bg-white/15 text-white/80'}`}
      >
        {musicOn ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
      </button>
      {track ? (
        <>
          <span className="max-w-[14ch] truncate text-[11px] font-semibold text-white/85">{track.title}</span>
          <span className="px-0.5"><Equalizer active={musicOn} /></span>
          {trackList.length > 1 && (
            <button
              onClick={nextTrack}
              aria-label={t('session.nextTrack')}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white/70 active:scale-90"
            >
              <SkipForward size={13} />
            </button>
          )}
        </>
      ) : (
        <button
          onClick={() => navigate('/music')}
          className="flex items-center gap-1 pe-2 ps-0.5 text-[11px] font-semibold text-white/70"
        >
          <Music size={12} /> {isAr ? 'موسيقى' : 'Music'}
        </button>
      )}
    </div>
  );

  if (isLoading) return <Loader />;

  if (phase === 'done') {
    const mins = Math.floor(sessionSecs / 60);
    const secs = sessionSecs % 60;
    const timeLabel = isAr
      ? `${mins} د ${String(secs).padStart(2, '0')} ث`
      : `${mins}m ${String(secs).padStart(2, '0')}s`;
    return (
      <div className="fitness-hero relative flex min-h-screen flex-col items-center justify-center px-8 text-center text-white">
        <Confetti />
        <Trophy size={72} className="text-brand-yellow" />
        <h1 className="mt-4 text-3xl font-extrabold">{t('session.complete')}</h1>
        <p className="mt-2 text-white/70">{group?.name} · {doneList.length} exercises · +60 XP</p>
        <div className="mt-4 flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold">
          <Timer size={15} className="text-brand-yellow" />
          <span className="tabular-nums">{timeLabel}</span>
          <span className="text-white/50">·</span>
          <Dumbbell size={15} className="text-brand-yellow" />
          <span className="tabular-nums">{doneList.length}</span>
        </div>
        <div className="mt-6 w-full max-w-xs space-y-1.5 text-start">
          {doneList.map((n, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-white/80"><Check size={14} className="text-brand-green" /> {n}</div>
          ))}
        </div>
        {/* Keep tonight's numbers as a repeatable routine — the sets/weights
            actually lifted, not the plan as written. */}
        {routineSaved ? (
          <button
            onClick={() => navigate('/routines')}
            className="mt-6 flex min-h-[44px] w-full max-w-xs items-center justify-center gap-2 rounded-full bg-white/15 text-sm font-bold text-white transition active:scale-[0.97]"
          >
            <ListChecks size={16} /> {isAr ? 'شوف روتيناتك ←' : 'View my routines →'}
          </button>
        ) : (
          <button
            onClick={() => void saveAsRoutine()}
            disabled={savingRoutine}
            className="mt-6 flex min-h-[44px] w-full max-w-xs items-center justify-center gap-2 rounded-full bg-white/15 text-sm font-bold text-white transition active:scale-[0.97] disabled:opacity-50"
          >
            <Bookmark size={16} /> {isAr ? 'احفظه روتين 📌' : 'Save as routine 📌'}
          </button>
        )}
        {/* Peak-pride moment = referral moment. One tap sends the brag + the
            invite link to WhatsApp, where Egyptian invites actually travel. */}
        <button
          onClick={() => {
            const link = referral?.link || window.location.origin;
            waOpen(`لسه مخلص تمرين ${group?.name ? `«${group.name}» ` : ''}على PULSE 💪🔥\nتيجي نتمرن مع بعض؟ التطبيق مجاني ١٠٠٪:\n${link}`);
          }}
          className="mt-8 flex min-h-[48px] w-full max-w-xs items-center justify-center gap-2 rounded-full bg-[#25D366] font-bold text-white shadow-lg transition active:scale-[0.97]"
        >
          <WaIcon size={18} /> {isAr ? 'اتحدى صاحبك على واتساب' : 'Challenge a friend on WhatsApp'}
        </button>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => void shareMilestone({ kind: 'workout', title: t('share.workoutDone'), value: `${doneList.length} ${t('today.workouts', { count: doneList.length }).toUpperCase()}`, subtitle: group?.name, userName: firstName, emoji: '💪', savedMsg: t('share.saved') })}
            className="btn-pill bg-white/15 px-8 text-white"
          >
            <Share2 size={16} /> {t('session.share')}
          </button>
          <button onClick={() => { const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0; if (idx > 0) navigate(-1); else navigate('/'); }} className="btn-pill btn-primary px-10">{t('session.doneBtn')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-ink text-white">
      {/* The auth screens' photo-glass look, full strength: the coach scene with a
          dark gradient ON TOP of the page bg — the app-frame texture alone is a
          5–9% whisper and reads as a plain color under bg-ink/85. */}
      <div className="pointer-events-none fixed inset-0 mx-auto max-w-[480px]" aria-hidden>
        <img src="/landing/scene-coach.jpg" alt="" className="h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/70 to-ink/90" />
      </div>
      {/* Ambient pulse — breathes only while the music plays */}
      <AmbientGlow active={musicOn} />

      {/* Top bar + progress */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-12" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}>
        <button onClick={() => navigate(-1)} aria-label={t('common.close')} className="shrink-0"><X /></button>
        <button
          onClick={() => { const on = !voiceOn; setVoiceOn(on); setVoiceEnabled(on); if (on) coach('start', i18n.language); else cancelVoice(); }}
          aria-label={t('daily.voice')}
          title={t('daily.voice')}
          className={`shrink-0 rounded-full p-1.5 transition ${voiceOn ? 'bg-white/15 text-brand-pink' : 'text-white/50'}`}
        >
          {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-brand-pink transition-all" style={{ width: `${(i / exercises.length) * 100}%` }} />
          </div>
        </div>
        {miniPlayer}
        <audio ref={audioRef} loop />
      </div>
      <div className="relative z-10 flex flex-wrap items-center gap-2 px-4 pt-2">
        <p className="text-xs text-white/50">{group?.name} · {t('session.exerciseOf', { n: i + 1, total: exercises.length })}</p>
        {shortMode && (
          <span className="rounded-full bg-brand-yellow/20 px-2.5 py-0.5 text-[10px] font-bold text-brand-yellow">
            ⚡ {isAr ? 'رجعة سريعة · ١٠ دقايق وترجع' : 'Quick comeback · 10 min'}
          </span>
        )}
        {/* Live heart rate over Web Bluetooth — renders nothing on iOS. */}
        <HrMonitor className="ms-auto" />
      </div>

      {/* Coach-recorded intro video (coach workouts only) — on demand, never autoplay. */}
      {source?.videoId && (
        <details className="relative z-10 mx-4 mt-2 rounded-xl bg-white/10 px-3 py-2">
          <summary className="cursor-pointer text-xs font-bold text-white/80">🎥 {t('session.coachVideo', { defaultValue: isAr ? 'فيديو من الكوتش' : 'Video from your coach' })}</summary>
          <div className="mt-2">
            <ContentVideo videoId={source.videoId} label={source.title} />
          </div>
        </details>
      )}

      {phase === 'rest' ? (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6">
          {/* Circular countdown ring */}
          <div className="relative grid h-[136px] w-[136px] place-items-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={RING_R} fill="none" stroke="currentColor" strokeWidth="7" className="text-white/10" />
              <circle
                cx="60"
                cy="60"
                r={RING_R}
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                className="text-brand-pink"
                style={{
                  strokeDasharray: RING_C,
                  strokeDashoffset: RING_C * (1 - Math.max(0, Math.min(rest, restTotal)) / restTotal),
                  transition: 'stroke-dashoffset 1s linear',
                }}
              />
            </svg>
            <div className="flex flex-col items-center">
              <Timer size={18} className="text-brand-pink" />
              <p className="font-display text-4xl font-extrabold tabular-nums leading-tight">{rest}</p>
              <p className="text-[11px] uppercase tracking-widest text-white/40">{isAr ? 'ثانية' : 'sec'}</p>
            </div>
          </div>

          {/* Rest length chips — change applies to THIS countdown and is saved. */}
          <div className="flex items-center gap-1.5">
            {REST_CHOICES.map((v) => (
              <button
                key={v}
                onClick={() => pickRest(v)}
                className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums transition active:scale-95 ${
                  restTotal === v ? 'bg-brand-pink text-white' : 'bg-white/10 text-white/60'
                }`}
              >
                {v}{isAr ? 'ث' : 's'}
              </button>
            ))}
          </div>

          {/* One micro-lesson per rest — rotates with the exercise index */}
          {(() => {
            const tip = getRestTip(group?.name, i);
            return (
              <p className="max-w-xs text-center text-xs leading-relaxed text-white/60">
                📚 {isAr ? tip.ar : tip.en}
              </p>
            );
          })()}

          {/* Rest hero: the NEXT move performed large — mental rehearsal while resting. */}
          {next && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.1 }}
              className="text-white/75"
            >
              <HumanMove pattern={patternFor(next.name)} className="h-32 w-32" />
            </motion.div>
          )}

          {/* Next up — with the next exercise's figure */}
          {next && (
            <motion.div
              className="flex w-full max-w-xs items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/5 text-brand-pink">
                <ExerciseVisual name={next.name} videoUrl={next.videoUrl} className="h-16 w-16" animClassName="h-12 w-12" />
              </div>
              <div className="min-w-0 text-start">
                <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">{t('session.rest')}</p>
                <p className="truncate text-lg font-extrabold">{next.name}</p>
                {(next.sets || next.reps) && (
                  <p className="truncate text-xs text-white/50">{[meta(easedSets(next.sets)), meta(next.reps)].filter(Boolean).join(' · ')}</p>
                )}
              </div>
            </motion.div>
          )}

          <p className="text-sm text-white/60">{isAr ? hype.ar : hype.en}</p>
          <button onClick={skipRest} className="btn-pill btn-primary px-8"><SkipForward size={16} /> {t('session.skipRest')}</button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
        <motion.div
          key={i}
          className="relative z-10 flex flex-1 flex-col px-5"
          initial={{ opacity: 0, x: 26 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -26 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        >
          <div className="mx-auto my-4 flex items-center justify-center gap-3">
            <button
              onClick={() => { if (current?.videoUrl || current?.videoId) { tapFeedback(); setShowForm(true); } }}
              className="block h-40 w-40 shrink-0 overflow-hidden rounded-3xl bg-white/5 text-brand-pink"
            >
              <ExerciseVisual
                name={current?.name || group?.name}
                videoUrl={current?.videoUrl}
                className="h-40 w-40"
                animClassName="h-28 w-28"
                showPlayHint={!!(current?.videoUrl || current?.videoId)}
              />
            </button>
            {/* Video frame shows WHAT it looks like; the figure shows HOW it moves
                and which muscles fire — worth both when a real frame exists. */}
            {exercisePoster(current?.videoUrl) && (
              <div className="flex h-40 w-28 shrink-0 flex-col items-center justify-center gap-0.5 rounded-3xl bg-white/5 text-white/70">
                <HumanMove pattern={patternFor(current?.name || group?.name)} className="h-28 w-24" />
                <span className="text-[9px] font-bold uppercase tracking-wide text-white/35">{t('session.moveGuide')}</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-extrabold">{current?.name}</h1>

          {/* Every exercise has a real demo; the animation is only a shape cue. */}
          {(current?.videoUrl || current?.videoId) && (
            <button
              onClick={() => { tapFeedback(); setShowForm(true); }}
              className="mx-auto mt-2 flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold transition active:scale-95"
            >
              <PlayCircle size={14} /> {t('session.watchForm')}
            </button>
          )}
          <motion.p
            key={`hype-${i}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-1 text-sm font-semibold text-brand-pink"
          >
            {isAr ? hype.ar : hype.en}
          </motion.p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {current?.sets && (
              <span className={`rounded-full px-3 py-1 ${deloading ? 'bg-sky-500/30 text-sky-100' : 'bg-white/10'}`}>
                {meta(easedSets(current.sets))}{deloading ? ` · ${t('adapt.eased')}` : ''}
              </span>
            )}
            {current?.reps && <span className="rounded-full bg-white/10 px-3 py-1">{meta(current.reps)}</span>}
            {current?.level && <span className="rounded-full bg-white/10 px-3 py-1">{meta(current.level)}</span>}
            {/* Routine sessions carry the weight it was saved at — the target to beat. */}
            {typeof current?.weightKg === 'number' && current.weightKg > 0 && (
              <span className="rounded-full bg-white/10 px-3 py-1 tabular-nums">🎯 {current.weightKg} {t('session.kg')}</span>
            )}
          </div>

          {/* Progression ladder — muscle-group sessions only (coach workouts don't carry these) */}
          {(easier || harder) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {easier && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                  {isAr ? 'صعبة عليك؟' : 'Too hard?'} → <span className="font-semibold text-white/90">{isAr ? (easier.nameAr || easier.name) : easier.name}</span>
                </span>
              )}
              {harder && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                  {isAr ? 'سهلة أوي؟' : 'Too easy?'} → <span className="font-semibold text-white/90">{isAr ? (harder.nameAr || harder.name) : harder.name}</span>
                </span>
              )}
            </div>
          )}

          {/* Their own injury, on the movement that loads it, with the swap we'd make */}
          {current?.caution && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3 text-start">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-300" />
              <div className="min-w-0 text-xs leading-relaxed text-amber-100">
                <p className="font-bold">{t('session.careArea', { areas: (current.flaggedFor ?? []).join(', ') })}</p>
                {current.saferAlternative && <p className="mt-0.5">{t('session.trySafer', { name: current.saferAlternative })}</p>}
              </div>
            </div>
          )}
          {/* Log your best set — ABOVE the how-to text. It used to sit under six
              instruction steps where no lifter mid-set would ever scroll. */}
          <div className="mt-4 rounded-2xl bg-white/5 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/50">
              <Dumbbell size={12} /> {t('session.logSet')}
            </p>
            {lastLift && (
              <p className="mt-1 text-xs text-white/50">
                {isAr ? 'آخر مرة' : 'Last time'}: <span className="font-bold text-white/80">{lastLift.weightKg} {t('session.kg')} × {lastLift.reps}</span>
                {bestLift && bestLift.weightKg > lastLift.weightKg && (
                  <> · {isAr ? 'رقمك القياسي' : 'your best'}: <span className="font-bold text-orange-300">{bestLift.weightKg} {t('session.kg')}</span></>
                )}
              </p>
            )}
            {/* Set-type chips — warm-ups won't count toward your PR */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SET_TYPE_OPTS.map((o) => (
                <button
                  key={o.v}
                  onClick={() => { tapFeedback(); setEntry({ setType: o.v }); }}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition active:scale-95 ${
                    setType === o.v ? 'bg-brand-pink text-white' : 'bg-white/10 text-white/55'
                  }`}
                >
                  {isAr ? o.ar : o.en}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                placeholder={t('session.kg')}
                aria-label="Weight (kg)"
                value={entry.kg}
                onChange={(e) => setEntry({ kg: e.target.value.replace(/[^\d.]/g, '') })}
                className="h-11 w-0 min-w-0 flex-1 rounded-xl bg-white/10 px-3 text-center font-semibold text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-brand-pink"
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder={t('session.reps')}
                aria-label="Reps"
                value={entry.reps}
                onChange={(e) => setEntry({ reps: e.target.value.replace(/\D/g, '') })}
                className="h-11 w-0 min-w-0 flex-1 rounded-xl bg-white/10 px-3 text-center font-semibold text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-brand-pink"
              />
              <button
                onClick={logSet}
                disabled={logging}
                className="btn-pill btn-primary h-11 shrink-0 px-5 disabled:opacity-50"
              >
                {editingId ? (isAr ? 'حفظ' : 'Save') : t('session.log')}
              </button>
            </div>
            {editingId && (
              <button
                onClick={() => { setEditingId(null); setEntry({ reps: '' }); }}
                className="mt-1.5 text-[11px] font-bold text-white/50 underline"
              >
                {isAr ? 'إلغاء التعديل' : 'Cancel edit'}
              </button>
            )}

            {/* This session's sets for this exercise — numbered, editable */}
            {currentSets.length > 0 && (
              <div className="mt-3 space-y-1">
                {currentSets.map((s, k) => {
                  const opt = SET_TYPE_OPTS.find((o) => o.v === s.setType);
                  const beingEdited = !!s.id && editingId === s.id;
                  return (
                    <div
                      key={s.id ?? `off-${k}`}
                      className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm ${beingEdited ? 'bg-brand-pink/20 ring-1 ring-brand-pink/50' : 'bg-white/5'}`}
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-bold tabular-nums text-white/60">{k + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold tabular-nums">
                        {s.weightKg} {t('session.kg')} × {s.reps}
                      </span>
                      {s.setType !== 'normal' && opt && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${opt.cls}`}>{isAr ? opt.ar : opt.en}</span>
                      )}
                      {s.offline ? (
                        <span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                          {isAr ? 'هتتسجل لما النت يرجع' : 'syncs later'}
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditSet(s)}
                            aria-label={isAr ? 'عدّل المجموعة' : 'Edit set'}
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/50 transition active:scale-90"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => void deleteSet(s)}
                            aria-label={isAr ? 'امسح المجموعة' : 'Delete set'}
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-red-300/70 transition active:scale-90"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* How-to folded away: native <details> resets per exercise since the
              slide remounts (key={i}) — the wall of text is opt-in, not default. */}
          {(current?.description || (Array.isArray(current?.instructions) && current.instructions.length > 0)) && (
            <details className="mt-3 rounded-2xl bg-white/5 p-3">
              <summary className="cursor-pointer list-none text-[11px] font-bold uppercase tracking-wide text-white/50">
                {isAr ? 'إزاي تعملها؟ ▾' : 'How to do it ▾'}
              </summary>
              {current?.description && <p className="mt-2 text-sm text-white/70">{current.description}</p>}
              {Array.isArray(current?.instructions) && current.instructions.length > 0 && (
                <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm text-white/70">
                  {current.instructions.slice(0, 6).map((s: string, k: number) => <li key={k}>{s}</li>)}
                </ol>
              )}
            </details>
          )}
        </motion.div>
        </AnimatePresence>
      )}

      {/* PR celebration */}
      <AnimatePresence>
        {prWeight !== null && (
          <motion.div
            key="pr"
            className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Confetti onDone={() => setPrWeight(null)} />
            <motion.div
              initial={{ scale: 0.4, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
              className="rounded-3xl bg-brand-pink px-8 py-6 text-center text-white shadow-2xl"
            >
              <p className="text-3xl font-extrabold">{t('session.newPR')} 🏆</p>
              <p className="mt-1 text-xl font-bold">{prWeight} {t('session.kg')}</p>
              <div className="pointer-events-auto mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={() => waOpen(`كسرت رقمي القياسي النهارده 🏆 ${prWeight} كجم ${current?.name ? `في ${current.name}` : ''} على PULSE 💪\nتعالى اتحدى معايا — مجاني: ${window.location.origin}`)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-1.5 text-sm font-bold"
                >
                  <WaIcon size={14} /> WhatsApp
                </button>
                <button
                  onClick={() => void shareMilestone({ kind: 'pr', title: t('share.pr'), value: `${prWeight} ${t('session.kg').toUpperCase()}`, subtitle: current?.name, userName: firstName, emoji: '🏆', savedMsg: t('share.saved') })}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-4 py-1.5 text-sm font-bold"
                >
                  <Share2 size={14} /> {t('session.share')} 🎉
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action */}
      {phase === 'exercise' && (
        <div className="sticky bottom-0 z-20 border-t border-white/10 bg-ink/90 p-4 backdrop-blur">
          <button onClick={finishExercise} className="btn-pill btn-green w-full">
            {isLast ? <><Trophy size={18} /> {t('session.finish')}</> : <><Check size={18} /> {t('session.doneNext')} <ChevronRight size={16} className="rtl:rotate-180" /></>}
          </button>
        </div>
      )}

      {/* Form demo, on demand. Opened by choice so it never competes with the timer. */}
      <AnimatePresence>
        {showForm && (current?.videoUrl || current?.videoId) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <div className="mb-2 flex items-center justify-between text-white">
                <p className="min-w-0 truncate pe-3 font-semibold">{current?.name}</p>
                <button onClick={() => setShowForm(false)} aria-label={t('common.close')} className="rounded-full bg-white/15 p-2">
                  <X size={18} />
                </button>
              </div>
              <ContentVideo videoId={current?.videoId} videoUrl={current?.videoUrl} label={current?.name} />
              {/* The figure answers "which muscle should I feel?" while watching. */}
              <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/10 p-2 text-white/75">
                <HumanMove pattern={patternFor(current?.name)} className="h-20 w-20 shrink-0" />
                <p className="min-w-0 flex-1 text-xs leading-relaxed text-white/60">{t('session.moveGuideHint')}</p>
              </div>
              {/* A coach types names freely, so the demo may be the closest match
                  rather than the exact lift. Say so instead of implying it is the same. */}
              {current?.matchedExercise && current.matchedExercise !== current.name && (
                <p className="mt-2 text-center text-[11px] text-white/50">
                  {t('session.showingDemo', { name: current.matchedExercise })}
                </p>
              )}
              {current?.caution && (
                <p className="mt-2 rounded-xl bg-amber-400/15 p-3 text-xs leading-relaxed text-amber-100">
                  {t('session.careArea', { areas: (current.flaggedFor ?? []).join(', ') })}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
