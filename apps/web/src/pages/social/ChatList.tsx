import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { MediaImage, Loader, ErrorMsg } from '../../components/ui';
import { timeAgo } from '../../components/PostCard';
import TopBar from '../../components/TopBar';
import AmbientBg from '../../components/AmbientBg';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

export default function ChatList() {
  const { t } = useTranslation();
  const { data: threads, isLoading, error, refetch } = useQuery({
    queryKey: ['chat-threads'],
    queryFn: () => api.get('/api/chat/threads'),
    refetchInterval: 15000,
    retry: false,
  });

  const gated = error && /connect/i.test((error as any)?.message ?? '');
  // The thread map below shadows `t` with the thread object — grab this string first.
  const sayHi = t('chat.sayHi');

  return (
    <div className="relative min-h-screen">
      <AmbientBg tone="cool" />
      <TopBar title={t('chat.title')} color="fitness-hero" textColor="text-white" />
      {gated ? (
        <div className="py-16 text-center text-gray-400">
          <p>{t('chat.connectFirst')}</p>
          <Link to="/buddies" className="mt-2 inline-block font-semibold text-brand-pink">{t('chat.findBuddies')}</Link>
        </div>
      ) : error ? (
        // Non-gated failures (network, server) used to fall through to the
        // "no conversations" branch — indistinguishable from an empty inbox.
        <ErrorMsg error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Loader />
      ) : !threads?.length ? (
        <div className="py-16 text-center text-gray-400">
          <p>{t('chat.empty')}</p>
          <Link to="/people" className="mt-2 inline-block font-semibold text-brand-pink">{t('chat.findPeople')}</Link>
        </div>
      ) : (
        <div className="divide-y">
          {threads.map((t: any, i: number) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -40px 0px' }}
              transition={{ ...spring, delay: Math.min(i, 5) * 0.04 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link to={`/chat/${t.id}`} className="flex items-center gap-3 bg-white px-4 py-3">
                <MediaImage path={t.other?.avatarUrl} label={t.other?.firstName} className="h-12 w-12 shrink-0 rounded-full" seed={t.id.length} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-semibold">{t.other?.firstName} {t.other?.lastName}</p>
                    <span className="shrink-0 text-[11px] text-gray-400">{t.lastMessageAt ? timeAgo(t.lastMessageAt) : ''}</span>
                  </div>
                  <p className="truncate text-sm text-gray-400">{t.lastMessage ?? sayHi}</p>
                </div>
                {t.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-pink px-1.5 text-xs font-bold text-white">{t.unread}</span>}
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
