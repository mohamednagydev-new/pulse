import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Gift, Sparkles } from 'lucide-react';
import { CurlAnim } from './TrainingAnim';
import { WaterAnim, MealAnim, FlameAnim } from './MicroAnims';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { celebrateFeedback } from '../lib/haptics';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

/** Quest key → animated icon. Unmapped keys (reels, one-offs) keep their emoji. */
function questAnim(key: string): ((p: { className?: string }) => JSX.Element) | null {
  const k = key.toLowerCase();
  if (/workout|train|exercise|session|move/.test(k)) return CurlAnim;
  if (/water|hydrat|drink/.test(k)) return WaterAnim;
  if (/food|meal|eat|nutrition/.test(k)) return MealAnim;
  if (/streak|xp|combo|bonus/.test(k)) return FlameAnim;
  return null;
}

interface Quest {
  key: string;
  en: string;
  ar: string;
  icon: string;
  target: number;
  progress: number;
  done: boolean;
  claimed: boolean;
  xp: number;
}

interface QuestsPayload {
  day: string;
  quests: Quest[];
  allDone: boolean;
  bonusXp: number;
  bonusClaimed: boolean;
  claimable: boolean;
}

/** Today's three quests + the all-three bonus, with a single "claim everything" button. */
export default function DailyQuests() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { data } = useQuery<QuestsPayload>({
    queryKey: ['quests'],
    queryFn: () => api.get('/api/daily/quests'),
    staleTime: 60_000,
  });

  const claim = useMutation({
    mutationFn: () => api.post('/api/daily/quests/claim'),
    onSuccess: (res: any) => {
      celebrateFeedback();
      const gained = (res?.awarded ?? 0) + (res?.bonus ?? 0);
      toast(`${t('daily.claimed')} · +${gained} XP`, 'success');
      qc.invalidateQueries({ queryKey: ['quests'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['progress'] });
    },
    onError: (err: any) => toast(err?.message ?? 'Something went wrong', 'error'),
  });

  // Render nothing until the first payload lands so the page doesn't jump.
  if (!data) return null;

  const quests = data.quests ?? [];
  if (quests.length === 0) return null;

  const isAr = i18n.language.startsWith('ar');
  const bonusPending = data.allDone && !data.bonusClaimed ? data.bonusXp ?? 0 : 0;
  const pendingXp =
    quests.filter((q) => q.done && !q.claimed).reduce((sum, q) => sum + (q.xp ?? 0), 0) + bonusPending;
  const everythingClaimed =
    quests.every((q) => q.claimed) && (!data.allDone || data.bonusClaimed);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={spring}
      className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold">{t('daily.quests')}</h2>
          <p className="truncate text-xs text-gray-400">{t('daily.questsSub')}</p>
        </div>
        {data.bonusXp > 0 && (
          <span
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              data.bonusClaimed ? 'bg-gray-100 text-gray-400' : 'bg-orange-100 text-orange-600'
            }`}
          >
            <Gift size={12} /> +{data.bonusXp}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2.5">
        {quests.map((q, i) => {
          const target = Math.max(1, q.target ?? 1);
          const pct = Math.min(100, Math.round(((q.progress ?? 0) / target) * 100));
          const Anim = questAnim(q.key);
          return (
            <motion.div
              key={q.key}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring, delay: 0.06 * i }}
              className="flex items-center gap-3"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                  q.done ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-50 text-orange-500'
                }`}
                aria-hidden
              >
                {Anim ? <Anim className="h-7 w-7" /> : q.icon || '🎯'}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`min-w-0 truncate text-sm font-semibold ${q.done ? 'text-gray-400 line-through' : ''}`}>
                    {isAr ? q.ar : q.en}
                  </p>
                  <span className="shrink-0 text-[11px] font-bold tabular-nums text-gray-400">
                    {Math.min(q.progress ?? 0, target)}/{target}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ ...spring, delay: 0.1 + 0.06 * i }}
                    className={`h-full rounded-full ${q.done ? 'bg-emerald-500' : 'bg-orange-500'}`}
                  />
                </div>
              </div>

              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  q.claimed
                    ? 'bg-emerald-500 text-white'
                    : q.done
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-gray-100 text-gray-300'
                }`}
                aria-label={q.done ? t('daily.claimed') : undefined}
              >
                {q.done ? <Check size={13} strokeWidth={3} /> : `+${q.xp ?? 0}`}
              </span>
            </motion.div>
          );
        })}
      </div>

      {everythingClaimed ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="mt-3 flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-600"
        >
          <Sparkles size={15} /> {t('daily.allDone')}
        </motion.div>
      ) : data.claimable && pendingXp > 0 ? (
        <motion.button
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          whileTap={{ scale: 0.96 }}
          onClick={() => claim.mutate()}
          disabled={claim.isPending}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-bold text-white shadow-sm transition disabled:opacity-60"
        >
          <Gift size={16} /> {t('daily.claimAll', { xp: pendingXp })}
        </motion.button>
      ) : null}
    </motion.section>
  );
}
