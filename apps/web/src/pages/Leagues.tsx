import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Flame, Minus, Timer, Zap } from 'lucide-react';
import { api } from '../lib/api';
import { Loader, MediaImage, ErrorMsg } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';
import { levelLabel } from '../lib/levels';

interface Tier { key: string; en: string; ar: string; icon: string; color: string }
interface Member {
  id: string; firstName?: string; lastName?: string; avatarUrl?: string | null;
  level?: number; currentStreak?: number; xp: number; rank: number; isMe: boolean;
}
interface Standings {
  weekKey: string; endsAt: number; tier: number; tierInfo: Tier; tiers: Tier[];
  promoteCount: number; demoteCount: number;
  myRank: number | null; myXp: number; members: Member[];
}
interface HistoryRow { weekKey: string; tier: number; tierInfo: Tier; xp: number; rank: number | null; result: string | null }

export default function Leagues() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');

  const { data, isLoading, isError, error, refetch } = useQuery<Standings>({
    queryKey: ['league'],
    queryFn: () => api.get('/api/gamification/league'),
    staleTime: 60_000,
  });
  const { data: history } = useQuery<HistoryRow[]>({
    queryKey: ['league-history'],
    queryFn: () => api.get('/api/gamification/league/history'),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <><TopBar title={t('league.title')} color="fitness-hero" textColor="text-white" /><Loader /></>;
  // A failed fetch used to leave the skeleton up forever — surface it with a retry.
  if (isError || !data)
    return (
      <>
        <TopBar title={t('league.title')} color="fitness-hero" textColor="text-white" />
        <ErrorMsg error={error} onRetry={() => refetch()} />
      </>
    );

  const tierName = (tier: Tier) => (isAr ? tier.ar : tier.en);
  const promoteLine = data.promoteCount;
  const demoteLine = data.members.length - data.demoteCount;

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-24">
      <AmbientBg tone="cool" />
      <TopBar title={t('league.title')} color="fitness-hero" textColor="text-white" />

      {/* Tier ladder — where you are and what's above you */}
      <div className="no-scrollbar flex items-end justify-center gap-1.5 overflow-x-auto px-4">
        {data.tiers.map((tier, i) => {
          const isCurrent = i === data.tier;
          const reached = i <= data.tier;
          return (
            <motion.div
              key={tier.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 260, damping: 22 }}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl px-3 py-2 transition ${
                isCurrent ? 'bg-white shadow-md' : 'opacity-45'
              }`}
            >
              <span className={isCurrent ? 'text-3xl' : 'text-xl'} style={{ filter: reached ? 'none' : 'grayscale(1)' }} aria-hidden>
                {tier.icon}
              </span>
              <span className="text-[10px] font-bold" style={{ color: isCurrent ? tier.color : '#9CA3AF' }}>
                {tierName(tier)}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 px-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {t('league.yourRoom', { tier: tierName(data.tierInfo) })}
              </p>
              <p className="truncate text-xs text-gray-400">{t('league.roomSub', { n: data.members.length })}</p>
            </div>
            <Countdown endsAt={data.endsAt} label={t('league.endsIn')} />
          </div>

          {data.myRank && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-orange-50 px-3 py-2.5">
              <span className="text-lg font-extrabold tabular-nums text-orange-600">#{data.myRank}</span>
              <span className="min-w-0 flex-1 text-xs text-gray-500">
                {data.promoteCount > 0 && data.myRank <= data.promoteCount
                  ? t('league.holdingPromotion')
                  : data.demoteCount > 0 && data.myRank > demoteLine
                    ? t('league.inDangerZone')
                    : t('league.keepPushing')}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-orange-600">
                <Zap size={14} /> {data.myXp}
              </span>
            </div>
          )}
        </div>
      </div>

      <ul className="mt-3 space-y-1 px-4">
        {data.members.map((m, i) => (
          <div key={m.id}>
            {/* The two lines people actually play around */}
            {promoteLine > 0 && i === promoteLine && (
              <Divider color="#16A34A" label={t('league.promotionZone')} icon={<ChevronUp size={12} />} />
            )}
            {data.demoteCount > 0 && i === demoteLine && (
              <Divider color="#DC2626" label={t('league.relegationZone')} icon={<ChevronDown size={12} />} />
            )}

            <motion.li
              initial={{ opacity: 0, x: isAr ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.03 }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                m.isMe ? 'bg-orange-500 text-white shadow-sm' : 'bg-white shadow-sm'
              }`}
            >
              <span className={`w-6 shrink-0 text-center text-sm font-extrabold tabular-nums ${m.isMe ? 'text-white' : 'text-gray-300'}`}>
                {m.rank}
              </span>
              <MediaImage path={m.avatarUrl} label={m.firstName} className="h-9 w-9 shrink-0 rounded-full" />
              <Link to={m.isMe ? '/profile' : `/u/${m.id}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{m.firstName} {m.lastName}</span>
                <span className={`block truncate text-[11px] ${m.isMe ? 'text-white/70' : 'text-gray-400'}`}>
                  {levelLabel(m.level ?? 1, i18n.language)}
                  {(m.currentStreak ?? 0) > 0 && <> · 🔥 {m.currentStreak}</>}
                </span>
              </Link>
              <span className={`shrink-0 text-sm font-bold tabular-nums ${m.isMe ? 'text-white' : 'text-orange-500'}`}>
                {m.xp}
              </span>
            </motion.li>
          </div>
        ))}
      </ul>

      <div className="mt-5 px-4">
        <div className="rounded-2xl bg-white/70 p-3 text-[11px] leading-relaxed text-gray-500">
          {t('league.rules', { promote: data.promoteCount || 5, demote: data.demoteCount || 5 })}
        </div>
      </div>

      {(history?.length ?? 0) > 0 && (
        <section className="mt-5 px-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('league.history')}</h2>
          <ul className="mt-2 space-y-2">
            {history!.map((h) => (
              <li key={h.weekKey} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm">
                <span className="text-lg" aria-hidden>{h.tierInfo.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">{tierName(h.tierInfo)}</span>
                  <span className="block text-[11px] text-gray-400">
                    {new Date(`${h.weekKey}T00:00:00`).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}
                    {h.rank && ` · #${h.rank}`}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-gray-400">{h.xp} XP</span>
                <ResultChip result={h.result} t={t} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Divider({ color, label, icon }: { color: string; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-2" aria-hidden>
      <span className="h-px flex-1" style={{ background: color, opacity: 0.35 }} />
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
        {icon} {label}
      </span>
      <span className="h-px flex-1" style={{ background: color, opacity: 0.35 }} />
    </div>
  );
}

function ResultChip({ result, t }: { result: string | null; t: (k: string) => string }) {
  if (!result) return null;
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    promoted: { cls: 'bg-emerald-100 text-emerald-600', icon: <ChevronUp size={11} />, label: t('league.promoted') },
    demoted: { cls: 'bg-red-100 text-red-500', icon: <ChevronDown size={11} />, label: t('league.demoted') },
    held: { cls: 'bg-gray-100 text-gray-400', icon: <Minus size={11} />, label: t('league.held') },
  };
  const r = map[result];
  if (!r) return null;
  return (
    <span className={`flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-bold ${r.cls}`}>
      {r.icon} {r.label}
    </span>
  );
}

/** Live countdown to the weekly reset — the reason to earn XP today rather than Friday. */
function Countdown({ endsAt, label }: { endsAt: number; label: string }) {
  const [left, setLeft] = useState(() => endsAt - Date.now());
  useEffect(() => {
    const id = setInterval(() => setLeft(endsAt - Date.now()), 60_000);
    return () => clearInterval(id);
  }, [endsAt]);

  const total = Math.max(0, left);
  const days = Math.floor(total / 86400000);
  const hours = Math.floor((total % 86400000) / 3600000);
  const mins = Math.floor((total % 3600000) / 60000);

  return (
    <div className="shrink-0 text-end">
      <p className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        <Timer size={11} /> {label}
      </p>
      <p className="text-sm font-extrabold tabular-nums">
        {days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
      </p>
    </div>
  );
}

/** Compact card for Home — same data, one line. */
export function LeagueCard() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const { data } = useQuery<Standings>({
    queryKey: ['league'],
    queryFn: () => api.get('/api/gamification/league'),
    staleTime: 60_000,
  });
  if (!data) return null;

  const inPromo = data.promoteCount > 0 && (data.myRank ?? 99) <= data.promoteCount;
  const inDanger = data.demoteCount > 0 && (data.myRank ?? 0) > data.members.length - data.demoteCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="mx-4 mt-4"
    >
      <Link
        to="/leagues"
        className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition active:scale-[0.98]"
      >
        <span className="text-3xl" aria-hidden>{data.tierInfo.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">
            {isAr ? data.tierInfo.ar : data.tierInfo.en} · {t('league.title')}
          </span>
          <span className={`block truncate text-xs ${inDanger ? 'text-red-500' : inPromo ? 'text-brand-green' : 'text-gray-400'}`}>
            {data.myRank ? t('league.rankOf', { rank: data.myRank, total: data.members.length }) : t('league.notRanked')}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-orange-600">
          <Flame size={13} /> {data.myXp}
        </span>
      </Link>
    </motion.div>
  );
}
