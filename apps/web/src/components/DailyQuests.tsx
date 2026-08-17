import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Gift, Sparkles } from 'lucide-react';
import { CurlAnim } from './TrainingAnim';
import { WaterAnim, MealAnim, FlameAnim } from './MicroAnims';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { waOpen } from './WaShare';
import { celebrateFeedback } from '../lib/haptics';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

/** EVERY quest deep-links to where it gets done — a quest tile that does
 *  nothing on tap reads as broken (user feedback: "record your weight"). */
const QUEST_ROUTES: Record<string, string> = {
  'explore-ai': '/coach-chat',
  'explore-photo': '/tracker',
  'explore-recipe': '/tracker',
  'explore-journey': '/progress',
  'explore-duel': '/buddies',
  'explore-group': '/group',
  workout: '/workout',
  water: '/',
  food: '/tracker',
  lift: '/workout',
  reels: '/reels',
  social: '/community',
  weight: '/progress',
};

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
  const navigate = useNavigate();
  const { data } = useQuery<QuestsPayload>({
    queryKey: ['quests'],
    queryFn: () => api.get('/api/daily/quests'),
    staleTime: 60_000,
  });

  const { data: referral } = useQuery({ queryKey: ['referral'], queryFn: () => api.get('/api/me/referral'), staleTime: Infinity });
  const inviteFriend = () => referral?.link && waOpen(t('gs.inviteMsg', { link: referral.link }));

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

      {/* Three mini-tiles instead of three full rows — half the height, same info. */}
      <div className="mt-3 grid grid-cols-3 gap-2">
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
              // Actionable tiles: invite → WhatsApp; explore → the feature itself.
              onClick={() => {
                if (q.done) return;
                if (q.key === 'invite') inviteFriend();
                else if (QUEST_ROUTES[q.key]) navigate(QUEST_ROUTES[q.key]);
              }}
              className={`flex min-w-0 flex-col items-center rounded-xl px-1.5 py-2.5 text-center ${
                q.done ? 'bg-emerald-50' : 'bg-gray-50'
              } ${(q.key === 'invite' || QUEST_ROUTES[q.key]) && !q.done ? 'cursor-pointer ring-1 ring-orange-300/60' : ''}`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ${
                  q.done ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-500'
                }`}
                aria-hidden
              >
                {q.done ? <Check size={16} strokeWidth={3} /> : Anim ? <Anim className="h-6 w-6" /> : q.icon || '🎯'}
              </span>
              <p className={`mt-1.5 line-clamp-2 w-full text-[10px] font-semibold leading-tight ${q.done ? 'text-emerald-700' : 'text-gray-600'}`}>
                {isAr ? q.ar : q.en}
              </p>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ ...spring, delay: 0.1 + 0.06 * i }}
                  className={`h-full rounded-full ${q.done ? 'bg-emerald-500' : 'bg-orange-500'}`}
                />
              </div>
              <span className={`mt-1 text-[10px] font-bold tabular-nums ${q.done ? 'text-emerald-600' : 'text-gray-400'}`}>
                {q.done ? (q.claimed ? t('daily.claimed') : `+${q.xp ?? 0} XP`) : `${Math.min(q.progress ?? 0, target)}/${target}`}
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
