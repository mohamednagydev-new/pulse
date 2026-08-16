import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { Loader, MediaImage, EmptyState } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';
import { Trophy } from 'lucide-react';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;
const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Wall of Champions — every finished prize challenge with its podium and
 * raffle winner. Social proof that the prizes are real, permanent fame for
 * winners, and the strongest ad for joining the NEXT challenge.
 */
export default function Champions() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const { data, isLoading } = useQuery({ queryKey: ['champions'], queryFn: () => api.get('/api/gamification/champions') });

  if (isLoading) return <Loader />;
  const walls: any[] = data ?? [];

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <AmbientBg tone="warm" />
      <TopBar title={t('champions.title')} color="bg-gradient-to-b from-amber-500 to-orange-600" textColor="text-white" />
      <p className="px-5 pt-3 text-sm text-gray-500">{t('champions.sub')}</p>

      {walls.length === 0 && (
        <EmptyState icon={<Trophy size={40} />} title={t('champions.emptyTitle')} hint={t('champions.emptyHint')} />
      )}

      <div className="mt-3 space-y-4 px-4">
        {walls.map((c, i) => (
          <motion.section
            key={c.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: (i % 4) * 0.05 }}
            className="overflow-hidden rounded-2xl bg-white shadow-sm"
          >
            {c.coverImage && <MediaImage path={c.coverImage} label={c.title} className="h-24 w-full" />}
            <div className="p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="min-w-0 truncate text-base font-extrabold">{(isAr && c.titleAr) || c.title}</h2>
                <span className="shrink-0 text-[11px] font-bold text-gray-400">{c.endsOn}</span>
              </div>
              {c.prizeText && (
                <p className="mt-0.5 text-xs text-amber-600">🎁 {(isAr && c.prizeTextAr) || c.prizeText}</p>
              )}
              <div className="mt-3 space-y-2">
                {c.podium.map((p: any, rank: number) => (
                  <Link key={p.user.id} to={`/u/${p.user.id}`} className="flex items-center gap-2.5">
                    <span className="w-7 shrink-0 text-center text-lg">{MEDALS[rank]}</span>
                    <MediaImage path={p.user.avatarUrl} label={p.user.firstName} className="h-9 w-9 shrink-0 rounded-full" seed={rank} />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.user.firstName} {p.user.lastName}</span>
                    <span className="shrink-0 text-xs font-extrabold tabular-nums text-gray-400">{p.progress}</span>
                  </Link>
                ))}
                {c.raffleWinner && (
                  <Link to={`/u/${c.raffleWinner.id}`} className="flex items-center gap-2.5 border-t border-gray-100 pt-2">
                    <span className="w-7 shrink-0 text-center text-lg">🎁</span>
                    <MediaImage path={c.raffleWinner.avatarUrl} label={c.raffleWinner.firstName} className="h-9 w-9 shrink-0 rounded-full" seed={5} />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{c.raffleWinner.firstName} {c.raffleWinner.lastName}</span>
                    <span className="shrink-0 text-[10px] font-bold text-amber-500">{t('champions.raffle')}</span>
                  </Link>
                )}
              </div>
            </div>
          </motion.section>
        ))}
      </div>

      <Link
        to="/achievements"
        className="mx-4 mt-5 flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-extrabold text-white shadow-sm"
      >
        🏆 {t('champions.joinNext')}
      </Link>
    </div>
  );
}
