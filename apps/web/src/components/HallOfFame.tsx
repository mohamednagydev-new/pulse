import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Flame, Trophy, Zap } from 'lucide-react';
import { api } from '../lib/api';
import Avatar from './Avatar';

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

/** This week's top movers: a 3-person podium, then ranked rows to #10. */
export default function HallOfFame() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'xp' | 'streak'>('xp');
  // Podium always shows; ranks 4-10 fold away so Home stays short by default.
  const [expanded, setExpanded] = useState(false);
  const { data } = useQuery<{ topXp: Person[]; topStreaks: Person[] }>({
    queryKey: ['hall-of-fame'],
    queryFn: () => api.get('/api/daily/hall-of-fame'),
    staleTime: 5 * 60_000,
  });

  const rows = (tab === 'xp' ? data?.topXp : data?.topStreaks) ?? [];
  if (!data || rows.length === 0) return null;

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3, 10);
  // Center the champion: silver — gold — bronze.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as Person[];

  const score = (p: Person) =>
    tab === 'xp' ? (
      <>{p.xp ?? 0} XP</>
    ) : (
      <><Flame size={10} /> {p.currentStreak ?? 0}</>
    );

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

      <div className="mx-4 mt-2.5 overflow-hidden rounded-2xl bg-white shadow-sm">
        {/* Podium */}
        <div className="flex items-end justify-center gap-5 bg-gradient-to-b from-amber-50/80 to-white px-4 pb-3 pt-4">
          {podiumOrder.map((p) => {
            const rank = podium.indexOf(p);
            const champion = rank === 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * rank }}
              >
                <Link to={`/u/${p.id}`} className="flex w-[76px] flex-col items-center transition active:scale-95">
                  <span className={`relative rounded-full ${champion ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
                    <Avatar
                      path={p.avatarUrl}
                      name={`${p.firstName ?? ''} ${p.lastName ?? ''}`}
                      className={champion ? 'h-16 w-16' : 'h-12 w-12'}
                      textClass={champion ? 'text-xl' : 'text-base'}
                    />
                    <span
                      className="absolute -bottom-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] shadow"
                      aria-hidden
                    >
                      {MEDALS[rank]}
                    </span>
                  </span>
                  <span className="mt-1.5 w-full truncate text-center text-[11px] font-semibold">{p.firstName}</span>
                  <span className="font-display flex items-center gap-0.5 text-[11px] font-bold tabular-nums text-orange-500">
                    {score(p)}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Ranks 4–10 */}
        {rest.length > 0 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full border-t border-gray-50 py-2 text-center text-xs font-bold text-gray-400"
          >
            {t('common.seeAll')} · {rest.length + 3} ↓
          </button>
        )}
        {rest.length > 0 && expanded && (
          <div className="divide-y divide-gray-50 border-t border-gray-50">
            {rest.map((p, i) => (
              <Link key={p.id} to={`/u/${p.id}`} className="flex items-center gap-3 px-4 py-2 transition active:bg-gray-50">
                <span className="w-4 text-center text-[11px] font-bold tabular-nums text-gray-400">{i + 4}</span>
                <Avatar
                  path={p.avatarUrl}
                  name={`${p.firstName ?? ''} ${p.lastName ?? ''}`}
                  className="h-8 w-8"
                  textClass="text-xs"
                />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                  {p.firstName} {p.lastName}
                </span>
                <span className="font-display flex shrink-0 items-center gap-0.5 text-[11px] font-bold tabular-nums text-orange-500">
                  {score(p)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}
