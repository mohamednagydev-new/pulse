import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardList,
  Clock, Dumbbell, Home, Play, Ruler, Sparkles, Sunrise, Utensils,
} from 'lucide-react';
import { api } from '../lib/api';
import { Loader } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';
import Confetti from '../components/Confetti';
import HumanMove, { PatternName } from '../components/HumanMove';
import { toast } from '../lib/toast';
import { celebrateFeedback, tapFeedback } from '../lib/haptics';
import { useAuth } from '../store/auth';

type Bilingual = { en: string; ar: string };

interface Answers {
  goal: string;
  experience: string;
  daysPerWeek: number;
  minutesPerSession: number;
  equipment: string;
  activityLevel: string;
  limitations: string[];
  preferMornings: boolean;
  // Optional — these turn the calorie target from a flat goal default into a real
  // estimate from their own body.
  heightCm?: number;
  weightKg?: number;
  birthYear?: number;
  gender?: 'male' | 'female';
}

const DEFAULTS: Answers = {
  goal: '', experience: '', daysPerWeek: 3, minutesPerSession: 30,
  equipment: '', activityLevel: '', limitations: [], preferMornings: false,
};

const OPTIONS = {
  goal: ['lose_weight', 'build_muscle', 'get_strong', 'stay_fit', 'more_energy'],
  experience: ['none', 'some', 'regular', 'advanced'],
  equipment: ['none', 'home_basic', 'full_gym'],
  activityLevel: ['sedentary', 'light', 'moderate', 'active'],
  limitations: ['knee', 'back', 'shoulder', 'wrist', 'neck'],
};

const DAY_CHOICES = [1, 2, 3, 4, 5, 6];
const MINUTE_CHOICES = [15, 20, 30, 45, 60];

export default function Assessment() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const refreshUser = useAuth((s) => s.refreshUser);
  const isAr = i18n.language.startsWith('ar');
  const say = (b: Bilingual) => (isAr ? b.ar : b.en);

  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(DEFAULTS);
  const [result, setResult] = useState<any>(null);
  const [party, setParty] = useState(false);

  const { data: existing, isLoading } = useQuery<any>({
    queryKey: ['assessment'],
    queryFn: () => api.get('/api/assessment'),
  });

  const submit = useMutation({
    mutationFn: () => api.post('/api/assessment', a),
    onSuccess: async (res: any) => {
      celebrateFeedback();
      setParty(true);
      setResult(res);
      qc.invalidateQueries({ queryKey: ['assessment'] });
      qc.invalidateQueries({ queryKey: ['path-current'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });

      /**
       * Re-read the account, or the user is trapped on this screen.
       *
       * Finishing the intake sets `onboarded: true` on the server, but the auth store
       * still holds the stale `false`. RequireAuth redirects anyone with
       * `onboarded === false` to /my-plan — so every tap that tries to leave this page
       * bounces straight back to it, and the only escape is a full page reload.
       *
       * This is why it has to be awaited and why it cannot be left to the next natural
       * refetch: navigation happens on the very next tap.
       */
      await refreshUser().catch(() => {
        /* the plan is saved either way; a reload will pick the flag up */
      });
    },
    onError: (e: any) => toast(e?.message ?? t('assess.failed'), 'error'),
  });

  if (isLoading) return <Loader />;

  // Already has a plan and hasn't asked to redo it — show it instead of the form.
  const plan = result ?? (existing?.hasPlan && step === 0 && a.goal === '' ? existing : null);
  if (plan) {
    return (
      <PlanView
        data={result ? { assessment: result.assessment, program: result.program, firstLesson: result.firstLesson } : plan}
        dueRecheck={!result && existing?.dueRecheck}
        say={say}
        t={t}
        party={party}
        onPartyDone={() => setParty(false)}
        onRedo={() => { setResult(null); setA({ ...DEFAULTS, goal: ' ' }); setStep(0); }}
        onStart={(id: string) => navigate(`/lesson/${id}`)}
      />
    );
  }

  const STEPS = [
    {
      key: 'goal', icon: Sparkles,
      body: (
        <Choices options={OPTIONS.goal} value={a.goal} onPick={(v) => setA({ ...a, goal: v })} t={t} group="goal" />
      ),
      valid: !!a.goal.trim(),
    },
    {
      key: 'experience', icon: Dumbbell,
      body: (
        <Choices options={OPTIONS.experience} value={a.experience} onPick={(v) => setA({ ...a, experience: v })} t={t} group="experience" />
      ),
      valid: !!a.experience,
    },
    {
      key: 'days', icon: CalendarDays,
      body: (
        <div className="grid grid-cols-3 gap-2">
          {DAY_CHOICES.map((d) => (
            <Pill key={d} active={a.daysPerWeek === d} onClick={() => setA({ ...a, daysPerWeek: d })}>
              {t('assess.daysN', { n: d })}
            </Pill>
          ))}
        </div>
      ),
      valid: true,
    },
    {
      key: 'minutes', icon: Clock,
      body: (
        <div className="grid grid-cols-3 gap-2">
          {MINUTE_CHOICES.map((m) => (
            <Pill key={m} active={a.minutesPerSession === m} onClick={() => setA({ ...a, minutesPerSession: m })}>
              {t('assess.minutesN', { n: m })}
            </Pill>
          ))}
        </div>
      ),
      valid: true,
    },
    {
      key: 'equipment', icon: Dumbbell,
      body: (
        <Choices options={OPTIONS.equipment} value={a.equipment} onPick={(v) => setA({ ...a, equipment: v })} t={t} group="equipment" />
      ),
      valid: !!a.equipment,
    },
    {
      key: 'activity', icon: Activity,
      body: (
        <Choices options={OPTIONS.activityLevel} value={a.activityLevel} onPick={(v) => setA({ ...a, activityLevel: v })} t={t} group="activity" />
      ),
      valid: !!a.activityLevel,
    },
    {
      key: 'limitations', icon: AlertTriangle,
      body: (
        <>
          <div className="grid grid-cols-2 gap-2">
            {OPTIONS.limitations.map((l) => {
              const on = a.limitations.includes(l);
              return (
                <Pill
                  key={l}
                  active={on}
                  onClick={() =>
                    setA({ ...a, limitations: on ? a.limitations.filter((x) => x !== l) : [...a.limitations, l] })
                  }
                >
                  {t(`assess.limit.${l}`)}
                </Pill>
              );
            })}
          </div>
          <button
            onClick={() => setA({ ...a, limitations: [] })}
            className={`mt-2 w-full rounded-xl py-3 text-sm font-bold transition ${
              a.limitations.length === 0 ? 'bg-brand-green text-white' : 'bg-white/10 text-white/70'
            }`}
          >
            {t('assess.limit.none')}
          </button>
        </>
      ),
      valid: true,
    },
    {
      // Skippable on purpose. With these the calorie target is calculated from
      // their body rather than a flat number for their goal.
      key: 'body', icon: Ruler,
      body: (
        <>
          <div className="grid grid-cols-2 gap-2">
            {(['male', 'female'] as const).map((g) => (
              <Pill key={g} active={a.gender === g} onClick={() => setA({ ...a, gender: a.gender === g ? undefined : g })}>
                {t(`assess.sex.${g}`)}
              </Pill>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {([
              ['heightCm', t('assess.heightCm')],
              ['weightKg', t('assess.weightKg')],
              ['birthYear', t('assess.birthYear')],
            ] as const).map(([field, label]) => (
              <label key={field} className="block">
                <span className="mb-1 block text-[11px] font-semibold text-white/60">{label}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={(a as any)[field] ?? ''}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setA({ ...a, [field]: v === '' ? undefined : Number(v) } as Answers);
                  }}
                  className="min-h-[52px] w-full rounded-xl bg-white/10 px-3 text-center text-lg font-bold outline-none focus:bg-white/15"
                />
              </label>
            ))}
          </div>
        </>
      ),
      valid: true,
    },
    {
      key: 'timing', icon: Sunrise,
      body: (
        <div className="grid grid-cols-2 gap-2">
          <Pill active={a.preferMornings} onClick={() => setA({ ...a, preferMornings: true })}>{t('assess.morning')}</Pill>
          <Pill active={!a.preferMornings} onClick={() => setA({ ...a, preferMornings: false })}>{t('assess.evening')}</Pill>
        </div>
      ),
      valid: true,
    },
  ];

  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const Icon = current.icon;

  return (
    <div className="fitness-hero relative min-h-screen overflow-x-hidden pb-10 text-white">
      <TopBar title={t('assess.title')} color="bg-transparent" textColor="text-white" />

      <div className="px-5">
        {/* Progress across the whole intake */}
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <span key={s.key} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-white/60">{t('assess.stepOf', { n: step + 1, total: STEPS.length })}</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="mt-6 px-5"
        >
          <Icon size={28} className="text-white/80" />
          <h1 className="mt-3 text-2xl font-extrabold leading-tight">{t(`assess.q.${current.key}`)}</h1>
          <p className="mt-1 text-sm text-white/60">{t(`assess.hint.${current.key}`)}</p>
          <div className="mt-5">{current.body}</div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex gap-2 px-5">
        {step > 0 && (
          <button
            onClick={() => { tapFeedback(); setStep(step - 1); }}
            className="flex min-h-[50px] items-center justify-center gap-1.5 rounded-2xl bg-white/10 px-5 text-sm font-bold active:scale-95"
          >
            <ArrowLeft size={16} className="rtl:rotate-180" /> {t('common.back')}
          </button>
        )}
        <button
          onClick={() => { tapFeedback(); last ? submit.mutate() : setStep(step + 1); }}
          disabled={!current.valid || submit.isPending}
          className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-extrabold text-ink transition active:scale-95 disabled:opacity-40"
        >
          {submit.isPending ? t('assess.building') : last ? t('assess.buildPlan') : t('common.next')}
          {!last && <ArrowRight size={16} className="rtl:rotate-180" />}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------- Result ------------------------------- */

function PlanView({
  data, dueRecheck, say, t, party, onPartyDone, onRedo, onStart,
}: {
  data: any; dueRecheck?: boolean; say: (b: Bilingual) => string;
  t: (k: string, o?: any) => string; party: boolean; onPartyDone: () => void;
  onRedo: () => void; onStart: (lessonId: string) => void;
}) {
  const as = data.assessment ?? {};
  const program = data.program;
  const rationale: Bilingual[] = as.rationale ?? [];
  const cautions: Bilingual[] = as.cautions ?? [];
  const days: string[] = as.scheduleDays ?? [];

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-24">
      {party && <Confetti onDone={onPartyDone} />}
      <AmbientBg tone="green" />
      <TopBar title={t('assess.planTitle')} color="fitness-hero" textColor="text-white" />

      {dueRecheck && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          <ClipboardList size={15} className="mt-0.5 shrink-0" />
          <span>{t('assess.dueRecheck')}</span>
        </div>
      )}

      {/* The plan HERO: your goal acted out by the moving figure, your level,
          your program — a plan should feel like a badge, not a paragraph. */}
      <section className="scene-tex mx-4 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600 p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-24 w-20 shrink-0 rounded-2xl bg-white/15 p-1 text-white/90">
            <HumanMove pattern={GOAL_PATTERNS[as.goal] ?? 'jump'} className="h-full w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">{t('assess.yourLevel')}</p>
            <p className="text-2xl font-extrabold">{t(`assess.level.${String(as.recommendedLevel).toLowerCase()}`)}</p>
            {program && (
              <p className="mt-0.5 truncate text-xs text-white/85">
                📋 {program.title} · {program._count?.lessons ?? 0} {t('path.lessons')}
              </p>
            )}
          </div>
        </div>

        {days.length > 0 && (
          <div className="mt-3 border-t border-white/20 pt-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-white/70">{t('assess.yourDays')}</p>
            <div className="flex flex-wrap gap-1.5">
              {days.map((d) => (
                <span key={d} className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">
                  {(() => {
                    const idx = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(d);
                    return idx >= 0
                      ? new Date(Date.UTC(2024, 0, 7 + idx)).toLocaleDateString(document.documentElement.lang || 'ar', { weekday: 'long' })
                      : d;
                  })()}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <Outcome say={say} t={t} />

      {rationale.length > 0 && (
        <section className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-bold">{t('assess.why')}</p>
          <ul className="mt-2 space-y-2">
            {rationale.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-gray-600">
                <Check size={14} className="mt-0.5 shrink-0 text-brand-green" /> {say(r)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {cautions.length > 0 && (
        <section className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-amber-800">
            <AlertTriangle size={15} /> {t('assess.careWith')}
          </p>
          <ul className="mt-2 space-y-2">
            {cautions.map((c, i) => (
              <li key={i} className="text-xs leading-relaxed text-amber-900">{say(c)}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-5 space-y-2 px-4">
        {data.firstLesson && (
          <button
            onClick={() => onStart(data.firstLesson.id)}
            className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
          >
            <Play size={16} fill="currentColor" /> {t('assess.startFirst')}
          </button>
        )}
        <button
          onClick={onRedo}
          className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600 active:scale-95"
        >
          <ClipboardList size={15} /> {t('assess.redo')}
        </button>
      </div>

      <WhatHappensNext nextCheckOn={as.nextCheckOn} t={t} />

      <p className="mt-4 px-6 text-center text-[11px] leading-relaxed text-gray-400">{t('assess.recheckNote')}</p>
    </div>
  );
}

/**
 * What the plan actually means, and how to leave this screen.
 *
 * The plan page told people their level, their programme and their days, and then
 * stopped — no explanation of what any of it changes, and no way onward except the
 * first lesson. Someone arriving here straight from sign-up had a screen full of
 * conclusions and nowhere to go.
 *
 * Every row is a real destination, so this doubles as the navigation this screen was
 * missing. The last one is deliberately Home: after being walked through an intake,
 * the most useful thing is to be let into the app.
 */
function WhatHappensNext({ nextCheckOn, t }: { nextCheckOn?: string | null; t: (k: string, o?: any) => string }) {
  const rows = [
    { to: '/schedule', icon: CalendarDays, title: t('next.scheduleTitle'), body: t('next.scheduleBody') },
    { to: '/programs', icon: Play, title: t('next.continueTitle'), body: t('next.continueBody') },
    { to: '/meals', icon: Utensils, title: t('next.mealsTitle'), body: t('next.mealsBody') },
  ];

  return (
    <section className="mx-4 mt-6">
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">{t('next.title')}</p>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {rows.map((r, i) => (
          <Link
            key={r.to}
            to={r.to}
            className={`flex items-start gap-3 p-4 transition active:bg-gray-50 ${i > 0 ? 'border-t border-gray-100' : ''}`}
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <r.icon size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{r.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">{r.body}</span>
            </span>
            <ArrowRight size={15} className="mt-1 shrink-0 text-gray-300 rtl:rotate-180" />
          </Link>
        ))}

        {/* Not a link — nothing to tap, it is the promise the plan makes. */}
        <div className="flex items-start gap-3 border-t border-gray-100 p-4">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-brand-green">
            <ClipboardList size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{t('next.recheckTitle')}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">
              {nextCheckOn ? t('next.recheckBodyOn', { date: nextCheckOn }) : t('next.recheckBody')}
            </span>
          </span>
        </div>
      </div>

      <Link
        to="/"
        className="mt-3 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-ink text-sm font-bold text-white shadow-sm transition active:scale-[0.98]"
      >
        <Home size={16} /> {t('next.explore')}
      </Link>
    </section>
  );
}

/* ------------------------------- Bits ------------------------------- */

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[52px] rounded-xl px-3 text-sm font-bold transition active:scale-95 ${
        active ? 'bg-white text-ink' : 'bg-white/10 text-white'
      }`}
    >
      {children}
    </button>
  );
}

/** The goal step gets a tiny person acting each goal out — the first "the app
 *  shows me the movement" moment, before a single workout is opened. */
const GOAL_PATTERNS: Record<string, PatternName> = {
  lose_weight: 'jog', build_muscle: 'curl', get_strong: 'deadlift', stay_fit: 'jump', more_energy: 'breathe',
};

function Choices({
  options, value, onPick, t, group,
}: { options: string[]; value: string; onPick: (v: string) => void; t: (k: string) => string; group: string }) {
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onPick(o)}
          className={`flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-start transition active:scale-[0.98] ${
            value === o ? 'bg-white text-ink shadow-lg' : 'bg-white/15 text-white ring-1 ring-white/20'
          }`}
        >
          {group === 'goal' && GOAL_PATTERNS[o] && (
            <span className={`h-11 w-11 shrink-0 ${value === o ? 'text-gray-500' : 'text-white/70'}`}>
              <HumanMove pattern={GOAL_PATTERNS[o]} className="h-11 w-11" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{t(`assess.${group}.${o}`)}</span>
            <span className={`block text-xs ${value === o ? 'text-gray-500' : 'text-white/60'}`}>
              {t(`assess.${group}Sub.${o}`)}
            </span>
          </span>
          {value === o && <Check size={18} className="shrink-0 text-brand-green" />}
        </button>
      ))}
    </div>
  );
}

/** Is the plan producing anything? Adherence says they showed up; this says whether
 *  showing up moved the number they came here to move. */
function Outcome({ say, t }: { say: (b: Bilingual) => string; t: (k: string, o?: any) => string }) {
  const { data } = useQuery<any>({ queryKey: ['checkin'], queryFn: () => api.get('/api/assessment/checkin') });
  const { data: hist } = useQuery<any>({ queryKey: ['plan-history'], queryFn: () => api.get('/api/assessment/history') });

  const o = data?.outcome;
  const j = hist?.journey;
  if (!o && !j) return null;

  const tone: Record<string, string> = {
    working: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    flat: 'bg-amber-50 text-amber-800 border-amber-200',
    too_fast: 'bg-red-50 text-red-700 border-red-200',
    no_data: 'bg-gray-50 text-gray-500 border-gray-200',
  };

  return (
    <>
      {o && (
        <section className={`mx-4 mt-4 rounded-2xl border p-4 ${tone[o.verdict] ?? tone.no_data}`}>
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{t('assess.isItWorking')}</p>
          <p className="mt-1 text-sm font-semibold leading-relaxed">{say(o.message)}</p>
        </section>
      )}

      {j && (j.fromLevel !== j.toLevel || j.fromDays !== j.toDays) && (
        <section className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-bold">{t('assess.howFar')}</p>
          <div className="mt-2 flex items-center justify-between text-center">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('assess.started')}</p>
              <p className="truncate text-sm font-bold">{t(`assess.level.${String(j.fromLevel).toLowerCase()}`)}</p>
              <p className="text-[11px] text-gray-400">{t('assess.daysN', { n: j.fromDays })}</p>
            </div>
            <ArrowRight size={16} className="mx-2 shrink-0 text-gray-300 rtl:rotate-180" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('assess.now')}</p>
              <p className="truncate text-sm font-bold text-brand-green">{t(`assess.level.${String(j.toLevel).toLowerCase()}`)}</p>
              <p className="text-[11px] text-gray-400">{t('assess.daysN', { n: j.toDays })}</p>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-gray-400">{t('assess.overDays', { n: j.days })}</p>
        </section>
      )}
    </>
  );
}
