import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Calculator } from 'lucide-react';
import { api } from '../lib/api';
import { Loader } from './ui';

/**
 * Per-exercise strength detail: weight-over-time chart (best set per day),
 * estimated 1RM (Epley), 30-day trend and weekly volume — all client-side
 * from GET /api/tracker/lifts?exercise=NAME (last 50 sets).
 */

type Lift = {
  id: string;
  exercise: string;
  weightKg: number;
  reps: number;
  setType?: string;
  createdAt: string;
};

type DayBest = { day: string; weightKg: number; reps: number; e1rm: number; ts: number };

const epley = (w: number, r: number) => w * (1 + r / 30);
const round1 = (n: number) => Math.round(n * 10) / 10;
const dayKey = (iso: string) => iso.slice(0, 10);

export default function ExerciseProgressChart({ exercise }: { exercise: string }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);

  const { data, isLoading } = useQuery({
    queryKey: ['lifts', exercise],
    queryFn: () => api.get(`/api/tracker/lifts?exercise=${encodeURIComponent(exercise)}`),
  });

  const stats = useMemo(() => {
    const logs: Lift[] = Array.isArray(data) ? data : [];
    // Warmup sets are noise for strength trends; bodyweight (0 kg) sets carry
    // no weight signal, so they'd only flatten the chart and zero the e1RM.
    const working = logs.filter((l) => l.setType !== 'warmup' && l.weightKg > 0);
    if (working.length === 0) return null;

    // Best set per day = the heaviest set (ties broken by e1RM).
    const byDay = new Map<string, DayBest>();
    for (const l of working) {
      const day = dayKey(l.createdAt);
      const cand: DayBest = { day, weightKg: l.weightKg, reps: l.reps, e1rm: epley(l.weightKg, l.reps), ts: new Date(l.createdAt).getTime() };
      const cur = byDay.get(day);
      if (!cur || cand.weightKg > cur.weightKg || (cand.weightKg === cur.weightKg && cand.e1rm > cur.e1rm)) {
        byDay.set(day, cand);
      }
    }
    const days = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
    const latest = days[days.length - 1];
    const currentE1rm = latest.e1rm;
    const bestE1rm = Math.max(...working.map((l) => epley(l.weightKg, l.reps)));

    // Trend vs ~30 days ago: latest best-day at least 30 days older than the newest.
    const cutoff = latest.ts - 30 * 86400000;
    const baselineDay = [...days].reverse().find((d) => d.ts <= cutoff);
    const trend: 'up' | 'down' | 'flat' | null = baselineDay
      ? currentE1rm > baselineDay.e1rm + 0.5
        ? 'up'
        : currentE1rm < baselineDay.e1rm - 0.5
          ? 'down'
          : 'flat'
      : null;
    const trendDelta = baselineDay ? round1(currentE1rm - baselineDay.e1rm) : 0;

    // Rolling weekly volume (sum weight*reps): last 7 days vs the 7 before.
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const twoWeeksAgo = now - 14 * 86400000;
    let volThis = 0;
    let volLast = 0;
    for (const l of working) {
      const ts = new Date(l.createdAt).getTime();
      if (ts >= weekAgo) volThis += l.weightKg * l.reps;
      else if (ts >= twoWeeksAgo) volLast += l.weightKg * l.reps;
    }

    return { days, currentE1rm, bestE1rm, trend, trendDelta, volThis: Math.round(volThis), volLast: Math.round(volLast) };
  }, [data]);

  if (isLoading) return <Loader />;

  if (!stats) {
    return <p className="px-5 py-8 text-center text-sm text-gray-400">{L('No working sets logged yet for this exercise.', 'لسه مسجلتش أوزان للتمرين ده.')}</p>;
  }

  const { days, currentE1rm, bestE1rm, trend, trendDelta, volThis, volLast } = stats;
  const volDelta = volLast > 0 ? Math.round(((volThis - volLast) / volLast) * 100) : null;
  const kg = t('session.kg');

  return (
    <div className="p-5 pb-8">
      <h3 className="mb-1 truncate text-lg font-extrabold">{exercise}</h3>
      <p className="mb-4 text-[11px] text-gray-400">{L('Best set per day, warmups excluded', 'أحسن مجموعة في اليوم — من غير التسخين')}</p>

      {/* e1RM tiles */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-b from-cyan-50 to-white p-3 shadow-sm ring-1 ring-cyan-100">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{L('Current estimated max (e1RM)', 'أقصى وزن متوقع دلوقتي')}</p>
          <div className="mt-1 flex items-baseline gap-1.5" dir="ltr">
            <span className="font-display text-2xl font-extrabold">{round1(currentE1rm)}</span>
            <span className="text-sm font-bold text-gray-400">{kg}</span>
            {trend === 'up' && <TrendingUp size={16} className="text-brand-green" />}
            {trend === 'down' && <TrendingDown size={16} className="text-red-400" />}
            {trend === 'flat' && <Minus size={16} className="text-gray-300" />}
          </div>
          {trend !== null ? (
            <p className="mt-0.5 text-[10px] text-gray-400" dir="ltr">
              {trendDelta > 0 ? '+' : ''}{trendDelta} {kg} · {L('vs 30 days ago', 'عن ٣٠ يوم فاتوا')}
            </p>
          ) : (
            <p className="mt-0.5 text-[10px] text-gray-300">{L('Log more to see your trend', 'سجل أكتر تشوف التقدم')}</p>
          )}
        </div>
        <div className="rounded-2xl bg-gradient-to-b from-amber-50 to-white p-3 shadow-sm ring-1 ring-amber-100">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{L('Best-ever estimated max (e1RM)', 'أحسن رقم ليك')}</p>
          <div className="mt-1 flex items-baseline gap-1.5" dir="ltr">
            <span className="font-display text-2xl font-extrabold">{round1(bestE1rm)}</span>
            <span className="text-sm font-bold text-gray-400">{kg}</span>
            <span className="text-base">🏆</span>
          </div>
          <p className="mt-0.5 text-[10px] text-gray-400">{L('Epley estimate', 'تقدير بمعادلة Epley')}</p>
        </div>
      </div>
      {/* Plain-language read of what those tiles mean */}
      <p className="mt-2 text-[11px] text-gray-400">
        {L('The heaviest single rep we estimate you could lift', 'أتقل عدة واحدة متوقع ترفعها')}
      </p>

      {/* Weight over time */}
      <div className="mt-4 rounded-2xl bg-gray-50 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">{L('Top weight over time', 'الوزن على مدار الوقت')}</p>
        {days.length >= 2 ? (
          <div dir="ltr">
            <LiftChart points={days} />
            <div className="mt-1 flex justify-between text-[11px] text-gray-400">
              <span>
                {new Date(days[0].ts).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })} · {days[0].weightKg} {kg}
              </span>
              <span>
                {new Date(days[days.length - 1].ts).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })} · {days[days.length - 1].weightKg} {kg}
              </span>
            </div>
          </div>
        ) : (
          <p className="py-3 text-center text-xs text-gray-400">{L('One session so far — log another to draw the line.', 'جلسة واحدة لحد دلوقتي — سجل تاني عشان الرسم يظهر.')}</p>
        )}
      </div>

      {/* Weekly volume */}
      <div className="mt-3 rounded-2xl bg-gray-50 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">{L('Volume (weight × reps)', 'الحجم (وزن × عدات)')}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400">{L('This week', 'الأسبوع ده')}</p>
            <p className="font-display text-xl font-extrabold" dir="ltr">{volThis.toLocaleString()} <span className="font-sans text-xs font-bold text-gray-400">{kg}</span></p>
          </div>
          <div className="min-w-0 text-end">
            <p className="text-[11px] text-gray-400">{L('Last week', 'الأسبوع اللي فات')}</p>
            <p className="font-display text-xl font-extrabold text-gray-400" dir="ltr">{volLast.toLocaleString()} <span className="font-sans text-xs font-bold text-gray-300">{kg}</span></p>
          </div>
          {volDelta !== null && (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${volDelta > 0 ? 'bg-emerald-100 text-emerald-600' : volDelta < 0 ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'}`}
              dir="ltr"
            >
              {volDelta > 0 ? '+' : ''}{volDelta}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Best-set weight per day, same visual family as the body-weight sparkline. */
function LiftChart({ points }: { points: DayBest[] }) {
  const w = 280;
  const h = 80;
  const pad = 6;
  const values = points.map((p) => p.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (i: number) => (points.length === 1 ? w / 2 : pad + (i / (points.length - 1)) * (w - pad * 2));
  const y = (v: number) => pad + (1 - (v - min) / range) * (h - pad * 2);
  const line = points.map((p, i) => `${x(i)},${y(p.weightKg)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" height={80} role="img" aria-label="Weight over time">
      <motion.polyline
        points={line}
        fill="none"
        stroke="#00BCD4"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
      {points.map((p, i) => (
        <circle key={p.day} cx={x(i)} cy={y(p.weightKg)} r={3} fill="#fff" stroke="#00BCD4" strokeWidth={2} />
      ))}
    </svg>
  );
}

/** Tiny standalone Epley calculator: weight + reps → e1RM. */
export function OneRmCalculator() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const wn = parseFloat(weight);
  const rn = parseInt(reps, 10);
  const valid = Number.isFinite(wn) && wn > 0 && Number.isFinite(rn) && rn > 0 && rn <= 30;
  const result = valid ? round1(epley(wn, rn)) : null;
  return (
    <div className="mt-4 rounded-2xl bg-gray-50 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
        <Calculator size={12} /> {L('1RM calculator', 'حاسبة أقصى وزن (1RM)')}
      </p>
      <div className="flex items-center gap-2">
        <input
          dir="ltr"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ''))}
          placeholder={t('session.kg')}
          aria-label={L('Weight', 'الوزن')}
          className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-2 text-center text-sm font-bold outline-none ring-1 ring-gray-200 focus:ring-brand-teal"
        />
        <span className="shrink-0 text-xs font-bold text-gray-300">×</span>
        <input
          dir="ltr"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value.replace(/[^\d]/g, ''))}
          placeholder={t('session.reps')}
          aria-label={t('session.reps')}
          className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-2 text-center text-sm font-bold outline-none ring-1 ring-gray-200 focus:ring-brand-teal"
        />
        <div className="flex min-w-[84px] shrink-0 items-baseline justify-center gap-1 rounded-lg bg-white px-2.5 py-2 ring-1 ring-cyan-100" dir="ltr">
          {result !== null ? (
            <>
              <span className="font-display text-base font-extrabold text-brand-teal">{result}</span>
              <span className="text-[10px] font-bold text-gray-400">{t('session.kg')}</span>
            </>
          ) : (
            <span className="text-sm font-bold text-gray-300">= 1RM</span>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-gray-300">{L('Epley: weight × (1 + reps/30)', 'معادلة Epley: الوزن × (١ + العدات/٣٠)')}</p>
    </div>
  );
}
