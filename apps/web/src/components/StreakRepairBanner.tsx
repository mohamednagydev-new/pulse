import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * Duolingo-style streak repair: when the API left a repair offer on the user
 * (streakRepairValue + streakRepairUntil, set the moment a >=3-day streak
 * died), show an urgent card with a live countdown. One full workout before
 * the deadline restores the streak — the CTA sends them straight to training.
 * Renders nothing when there is no open offer.
 */
export default function StreakRepairBanner() {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const navigate = useNavigate();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });

  // Live countdown — re-render every minute so the HH:MM stays honest.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const until = me?.streakRepairUntil ? new Date(me.streakRepairUntil).getTime() : null;
  const v: number = me?.streakRepairValue ?? 0;
  if (!until || until <= now || v <= 0) return null;

  const msLeft = until - now;
  const hh = String(Math.floor(msLeft / 3_600_000)).padStart(2, '0');
  const mm = String(Math.floor((msLeft % 3_600_000) / 60_000)).padStart(2, '0');

  return (
    <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 p-4 text-white shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-base font-extrabold leading-snug">
            <span aria-hidden>💔</span>
            <span aria-hidden className="opacity-80">→</span>
            <span aria-hidden>🔥</span>
            <span>{L(`Bring back your ${v}-day streak`, `رجّع سلسلة الـ${v} يوم`)}</span>
          </div>
          <p className="mt-1 text-sm text-white/90">
            {L('One full workout before the timer ends restores it.', 'تمرينة واحدة كاملة قبل ما الوقت يخلص ترجّعها.')}
          </p>
        </div>
        <div className="shrink-0 rounded-xl bg-white/20 px-2.5 py-1.5 text-center">
          <div className="font-mono text-lg font-bold tabular-nums leading-none" dir="ltr">{hh}:{mm}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/80">{L('left', 'باقي')}</div>
        </div>
      </div>
      <button
        onClick={() => navigate('/programs')}
        className="mt-3 w-full rounded-xl bg-white py-2.5 text-sm font-bold text-orange-600 active:scale-[0.98]"
      >
        {L('Train now', 'اتمرن دلوقتي')}
      </button>
    </div>
  );
}
