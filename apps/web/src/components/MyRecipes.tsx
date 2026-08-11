import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChefHat, Minus, Plus, Search, Trash2, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

/**
 * "My recipes": compose a dish from the food table once, log it forever with
 * one tap. The server recomputes macros from the ingredients — the numbers the
 * user sees while building are the numbers that get logged.
 */

type Item = { foodId: string; portions: number; name: string; nameAr?: string };
type Rec = { id: string; name: string; servings: number; items: Item[]; calories: number; protein: number; carbs: number; fat: number };
type Food = { id: string; name: string; portion: string; calories: number; protein: number; carbs: number; fat: number };

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export default function MyRecipes({ onClose, date }: { onClose: () => void; date?: string }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const ar = i18n.language.startsWith('ar');
  const [building, setBuilding] = useState(false);

  const { data } = useQuery({ queryKey: ['my-recipes'], queryFn: () => api.get('/api/meals/my-recipes') });
  const recipes: Rec[] = data?.recipes ?? [];

  const log = useMutation({
    mutationFn: ({ id, slot }: { id: string; slot: string }) =>
      api.post(`/api/meals/my-recipes/${id}/log`, { servings: 1, mealType: slot, ...(date ? { date } : {}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker-day'] });
      qc.invalidateQueries({ queryKey: ['quests'] });
      toast(t('myrec.logged'), 'success');
      onClose();
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/api/meals/my-recipes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-recipes'] }),
  });

  if (building) return <RecipeBuilder onDone={() => setBuilding(false)} />;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <button
        onClick={() => setBuilding(true)}
        className="btn-pill btn-primary flex min-h-[42px] w-full items-center justify-center gap-2"
      >
        <ChefHat size={16} /> {t('myrec.new')}
      </button>

      <div className="mt-3 space-y-2">
        {recipes.map((r) => (
          <RecipeRow key={r.id} r={r} ar={ar} onLog={(slot) => log.mutate({ id: r.id, slot })} onDel={() => del.mutate(r.id)} />
        ))}
        {recipes.length === 0 && <p className="py-8 text-center text-sm text-gray-400">{t('myrec.empty')}</p>}
      </div>
    </div>
  );
}

function RecipeRow({ r, ar, onLog, onDel }: { r: Rec; ar: boolean; onLog: (slot: string) => void; onDel: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const per = (v: number) => Math.round(v / r.servings);
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 text-start">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{r.name}</span>
          <span className="block text-[11px] text-gray-400">
            {per(r.calories)} kcal · P{per(r.protein)} C{per(r.carbs)} F{per(r.fat)} {t('myrec.perServing')}
          </span>
        </span>
        <span className="shrink-0 text-[11px] text-gray-400">{r.items.map((i) => (ar && i.nameAr ? i.nameAr : i.name)).slice(0, 2).join('، ')}{r.items.length > 2 ? '…' : ''}</span>
      </button>
      {open && (
        <div className="mt-2.5 border-t border-gray-100 pt-2.5">
          <div className="flex gap-1.5">
            {SLOTS.map((s) => (
              <button key={s} onClick={() => onLog(s)} className="min-h-9 flex-1 rounded-full bg-emerald-50 px-1 text-[11px] font-bold text-brand-green">
                {t(`meals.${s}`)}
              </button>
            ))}
            <button onClick={onDel} aria-label={t('common.delete', { defaultValue: 'Delete' })} className="shrink-0 rounded-full p-2 text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-gray-400">{t('myrec.tapSlot')}</p>
        </div>
      )}
    </div>
  );
}

function RecipeBuilder({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [servings, setServings] = useState(1);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<(Food & { portions: number })[]>([]);

  const { data } = useQuery({
    queryKey: ['foods', q],
    queryFn: () => api.get(`/api/meals/foods?q=${encodeURIComponent(q)}`),
  });
  const foods: Food[] = (data?.foods ?? []).filter((f: Food) => !items.some((i) => i.id === f.id));

  const total = (k: 'calories' | 'protein' | 'carbs' | 'fat') => items.reduce((s, i) => s + i[k] * i.portions, 0);

  const save = useMutation({
    mutationFn: () =>
      api.post('/api/meals/my-recipes', {
        name: name.trim(),
        servings,
        items: items.map((i) => ({ foodId: i.id, portions: i.portions })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-recipes'] });
      toast(t('myrec.saved'), 'success');
      onDone();
    },
    onError: () => toast(t('myrec.failed'), 'error'),
  });

  const bump = (id: string, d: number) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, portions: Math.max(0.25, Math.min(20, i.portions + d)) } : i)).filter((i) => i.portions > 0));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <input
          className="w-full rounded-xl bg-gray-100 px-3 py-2.5 text-sm outline-none"
          placeholder={t('myrec.namePh')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="mt-2 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
          <span className="text-xs font-bold text-gray-500">{t('myrec.servings')}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="-" className="rounded-full border border-gray-200 p-1.5"><Minus size={13} /></button>
            <span className="w-6 text-center text-sm font-bold">{servings}</span>
            <button onClick={() => setServings((s) => Math.min(20, s + 1))} aria-label="+" className="rounded-full border border-gray-200 p-1.5"><Plus size={13} /></button>
          </div>
        </div>

        {/* Chosen ingredients with portion steppers */}
        {items.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{i.name}</span>
                <span className="shrink-0 text-[11px] text-gray-500">{Math.round(i.calories * i.portions)} kcal</span>
                <button onClick={() => bump(i.id, -0.5)} aria-label="-" className="shrink-0 rounded-full border border-gray-200 bg-white p-1"><Minus size={12} /></button>
                <span className="w-8 shrink-0 text-center text-xs font-bold" dir="ltr">×{i.portions}</span>
                <button onClick={() => bump(i.id, 0.5)} aria-label="+" className="shrink-0 rounded-full border border-gray-200 bg-white p-1"><Plus size={12} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Food search to add more */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5">
          <Search size={15} className="shrink-0 text-gray-400" />
          <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder={t('myrec.addFood')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-1.5 space-y-1">
          {foods.slice(0, 8).map((f) => (
            <button
              key={f.id}
              onClick={() => setItems((prev) => [...prev, { ...f, portions: 1 }])}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start active:bg-gray-50"
            >
              <Plus size={14} className="shrink-0 text-brand-green" />
              <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
              <span className="shrink-0 text-[11px] text-gray-400">{f.portion} · {f.calories} kcal</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live totals + save */}
      <div className="shrink-0 border-t border-gray-100 bg-white p-4">
        <p className="text-center text-xs text-gray-500">
          {t('myrec.total')}: <b>{Math.round(total('calories'))}</b> kcal · P{Math.round(total('protein'))} C{Math.round(total('carbs'))} F{Math.round(total('fat'))}
          {servings > 1 && (
            <> · {t('myrec.perServing')}: <b>{Math.round(total('calories') / servings)}</b> kcal</>
          )}
        </p>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => save.mutate()}
          disabled={save.isPending || !name.trim() || items.length === 0}
          className="btn-pill btn-primary mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          {t('myrec.save')} <ArrowRight size={15} className="rtl:rotate-180" />
        </motion.button>
      </div>
    </div>
  );
}
