import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { api } from '../lib/api';

/**
 * Home card for the weekly recap.
 *
 * From Friday 12:00 through the end of Monday (the "recap window") it shows the
 * week that just ENDED — that is the moment a recap is news. Outside the window
 * it only appears if the current week already has at least one workout, showing
 * the week in progress; a totally empty card on Home would just be noise.
 */

type WeekStats = {
  week: { start: string; end: string };
  workouts: number;
  xp: number;
  activeDays: number;
  focusEn: string;
  focusAr: string;
};

/** True from Friday 12:00 local through Monday 23:59. */
function inRecapWindow(now = new Date()): boolean {
  const dow = now.getDay(); // 0=Sun … 6=Sat
  if (dow === 5) return now.getHours() >= 12; // Friday afternoon
  return dow === 6 || dow === 0 || dow === 1; // Sat, Sun, Mon
}

export default function WeeklyRecapCard() {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);

  const { data } = useQuery<{ last: WeekStats; current: WeekStats }>({
    queryKey: ['recap-weekly'],
    queryFn: () => api.get('/api/recap/weekly'),
    staleTime: 5 * 60_000,
  });
  if (!data) return null;

  const windowOpen = inRecapWindow();
  const week = windowOpen ? data.last : data.current;
  if (!windowOpen && week.workouts < 1) return null;

  const stats: { value: number; label: string }[] = [
    { value: week.workouts, label: L('workouts', 'تمارين') },
    { value: week.activeDays, label: L('active days', 'أيام نشاط') },
    { value: week.xp, label: 'XP' },
  ];

  return (
    <Link to="/recap" className="mx-4 mt-3 block rounded-2xl glass p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">📊 {L('Your week', 'أسبوعك')}</h2>
        <ChevronRight size={18} className="shrink-0 text-gray-400 rtl:rotate-180" />
      </div>
      <div className="mt-2 flex items-center gap-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline gap-1.5">
            <span className="font-display text-xl font-bold leading-none">{s.value}</span>
            <span className="text-[11px] text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray-600">{L(week.focusEn, week.focusAr)}</p>
    </Link>
  );
}
