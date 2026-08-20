import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Share2, Flame, Zap, CalendarCheck2, Scale, UtensilsCrossed, Medal } from 'lucide-react';
import { api } from '../lib/api';
import { BRAND_NAME } from '../lib/brand';
import { Loader } from '../components/ui';
import TopBar from '../components/TopBar';
import { toast } from '../lib/toast';

/**
 * Weekly recap + monthly wrapped.
 *
 * Weekly = the last completed Saturday→Friday week, honest numbers and one
 * focus suggestion. Monthly = the shareable "wrapped": a 4:5 gradient card
 * rendered as a div on screen and redrawn text-only on a 1080×1350 canvas for
 * navigator.share / PNG download — no external images, so it works offline.
 */

type WeekStats = {
  week: { start: string; end: string };
  workouts: number;
  xp: number;
  activeDays: number;
  calorieDaysLogged: number;
  avgCalories: number | null;
  goalCalories: number | null;
  weightStart: number | null;
  weightEnd: number | null;
  streak: number;
  focusEn: string;
  focusAr: string;
};

type MonthStats = {
  month: string;
  range: { start: string; end: string };
  totalWorkouts: number;
  totalXp: number;
  activeDays: number;
  calorieDaysLogged: number;
  avgCalories: number | null;
  goalCalories: number | null;
  weightDelta: number | null;
  bestStreakInMonth: number;
  badgesEarned: number;
  focusEn: string;
  focusAr: string;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function Recap() {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');

  const { data: weekly, isLoading: loadingW } = useQuery<{ last: WeekStats; current: WeekStats }>({
    queryKey: ['recap-weekly'],
    queryFn: () => api.get('/api/recap/weekly'),
  });
  const { data: monthly, isLoading: loadingM } = useQuery<MonthStats>({
    queryKey: ['recap-monthly'],
    queryFn: () => api.get('/api/recap/monthly'),
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <TopBar
        title={L('Recap', 'الملخص')}
        color="bg-gradient-to-b from-indigo-600 to-violet-500"
        textColor="text-white"
      />

      {/* Tabs — same pill pattern as Community */}
      <div className="mx-4 mb-4 flex rounded-full glass p-1 text-sm font-bold">
        {(['weekly', 'monthly'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`min-h-10 flex-1 rounded-full transition ${
              tab === k ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'
            }`}
          >
            {k === 'weekly' ? L('Weekly', 'أسبوعي') : L('Monthly', 'شهري')}
          </button>
        ))}
      </div>

      {tab === 'weekly' &&
        (loadingW || !weekly ? <Loader /> : <WeeklyView s={weekly.last} L={L} isAr={isAr} />)}
      {tab === 'monthly' &&
        (loadingM || !monthly ? <Loader /> : <MonthlyView m={monthly} L={L} isAr={isAr} />)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly
// ---------------------------------------------------------------------------

function WeeklyView({ s, L, isAr }: { s: WeekStats; L: (en: string, ar: string) => string; isAr: boolean }) {
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' });
  const weightDelta =
    s.weightStart !== null && s.weightEnd !== null ? round1(s.weightEnd - s.weightStart) : null;

  return (
    <div className="animate-fade-up">
      <p className="px-4 text-xs font-bold uppercase tracking-wide text-gray-400">
        {fmt(s.week.start)} – {fmt(s.week.end)}
      </p>

      {/* Hero numbers */}
      <div className="mx-4 mt-2 grid grid-cols-3 gap-3">
        <Hero icon={<CalendarCheck2 size={16} className="text-indigo-500" />} value={s.workouts} label={L('Workouts', 'تمارين')} />
        <Hero icon={<Zap size={16} className="text-amber-500" />} value={s.xp} label="XP" />
        <Hero icon={<Flame size={16} className="text-orange-500" />} value={s.activeDays} label={L('Active days', 'أيام نشاط')} />
      </div>

      {/* Weight */}
      <section className="mx-4 mt-3 rounded-2xl glass p-4">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold">
          <Scale size={15} /> {L('Weight', 'الوزن')}
        </h2>
        {weightDelta === null ? (
          <p className="text-xs text-gray-500">{L('No weight logs this week.', 'مفيش وزن متسجل الأسبوع ده.')}</p>
        ) : (
          <p className="text-sm">
            <span className="font-display text-lg font-bold">{s.weightStart}</span>
            <span className="mx-1 text-gray-400">←</span>
            <span className="font-display text-lg font-bold">{s.weightEnd}</span>
            <span className="ms-1 text-xs text-gray-500">{L('kg', 'كجم')}</span>
            <span className={`ms-2 text-xs font-bold ${weightDelta < 0 ? 'text-brand-green' : weightDelta > 0 ? 'text-brand-red' : 'text-gray-500'}`}>
              {weightDelta > 0 ? '+' : ''}{weightDelta} {L('kg', 'كجم')}
            </span>
          </p>
        )}
      </section>

      {/* Calorie adherence */}
      <section className="mx-4 mt-3 rounded-2xl glass p-4">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold">
          <UtensilsCrossed size={15} /> {L('Nutrition', 'التغذية')}
        </h2>
        <p className="text-xs text-gray-500">
          {L(`Logged food on ${s.calorieDaysLogged}/7 days`, `سجّلت أكلك ${s.calorieDaysLogged}/٧ أيام`)}
        </p>
        {s.avgCalories !== null && (
          <p className="mt-1 text-sm">
            <span className="font-display text-lg font-bold">{s.avgCalories}</span>
            <span className="ms-1 text-xs text-gray-500">
              {L('kcal avg', 'سعرة متوسط')}
              {s.goalCalories ? ` · ${L('goal', 'الهدف')} ${s.goalCalories}` : ''}
            </span>
          </p>
        )}
      </section>

      {/* Streak */}
      <section className="mx-4 mt-3 flex items-center gap-3 rounded-2xl glass p-4">
        <Flame size={22} className="shrink-0 text-orange-500" />
        <div>
          <p className="font-display text-lg font-bold leading-none">{s.streak}</p>
          <p className="text-[11px] text-gray-500">{L('day streak right now', 'يوم سلسلة حالياً')}</p>
        </div>
      </section>

      {/* Focus callout */}
      <section className="mx-4 mt-3 rounded-2xl border-s-4 border-indigo-500 bg-indigo-50 p-4 dark:bg-indigo-950/40">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-indigo-500">
          {L('This week’s focus', 'تركيز الأسبوع')}
        </p>
        <p className="text-sm leading-relaxed">{L(s.focusEn, s.focusAr)}</p>
      </section>
    </div>
  );
}

function Hero({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-2xl glass p-3 text-center">
      <div className="mb-1 flex justify-center">{icon}</div>
      <p className="font-display text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monthly wrapped
// ---------------------------------------------------------------------------

function monthTitle(month: string, isAr: boolean): string {
  return new Date(`${month}-15T12:00:00`).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function MonthlyView({ m, L, isAr }: { m: MonthStats; L: (en: string, ar: string) => string; isAr: boolean }) {
  const title = monthTitle(m.month, isAr);
  const weightLine =
    m.weightDelta === null ? '—' : `${m.weightDelta > 0 ? '+' : ''}${m.weightDelta} ${L('kg', 'كجم')}`;

  const rows: { value: string; label: string }[] = [
    { value: String(m.totalWorkouts), label: L('Workouts', 'تمارين') },
    { value: String(m.totalXp), label: L('XP earned', 'نقاط خبرة') },
    { value: String(m.activeDays), label: L('Active days', 'أيام نشاط') },
    { value: weightLine, label: L('Weight change', 'تغيير الوزن') },
    { value: String(m.bestStreakInMonth), label: L('Best streak', 'أطول سلسلة') },
  ];

  const share = async () => {
    try {
      await shareWrapped({ title, rows, brand: BRAND_NAME, isAr });
      toast(L('Ready to share!', 'جاهزة للمشاركة!'), 'success');
    } catch {
      /* user cancelled the share sheet — not an error */
    }
  };

  return (
    <div className="animate-fade-up">
      {/* The wrapped card — 4:5, same numbers the canvas will draw */}
      <div className="mx-4 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg">
        <div className="flex aspect-[4/5] flex-col p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
            {L('Monthly wrapped', 'ملخص الشهر')}
          </p>
          <h2 className="mt-1 text-2xl font-bold">{title}</h2>
          <div className="my-auto space-y-4">
            {rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between border-b border-white/15 pb-2">
                <span className="text-sm text-white/80">{r.label}</span>
                <span className="font-display text-3xl font-bold">{r.value}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-extrabold tracking-widest">{BRAND_NAME}</span>
            {m.badgesEarned > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                <Medal size={13} /> {m.badgesEarned} {L('badges', 'شارات')}
              </span>
            )}
          </div>
        </div>
      </div>

      <button onClick={() => void share()} className="btn-pill btn-primary mx-4 mt-4 flex w-[calc(100%-2rem)] items-center justify-center gap-2">
        <Share2 size={17} /> {L('Share', 'مشاركة')}
      </button>

      <section className="mx-4 mt-4 rounded-2xl glass p-4">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-indigo-500">
          {L('Next month', 'الشهر الجاي')}
        </p>
        <p className="text-sm leading-relaxed">{L(m.focusEn, m.focusAr)}</p>
      </section>
    </div>
  );
}

/**
 * Draw the wrapped card on an offscreen 1080×1350 canvas (text-only, no
 * external images — nothing to load, nothing to fail) and hand it to the
 * native share sheet; fall back to a PNG download where files can't be shared.
 */
async function shareWrapped(opts: {
  title: string;
  rows: { value: string; label: string }[];
  brand: string;
  isAr: boolean;
}): Promise<void> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#4f46e5'); // indigo-600
  g.addColorStop(0.5, '#7c3aed'); // violet-600
  g.addColorStop(1, '#c026d3'); // fuchsia-600
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const font = opts.isAr ? 'Tajawal, sans-serif' : 'Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `bold 34px ${font}`;
  ctx.fillText((opts.isAr ? 'ملخص الشهر' : 'MONTHLY WRAPPED'), W / 2, 130);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 64px ${font}`;
  ctx.fillText(opts.title, W / 2, 220);

  // Stat rows: label left, big value right (mirrored for Arabic).
  const top = 340;
  const rowH = 150;
  for (let i = 0; i < opts.rows.length; i++) {
    const y = top + i * rowH;
    const r = opts.rows[i];
    ctx.textAlign = opts.isAr ? 'right' : 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `36px ${font}`;
    ctx.fillText(r.label, opts.isAr ? W - 90 : 90, y + 60);
    ctx.textAlign = opts.isAr ? 'left' : 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 84px ${font}`;
    ctx.fillText(r.value, opts.isAr ? 90 : W - 90, y + 70);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, y + 105);
    ctx.lineTo(W - 90, y + 105);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 56px ${font}`;
  ctx.fillText(opts.brand, W / 2, H - 110);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'wrapped.png', { type: 'image/png' });

  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title: `${opts.title} — ${opts.brand}` });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${opts.brand.toLowerCase().replace(/\s+/g, '')}-wrapped.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
