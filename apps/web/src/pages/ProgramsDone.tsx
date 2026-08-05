import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { Loader, ErrorMsg, EmptyState } from '../components/ui';
import TopBar from '../components/TopBar';

export default function ProgramsDone() {
  const { t } = useTranslation();
  const { data: completions, isLoading, isError, error, refetch } = useQuery({ queryKey: ['completions'], queryFn: () => api.get('/api/me/completions') });

  return (
    <div className="min-h-screen">
      <TopBar title={t('profile.programsDone')} color="bg-gradient-to-b from-brand-teal to-cyan-500" textColor="text-white" />
      {isLoading ? (
        <Loader />
      ) : isError ? (
        <ErrorMsg error={error} onRetry={() => refetch()} />
      ) : !completions?.length ? (
        <EmptyState icon={<CheckCircle2 size={40} />} title={t('profile.doneEmpty')} />
      ) : (
        <div className="space-y-2 px-4 pt-4">
          {completions.map((c: any) => (
            <Link key={c.id} to={`/lesson/${c.lessonId}`} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
              <CheckCircle2 size={20} className="shrink-0 text-brand-green" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium leading-tight">{c.lesson?.title}</p>
                <p className="truncate text-xs text-gray-400">{c.lesson?.program?.title} · {c.lesson?.program?.coach?.name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
