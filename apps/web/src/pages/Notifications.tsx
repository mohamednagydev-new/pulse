import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { UserPlus, Megaphone, MessageSquare, Heart, Award, Flame, Bell, CheckCheck } from 'lucide-react';
import { api } from '../lib/api';
import { Loader, ErrorMsg } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';
import { toast } from '../lib/toast';

type NotificationType = 'follow' | 'cheer' | 'comment' | 'reaction' | 'coach' | 'reminder' | 'general';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  url?: string | null;
  readAt: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<NotificationType, { Icon: typeof Bell; className: string }> = {
  follow: { Icon: UserPlus, className: 'bg-brand-blue/10 text-brand-blue' },
  cheer: { Icon: Megaphone, className: 'bg-brand-yellow/10 text-brand-yellow' },
  comment: { Icon: MessageSquare, className: 'bg-brand-teal/10 text-brand-teal' },
  reaction: { Icon: Heart, className: 'bg-brand-red/10 text-brand-red' },
  coach: { Icon: Award, className: 'bg-brand-green/10 text-brand-green' },
  reminder: { Icon: Flame, className: 'bg-brand-pink/10 text-brand-pink' },
  general: { Icon: Bell, className: 'bg-gray-100 text-gray-500' },
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(days / 365)}y`;
}

export function Notifications() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: notifications, isLoading, isError, error, refetch } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/api/notifications'),
  });

  // Keep the app-wide bell badge in sync once the list has loaded.
  useEffect(() => {
    if (notifications) qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
  }, [notifications, qc]);

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/api/notifications/${id}/read`),
    onMutate: (id: string) => {
      qc.setQueryData<Notification[]>(['notifications'], (old) =>
        old?.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post('/api/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
    onError: (e: any) => toast(e?.message || 'Could not mark all read', 'error'),
  });

  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;

  const open = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.url) navigate(n.url);
  };

  return (
    <div className="relative min-h-screen pb-8">
      <AmbientBg tone="warm" />
      <TopBar title={t('notif.title')} color="fitness-hero" textColor="text-white" />

      {isLoading ? (
        <Loader />
      ) : isError ? (
        <ErrorMsg error={error} onRetry={() => refetch()} />
      ) : (
        <div className="px-4 pt-2">
          <div className="flex min-h-8 items-center justify-between px-1 pb-2">
            <p className="text-sm font-bold uppercase text-gray-400">
              {unreadCount > 0 ? `${t('notif.title')} · ${unreadCount}` : t('notif.title')}
            </p>
            {unreadCount > 0 && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-brand-pink disabled:opacity-50"
              >
                <CheckCheck size={15} /> {t('notif.markAll')}
              </motion.button>
            )}
          </div>

          {(notifications?.length ?? 0) === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Bell size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-semibold">{t('notif.caughtUp')}</p>
              {/* A terminal screen for new users before — hand them somewhere alive. */}
              <button onClick={() => navigate('/community')} className="btn-pill btn-primary mx-auto mt-4 px-6 text-sm">
                {t('notif.exploreCta')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {(notifications ?? []).map((n, i) => {
                const { Icon, className } = TYPE_ICONS[n.type] ?? TYPE_ICONS.general;
                const unread = !n.readAt;
                return (
                  <motion.button
                    key={n.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.04 }}
                    onClick={() => open(n)}
                    className={`flex w-full items-start gap-3 rounded-2xl p-3 text-start shadow-sm ${
                      unread ? 'bg-brand-pink/5' : 'bg-white'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${className}`}>
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <span className="flex-1 font-bold leading-snug">{n.title}</span>
                        {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-pink" />}
                      </span>
                      {n.body && <span className="mt-0.5 block text-sm text-gray-500 line-clamp-2">{n.body}</span>}
                      <span className="mt-1 block text-xs text-gray-400" dir="ltr">{timeAgo(n.createdAt)}</span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Notifications;
