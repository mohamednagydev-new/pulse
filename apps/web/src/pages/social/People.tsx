import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, Flame, UserPlus, Check, HeartHandshake, Clock, Zap, MessageSquare } from 'lucide-react';
import { api } from '../../lib/api';
import { MediaImage, Loader, ErrorMsg } from '../../components/ui';
import TopBar from '../../components/TopBar';
import AmbientBg from '../../components/AmbientBg';
import CoachBadge from '../../components/CoachBadge';
import { toast } from '../../lib/toast';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;
const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;

export default function People() {
  const [q, setQ] = useState('');
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const key = ['people', q];
  const { data: users, isLoading, isError, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => api.get(q.trim() ? `/api/social/users?q=${encodeURIComponent(q)}` : '/api/social/suggested'),
  });

  const follow = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) =>
      on ? api.post(`/api/social/users/${id}/follow`) : api.del(`/api/social/users/${id}/follow`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
  });

  const connect = useMutation({
    mutationFn: (id: string) => api.post(`/api/social/connections/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['people'] }); toast(`${t('buddies.requested')} ✓`, 'success'); },
  });
  const accept = useMutation({
    mutationFn: (id: string) => api.post(`/api/social/connections/${id}/accept`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['people'] }); toast(`${t('buddies.connect')} ✓`, 'success'); },
  });
  const message = useMutation({
    mutationFn: (id: string) => api.post('/api/chat/threads', { userId: id }),
    onSuccess: (thread: any) => navigate(`/chat/${thread.id}`),
    onError: (e: any) => toast(e?.message || 'Could not open chat', 'error'),
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <AmbientBg tone="warm" />
      <TopBar title={t('nav.community')} color="fitness-hero" textColor="text-white" />
      <div className="px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex min-h-[44px] items-center gap-2 rounded-full bg-white px-4 py-3 shadow-sm"
        >
          <Search size={18} className="shrink-0 text-gray-400" />
          <input className="w-full min-w-0 bg-transparent outline-none" placeholder={`${t('common.search')}…`} value={q} onChange={(e) => setQ(e.target.value)} />
        </motion.div>
      </div>

      {!q.trim() && <p className="px-5 pt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('reels.forYou')}</p>}

      {isLoading ? (
        <Loader />
      ) : isError ? (
        <ErrorMsg error={error} onRetry={() => refetch()} />
      ) : (
        <div className="mt-2 space-y-2 px-4">
          {(users ?? []).map((u: any, i: number) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -40px 0px' }}
              transition={{ ...spring, delay: Math.min(i, 5) * 0.04 }}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
            >
              <Link to={`/u/${u.id}`} className="shrink-0">
                <MediaImage path={u.avatarUrl} label={u.firstName} className="h-12 w-12 rounded-full" seed={u.id.length} />
              </Link>
              <Link to={`/u/${u.id}`} className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-semibold"><span className="min-w-0 truncate">{u.firstName} {u.lastName}</span> {u.isCoach && <CoachBadge verified={u.coachVerified} />}</p>
                <p className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="rounded-full bg-brand-pink/10 px-2 font-bold text-brand-pink">{t('common.lv', { n: u.level })}</span>
                  <span className="flex items-center gap-0.5"><Flame size={11} /> {u.currentStreak}</span>
                </p>
              </Link>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <FollowButton isFollowing={!!u.isFollowing} onToggle={() => follow.mutate({ id: u.id, on: !u.isFollowing })} />
                <ConnectButton
                  status={u.connectionStatus}
                  onConnect={() => connect.mutate(u.id)}
                  onAccept={() => accept.mutate(u.id)}
                  onMessage={() => message.mutate(u.id)}
                />
              </div>
            </motion.div>
          ))}
          {!users?.length && <p className="py-16 text-center text-gray-400">{t('buddies.empty')}</p>}
        </div>
      )}
    </div>
  );
}

export function FollowButton({ isFollowing, onToggle }: { isFollowing: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={tapSpring}
      onClick={onToggle}
      className={`btn-pill flex min-h-[32px] items-center gap-1.5 px-3 py-1 text-xs ${
        isFollowing ? 'btn-ghost text-gray-500' : 'btn-primary'
      }`}
    >
      {isFollowing ? <Check size={14} className="text-brand-green" /> : <UserPlus size={14} />}
      {isFollowing ? t('social2.following') : t('social2.follow')}
    </motion.button>
  );
}

export function ConnectButton({
  status,
  onConnect,
  onAccept,
  onMessage,
}: {
  status?: 'none' | 'pending_out' | 'pending_in' | 'connected';
  onConnect: () => void;
  onAccept: () => void;
  onMessage: () => void;
}) {
  const { t } = useTranslation();
  if (status === 'connected')
    return (
      <motion.button whileTap={{ scale: 0.92 }} transition={tapSpring} onClick={onMessage} className="btn-pill btn-ghost flex min-h-[32px] items-center gap-1.5 px-3 py-1 text-xs text-brand-pink">
        <MessageSquare size={14} /> {t('buddies.message')}
      </motion.button>
    );
  if (status === 'pending_out')
    return (
      <button disabled className="btn-pill btn-ghost flex min-h-[32px] items-center gap-1.5 px-3 py-1 text-xs text-gray-400">
        <Clock size={14} /> {t('buddies.requested')}
      </button>
    );
  if (status === 'pending_in')
    return (
      <motion.button whileTap={{ scale: 0.92 }} transition={tapSpring} onClick={onAccept} className="btn-pill btn-primary flex min-h-[32px] items-center gap-1.5 px-3 py-1 text-xs">
        <Zap size={14} /> {t('buddies.accept')}
      </motion.button>
    );
  return (
    <motion.button whileTap={{ scale: 0.92 }} transition={tapSpring} onClick={onConnect} className="btn-pill btn-primary flex min-h-[32px] items-center gap-1.5 px-3 py-1 text-xs">
      <HeartHandshake size={14} /> {t('buddies.connect')}
    </motion.button>
  );
}
