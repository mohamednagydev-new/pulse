import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Play, RefreshCw, X } from 'lucide-react';
import { api } from '../lib/api';
import { tapFeedback } from '../lib/haptics';
import HumanMove, { patternFor } from './HumanMove';

interface Roll {
  group: { id: string; name: string; nameAr?: string | null } | null;
  exercises: { id: string; name: string; nameAr?: string | null; sets: number; reps: string }[];
}

/** "Surprise me" — for the days when choosing the workout is the thing stopping you. */
export default function WorkoutRoulette() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAr = i18n.language.startsWith('ar');
  const [open, setOpen] = useState(false);
  const [roll, setRoll] = useState<Roll | null>(null);
  const [rolling, setRolling] = useState(false);

  const draw = async () => {
    tapFeedback();
    setRolling(true);
    setOpen(true);
    try {
      const res: Roll = await api.get('/api/daily/roulette');
      // Hold the spinner briefly so the reveal reads as a draw, not a fetch.
      setTimeout(() => { setRoll(res); setRolling(false); }, 650);
    } catch {
      setRolling(false);
      setOpen(false);
    }
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={draw}
        className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-green to-emerald-600 px-4 py-3.5 text-start text-white shadow-sm"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <Dices size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{t('fun.rouletteTitle')}</span>
          <span className="block truncate text-xs text-white/70">{t('fun.rouletteSub')}</span>
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-extrabold">{t('fun.rouletteTitle')}</h3>
                <button onClick={() => setOpen(false)} aria-label={t('common.close')} className="rounded-full p-1 text-gray-400 active:scale-90">
                  <X size={18} />
                </button>
              </div>

              {rolling || !roll ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center gap-3">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}>
                    <Dices size={44} className="text-orange-500" />
                  </motion.div>
                  <p className="text-sm font-semibold text-gray-400">{t('fun.rolling')}</p>
                </div>
              ) : !roll.group ? (
                <p className="py-10 text-center text-sm text-gray-400">{t('fun.rouletteEmpty')}</p>
              ) : (
                <>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-orange-500">{t('fun.todaysDraw')}</p>
                  <p className="mt-0.5 text-2xl font-extrabold">{(isAr && roll.group.nameAr) || roll.group.name}</p>

                  <ul className="mt-3 space-y-2">
                    {roll.exercises.map((e, i) => (
                      <motion.li
                        key={e.id}
                        initial={{ opacity: 0, x: isAr ? 12 : -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600">
                          {i + 1}
                        </span>
                        <span className="h-10 w-10 shrink-0 text-gray-400">
                          <HumanMove pattern={patternFor(e.name)} className="h-10 w-10" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{(isAr && e.nameAr) || e.name}</span>
                        <span className="shrink-0 text-[11px] font-bold tabular-nums text-gray-400">{e.sets}×{e.reps}</span>
                      </motion.li>
                    ))}
                  </ul>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={draw}
                      className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-gray-100 px-4 text-sm font-bold text-gray-600 active:scale-95"
                    >
                      <RefreshCw size={15} /> {t('fun.reroll')}
                    </button>
                    <button
                      onClick={() => { setOpen(false); navigate(`/session/${roll.group!.id}`); }}
                      className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white active:scale-95"
                    >
                      <Play size={15} /> {t('fun.startThis')}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
