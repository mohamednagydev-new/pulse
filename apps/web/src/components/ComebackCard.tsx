import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { sameMuscle } from '../lib/muscleNames';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;
const DAY_INDEX = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Warm "welcome back" card for returning users — shown only when someone with at
 * least one completed workout has been away 3+ days. No guilt, no red numbers:
 * the offer is a 10-minute restart, not a lecture.
 */
export default function ComebackCard() {
  const { t } = useTranslation();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });
  const { data: progress } = useQuery({ queryKey: ['progress'], queryFn: () => api.get('/api/tracker/progress') });
  const { data: groups } = useQuery({ queryKey: ['muscle-groups'], queryFn: () => api.get('/api/muscle-groups') });
  const { data: sched } = useQuery({ queryKey: ['schedule'], queryFn: () => api.get('/api/me/schedule') });

  // Only speak to people who have trained before and then drifted.
  const last: string | null | undefined = me?.lastActiveOn;
  if (!last || (progress?.totalWorkouts ?? progress?.totalCompletions ?? 0) < 1) return null;

  const lastDate = new Date(`${last}T00:00:00`);
  if (Number.isNaN(lastDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const idleDays = Math.round((today.getTime() - lastDate.getTime()) / 86_400_000);
  if (idleDays < 3) return null;

  // Where the comeback session goes: today's scheduled focus if it maps to a
  // muscle group, otherwise the first group. No group data → no card.
  const list: any[] = Array.isArray(groups) ? groups : [];
  const todayName = DAY_INDEX[new Date().getDay()];
  const todayPlan = (sched?.schedule ?? []).find((d: any) => d?.day === todayName);
  const preferred = (todayPlan?.groups ?? [])
    .map((name: string) => list.find((g: any) => sameMuscle(g?.name, name))?.id)
    .find(Boolean);
  const groupId: string | undefined = preferred ?? list[0]?.id;
  if (!groupId) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mx-4 -mt-3 mb-6 rounded-2xl bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-2xl" aria-hidden>
          🌤️
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">{t('comeback.title')}</p>
          <p className="mt-0.5 text-xs leading-snug text-gray-500">{t('comeback.body', { n: idleDays })}</p>
        </div>
      </div>
      <Link
        to={`/session/${groupId}?short=1`}
        className="btn-pill btn-primary mt-3 flex w-full items-center justify-center gap-1 py-2.5 text-sm"
      >
        {t('comeback.cta')}
        <ChevronRight size={16} className="rtl:rotate-180" />
      </Link>
    </motion.section>
  );
}
