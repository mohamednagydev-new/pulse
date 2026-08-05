import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Star, Play, Dumbbell, CalendarDays, UserPlus, Check, Clock, Zap, HeartHandshake } from 'lucide-react';
import { api } from '../../lib/api';
import { MediaImage, Loader, ErrorMsg } from '../../components/ui';
import TopBar from '../../components/TopBar';
import PostCard from '../../components/PostCard';
import CoachBadge from '../../components/CoachBadge';
import { toast } from '../../lib/toast';

const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const key = ['user-profile', id];
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: key, queryFn: () => api.get(`/api/social/users/${id}`) });

  const follow = useMutation({
    mutationFn: (on: boolean) => (on ? api.post(`/api/social/users/${id}/follow`) : api.del(`/api/social/users/${id}/follow`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const message = useMutation({
    mutationFn: () => api.post('/api/chat/threads', { userId: id }),
    onSuccess: (thread: any) => navigate(`/chat/${thread.id}`),
    onError: (e: any) => toast(e?.message || 'Could not open chat', 'error'),
  });

  const connect = useMutation({
    mutationFn: () => api.post(`/api/social/connections/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast(`${t('buddies.requested')} ✓`, 'success'); },
  });
  const accept = useMutation({
    mutationFn: () => api.post(`/api/social/connections/${id}/accept`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast(`${t('buddies.connect')} ✓`, 'success'); },
  });

  if (isLoading) return <Loader />;
  // A failed fetch used to render a blank screen — keep the back bar and offer a retry.
  if (isError || !data)
    return (
      <div className="min-h-screen">
        <TopBar title="" color="fitness-hero" textColor="text-white" />
        <ErrorMsg error={error} onRetry={() => refetch()} />
      </div>
    );
  const { user, stats, isFollowing, posts } = data;

  return (
    <div className="min-h-screen pb-8">
      <TopBar title={`${user.firstName} ${user.lastName}`} color="fitness-hero" textColor="text-white" curved />
      <div className="-mt-6 flex flex-col items-center">
        <MediaImage path={user.avatarUrl} label={user.firstName} className="h-24 w-24 rounded-full ring-4 ring-white" seed={user.id.length} />
        <p className="mt-2 flex items-center gap-1.5 text-lg font-bold">{user.firstName} {user.lastName} {user.isCoach && <CoachBadge verified={user.coachVerified} />}</p>
        <span className="rounded-full bg-brand-pink/10 px-3 py-0.5 text-xs font-bold text-brand-pink">{t('common.lv', { n: user.level })}</span>
        {user.isCoach && user.coachHeadline && <p className="mt-1 text-sm font-semibold text-brand-blue">{user.coachHeadline}</p>}
        {user.bio && <p className="mt-2 px-8 text-center text-sm text-gray-500">{user.bio}</p>}
        {user.isCoach && (user.coachBio || user.coachSpecialties) && (
          <div className="mx-6 mt-3 w-full max-w-full px-0">
            <div className="rounded-2xl bg-white p-4 text-sm text-gray-600 shadow-sm">
              <p className="mb-1 font-bold text-ink">{t('home.coaches')}</p>
              {user.coachBio && <p>{user.coachBio}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {parseSpecialties(user.coachSpecialties).map((s: string, i: number) => (
                  <span key={i} className="rounded-full bg-brand-blue/10 px-2.5 py-1 text-xs font-medium text-brand-blue">{s}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mx-6 mt-4 grid grid-cols-3 rounded-2xl bg-white py-3 text-center shadow-sm">
        <Stat n={stats.followers} label="Followers" />
        <Stat n={stats.following} label={t('social2.following')} />
        <Stat n={stats.completions} label={t('programs.workout')} />
      </div>

      <div className="mx-6 mt-3 flex gap-3">
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={tapSpring}
          onClick={() => follow.mutate(!isFollowing)}
          className={`btn-pill flex min-h-[44px] flex-1 items-center justify-center gap-2 ${isFollowing ? 'btn-ghost text-gray-600' : 'btn-primary'}`}
        >
          {isFollowing ? <Check size={16} className="text-brand-green" /> : <UserPlus size={16} />}
          {isFollowing ? t('social2.following') : t('social2.follow')}
        </motion.button>
        {user.connectionStatus === 'connected' ? (
          <motion.button whileTap={{ scale: 0.92 }} transition={tapSpring} onClick={() => message.mutate()} className="btn-pill btn-ghost flex min-h-[44px] flex-1 items-center justify-center gap-2">
            <MessageSquare size={16} /> {t('buddies.message')}
          </motion.button>
        ) : user.connectionStatus === 'pending_out' ? (
          <button disabled className="btn-pill btn-ghost flex min-h-[44px] flex-1 items-center justify-center gap-2 text-gray-400">
            <Clock size={16} /> {t('buddies.requested')}
          </button>
        ) : user.connectionStatus === 'pending_in' ? (
          <motion.button whileTap={{ scale: 0.92 }} transition={tapSpring} onClick={() => accept.mutate()} className="btn-pill btn-primary flex min-h-[44px] flex-1 items-center justify-center gap-2">
            <Zap size={16} /> {t('buddies.accept')}
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale: 0.92 }} transition={tapSpring} onClick={() => connect.mutate()} className="btn-pill btn-primary flex min-h-[44px] flex-1 items-center justify-center gap-2">
            <HeartHandshake size={16} /> {t('buddies.connect')}
          </motion.button>
        )}
      </div>

      {user.isCoach && <CoachSection userId={user.id} />}

      <div className="mt-5 space-y-3 px-4">
        {posts.map((p: any) => <PostCard key={p.id} post={p} queryKey={key} />)}
        {!posts.length && <p className="py-10 text-center text-gray-400">{t('community.noActivity')}</p>}
      </div>
    </div>
  );
}

function CoachSection({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: rating } = useQuery({ queryKey: ['coach-rating', userId], queryFn: () => api.get(`/api/coach/${userId}/rating`) });
  const { data: statusData } = useQuery({ queryKey: ['coach-status', userId], queryFn: () => api.get(`/api/coach/${userId}/status`) });
  const { data: workouts } = useQuery({ queryKey: ['coach-workouts-pub', userId], queryFn: () => api.get(`/api/coach/${userId}/workouts`) });
  const { data: programs } = useQuery({ queryKey: ['coach-programs-pub', userId], queryFn: () => api.get(`/api/coach/${userId}/programs`) });
  const request = useMutation({ mutationFn: () => api.post(`/api/coach/${userId}/request`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['coach-status', userId] }); toast(`${t('buddies.requested')} ✓`, 'success'); } });
  const rate = useMutation({ mutationFn: (stars: number) => api.post(`/api/coach/${userId}/rate`, { stars }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['coach-rating', userId] }); toast('Thanks for rating!', 'success'); } });

  const status = statusData?.status;
  const avg = rating?.avg ? Math.round(rating.avg * 10) / 10 : null;

  return (
    <div className="mx-6 mt-4 space-y-3">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={16} className={avg && s <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />)}
            <span className="ms-1 text-sm text-gray-500" dir="ltr">{avg ?? '—'} ({rating?.count ?? 0})</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            transition={tapSpring}
            onClick={() => request.mutate()}
            disabled={status === 'pending' || status === 'accepted'}
            className="btn-pill btn-primary flex min-h-[40px] items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-70"
          >
            {status === 'accepted' ? (
              <><Check size={14} className="text-brand-green" /> {t('coach.yourCoach')}</>
            ) : status === 'pending' ? (
              <><Clock size={14} /> {t('buddies.requested')}</>
            ) : (
              <><Zap size={14} /> {t('buddies.connect')}</>
            )}
          </motion.button>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <motion.button key={s} whileTap={{ scale: 0.8 }} transition={tapSpring} onClick={() => rate.mutate(s)} className="flex h-10 w-8 items-center justify-center">
              <Star size={18} className={rating?.mine && s <= rating.mine ? 'fill-brand-pink text-brand-pink' : 'text-gray-300'} />
            </motion.button>
          ))}
        </div>
      </div>

      {!!programs?.length && (
        <div>
          <h3 className="mb-2 flex items-center gap-1 font-bold"><CalendarDays size={16} /> {t('nav.programs')}</h3>
          <div className="space-y-2">
            {programs.map((p: any) => (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.98 }}
                transition={tapSpring}
                onClick={() => navigate(`/coach-program/${p.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-start shadow-sm"
              >
                <div className="flex-1">
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-xs text-gray-400">{p.days.length} {t('duels.days')}</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full btn-primary"><Play size={16} /></span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {!!workouts?.length && (
        <div>
          <h3 className="mb-2 flex items-center gap-1 font-bold"><Dumbbell size={16} /> {t('programs.workout')}</h3>
          <div className="space-y-2">
            {workouts.map((w: any) => (
              <div key={w.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex-1">
                  <p className="font-semibold">{w.title}</p>
                  <p className="text-xs text-gray-400">{w.muscleFocus} · {w.exercises.length}</p>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} transition={tapSpring} onClick={() => navigate(`/session/w/${w.id}`)} className="flex h-10 w-10 items-center justify-center rounded-full btn-primary"><Play size={16} /></motion.button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function parseSpecialties(json?: string): string[] {
  try {
    const v = JSON.parse(json ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <p className="text-lg font-extrabold">{n}</p>
      <p className="text-[11px] text-gray-400">{label}</p>
    </div>
  );
}
