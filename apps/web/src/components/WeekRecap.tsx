import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CalendarCheck, Flame, TrendingUp, Trophy } from 'lucide-react';
import { api } from '../lib/api';

/**
 * The week in one card.
 *
 * The prose comes from the API already written — rule-based always, reworded by a
 * model only when one is configured. Nothing here depends on AI being on, which is
 * why it renders the same shape either way.
 */

type Stats = {
  daysTrained: number;
  plannedDays: number;
  prevDaysTrained: number;
  daysLogged: number;
  avgCalories: number | null;
  newPrs: number;
  streak: number;
  weightChangeKg: number | null;
};

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

export default function WeekRecap({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['week-recap'],
    queryFn: () => api.get('/api/meals/recap'),
    // Written once a week and cached server-side; there is nothing to refetch on focus.
    staleTime: 1000 * 60 * 60,
  });

  if (isLoading || !data?.text) return null;
  const s: Stats = data.stats ?? {};

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className={`overflow-hidden rounded-3xl bg-ink text-white shadow-lg ${className}`}
    >
      <div className="px-5 pb-1 pt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">{t('recap.title')}</p>
        <p className="mt-2 text-[15px] font-semibold leading-relaxed">{data.text}</p>
      </div>

      <div className="mt-3 grid grid-cols-4 divide-x divide-white/10 border-t border-white/10 rtl:divide-x-reverse">
        <Stat
          icon={CalendarCheck}
          value={s.plannedDays ? `${s.daysTrained}/${s.plannedDays}` : String(s.daysTrained ?? 0)}
          label={t('recap.trained')}
        />
        <Stat icon={Flame} value={String(s.streak ?? 0)} label={t('recap.streak')} />
        <Stat icon={Trophy} value={String(s.newPrs ?? 0)} label={t('recap.prs')} />
        <Stat
          icon={TrendingUp}
          value={s.avgCalories ? String(s.avgCalories) : '—'}
          label={t('recap.avgKcal')}
        />
      </div>
    </motion.section>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Flame; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1 py-3">
      <Icon size={14} className="text-white/40" />
      <span className="text-base font-extrabold leading-none" dir="ltr">
        {value}
      </span>
      <span className="text-center text-[9.5px] leading-tight text-white/50">{label}</span>
    </div>
  );
}
