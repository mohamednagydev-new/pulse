import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Mic, Plus, Search, Trash2, Sparkles, Pencil } from 'lucide-react';
import Sheet from '../components/Sheet';
import { listenOnce, voiceSupported } from '../lib/voiceInput';
import { toast } from '../lib/toast';
import { api } from '../lib/api';
import { Loader, ErrorMsg } from '../components/ui';
import TopBar from '../components/TopBar';
import CountUp from '../components/CountUp';
import AmbientBg from '../components/AmbientBg';
import FoodPicker from '../components/FoodPicker';
import MealPhoto from '../components/MealPhoto';
import NutritionHub from '../components/NutritionHub';
import SpotlightBubble from '../components/SpotlightBubble';
import { bumpDaily, markSpot, spotSeen } from '../lib/spotlight';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

export default function Tracker() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [photo, setPhoto] = useState(false);
  // The AI free-text box is a secondary door now — closed until asked for.
  const [describeOpen, setDescribeOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const voice = useRef<{ cancel: () => void } | null>(null);

  // Leaving the page mid-dictation must release the microphone.
  useEffect(() => () => voice.current?.cancel(), []);

  // Voice spotlight: fires after the user has LOGGED FOOD on 3 different days
  // without ever dictating — the moment the tip answers a real habit.
  const [voiceSpot, setVoiceSpot] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['tracker-day'], queryFn: () => api.get('/api/tracker/day') });
  // Diet Journey lives on Progress, but diet-minded users live HERE — surface it.
  const { data: journey } = useQuery({ queryKey: ['diet-journey'], queryFn: () => api.get('/api/tracker/diet-journey') });

  useEffect(() => {
    if (!data?.entries?.length || spotSeen('spot-voice') || !voiceSupported()) return;
    if (bumpDaily('tracker-logged') >= 3) setVoiceSpot(true);
  }, [data]);

  // The free-text estimator needs a configured key. Asking first means we show the
  // box only where it works, instead of offering a button that quietly fails.
  const { data: ai } = useQuery({ queryKey: ['ai-status'], queryFn: () => api.get('/api/ai/status') });

  const del = useMutation({
    mutationFn: (id: string) => api.del(`/api/tracker/calories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracker-day'] }),
  });

  // AI: describe food in natural language -> estimate macros -> log
  const addByText = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const est = await api.post('/api/ai/calories', { text });
      for (const item of est.items ?? []) {
        await api.post('/api/tracker/calories', item);
      }
      setText('');
      qc.invalidateQueries({ queryKey: ['tracker-day'] });
    } catch {
      // AI may be off or the estimate failed — say so and keep their text so
      // nothing typed is lost; the food list below always works.
      toast(isAr ? 'معرفناش نقدّرها — جرّب من قايمة الأكل' : "Couldn't estimate that — try the food list", 'error');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <Loader />;
  if (isError)
    return (
      <div className="min-h-screen">
        <TopBar title={isAr ? 'الأكل' : 'Food'} color="bg-gradient-to-b from-brand-green to-emerald-600" textColor="text-white" />
        <ErrorMsg error={error} onRetry={() => refetch()} />
      </div>
    );

  const totals = data?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const goals = data?.goals ?? {};
  // Honest bar: fill still caps at 100%, but the color tells the truth —
  // green under target, amber a little over (to 115%), red past that.
  const rawPct = goals.calories ? Math.round((totals.calories / goals.calories) * 100) : 0;
  const pct = Math.min(100, rawPct);
  const overBy = goals.calories ? Math.max(0, Math.round(totals.calories - goals.calories)) : 0;
  const barTone = rawPct > 115 ? 'bg-red-500' : rawPct >= 100 ? 'bg-amber-500' : 'bg-brand-green';

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <AmbientBg tone="green" />
      <TopBar title={isAr ? 'الأكل' : 'Food'} color="bg-gradient-to-b from-brand-green to-emerald-600" textColor="text-white" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="mx-4 rounded-2xl bg-gradient-to-b from-white to-emerald-50/50 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('tracker.today')}</p>
          {/* The meal plan literally says "change your targets in Tracker" — now true. */}
          <button onClick={() => setGoalsOpen(true)} aria-label={t('tracker.editGoals')} className="flex items-center gap-1 text-[11px] font-bold text-brand-blue">
            <Pencil size={11} /> {t('tracker.editGoals')}
          </button>
        </div>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <CountUp value={totals.calories} className="text-3xl font-extrabold" />
            <p className="text-xs text-gray-400">{goals.calories ? `/ ${goals.calories} kcal` : t('tracker.kcalToday')}</p>
          </div>
          <div className="shrink-0 text-end text-xs text-gray-500">
            <p>P {Math.round(totals.protein)}g</p>
            <p>C {Math.round(totals.carbs)}g</p>
            <p>F {Math.round(totals.fat)}g</p>
          </div>
        </div>
        {goals.calories ? (
          <>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                className={`h-full rounded-full ${barTone}`}
              />
            </div>
            {overBy > 0 && (
              <p className={`mt-1.5 text-end text-[11px] font-bold ${rawPct > 115 ? 'text-red-500' : 'text-amber-600'}`}>
                {isAr ? `+${overBy} زيادة` : `+${overBy} over`}
              </p>
            )}
          </>
        ) : null}
      </motion.div>

      {/* The primary way in: pick from the Egyptian food table. Always works. */}
      <motion.button
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        transition={{ ...spring, delay: 0.08 }}
        onClick={() => setPicking(true)}
        className="mx-4 mt-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-white p-4 text-start shadow-sm"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-brand-green">
          <Search size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{t('food.addFood')}</span>
          <span className="block truncate text-xs text-gray-400">{t('food.addFoodSub')}</span>
        </span>
        <Plus size={18} className="shrink-0 text-gray-300" />
      </motion.button>

      {/* Photo + AI-describe, demoted to one compact secondary row — small doors,
          not stacked cards. Only offered when the AI can actually work. */}
      {ai?.enabled && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="mx-4 mt-2 flex gap-2"
        >
          <button
            onClick={() => setPhoto(true)}
            aria-label={t('photo.title')}
            className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-white text-xs font-bold text-gray-600 shadow-sm transition active:scale-[0.97]"
          >
            <Camera size={14} className="text-brand-pink" /> {isAr ? 'صوّر الأكل' : 'Photo'}
          </button>
          <button
            onClick={() => setDescribeOpen((v) => !v)}
            aria-expanded={describeOpen}
            className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold shadow-sm transition active:scale-[0.97] ${
              describeOpen ? 'bg-emerald-50 text-brand-green' : 'bg-white text-gray-600'
            }`}
          >
            <Sparkles size={14} className="text-brand-pink" /> {isAr ? 'اوصف أكلك' : 'Describe'}
          </button>
        </motion.div>
      )}

      {/* Secondary, and only when it is actually configured. */}
      {ai?.enabled && voiceSpot && !spotSeen('spot-voice') && (
        <SpotlightBubble spotKey="spot-voice" text={t('spot.voice')} onDismiss={() => setVoiceSpot(false)} className="mx-4 mt-2" />
      )}
      {ai?.enabled && describeOpen && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.12 }}
          className="mx-4 mt-2 rounded-2xl bg-white p-3 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="shrink-0 text-brand-pink" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder={t('tracker.describePh')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addByText()}
            />
            {voiceSupported() && (
              <button
                onClick={async () => {
                  // Second tap while listening stops the dictation.
                  if (listening) {
                    voice.current?.cancel();
                    return;
                  }
                  setListening(true);
                  markSpot('spot-voice'); // they found the mic — the tip has nothing left to teach
                  setVoiceSpot(false);
                  try {
                    const session = listenOnce(i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US', (s) => setText(s));
                    voice.current = session;
                    const said = await session.promise;
                    if (said) setText(said);
                  } catch (e) {
                    if (e instanceof Error && (e.message === 'not-allowed' || e.message === 'service-not-allowed')) {
                      toast(t('food.micDenied'), 'error');
                    }
                  } finally {
                    voice.current = null;
                    setListening(false);
                  }
                }}
                aria-label={t('food.speak')}
                aria-pressed={listening}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-90 ${
                  listening ? 'bg-red-500 text-white' : 'bg-emerald-50 text-brand-green'
                }`}
              >
                <Mic size={16} className={listening ? 'animate-pulse' : ''} />
              </button>
            )}
            <motion.button whileTap={{ scale: 0.9 }} onClick={addByText} disabled={busy} aria-label={t('food.add')} className="shrink-0 rounded-full btn-primary p-2 disabled:opacity-60">
              <Plus size={18} />
            </motion.button>
          </div>
          <p className="mt-1 px-1 text-[11px] text-gray-400">{t('tracker.describeHint')}</p>
        </motion.div>
      )}

      {/* TODAY'S LOG — the user's food is the page's content, so it comes first. */}
      <div className="mt-4 space-y-2 px-4">
        <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{isAr ? 'أكل النهارده' : "Today's log"}</p>
        {(data?.entries ?? []).map((e: any, i: number) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: Math.min(i, 5) * 0.04 }}
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium">{e.name}</p>
              <p className="text-xs text-gray-400">{e.calories} kcal · P{Math.round(e.protein ?? 0)} C{Math.round(e.carbs ?? 0)} F{Math.round(e.fat ?? 0)}</p>
            </div>
            <button onClick={() => del.mutate(e.id)} aria-label={`Delete ${e.name}`} className="-me-2 shrink-0 p-2 text-gray-300 transition-colors hover:text-red-500">
              <Trash2 size={18} />
            </button>
          </motion.div>
        ))}
        {!data?.entries?.length && <p className="py-6 text-center text-sm text-gray-400">{t('tracker.noFood')}</p>}
      </div>

      {/* NUTRITION hub — the three diet products, told apart by function, with
          the weight-goal journey as the headline card (it owns the journey now). */}
      <NutritionHub journey={journey} />

      <AnimatePresence>{picking && <FoodPicker onClose={() => setPicking(false)} />}</AnimatePresence>
      <GoalsSheet open={goalsOpen} onClose={() => setGoalsOpen(false)} current={goals} />
      <AnimatePresence>{photo && <MealPhoto onClose={() => setPhoto(false)} />}</AnimatePresence>
    </div>
  );
}

/** Calorie/macro targets editor — PATCH /api/tracker/goals existed for months
 *  with no UI while two bilingual strings told users to "change them in Tracker". */
function GoalsSheet({ open, onClose, current }: { open: boolean; onClose: () => void; current: any }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [v, setV] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  useEffect(() => {
    if (open) setV({
      calories: String(current?.calories ?? ''),
      protein: String(current?.protein ?? ''),
      carbs: String(current?.carbs ?? ''),
      fat: String(current?.fat ?? ''),
    });
  }, [open, current]);

  const save = useMutation({
    mutationFn: () =>
      api.patch('/api/tracker/goals', {
        ...(Number(v.calories) > 0 ? { goalCalories: Math.round(Number(v.calories)) } : {}),
        ...(Number(v.protein) > 0 ? { goalProtein: Math.round(Number(v.protein)) } : {}),
        ...(Number(v.carbs) > 0 ? { goalCarbs: Math.round(Number(v.carbs)) } : {}),
        ...(Number(v.fat) > 0 ? { goalFat: Math.round(Number(v.fat)) } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker-day'] });
      qc.invalidateQueries({ queryKey: ['meal-plan'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      toast(t('tracker.goalsSaved'), 'success');
      onClose();
    },
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });

  const FIELDS: { key: keyof typeof v; label: string }[] = [
    { key: 'calories', label: 'kcal' },
    { key: 'protein', label: `${t('tracker.protein')} (g)` },
    { key: 'carbs', label: `${t('tracker.carbs')} (g)` },
    { key: 'fat', label: `${t('tracker.fat')} (g)` },
  ];

  return (
    <Sheet open={open} onClose={onClose} label={t('tracker.editGoals')}>
      <div className="p-4 pb-6">
        <h3 className="text-base font-bold">{t('tracker.editGoals')}</h3>
        <p className="mt-0.5 text-xs text-gray-400">{t('tracker.goalsHint')}</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {FIELDS.map(({ key, label }) => (
            <label key={key} className="block">
              <span className="text-[11px] font-bold text-gray-400">{label}</span>
              <input
                inputMode="numeric"
                className="input-field mt-1"
                value={v[key]}
                onChange={(e) => setV({ ...v, [key]: e.target.value.replace(/\D/g, '') })}
              />
            </label>
          ))}
        </div>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !(Number(v.calories) > 0)}
          className="btn-pill btn-primary mt-4 min-h-[46px] w-full disabled:opacity-50"
        >
          {t('common.save')}
        </button>
      </div>
    </Sheet>
  );
}
