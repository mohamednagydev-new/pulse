import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Plus, Search, Trash2, Sparkles, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Loader, ErrorMsg } from '../components/ui';
import TopBar from '../components/TopBar';
import CountUp from '../components/CountUp';
import AmbientBg from '../components/AmbientBg';
import FoodPicker from '../components/FoodPicker';
import MealPhoto from '../components/MealPhoto';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

export default function Tracker() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [photo, setPhoto] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['tracker-day'], queryFn: () => api.get('/api/tracker/day') });

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
      /* AI may be off; user can add manually below */
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <Loader />;
  if (isError)
    return (
      <div className="min-h-screen">
        <TopBar title={t('tracker.calories')} color="bg-gradient-to-b from-brand-green to-emerald-600" textColor="text-white" />
        <ErrorMsg error={error} onRetry={() => refetch()} />
      </div>
    );

  const totals = data?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const goals = data?.goals ?? {};
  const pct = goals.calories ? Math.min(100, Math.round((totals.calories / goals.calories) * 100)) : 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <AmbientBg tone="green" />
      <TopBar title={t('tracker.calories')} color="bg-gradient-to-b from-brand-green to-emerald-600" textColor="text-white" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="mx-4 rounded-2xl bg-gradient-to-b from-white to-emerald-50/50 p-5 shadow-sm"
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Today</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <CountUp value={totals.calories} className="text-3xl font-extrabold" />
            <p className="text-xs text-gray-400">{goals.calories ? `/ ${goals.calories} kcal` : 'kcal today'}</p>
          </div>
          <div className="shrink-0 text-end text-xs text-gray-500">
            <p>P {Math.round(totals.protein)}g</p>
            <p>C {Math.round(totals.carbs)}g</p>
            <p>F {Math.round(totals.fat)}g</p>
          </div>
        </div>
        {goals.calories ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="h-full rounded-full bg-brand-green"
            />
          </div>
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

      <Link
        to="/meals"
        className="mx-4 mt-2 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-white p-4 text-start shadow-sm transition active:scale-[0.98]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-brand-orange">
          <UtensilsCrossed size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{t('meals.title')}</span>
          <span className="block truncate text-xs text-gray-400">{t('meals.subtitle')}</span>
        </span>
      </Link>

      {/* Vision. Only offered when it can actually work — a camera button that 503s
          is worse than no camera button. */}
      {ai?.enabled && (
        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          transition={{ ...spring, delay: 0.1 }}
          onClick={() => setPhoto(true)}
          className="mx-4 mt-2 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-white p-4 text-start shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-brand-pink">
            <Camera size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{t('photo.title')}</span>
            <span className="block truncate text-xs text-gray-400">{t('photo.sub')}</span>
          </span>
        </motion.button>
      )}

      {/* Secondary, and only when it is actually configured. */}
      {ai?.enabled && (
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
            <motion.button whileTap={{ scale: 0.9 }} onClick={addByText} disabled={busy} aria-label={t('food.add')} className="shrink-0 rounded-full btn-primary p-2 disabled:opacity-60">
              <Plus size={18} />
            </motion.button>
          </div>
          <p className="mt-1 px-1 text-[11px] text-gray-400">{t('tracker.describeHint')}</p>
        </motion.div>
      )}

      <AnimatePresence>{picking && <FoodPicker onClose={() => setPicking(false)} />}</AnimatePresence>
      <AnimatePresence>{photo && <MealPhoto onClose={() => setPhoto(false)} />}</AnimatePresence>

      <div className="mt-4 space-y-2 px-4">
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
        {!data?.entries?.length && <p className="py-10 text-center text-sm text-gray-400">{t('tracker.noFood')}</p>}
      </div>
    </div>
  );
}
