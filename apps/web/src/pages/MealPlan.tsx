import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, RefreshCw, UtensilsCrossed } from 'lucide-react';
import { api } from '../lib/api';
import { Loader } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';

/**
 * The day's plate.
 *
 * Deliberately shows its working: every meal carries the reason it was chosen and
 * the day carries notes about where it lands against the targets. That transparency
 * is the product — a plan you can argue with is a plan you can trust.
 */

type Bi = { en: string; ar: string };

type Meal = {
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  reason: Bi;
  label: Bi;
  recipe: { id: string; title: string; titleAr: string | null; coverImage: string | null; prepTimeMin: number | null; cuisine: string | null };
};

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;
const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;

const SLOT_ICON: Record<Meal['slot'], string> = {
  breakfast: '🍳',
  lunch: '🥘',
  dinner: '🌙',
  snack: '🫘',
};

export default function MealPlan() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language.startsWith('ar');
  const pick = (b?: Bi) => (b ? (isAr ? b.ar : b.en) : '');
  const [swapping, setSwapping] = useState<Meal['slot'] | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['meal-plan'], queryFn: () => api.get('/api/meals/plan') });

  const logMeal = useMutation({
    mutationFn: (m: Meal) => api.post('/api/meals/log', { recipeId: m.recipe.id, slot: m.slot, servings: m.servings }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plan'] });
      qc.invalidateQueries({ queryKey: ['tracker-day'] });
    },
  });

  if (isLoading) return <Loader />;

  const meals: Meal[] = data?.meals ?? [];
  const targets = data?.targets ?? {};
  const totals = data?.totals ?? { calories: 0, protein: 0 };
  const eaten: string[] = data?.logged?.slots ?? [];

  return (
    <div className="relative min-h-screen pb-16">
      <AmbientBg tone="warm" />
      <TopBar title={t('meals.title')} color="bg-gradient-to-b from-brand-orange to-orange-600" textColor="text-white" />

      {/* The day at a glance — target vs what this plan actually delivers. */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="mx-4 rounded-2xl bg-white p-5 shadow-sm"
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('meals.todayTarget')}</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-3xl font-extrabold" dir="ltr">
              {totals.calories}
              <span className="text-base font-semibold text-gray-400"> / {targets.calories} kcal</span>
            </p>
          </div>
          <div className="shrink-0 text-end text-xs text-gray-500" dir="ltr">
            <p className="font-bold text-gray-700">
              {totals.protein} / {targets.protein} g
            </p>
            <p>{t('meals.protein')}</p>
          </div>
        </div>
      </motion.div>

      {data?.empty && (
        <p className="mx-4 mt-4 rounded-2xl bg-white p-5 text-center text-sm text-gray-500 shadow-sm">
          {pick(data?.notes?.[0])}
        </p>
      )}

      <div className="mt-4 space-y-3 px-4">
        {meals.map((m, i) => {
          const done = eaten.includes(m.slot);
          return (
            <motion.div
              key={m.slot}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: Math.min(i, 5) * 0.06 }}
              className="overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
                <span className="text-base">{SLOT_ICON[m.slot]}</span>
                <span className="flex-1 text-[13px] font-bold uppercase tracking-wide text-gray-500">
                  {pick(m.label)}
                </span>
                <span className="text-xs font-bold text-gray-400" dir="ltr">
                  {m.calories} kcal · {m.protein}g
                </span>
              </div>

              <Link to={`/recipe/${m.recipe.id}`} className="flex items-start gap-3 p-4">
                {m.recipe.coverImage ? (
                  <img
                    src={m.recipe.coverImage}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-brand-orange">
                    <UtensilsCrossed size={22} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-bold leading-snug">
                    {m.recipe.title}
                    {m.servings > 1 && <span className="text-gray-400"> ×{m.servings}</span>}
                  </span>
                  {m.recipe.cuisine === 'egyptian' && (
                    <span className="mt-1 inline-block rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
                      {t('meals.egyptian')}
                    </span>
                  )}
                  <span className="mt-1 block text-[12px] leading-relaxed text-gray-500">{pick(m.reason)}</span>
                </span>
              </Link>

              <div className="flex gap-2 border-t border-gray-100 px-4 py-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={tapSpring}
                  onClick={() => logMeal.mutate(m)}
                  disabled={done || logMeal.isPending}
                  className={`btn-pill flex min-h-[38px] flex-1 items-center justify-center gap-1.5 py-2 text-sm ${
                    done ? 'bg-emerald-50 font-semibold text-brand-green' : 'btn-primary'
                  }`}
                >
                  <Check size={15} /> {done ? t('meals.logged') : t('meals.ateThis')}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={tapSpring}
                  onClick={() => setSwapping(m.slot)}
                  className="btn-pill flex min-h-[38px] items-center justify-center gap-1.5 border border-gray-200 px-4 py-2 text-sm font-semibold"
                >
                  <RefreshCw size={15} /> {t('meals.swap')}
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Why the day looks like this. */}
      {(data?.notes ?? []).length > 0 && !data?.empty && (
        <div className="mx-4 mt-4 space-y-2 rounded-2xl border border-gray-200 bg-white/70 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            <Info size={13} /> {t('meals.whyThis')}
          </p>
          {(data?.notes ?? []).map((n: Bi, i: number) => (
            <p key={i} className="text-[12.5px] leading-relaxed text-gray-600">
              {pick(n)}
            </p>
          ))}
        </div>
      )}

      {/* The one thing a rule engine cannot do: look at your bloodwork. ElCoach
          charges for this; we hand you the person and take nothing. */}
      {!data?.empty && (
        <Link
          to="/coaches-community?specialty=nutrition"
          className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand-blue">
            <UtensilsCrossed size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{t('meals.askNutritionist')}</span>
            <span className="block text-xs leading-relaxed text-gray-400">{t('meals.askNutritionistSub')}</span>
          </span>
        </Link>
      )}

      <AnimatePresence>
        {swapping && (
          <SwapSheet
            slot={swapping}
            currentId={meals.find((m) => m.slot === swapping)?.recipe.id ?? ''}
            onClose={() => setSwapping(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** Alternatives for one slot, ranked by how well they fit the same numbers. */
function SwapSheet({ slot, currentId, onClose }: { slot: string; currentId: string; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language.startsWith('ar');

  const { data, isLoading } = useQuery({
    queryKey: ['meal-swaps', slot],
    queryFn: () => api.get(`/api/meals/swaps?slot=${slot}&exclude=${currentId}`),
  });

  const log = useMutation({
    mutationFn: (recipeId: string) => api.post('/api/meals/log', { recipeId, slot, servings: 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker-day'] });
      qc.invalidateQueries({ queryKey: ['meal-plan'] });
      onClose();
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="mt-auto flex max-h-[80dvh] min-h-0 flex-col rounded-t-3xl bg-white"
      >
        <div className="shrink-0 px-5 pb-2 pt-4">
          <p className="font-bold">{t('meals.swapTitle')}</p>
          <p className="text-xs text-gray-400">{t('meals.swapSub')}</p>
        </div>
        <div
          className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          {isLoading && <p className="py-8 text-center text-sm text-gray-400">…</p>}
          {(data?.options ?? []).map((r: any) => (
            <button
              key={r.id}
              onClick={() => log.mutate(r.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 text-start"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{r.title}</span>
                <span className="block text-[11px] text-gray-400" dir="ltr">
                  {r.calories} kcal · P{Math.round(r.protein ?? 0)}
                </span>
              </span>
              <Check size={16} className="shrink-0 text-gray-300" />
            </button>
          ))}
          {!isLoading && (data?.options ?? []).length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">{t('meals.noSwaps')}</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
