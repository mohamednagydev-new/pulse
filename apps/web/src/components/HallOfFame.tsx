import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Flame, Trophy, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { MediaImage } from './ui';

interface Person {
  id: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  level?: number;
  xp?: number;
  currentStreak?: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** This week's top movers. Kept to a single horizontal row: recognition earns its
 *  place on Home, but not five stacked rows of it. */
export default function HallOfFame() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'xp' | 'streak'>('xp');
  const { data } = useQuery<{ topXp: Person[]; topStreaks: Person[] }>({
    queryKey: ['hall-of-fame'],
    queryFn: () => api.get('/api/daily/hall-of-fame'),
    staleTime: 5 * 60_000,
  });

  const rows = (tab === 'xp' ? data?.topXp : data?.topStreaks) ?? [];
  if (!data || rows.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="mt-4"
    >
      <div className="flex items-center justify-between gap-3 px-4">
        <h2 className="flex min-w-0 items-center gap-1.5 truncate text-base font-bold">
          <Trophy size={16} className="shrink-0 text-amber-500" /> {t('fun.hallOfFame')}
        </h2>

        {/* Segmented control instead of a full-width tab bar — saves a row of height */}
        <div className="flex shrink-0 gap-0.5 rounded-full bg-gray-100 p-0.5">
          {([
            { key: 'xp' as const, icon: Zap, label: t('fun.topXp') },
            { key: 'streak' as const, icon: Flame, label: t('fun.topStreaks') },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-label={label}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                tab === key ? 'bg-white text-ink shadow-sm' : 'text-gray-400'
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar mt-2.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1">
        {rows.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.04 * i }}
            className="snap-start"
          >
            <Link
              to={`/u/${p.id}`}
              className="flex w-[92px] flex-col items-center rounded-2xl bg-white px-2 py-3 shadow-sm transition active:scale-95"
            >
              <span className="relative">
                <MediaImage path={p.avatarUrl} label={p.firstName} className="h-12 w-12 rounded-full" />
                <span
                  className="absolute -bottom-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] shadow"
                  aria-hidden
                >
                  {MEDALS[i] ?? <span className="text-[9px] font-bold text-gray-400">{i + 1}</span>}
                </span>
              </span>

              <span className="mt-2 w-full truncate text-center text-[11px] font-semibold">{p.firstName}</span>
              <span className="mt-0.5 flex items-center gap-0.5 text-[11px] font-bold tabular-nums text-orange-500">
                {tab === 'xp' ? (
                  <>{p.xp ?? 0} XP</>
                ) : (
                  <><Flame size={10} /> {p.currentStreak ?? 0}</>
                )}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
