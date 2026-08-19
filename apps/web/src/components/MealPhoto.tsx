import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, Minus, Plus, X } from 'lucide-react';
import { api } from '../lib/api';
import Sheet from './Sheet';

/**
 * Photograph a plate, get an estimate, confirm what to log.
 *
 * Two decisions worth knowing about.
 *
 * The photo is downscaled in the browser before it ever leaves the phone. A modern
 * camera produces 4–8 MB; the model only needs about 1024px on the long edge, and
 * sending the original would blow past the API's 2 MB body limit and cost several
 * times more per call for no extra accuracy.
 *
 * Nothing is logged until the user says so. An estimate from a photo is a guess with
 * a picture attached — plausible enough to be believed and wrong often enough to
 * matter — so every item is editable and each has to be confirmed.
 */

type Item = {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: 'high' | 'medium' | 'low';
};

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;

/** Downscale to a JPEG data URL. Long edge 1024, quality 0.7 — roughly 120–250 KB. */
function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 1024;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no canvas'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('bad image'));
    };
    img.src = url;
  });
}

export default function MealPhoto({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState('');
  const [items, setItems] = useState<Item[] | null>(null);
  const [message, setMessage] = useState('');
  const [slot, setSlot] = useState<(typeof SLOTS)[number]>('lunch');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setErr('');
    setItems(null);
    setMessage('');
    setBusy(true);
    try {
      const image = await downscale(file);
      setPreview(image);
      const r = await api.post('/api/ai/meal-photo', { image });
      setItems(r.items ?? []);
      setMessage(r.message ?? '');
    } catch (e) {
      // Raw server errors are English (and often technical) — log them for
      // debugging but always show the localized message to the user.
      console.error('meal-photo estimate failed:', e);
      setErr(t('photo.failed'));
    } finally {
      setBusy(false);
    }
  };

  const logAll = useMutation({
    mutationFn: async () => {
      for (const it of items ?? []) {
        await api.post('/api/tracker/calories', {
          name: it.name,
          mealType: slot,
          calories: it.calories,
          protein: it.protein,
          carbs: it.carbs,
          fat: it.fat,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker-day'] });
      qc.invalidateQueries({ queryKey: ['quests'] });
      onClose();
    },
  });

  const bump = (i: number, field: keyof Item, by: number) =>
    setItems((prev) =>
      (prev ?? []).map((it, n) =>
        n === i ? { ...it, [field]: Math.max(0, (it[field] as number) + by) } : it,
      ),
    );

  const total = (items ?? []).reduce((n, i) => n + i.calories, 0);

  return (
    <Sheet open onClose={onClose} label={t('photo.title')}>
      <div className="flex max-h-[80dvh] min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3">
          <p className="font-bold">{t('photo.title')}</p>
          <button onClick={onClose} aria-label={t('common.close')} className="-me-1 p-1 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {/* capture=environment opens the rear camera directly on a phone, which is
              the whole point — a file browser here would kill the interaction. */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />

          {preview ? (
            <img src={preview} alt="" className="mb-3 h-40 w-full rounded-2xl object-cover" />
          ) : null}

          {!items && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              transition={tapSpring}
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 disabled:opacity-60"
            >
              <Camera size={26} />
              <span className="text-sm font-semibold">{busy ? t('photo.reading') : t('photo.take')}</span>
              <span className="px-6 text-center text-[11px] leading-relaxed">{t('photo.hint')}</span>
            </motion.button>
          )}

          {err && <p className="mt-3 text-center text-sm text-red-500">{err}</p>}
          {message && <p className="mt-3 text-center text-xs leading-relaxed text-gray-500">{message}</p>}

          {items && items.length > 0 && (
            <div className="mt-3 space-y-2">
              {items.map((it, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{it.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {it.portion}
                        <span
                          className={`ms-2 font-bold ${
                            it.confidence === 'high'
                              ? 'text-brand-green'
                              : it.confidence === 'medium'
                                ? 'text-amber-600'
                                : 'text-red-500'
                          }`}
                        >
                          {t(`photo.${it.confidence}`)}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => setItems((p) => (p ?? []).filter((_, n) => n !== i))}
                      aria-label={t('photo.remove')}
                      className="shrink-0 p-1 text-gray-300"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => bump(i, 'calories', -25)}
                      aria-label={t('food.less')}
                      className="rounded-full border border-gray-200 p-1.5"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-20 text-center text-sm font-bold" dir="ltr">
                      {it.calories} kcal
                    </span>
                    <button
                      onClick={() => bump(i, 'calories', 25)}
                      aria-label={t('food.more')}
                      className="rounded-full border border-gray-200 p-1.5"
                    >
                      <Plus size={13} />
                    </button>
                    <span className="ms-auto text-[11px] text-gray-400" dir="ltr">
                      P{it.protein} C{it.carbs} F{it.fat}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {items && items.length > 0 && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="shrink-0 space-y-3 border-t border-gray-100 p-4"
            >
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
                onClick={() => logAll.mutate()}
                disabled={logAll.isPending}
                className="btn-pill btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60"
              >
                <Check size={16} /> {t('photo.logAll', { count: total })}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sheet>
  );
}
