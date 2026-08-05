import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BatteryLow, Check, TrendingUp, X, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { successFeedback, tapFeedback } from '../lib/haptics';

type Kind = 'deload' | 'reduce' | 'increase' | 'restart';

interface CheckIn {
  hasPlan: boolean;
  adherence?: { planned: number; done: number; ratio: number; weeks: number; daysSinceLast: number | null };
  deload?: { activeUntil: string } | null;
  proposal?: { id: string; kind: Kind; reason: { en: string; ar: string } | null; fromDays?: number | null; toDays?: number | null } | null;
}

const TONE: Record<Kind, { bg: string; icon: typeof Zap }> = {
  deload: { bg: 'from-sky-500 to-cyan-600', icon: BatteryLow },
  reduce: { bg: 'from-amber-500 to-orange-500', icon: BatteryLow },
  increase: { bg: 'from-emerald-500 to-teal-600', icon: TrendingUp },
  restart: { bg: 'from-violet-500 to-purple-600', icon: Zap },
};

/** The coach checking in: how the fortnight went, and the one change worth making. */
export default function CheckInCard() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language.startsWith('ar');

  const { data } = useQuery<CheckIn>({
    queryKey: ['checkin'],
    queryFn: () => api.get('/api/assessment/checkin'),
    staleTime: 5 * 60_000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['checkin'] });
    qc.invalidateQueries({ queryKey: ['assessment'] });
    qc.invalidateQueries({ queryKey: ['schedule'] });
  };

  const accept = useMutation({
    mutationFn: (id: string) => api.post(`/api/assessment/adjust/${id}`),
    onSuccess: () => { successFeedback(); toast(t('adapt.applied'), 'success'); refresh(); },
    onError: (e: any) => toast(e?.message ?? 'Could not apply', 'error'),
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => api.post(`/api/assessment/adjust/${id}/dismiss`),
    onSuccess: () => { tapFeedback(); refresh(); },
  });

  if (!data?.hasPlan) return null;

  // A lighter week is running — say so, so reduced effort feels prescribed, not slack.
  if (data.deload) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-600 p-4 text-white shadow-sm"
      >
        <BatteryLow size={20} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{t('adapt.deloadOn')}</p>
          <p className="truncate text-xs text-white/80">{t('adapt.deloadUntil', { date: data.deload.activeUntil })}</p>
        </div>
      </motion.div>
    );
  }

  const p = data.proposal;
  if (!p || !p.reason) return null;

  const tone = TONE[p.kind] ?? TONE.reduce;
  const Icon = tone.icon;
  const a = data.adherence;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={`mx-4 mt-4 overflow-hidden rounded-2xl bg-gradient-to-br ${tone.bg} text-white shadow-sm`}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon size={20} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">{t(`adapt.kind.${p.kind}`)}</p>
          <p className="mt-0.5 text-sm font-semibold leading-relaxed">{isAr ? p.reason.ar : p.reason.en}</p>
          {a && (
            <p className="mt-1.5 text-[11px] text-white/70">
              {t('adapt.lastWeeks', { done: a.done, planned: a.planned, weeks: a.weeks })}
            </p>
          )}
        </div>
      </div>

      <div className="flex border-t border-white/20">
        <button
          onClick={() => dismiss.mutate(p.id)}
          disabled={dismiss.isPending}
          className="flex min-h-[46px] flex-1 items-center justify-center gap-1.5 text-xs font-bold text-white/80 transition active:scale-95"
        >
          <X size={14} /> {t('adapt.notNow')}
        </button>
        <button
          onClick={() => accept.mutate(p.id)}
          disabled={accept.isPending}
          className="flex min-h-[46px] flex-1 items-center justify-center gap-1.5 border-s border-white/20 text-xs font-extrabold transition active:scale-95"
        >
          <Check size={14} /> {accept.isPending ? t('adapt.applying') : t('adapt.yes')}
        </button>
      </div>
    </motion.section>
  );
}
