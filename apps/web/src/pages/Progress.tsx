import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Flame, Trophy, CheckCircle2, TrendingDown, Medal, Share2, Ruler, Plus, Trash2, X, ImagePlus } from 'lucide-react';
import { api, uploadWithAuth } from '../lib/api';
import { shareMilestone } from '../lib/shareCard';
import { toast } from '../lib/toast';
import { Loader, MediaImage } from '../components/ui';
import Sheet from '../components/Sheet';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';
import WeekRecap from '../components/WeekRecap';
import CountUp from '../components/CountUp';
import StreakCalendar from '../components/StreakCalendar';
import Confetti from '../components/Confetti';
import MoreSections from '../components/MoreSections';
import ExerciseProgressChart, { OneRmCalculator } from '../components/ExerciseProgressChart';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

export default function Progress() {
  const { t, i18n } = useTranslation();
  const { data: p, isLoading } = useQuery({ queryKey: ['progress'], queryFn: () => api.get('/api/tracker/progress') });
  const { data: badges } = useQuery({ queryKey: ['badges'], queryFn: () => api.get('/api/gamification/badges') });
  const { data: prsData } = useQuery({ queryKey: ['prs'], queryFn: () => api.get('/api/tracker/prs') });
  const { data: act } = useQuery({ queryKey: ['activity'], queryFn: () => api.get('/api/daily/activity?days=119') });

  if (isLoading) return <Loader />;

  const week: { day: string; count: number }[] = p?.weekActivity ?? [];
  const maxCount = Math.max(1, ...week.map((w) => w.count));
  const weights: { date: string; weightKg: number }[] = p?.weights ?? [];
  const prs: { exercise: string; weightKg: number; reps: number; createdAt: string }[] = prsData ?? [];
  const activity: { date: string; count: number }[] = act?.activity ?? [];
  const activeDays = activity.filter((a) => a.count > 0).length;

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <AmbientBg tone="warm" />
      <TopBar title={t('tracker.progress')} color="bg-gradient-to-b from-brand-teal to-cyan-500" textColor="text-white" />

      {/* Above the raw stats on purpose: the sentence is what people read, the tiles
          are what they check afterwards. */}
      <WeekRecap className="mx-4 mb-4" />

      <div className="grid grid-cols-3 gap-3 px-4">
        <Stat
          icon={<Flame className="text-orange-500" />}
          value={p?.currentStreak ?? 0}
          label={t('tracker.streak')}
          delay={0}
          onShare={() => void shareMilestone({ kind: 'streak', title: t('share.streak'), value: `${p?.currentStreak ?? 0} ${t('duels.days').toUpperCase()}`, emoji: '🔥', savedMsg: t('share.saved') })}
        />
        <Stat icon={<Trophy className="text-amber-500" />} value={p?.longestStreak ?? 0} label="Best streak" delay={0.06} />
        <Stat icon={<CheckCircle2 className="text-brand-green" />} value={p?.totalCompletions ?? 0} label="Completed" delay={0.12} />
      </div>

      <DietJourneyCard />

      {/* Weight: quick-log + trend. The chart could NEVER render before — no UI
          ever wrote a WeightLog row, so weights was empty for every user. */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -40px 0px' }}
        transition={spring}
        className="mx-4 mt-4 rounded-2xl bg-white p-5 shadow-sm"
      >
        <h2 className="mb-3 flex items-center gap-2 font-bold"><TrendingDown size={16} /> {t('progress2.weightTrend')}</h2>
        <WeightQuickLog />
        {weights.length > 1 && (
          <div className="mt-4">
            <Sparkline points={weights.map((w) => w.weightKg)} />
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              <span>{weights[0].weightKg} {t('session.kg')}</span>
              <span>{weights[weights.length - 1].weightKg} {t('session.kg')}</span>
            </div>
          </div>
        )}
        {weights.length <= 1 && <p className="mt-2 text-xs text-gray-400">{t('progress2.weightHint')}</p>}
      </motion.section>

      {/* Everything below is opt-in — same chips+pin pattern as Home. */}
      <MoreSections
        storageKey="pulse-progress-pins"
        sections={[
          {
            key: 'calendar', emoji: '📆', label: t('homeSlim.calendar'),
            node: (
              <section className="mx-4 mt-4 rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h2 className="min-w-0 truncate font-bold">{t('daily.streakCalendar')}</h2>
                  <span className="shrink-0 text-[11px] text-gray-400">{t('daily.activeDays', { n: activeDays })}</span>
                </div>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <MiniStat emoji="🔥" value={act?.currentStreak ?? 0} label={t('tracker.streak')} />
                  <MiniStat emoji="🏆" value={act?.longestStreak ?? 0} label={t('daily.longest')} />
                  <MiniStat emoji="🧊" value={act?.streakFreezes ?? 0} label={t('daily.freezes')} />
                </div>
                <StreakCalendar activity={activity} />
              </section>
            ),
          },
          {
            key: 'week', emoji: '📊', label: t('homeSlim.week'),
            node: (
              <section className="mx-4 mt-4 rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('tracker.today')}</p>
                <h2 className="mb-4 font-bold">{t('home2.thisWeek')}</h2>
                <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
                  {week.map((w) => (
                    <div key={w.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full origin-bottom rounded-t-md bg-brand-teal"
                        style={{ height: `${(w.count / maxCount) * 90 + 4}px`, opacity: w.count ? 1 : 0.25 }}
                      />
                      <span className="text-[10px] text-gray-400">{new Date(w.day).toLocaleDateString(i18n.language, { weekday: 'narrow' })}</span>
                    </div>
                  ))}
                </div>
              </section>
            ),
          },
          { key: 'body', emoji: '📏', label: t('homeSlim.body'), node: <BodySection /> },
          { key: 'prs', emoji: '🏆', label: t('homeSlim.prs'), node: <StrengthSection prs={prs} /> },
          {
            key: 'badges', emoji: '🎖', label: t('homeSlim.badges'),
            node: (
              <section className="mx-4 mt-4 rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-bold"><Medal size={16} /> Badges</h2>
                  <Link to="/achievements" className="flex min-h-[40px] items-center text-sm font-semibold text-brand-teal">{t('common.viewAll')}</Link>
                </div>
                <div className="flex gap-3 overflow-x-auto">
                  {(badges?.badges ?? []).slice(0, 5).map((b: any) => (
                    <div
                      key={b.id}
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl ${b.earned ? 'bg-amber-100' : 'bg-gray-100 opacity-40 grayscale'}`}
                    >
                      {b.icon ?? '🏅'}
                    </div>
                  ))}
                </div>
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}

function Stat({ icon, value, label, delay, onShare }: { icon: React.ReactNode; value: number; label: string; delay: number; onShare?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      className="relative flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-b from-white to-gray-50 p-4 shadow-sm"
    >
      {onShare && (
        <button onClick={onShare} aria-label={`Share ${label}`} className="absolute end-1.5 top-1.5 p-1 text-gray-300 hover:text-orange-500">
          <Share2 size={14} />
        </button>
      )}
      {icon}
      <CountUp value={value} className="text-2xl font-extrabold" />
      <span className="truncate text-[10px] text-gray-400">{label}</span>
    </motion.div>
  );
}

function MiniStat({ emoji, value, label }: { emoji: string; value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-gray-50 px-2 py-2 text-center">
      <div className="flex items-baseline justify-center gap-1">
        <span className="shrink-0 text-sm">{emoji}</span>
        <span className="text-lg font-extrabold leading-none">{value}</span>
      </div>
      <p className="mt-1 truncate text-[10px] text-gray-400">{label}</p>
    </div>
  );
}

/* ---------------------------------- Body ---------------------------------- */

type BodyEntry = {
  id: string;
  date: string;
  waistCm?: number | null;
  chestCm?: number | null;
  armCm?: number | null;
  hipCm?: number | null;
  thighCm?: number | null;
  photo?: string | null;
  note?: string | null;
  createdAt: string;
};

type FieldKey = 'waistCm' | 'chestCm' | 'armCm' | 'hipCm' | 'thighCm';

const FIELDS: { key: FieldKey; label: string; good: 'up' | 'down' | null }[] = [
  { key: 'waistCm', label: 'daily.waist', good: 'down' },
  { key: 'chestCm', label: 'daily.chest', good: 'up' },
  { key: 'armCm', label: 'daily.arm', good: 'up' },
  { key: 'hipCm', label: 'daily.hip', good: 'down' },
  { key: 'thighCm', label: 'daily.thigh', good: null },
];

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function BodySection() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Record<FieldKey, string>>>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({ queryKey: ['body'], queryFn: () => api.get('/api/daily/body') });
  const entries: BodyEntry[] = data ?? [];

  const values = FIELDS.map((f) => parseFloat(form[f.key] ?? '')).filter((v) => Number.isFinite(v));
  const canSave = values.length > 0 && !uploading;

  const close = () => {
    setOpen(false);
    setForm({});
    setPhoto(null);
    setPhotoPreview(null);
  };

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      for (const f of FIELDS) {
        const v = parseFloat(form[f.key] ?? '');
        if (Number.isFinite(v)) body[f.key] = v;
      }
      if (photo) body.photo = photo;
      return api.post('/api/daily/body', body);
    },
    onSuccess: () => {
      toast(t('daily.saved'), 'success');
      qc.invalidateQueries({ queryKey: ['body'] });
      close();
    },
    onError: (e: unknown) => toast(e instanceof Error ? e.message : 'Something went wrong', 'error'),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del(`/api/daily/body/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body'] }),
  });

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      // Dedicated private endpoint — progress photos must never land in the
      // public images directory the social feed uses.
      const res = await uploadWithAuth('/api/daily/body-photo', fd);
      if (res.ok) {
        const data = await res.json();
        setPhoto(data.photo ?? null); // stored path, saved with the entry
        setPhotoPreview(data.url ?? null); // signed URL, renders the thumbnail
      }
    } catch {
      /* keep the sheet open — saving without a photo still works */
    } finally {
      setUploading(false);
    }
  };

  const prev = entries[1];

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -40px 0px' }}
        transition={spring}
        className="mx-4 mt-4 rounded-2xl bg-white p-5 shadow-sm"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 font-bold">
            <Ruler size={16} className="shrink-0 text-brand-teal" />
            <span className="truncate">{t('daily.body')}</span>
          </h2>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setOpen(true)}
            className="flex shrink-0 items-center gap-1 rounded-full btn-primary px-3 py-1.5 text-xs font-bold"
          >
            <Plus size={14} /> <span className="truncate">{t('daily.addMeasure')}</span>
          </motion.button>
        </div>

        {entries.length === 0 ? (
          <p className="py-4 text-sm text-gray-400">{t('daily.noBody')}</p>
        ) : (
          <div className="space-y-2">
            {entries.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring, delay: Math.min(i, 4) * 0.04 }}
                className="flex items-start gap-3 rounded-xl bg-gray-50 p-2.5"
              >
                {e.photo && (
                  <MediaImage path={e.photo} label="" className="h-12 w-12 shrink-0 rounded-lg" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-gray-400">
                    {new Date(e.date ?? e.createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {FIELDS.map((f) => {
                      const v = num(e[f.key]);
                      if (v === null) return null;
                      const before = i === 0 && prev ? num(prev[f.key]) : null;
                      const delta = before === null ? null : Math.round((v - before) * 10) / 10;
                      return (
                        <span key={f.key} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] shadow-sm">
                          <span className="text-gray-400">{t(f.label)}</span>
                          <span className="font-bold">{v}{t('daily.cm')}</span>
                          {delta !== null && delta !== 0 && (
                            <span className={`font-bold ${deltaColor(f.good, delta)}`}>
                              {delta < 0 ? '↓' : '↑'}{Math.abs(delta)}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  {e.note && <p className="mt-1 break-words text-[11px] text-gray-500">{e.note}</p>}
                </div>
                <button
                  onClick={() => window.confirm('Delete this measurement?') && del.mutate(e.id)}
                  aria-label={t('progress.deleteMeasure')}
                  className="-me-1 shrink-0 p-1.5 text-gray-300 transition-colors hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      <Sheet open={open} onClose={close} label={t('daily.addMeasure')}>
        <div className="p-5 pb-8">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="min-w-0 truncate text-lg font-extrabold">{t('daily.addMeasure')}</h3>
                <button onClick={close} aria-label={t('common.close')} className="-me-1 shrink-0 p-1.5 text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2">
                {FIELDS.map((f) => (
                  <label key={f.key} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t(f.label)}</span>
                    <input
                      dir="ltr"
                      inputMode="decimal"
                      value={form[f.key] ?? ''}
                      onChange={(ev) => setForm((s) => ({ ...s, [f.key]: ev.target.value }))}
                      placeholder="—"
                      className="w-20 shrink-0 rounded-lg bg-white px-2 py-1 text-end text-sm font-bold outline-none ring-1 ring-gray-200 focus:ring-brand-pink"
                    />
                    <span className="shrink-0 text-xs text-gray-400">{t('daily.cm')}</span>
                  </label>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-500 disabled:opacity-60"
                >
                  <ImagePlus size={16} /> {uploading ? t('common.loading') : 'Photo'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(ev) => ev.target.files?.[0] && void onFile(ev.target.files[0])}
                />
                {photo && (
                  <div className="relative">
                    <MediaImage path={photoPreview ?? photo} label="" className="h-14 w-14 rounded-lg" />
                    <button
                      onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                      aria-label="Remove photo"
                      className="absolute -end-2 -top-2 rounded-full bg-black/70 p-1 text-white"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => canSave && save.mutate()}
                disabled={!canSave || save.isPending}
                className="mt-5 w-full rounded-2xl btn-primary py-3 font-bold disabled:opacity-50"
              >
                {t('common.save')}
              </motion.button>
        </div>
      </Sheet>
    </>
  );
}

/* -------------------------------- Strength -------------------------------- */

type PrRow = { exercise: string; weightKg: number; reps: number; createdAt: string };

/** PR cards → tap opens per-exercise chart + e1RM sheet; tiny 1RM calc below. */
function StrengthSection({ prs }: { prs: PrRow[] }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <section className="mx-4 mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 font-bold"><Trophy size={16} className="text-amber-500" /> {t('progress2.prs')}</h2>
        {prs.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">{t('progress2.prsEmpty')}</p>
        ) : (
          <>
            <p className="mb-3 text-[11px] text-gray-400">{L('Tap an exercise for its chart & e1RM', 'دوس على أي تمرين تشوف الرسم والـ 1RM بتاعه')}</p>
            <div className="grid grid-cols-2 gap-3">
              {prs.map((r, i) => (
                <motion.div
                  key={r.exercise}
                  whileTap={{ scale: 0.97 }}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(r.exercise)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelected(r.exercise)}
                  className="relative min-w-0 cursor-pointer rounded-2xl bg-gradient-to-b from-amber-50 to-white p-3 shadow-sm ring-1 ring-amber-100"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void shareMilestone({ kind: 'pr', title: t('share.pr'), value: `${r.weightKg} ${t('session.kg').toUpperCase()}`, subtitle: `${r.exercise} · ${r.reps} ${t('session.reps')}`, emoji: '🏆', savedMsg: t('share.saved') });
                    }}
                    aria-label={`Share ${r.exercise} record`}
                    className="absolute end-2 top-2 p-1 text-amber-300 hover:text-amber-500"
                  >
                    <Share2 size={14} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 text-lg">{i === 0 ? '🏆' : '🥇'}</span>
                    <span className="min-w-0 truncate text-sm font-semibold">{r.exercise}</span>
                  </div>
                  <p className="font-display mt-1 text-2xl font-extrabold">
                    {r.weightKg}<span className="font-sans text-sm font-bold text-gray-400"> {t('session.kg')}</span>
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {r.reps} {t('session.reps')} · {new Date(r.createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                  </p>
                </motion.div>
              ))}
            </div>
          </>
        )}
        <OneRmCalculator />
      </section>

      <Sheet open={selected !== null} onClose={() => setSelected(null)} label={selected ?? ''}>
        {selected !== null && <ExerciseProgressChart exercise={selected} />}
      </Sheet>
    </>
  );
}

/** Green when moving the good way (waist/hip down), orange when growing (arm/chest). */
function deltaColor(good: 'up' | 'down' | null, delta: number): string {
  if (good === 'down') return delta < 0 ? 'text-brand-green' : 'text-gray-400';
  if (good === 'up') return delta > 0 ? 'text-brand-pink' : 'text-gray-400';
  return 'text-gray-400';
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 280;
  const h = 60;
  const d = points
    .map((v, i) => `${(i / (points.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" height={60}>
      <motion.polyline
        points={d}
        fill="none"
        stroke="#00BCD4"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

/** One number, one tap: the writer the weight-trend chart was starving for. */
function WeightQuickLog() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [kg, setKg] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const save = useMutation({
    mutationFn: () => api.post('/api/tracker/weight', { weightKg: Number(kg) }),
    onSuccess: (r: any) => {
      setKg('');
      qc.invalidateQueries({ queryKey: ['progress'] });
      qc.invalidateQueries({ queryKey: ['quests'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['diet-journey'] });
      if (r?.journeyCompleted) {
        setCelebrate(true);
        toast(t('diet.completed'), 'success');
      } else {
        toast(t('progress2.weightSaved'), 'success');
      }
    },
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });
  const n = Number(kg);
  const valid = Number.isFinite(n) && n >= 20 && n <= 400;
  return (
    <div className="flex items-center gap-2">
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}
      <input
        inputMode="decimal"
        className="input-field min-w-0 flex-1"
        placeholder={t('progress2.weightPh')}
        value={kg}
        onChange={(e) => setKg(e.target.value.replace(/[^\d.]/g, ''))}
      />
      <button
        onClick={() => valid && save.mutate()}
        disabled={!valid || save.isPending}
        className="btn-pill btn-primary min-h-[42px] shrink-0 px-5 text-sm disabled:opacity-50"
      >
        {t('common.save')}
      </button>
    </div>
  );
}

/** The diet JOURNEY: start → target with a healthy-pace trajectory. Turns the
 *  nutrition toolbox (targets, plan, logging, weigh-ins) into a program with
 *  a progress needle — and opts the user into food nudges + Friday weigh-ins. */
function DietJourneyCard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [target, setTarget] = useState('');
  const [starting, setStarting] = useState(false);
  const { data: j } = useQuery({ queryKey: ['diet-journey'], queryFn: () => api.get('/api/tracker/diet-journey') });

  const start = useMutation({
    mutationFn: () => api.post('/api/tracker/diet-journey', { targetWeightKg: Number(target) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diet-journey'] });
      qc.invalidateQueries({ queryKey: ['progress'] });
      setStarting(false);
      toast(t('diet.started'), 'success');
    },
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });
  const stop = useMutation({
    mutationFn: () => api.del('/api/tracker/diet-journey'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['diet-journey'] }); toast(t('diet.stopped'), 'info'); },
  });

  if (!j) return null;

  if (!j.active) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -40px 0px' }}
        className="scene-tex mx-4 mt-4 rounded-2xl bg-gradient-to-br from-emerald-500/95 to-teal-700/85 p-5 text-white shadow-md"
      >
        <h2 className="text-base font-extrabold">🎯 {t('diet.ctaTitle')}</h2>
        <p className="mt-1 text-xs text-white/85">{t('diet.ctaSub')}</p>
        {starting ? (
          <div className="mt-3 flex items-center gap-2">
            <input
              inputMode="decimal"
              className="min-w-0 flex-1 rounded-xl bg-white/15 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/50"
              placeholder={t('diet.targetPh')}
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ''))}
            />
            <button
              onClick={() => Number(target) >= 30 && start.mutate()}
              disabled={start.isPending || !(Number(target) >= 30)}
              className="min-h-[42px] shrink-0 rounded-full bg-white px-5 text-sm font-extrabold text-emerald-700 disabled:opacity-50"
            >
              {t('diet.go')}
            </button>
          </div>
        ) : (
          <button onClick={() => setStarting(true)} className="mt-3 min-h-[40px] rounded-full bg-white px-5 text-sm font-extrabold text-emerald-700">
            {t('diet.ctaBtn')}
          </button>
        )}
      </motion.section>
    );
  }

  const losing = j.targetWeightKg < j.startWeightKg;
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      className="mx-4 mt-4 rounded-2xl bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-bold">🎯 {t('diet.title')}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${j.onTrack ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
          {j.onTrack ? t('diet.onTrack') : t('diet.behind')}
        </span>
      </div>
      <div className="mt-3 flex items-baseline justify-between text-xs font-bold text-gray-400" dir="ltr">
        <span>{j.startWeightKg} kg</span>
        <span className="text-xl font-extrabold text-ink">{j.currentWeightKg} kg</span>
        <span>{j.targetWeightKg} kg 🏁</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${j.pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full bg-gradient-to-r ${losing ? 'from-emerald-400 to-teal-600' : 'from-orange-400 to-pink-600'}`}
        />
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-400">
        {t('diet.stats', {
          moved: Math.abs(Math.round((j.currentWeightKg - j.startWeightKg) * 10) / 10),
          weeks: j.weeksIn,
          eta: j.etaWeeks,
        })}
      </p>
      {/* Diet moves the scale; training keeps the muscle. Bridge to the workout side. */}
      <Link to="/programs" className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-orange-50 py-2.5 text-xs font-bold text-orange-600">
        💪 {t('diet.pairWorkout')}
      </Link>
      <button onClick={() => window.confirm(t('diet.stopConfirm')) && stop.mutate()} className="mt-2 w-full text-center text-[10px] font-bold text-gray-300">
        {t('diet.stop')}
      </button>
    </motion.section>
  );
}
