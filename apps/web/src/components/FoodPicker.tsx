import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Search, X } from 'lucide-react';
import { api } from '../lib/api';

/**
 * Pick what you ate from the Egyptian food table.
 *
 * The tracker previously had exactly one way in — describe your food and let an AI
 * guess the numbers — which meant that with the key unset it had no way in at all.
 * This is the path that always works, offline-friendly and with figures that don't
 * change between one guess and the next.
 */

type Food = {
  id: string;
  name: string;
  portion: string;
  grams: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
};

const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export default function FoodPicker({ onClose, date }: { onClose: () => void; date?: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);
  const [portions, setPortions] = useState(1);
  const [slot, setSlot] = useState<(typeof SLOTS)[number]>('snack');

  const { data, isLoading } = useQuery({
    queryKey: ['foods', q],
    queryFn: () => api.get(`/api/meals/foods?q=${encodeURIComponent(q)}`),
  });

  const log = useMutation({
    mutationFn: () =>
      api.post('/api/meals/foods/log', { foodId: picked!.id, portions, mealType: slot, ...(date ? { date } : {}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker-day'] });
      onClose();
    },
  });

  const foods: Food[] = data?.foods ?? [];
  // The API localises and strips the *Ar keys before it answers, so `name` and
  // `portion` already hold Arabic when the request carried x-lang: ar. Reading
  // `nameAr` on the client gives undefined in exactly the language we care about.
  const label = (f: Food) => f.name;
  const unit = (f: Food) => f.portion;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="mt-auto flex max-h-[85dvh] min-h-0 flex-col rounded-t-3xl bg-white"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-4 py-3">
          <Search size={18} className="shrink-0 text-gray-400" />
          <input
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder={t('food.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button onClick={onClose} aria-label={t('common.close')} className="-me-1 shrink-0 p-1 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {isLoading && <p className="py-8 text-center text-sm text-gray-400">…</p>}
          {!isLoading && foods.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">{t('food.noMatch')}</p>
          )}
          <div className="space-y-1.5">
            {foods.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setPicked(f);
                  setPortions(1);
                }}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition ${
                  picked?.id === f.id ? 'border-brand-green bg-emerald-50' : 'border-gray-100 bg-white'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{label(f)}</span>
                  <span className="block text-[11px] text-gray-400">
                    {unit(f)}
                    {f.grams ? ` · ${f.grams}g` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-end">
                  <span className="block text-sm font-bold">{f.calories}</span>
                  <span className="block text-[10px] text-gray-400">kcal</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {picked && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={tapSpring}
              className="shrink-0 space-y-3 border-t border-gray-100 bg-white p-4"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{label(picked)}</p>
                  <p className="text-xs text-gray-500">
                    {Math.round(picked.calories * portions)} kcal · P{Math.round(picked.protein * portions)} C
                    {Math.round(picked.carbs * portions)} F{Math.round(picked.fat * portions)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    transition={tapSpring}
                    onClick={() => setPortions((p) => Math.max(0.5, p - 0.5))}
                    aria-label={t('food.less')}
                    className="rounded-full border border-gray-200 p-2"
                  >
                    <Minus size={15} />
                  </motion.button>
                  <span className="w-10 text-center text-sm font-bold" dir="ltr">
                    ×{portions}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    transition={tapSpring}
                    onClick={() => setPortions((p) => Math.min(6, p + 0.5))}
                    aria-label={t('food.more')}
                    className="rounded-full border border-gray-200 p-2"
                  >
                    <Plus size={15} />
                  </motion.button>
                </div>
              </div>

              <div className="flex gap-1.5">
                {SLOTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlot(s)}
                    className={`min-h-9 flex-1 rounded-full px-2 text-[12px] font-bold transition ${
                      slot === s ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-500'
                    }`}
                  >
                    {t(`meals.${s}`)}
                  </button>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                transition={tapSpring}
                onClick={() => log.mutate()}
                disabled={log.isPending}
                className="btn-pill btn-primary w-full disabled:opacity-60"
              >
                {t('food.add')}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
