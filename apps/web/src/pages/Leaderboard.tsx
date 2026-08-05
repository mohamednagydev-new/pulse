import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Loader, MediaImage } from '../components/ui';
import TopBar from '../components/TopBar';

export default function Leaderboard() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { data: rows, isLoading } = useQuery({
    queryKey: ['leaderboard', id],
    queryFn: () => api.get(`/api/gamification/challenges/${id}/leaderboard`),
  });

  if (isLoading) return <Loader />;

  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`);

  return (
    <div className="min-h-screen">
      <TopBar title="Leaderboard" color="fitness-hero" textColor="text-white" />
      <div className="space-y-2 px-4 pt-2">
        {(rows ?? []).map((r: any) => (
          <div key={r.rank} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
            <span className="w-7 shrink-0 text-center text-lg font-bold">{medal(r.rank)}</span>
            <MediaImage path={r.avatarUrl} label={r.name} seed={r.rank} className="h-10 w-10 shrink-0 rounded-full" />
            <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
            <span className="shrink-0 font-bold text-brand-pink">{r.progress}</span>
          </div>
        ))}
        {!rows?.length && <p className="py-16 text-center text-gray-400">{t('challenge.noParticipants')}</p>}
      </div>
    </div>
  );
}
