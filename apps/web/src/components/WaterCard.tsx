import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { GlassWater, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { successFeedback, tapFeedback } from '../lib/haptics';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

interface WaterPayload {
  date: string;
  glasses: number;
  goal: number;
  week?: { date: string; glasses: number }[];
}

type WaterBody = { delta: number } | { set: number };

/** Compact water tracker — tap a glass to log up to it, or "+" to add one. */
export default function WaterCard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery<WaterPayload>({
    queryKey: ['water'],
    queryFn: () => api.get('/api/daily/water'),
    staleTime: 60_000,
  });

  const log = useMutation<any, Error, WaterBody, { prev?: WaterPayload }>({
    mutationFn: (body) => api.post('/api/daily/water', body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ['water'] });
      const prev = qc.getQueryData<WaterPayload>(['water']);
      if (prev) {
        const next = 'set' in body ? body.set : prev.glasses + body.delta;
        qc.setQueryData<WaterPayload>(['water'], { ...prev, glasses: Math.max(0, next) });
      }
      return { prev };
    },
    onError: (err, _body, ctx) => {
      if (ctx?.prev) qc.setQueryData(['water'], ctx.prev);
      toast(err?.message ?? 'Something went wrong', 'error');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['water'] });
      qc.invalidateQueries({ queryKey: ['quests'] });
    },
  });

  const glasses = data?.glasses ?? 0;
  const goal = Math.max(1, data?.goal ?? 8);
  const reached = glasses >= goal;

  // Personal ml target (35ml × bodyweight, clamped) — the flat 8-glass goal
  // told a 55kg and a 100kg user the same thing. Display-only guidance.
  const { data: me } = useQuery<any>({ queryKey: ['me'], queryFn: () => api.get('/api/me'), staleTime: 5 * 60_000 });
  const mlTarget = me?.weightKg ? Math.min(4000, Math.max(1500, Math.round((me.weightKg * 35) / 100) * 100)) : null;

  // Celebrate only on the transition into "goal reached".
  const wasReached = useRef<boolean | null>(null);
  useEffect(() => {
    if (!data) return;
    if (wasReached.current === false && reached) successFeedback();
    wasReached.current = reached;
  }, [data, reached]);

  // Render nothing until the first payload lands so the page doesn't jump.
  if (!data) return null;

  const tapGlass = (index: number) => {
    tapFeedback();
    // Tapping the last filled glass undoes it; anything else fills up to it.
    if (index + 1 === glasses) log.mutate({ delta: -1 });
    else log.mutate({ set: index + 1 });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={spring}
      className={`mx-4 mt-4 rounded-2xl p-4 shadow-sm transition-colors ${
        reached ? 'bg-sky-50 ring-1 ring-sky-200' : 'bg-white'
      }`}
    >
      {/* Separate node so the goal-reached pop doesn't fight the entrance animation. */}
      <motion.div animate={reached ? { scale: [1, 1.04, 1] } : { scale: 1 }} transition={{ duration: 0.45 }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <GlassWater size={18} className={reached ? 'text-sky-500' : 'text-orange-500'} />
          <h2 className="truncate text-base font-bold">{t('daily.water')}</h2>
        </div>
        <span className={`shrink-0 text-xs font-semibold tabular-nums ${reached ? 'text-sky-600' : 'text-gray-400'}`}>
          {t('daily.glasses', { n: glasses, goal })}
        </span>
      </div>
      {mlTarget && (
        <p className="mt-0.5 text-[11px] text-gray-400">
          {t('daily.mlTarget', { liters: (mlTarget / 1000).toFixed(1) })}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-1">
          {Array.from({ length: goal }).map((_, i) => {
            const filled = i < glasses;
            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => tapGlass(i)}
                whileTap={{ scale: 0.85 }}
                animate={filled ? { scale: 1 } : { scale: 0.94 }}
                transition={spring}
                aria-label={`${i + 1}`}
                aria-pressed={filled}
                className="flex h-10 min-w-0 flex-1 items-center justify-center"
              >
                <span
                  className={`h-7 w-5 rounded-b-lg rounded-t-sm border-2 transition-colors ${
                    filled
                      ? reached
                        ? 'border-sky-500 bg-sky-500'
                        : 'border-orange-500 bg-orange-500'
                      : 'water-glass-empty border-gray-200 bg-transparent'
                  }`}
                />
              </motion.button>
            );
          })}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            tapFeedback();
            log.mutate({ delta: 1 });
          }}
          disabled={glasses >= goal}
          aria-label={t('daily.addGlass')}
          title={t('daily.addGlass')}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition disabled:opacity-40 ${
            reached ? 'bg-sky-500' : 'bg-orange-500'
          }`}
        >
          <Plus size={20} strokeWidth={3} />
        </motion.button>
      </div>
      </motion.div>
    </motion.section>
  );
}
