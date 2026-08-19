import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Mic, Minus, Plus, ScanBarcode, Search, X } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { listenOnce, voiceSupported } from '../lib/voiceInput';
import Sheet from './Sheet';
import MyRecipes from './MyRecipes';
import BarcodeScan from './BarcodeScan';
import SpotlightBubble from './SpotlightBubble';
import { bump, markSpot, spotSeen } from '../lib/spotlight';

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
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'search' | 'recipes' | 'scan'>('search');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);
  const [portions, setPortions] = useState(1);
  const [slot, setSlot] = useState<(typeof SLOTS)[number]>('snack');
  const [listening, setListening] = useState(false);
  const voice = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => () => voice.current?.cancel(), []);

  // Barcode spotlight: third time in the picker without ever opening the scan
  // tab — the user demonstrably logs food but hasn't found the scanner.
  const [scanSpot, setScanSpot] = useState(false);
  useEffect(() => {
    if (spotSeen('spot-scan') || spotSeen('scan-used')) return;
    if (bump('picker-opens') >= 3) setScanSpot(true);
  }, []);

  // Dialect voice logging: the transcript drops straight into the search box,
  // and the API's Arabic normalisation does the matching ("كشري" → koshari).
  const speak = async () => {
    if (listening) {
      voice.current?.cancel();
      return;
    }
    setListening(true);
    try {
      const session = listenOnce(i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US', (interim) => setQ(interim));
      voice.current = session;
      const text = await session.promise;
      if (text) setQ(text);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'not-allowed' || code === 'service-not-allowed') toast(t('food.micDenied'), 'error');
      // 'no-speech' and cancels are silent — nothing to scold the user about.
    } finally {
      voice.current = null;
      setListening(false);
    }
  };

  const [category, setCategory] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['foods', q, category],
    queryFn: () => api.get(`/api/meals/foods?q=${encodeURIComponent(q)}${category ? `&category=${category}` : ''}`),
  });

  const log = useMutation({
    mutationFn: () =>
      api.post('/api/meals/foods/log', { foodId: picked!.id, portions, mealType: slot, ...(date ? { date } : {}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker-day'] });
      qc.invalidateQueries({ queryKey: ['quests'] });
      onClose();
    },
  });

  const foods: Food[] = data?.foods ?? [];
  // The API localises and strips the *Ar keys before it answers, so `name` and
  // `portion` already hold Arabic when the request carried x-lang: ar. Reading
  // `nameAr` on the client gives undefined in exactly the language we care about.
  const label = (f: Food) => f.name;
  const unit = (f: Food) => f.portion;

  // Keyboard-aware height: dvh ignores the keyboard on iOS (and on Android
  // without the interactive-widget meta), so the results list sat behind the
  // keys. visualViewport reports the space actually visible.
  const [vvh, setVvh] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setVvh(Math.round(vv.height));
    update();
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);

  return (
    <Sheet open onClose={onClose} label={t('food.search')}>
      <div className="flex min-h-0 flex-col" style={{ maxHeight: vvh ? `${Math.round(vvh * 0.82)}px` : '80dvh' }}>
        {/* Three ways in: search the table, my saved recipes, or a barcode. */}
        <div className="flex shrink-0 gap-1.5 px-4 pt-3">
          {([
            { key: 'search' as const, icon: Search, label: t('food.tabSearch') },
            { key: 'recipes' as const, icon: ChefHat, label: t('food.tabRecipes') },
            { key: 'scan' as const, icon: ScanBarcode, label: t('food.tabScan') },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => {
                setMode(key);
                if (key === 'scan') { markSpot('scan-used'); setScanSpot(false); }
              }}
              className={`flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-bold transition ${
                mode === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
              } ${key === 'scan' && scanSpot ? 'ring-2 ring-violet-500' : ''}`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {scanSpot && !spotSeen('spot-scan') && (
          <SpotlightBubble spotKey="spot-scan" text={t('spot.scan')} onDismiss={() => setScanSpot(false)} className="mx-4 mt-2" />
        )}

        {mode === 'recipes' && <MyRecipes onClose={onClose} date={date} />}
        {mode === 'scan' && <BarcodeScan onClose={onClose} date={date} />}

        {mode === 'search' && (
        <>
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-4 py-3">
          <Search size={18} className="shrink-0 text-gray-400" />
          <input
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder={listening ? t('food.listening') : t('food.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {voiceSupported() && (
            <button
              onClick={speak}
              aria-label={t('food.speak')}
              aria-pressed={listening}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-90 ${
                listening ? 'bg-red-500 text-white' : 'bg-emerald-50 text-brand-green'
              }`}
            >
              <Mic size={16} className={listening ? 'animate-pulse' : ''} />
            </button>
          )}
          <button onClick={onClose} aria-label={t('common.close')} className="-me-1 shrink-0 p-1 text-gray-400">
            <X size={20} />
          </button>
        </div>

        {/* Category chips: browse the whole table without guessing search words. */}
        <div className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto px-4 py-2">
          {([
            ['', i18n.language.startsWith('ar') ? 'الشائع' : 'Common'],
            ['staple', i18n.language.startsWith('ar') ? 'نشويات' : 'Staples'],
            ['protein', i18n.language.startsWith('ar') ? 'بروتين' : 'Protein'],
            ['dairy', i18n.language.startsWith('ar') ? 'ألبان' : 'Dairy'],
            ['veg', i18n.language.startsWith('ar') ? 'خضار' : 'Veg'],
            ['fruit', i18n.language.startsWith('ar') ? 'فاكهة' : 'Fruit'],
            ['street', i18n.language.startsWith('ar') ? 'أكل شارع' : 'Street'],
            ['drink', i18n.language.startsWith('ar') ? 'مشروبات' : 'Drinks'],
            ['sweet', i18n.language.startsWith('ar') ? 'حلويات' : 'Sweets'],
            ['snack', i18n.language.startsWith('ar') ? 'سناكس' : 'Snacks'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`min-h-[30px] shrink-0 rounded-full px-3 text-[11px] font-bold ${
                category === key ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
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
        </>
        )}
      </div>
    </Sheet>
  );
}
