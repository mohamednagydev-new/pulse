import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Copy, Info, MessageCircle, RefreshCw, SlidersHorizontal, UtensilsCrossed, X } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { ErrorMsg, Loader } from '../components/ui';
import Sheet from '../components/Sheet';
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
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [groceryOpen, setGroceryOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['meal-plan'], queryFn: () => api.get('/api/meals/plan') });

  const logMeal = useMutation({
    mutationFn: (m: Meal) => api.post('/api/meals/log', { recipeId: m.recipe.id, slot: m.slot, servings: m.servings }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plan'] });
      qc.invalidateQueries({ queryKey: ['tracker-day'] });
      qc.invalidateQueries({ queryKey: ['quests'] });
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
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('meals.todayTarget')}</p>
          <div className="flex items-center gap-1.5">
            {/* Turn the plan into a market list — the plan already knows the ingredients. */}
            <button
              onClick={() => setGroceryOpen(true)}
              className="flex min-h-9 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-xs font-bold text-gray-600 transition active:scale-95"
            >
              🛒 {isAr ? 'قايمة المشتريات' : 'Shopping list'}
            </button>
            {/* Diet preferences were PATCH-able for months with no UI — the planner
                could never be told about vegetarians or food dislikes. */}
            <button
              onClick={() => setPrefsOpen(true)}
              className="flex min-h-9 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-xs font-bold text-gray-600 transition active:scale-95"
            >
              <SlidersHorizontal size={13} /> {t('meals.prefs')}
            </button>
          </div>
        </div>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-3xl font-extrabold" dir="ltr">
              {totals.calories}
              <span className="text-base font-semibold text-gray-400"> / {targets.calories} kcal</span>
            </p>
            {/* fit% was computed server-side and never shown; training-day chip
                makes the +200 kcal boost legible instead of mysterious. */}
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
              {data?.trainingDay && <span className="rounded-full bg-orange-100 px-2 py-0.5 font-bold text-orange-600">💪 {t('meals.trainingDay')}</span>}
              {data?.fit?.calories ? <span>{t('meals.fitLine', { pct: data.fit.calories })}</span> : null}
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
          to="/nutritionist"
          className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm transition active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg">🥗</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{t('meals.askNutritionist')}</span>
            <span className="block text-xs leading-relaxed text-gray-400">{t('meals.askNutritionistSub')}</span>
          </span>
        </Link>
      )}

      {swapping && (
        <SwapSheet
          slot={swapping}
          currentId={meals.find((m) => m.slot === swapping)?.recipe.id ?? ''}
          onClose={() => setSwapping(null)}
        />
      )}

      <PrefsSheet open={prefsOpen} onClose={() => setPrefsOpen(false)} />
      <GrocerySheet open={groceryOpen} onClose={() => setGroceryOpen(false)} />
    </div>
  );
}

/* ---------- Grocery list ---------- */

type GroceryItem = { text: string; count: number };
type GroceryRecipe = { id: string; title: string; servings: number };

/** The plan turned into a market list: pick a horizon, tick things off in the
 *  aisle, or ship the whole list to whoever is doing the shopping. */
function GrocerySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [days, setDays] = useState(3);
  // Ticks are scratch state for one trip — deliberately not persisted, reset on close.
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) setChecked({});
  }, [open]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['grocery', days],
    queryFn: () => api.get(`/api/meals/grocery?days=${days}`),
    enabled: open,
  });

  const items: GroceryItem[] = data?.items ?? [];
  const recipes: GroceryRecipe[] = data?.recipes ?? [];

  const dayLabel = (n: number) => (isAr ? (n === 1 ? 'يوم' : `${n} أيام`) : n === 1 ? '1 day' : `${n} days`);

  /** "PULSE — Shopping list (3 days)" then one "• item ×n" per line. */
  const plainText = () => {
    const title = isAr ? `PULSE — قايمة المشتريات (${dayLabel(days)})` : `PULSE — Shopping list (${dayLabel(days)})`;
    return [title, ...items.map((it) => `• ${it.text}${it.count > 1 ? ` ×${it.count}` : ''}`)].join('\n');
  };

  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(plainText());
      toast(isAr ? 'اتنسخت القايمة' : 'List copied', 'success');
    } catch {
      toast(isAr ? 'النسخ ما نفعش' : 'Copy failed', 'error');
    }
  };

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(plainText())}`, '_blank', 'noopener');

  return (
    <Sheet open={open} onClose={onClose} label={isAr ? 'قايمة المشتريات' : 'Shopping list'}>
      <div className="flex max-h-[80dvh] min-h-0 flex-col">
        <div className="shrink-0 px-5 pb-2 pt-3">
          <h2 className="text-lg font-extrabold">🛒 {isAr ? 'قايمة المشتريات' : 'Shopping list'}</h2>

          <div className="mt-3 flex gap-2">
            {[1, 3, 7].map((n) => (
              <button
                key={n}
                onClick={() => setDays(n)}
                className={`min-h-9 flex-1 rounded-full text-xs font-bold transition active:scale-95 ${
                  days === n ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {dayLabel(n)}
              </button>
            ))}
          </div>

          {recipes.length > 0 && (
            <p className="mt-2.5 text-xs leading-relaxed text-gray-400">
              {isAr ? 'من: ' : 'From: '}
              {recipes.map((r) => (r.servings > 1 ? `${r.title} ×${r.servings}` : r.title)).join(isAr ? '، ' : ', ')}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          {isLoading && <Loader />}
          {isError && <ErrorMsg onRetry={() => refetch()} />}
          {!isLoading && !isError && items.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">{isAr ? 'مفيش حاجة في القايمة' : 'Nothing on the list yet'}</p>
          )}
          {items.map((it) => {
            const done = !!checked[it.text];
            return (
              <button
                key={it.text}
                onClick={() => setChecked((c) => ({ ...c, [it.text]: !c[it.text] }))}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-start transition active:bg-gray-50"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    done ? 'border-brand-orange bg-brand-orange text-white' : 'border-gray-300'
                  }`}
                >
                  {done && <Check size={13} />}
                </span>
                <span className={`min-w-0 flex-1 text-sm ${done ? 'text-gray-300 line-through' : 'text-gray-700'}`}>
                  {it.text}
                  {it.count > 1 && <span className="text-gray-400"> ×{it.count}</span>}
                </span>
              </button>
            );
          })}
        </div>

        {items.length > 0 && (
          <div className="flex shrink-0 gap-2 border-t border-gray-100 p-4">
            <button
              onClick={copyList}
              className="btn-pill flex min-h-11 flex-1 items-center justify-center gap-1.5 border border-gray-200 text-sm font-bold transition active:scale-95"
            >
              <Copy size={15} /> {isAr ? 'انسخ' : 'Copy'}
            </button>
            <button
              onClick={shareWhatsApp}
              className="btn-pill flex min-h-11 flex-1 items-center justify-center gap-1.5 bg-[#25D366] text-sm font-bold text-white transition active:scale-95"
            >
              <MessageCircle size={15} /> {isAr ? 'واتساب' : 'WhatsApp'}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** avoidFoods is stored as a JSON string — tolerate corrupt/legacy values. */
function parseAvoidFoods(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Diet type + foods to avoid — the two dials the planner reads per user. */
function PrefsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [diet, setDiet] = useState<string | null>(null);
  const [avoid, setAvoid] = useState<string[] | null>(null);
  const [entry, setEntry] = useState('');

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me'), enabled: open });
  // Local state seeds from the profile once, then the user edits freely.
  const dietValue = diet ?? me?.dietPref ?? 'none';
  const avoidValue = avoid ?? parseAvoidFoods(me?.avoidFoods);

  const save = useMutation({
    mutationFn: () => api.patch('/api/meals/prefs', { dietPref: dietValue, avoidFoods: avoidValue }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plan'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      onClose();
    },
  });

  const addEntry = () => {
    const v = entry.trim();
    if (!v || avoidValue.length >= 12) return;
    if (!avoidValue.some((a) => a.toLowerCase() === v.toLowerCase())) setAvoid([...avoidValue, v]);
    setEntry('');
  };

  const DIETS = [
    { key: 'none', label: t('meals.dietNone') },
    { key: 'vegetarian', label: t('meals.dietVegetarian') },
    { key: 'vegan', label: t('meals.dietVegan') },
  ];

  return (
    <Sheet open={open} onClose={onClose} label={t('meals.prefsTitle')}>
      <div className="p-5">
        <h2 className="text-lg font-extrabold">{t('meals.prefsTitle')}</h2>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('meals.dietType')}</p>
        <div className="mt-2 flex gap-2">
          {DIETS.map((d) => (
            <button
              key={d.key}
              onClick={() => setDiet(d.key)}
              className={`min-h-10 flex-1 rounded-full text-sm font-bold transition active:scale-95 ${
                dietValue === d.key ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('meals.avoid')}</p>
        <div className="mt-2 flex gap-2">
          <input
            className="input-field flex-1"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEntry())}
            placeholder={t('meals.avoidPh')}
            maxLength={40}
          />
          <button
            onClick={addEntry}
            disabled={!entry.trim() || avoidValue.length >= 12}
            className="btn-pill btn-primary min-h-11 px-5 text-sm disabled:opacity-50"
          >
            {t('meals.add')}
          </button>
        </div>
        {avoidValue.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {avoidValue.map((a) => (
              <span key={a} className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-semibold text-brand-orange">
                {a}
                <button
                  onClick={() => setAvoid(avoidValue.filter((x) => x !== a))}
                  aria-label={`${t('common.close')} ${a}`}
                  className="rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="btn-pill btn-primary mt-6 w-full disabled:opacity-60"
        >
          {save.isPending ? t('common.loading') : t('common.save')}
        </motion.button>
      </div>
    </Sheet>
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
      qc.invalidateQueries({ queryKey: ['quests'] });
      qc.invalidateQueries({ queryKey: ['meal-plan'] });
      onClose();
    },
  });

  return (
    <Sheet open onClose={onClose} label={t('meals.swapTitle')}>
      <div className="flex max-h-[78dvh] min-h-0 flex-col">
        <div className="shrink-0 px-5 pb-2 pt-2">
          <p className="font-bold">{t('meals.swapTitle')}</p>
          <p className="text-xs text-gray-400">{t('meals.swapSub')}</p>
        </div>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
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
      </div>
    </Sheet>
  );
}
