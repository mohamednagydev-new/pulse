import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bookmark } from 'lucide-react';
import { api } from '../lib/api';
import { Loader, ErrorMsg, EmptyState } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

const ROUTE: Record<string, (id: string) => string> = {
  lesson: (id) => `/lesson/${id}`,
  program: (id) => `/programs/${id}`,
  recipe: (id) => `/recipe/${id}`,
  article: (id) => `/article/${id}`,
};

export default function Bookmarks() {
  const { t } = useTranslation();
  const { data: bookmarks, isLoading, isError, error, refetch } = useQuery({ queryKey: ['bookmarks'], queryFn: () => api.get('/api/me/bookmarks') });

  return (
    <div className="relative min-h-screen">
      <AmbientBg tone="warm" />
      <TopBar title={t('profile.bookmarks')} color="bg-gradient-to-b from-brand-teal to-cyan-500" textColor="text-white" />
      {isLoading ? (
        <Loader />
      ) : isError ? (
        <ErrorMsg error={error} onRetry={() => refetch()} />
      ) : !bookmarks?.length ? (
        <EmptyState
          icon={<Bookmark size={40} />}
          title={t('bookmarks.empty')}
          action={
            <Link to="/" className="btn-pill btn-primary px-6">
              {t('today.explore')}
            </Link>
          }
        />
      ) : (
        <div className="space-y-2 px-4 pt-4">
          {bookmarks.map((b: any, i: number) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -40px 0px' }}
              transition={{ ...spring, delay: Math.min(i, 4) * 0.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link to={ROUTE[b.contentType]?.(b.contentId) ?? '/'} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <Bookmark size={18} className="shrink-0 text-brand-teal" fill="#00BCD4" />
                <span className="min-w-0 flex-1 truncate capitalize">{b.contentType}</span>
                <span className="shrink-0 text-xs text-gray-400">Saved</span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
