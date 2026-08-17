import { useState, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Star, Play, Dumbbell, CalendarDays, UserPlus, Check, Clock, Zap, HeartHandshake, ArrowLeft, Users, Activity, Ban, Copy, ListChecks } from 'lucide-react';
import { api } from '../../lib/api';
import { MediaImage, Loader, ErrorMsg } from '../../components/ui';
import Sheet from '../../components/Sheet';
import TopBar from '../../components/TopBar';
import PostCard, { timeAgo } from '../../components/PostCard';
import CoachBadge from '../../components/CoachBadge';
import { toast } from '../../lib/toast';

const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation();
  // "Connect to chat" explainer, opened by the message button when not yet buddies.
  const [gate, setGate] = useState(false);
  const [followsTab, setFollowsTab] = useState<'followers' | 'following' | null>(null);
  const follows = useQuery({
    queryKey: ['follows', id],
    queryFn: () => api.get(`/api/social/users/${id}/follows`),
    enabled: !!followsTab,
  });
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
  const cancelConn = useMutation({
    mutationFn: () => api.del(`/api/social/connections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  const block = useMutation({
    mutationFn: () => api.post(`/api/social/users/${id}/block`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast(t('social2.blockDone'), 'success'); },
  });
  const unblock = useMutation({
    mutationFn: () => api.del(`/api/social/users/${id}/block`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast(t('social2.unblockDone'), 'success'); },
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
      {/* Hero: photo-glass gradient with the avatar breaking out of its bottom
          edge. The old layout pulled the avatar up under the curved TopBar with
          no stacking context — half the photo vanished behind the header. */}
      <div className="relative overflow-hidden rounded-b-[28px] bg-gradient-to-br from-orange-500/95 via-pink-600/85 to-indigo-900/80 pb-16 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-luminosity"
          style={{ backgroundImage: 'url(/landing/scene-coach.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
          aria-hidden
        />
        <div className="relative flex items-center gap-2 px-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.9rem)' }}>
          <button onClick={() => navigate(-1)} aria-label={t('common.back', { defaultValue: 'Back' })} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <ArrowLeft size={19} className="rtl:rotate-180" />
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-bold uppercase tracking-wide text-white/80">
            {user.firstName} {user.lastName}
          </p>
          <span className="h-10 w-10" aria-hidden />
        </div>
      </div>

      {/* Identity block — explicit z-10 so nothing ever swallows the photo again. */}
      <div className="relative z-10 -mt-12 flex flex-col items-center">
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={tapSpring} className="relative">
          <MediaImage path={user.avatarUrl} label={user.firstName} className="h-28 w-28 rounded-full shadow-lg ring-4 ring-white dark:ring-[#191821]" seed={user.id.length} />
          {user.online && (
            <span className="absolute end-1.5 top-1.5 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#191821]" aria-hidden />
          )}
          <span className="absolute -bottom-1.5 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-orange-500 to-pink-600 px-3 py-0.5 text-[11px] font-extrabold text-white shadow rtl:translate-x-1/2">
            {t('common.lv', { n: user.level })}
          </span>
        </motion.div>
        <p className="mt-3.5 flex items-center gap-1.5 px-6 text-center text-xl font-extrabold">
          {user.firstName} {user.lastName} {user.isCoach && <CoachBadge verified={user.coachVerified} />}
        </p>
        <p className={`mt-0.5 text-[11px] font-semibold ${user.online ? 'text-emerald-500' : 'text-gray-400'}`}>
          {user.online
            ? t('social2.activeNow', { defaultValue: 'Active now' })
            : user.lastSeenAt
              ? t('social2.lastSeen', { defaultValue: 'Last seen {{ago}}', ago: timeAgo(user.lastSeenAt) })
              : ''}
        </p>
        {user.isCoach && user.coachHeadline && <p className="mt-0.5 px-8 text-center text-sm font-semibold text-brand-blue">{user.coachHeadline}</p>}
        {user.bio && <p className="mt-1.5 max-w-xs px-8 text-center text-sm leading-relaxed text-gray-500">{user.bio}</p>}
      </div>

      <div className="mx-5 mt-4 grid grid-cols-3 divide-x divide-gray-100 rounded-2xl bg-white py-3.5 text-center shadow-sm rtl:divide-x-reverse">
        {/* Followers/following are tappable lists now, not dead-end counts. */}
        <button onClick={() => setFollowsTab('followers')}>
          <Stat icon={<Users size={14} className="text-brand-blue" />} n={stats.followers} label={t('social2.followers', { defaultValue: 'Followers' })} />
        </button>
        <button onClick={() => setFollowsTab('following')}>
          <Stat icon={<HeartHandshake size={14} className="text-brand-pink" />} n={stats.following} label={t('social2.following')} />
        </button>
        <Stat icon={<Activity size={14} className="text-brand-green" />} n={stats.completions} label={t('programs.workout')} />
      </div>

      <Sheet open={!!followsTab} onClose={() => setFollowsTab(null)} label={t('social2.followers', { defaultValue: 'Followers' })}>
        <div className="max-h-[70dvh] overflow-y-auto p-4 pb-8">
          <div className="mb-3 flex gap-1.5">
            {(['followers', 'following'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFollowsTab(k)}
                className={`min-h-[34px] flex-1 rounded-full text-xs font-bold ${followsTab === k ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                {k === 'followers' ? t('social2.followers', { defaultValue: 'Followers' }) : t('social2.following')}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            {(followsTab ? follows.data?.[followsTab] ?? [] : []).map((u: any) => (
              <button
                key={u.id}
                onClick={() => { setFollowsTab(null); navigate(`/u/${u.id}`); }}
                className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-2.5 text-start"
              >
                <MediaImage path={u.avatarUrl} label={u.firstName} className="h-9 w-9 rounded-full" seed={1} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{u.firstName} {u.lastName}</span>
                {u.isCoach && <CoachBadge verified={u.coachVerified} />}
              </button>
            ))}
            {followsTab && (follows.data?.[followsTab] ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">—</p>
            )}
          </div>
        </div>
      </Sheet>

      {user.isCoach && (user.coachBio || user.coachSpecialties) && (
        <div className="mx-5 mt-3 rounded-2xl bg-white p-4 text-sm text-gray-600 shadow-sm">
          <p className="mb-1 font-bold text-ink">{t('home.coaches')}</p>
          {user.coachBio && <p className="leading-relaxed">{user.coachBio}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {parseSpecialties(user.coachSpecialties).map((s: string, i: number) => (
              <span key={i} className="rounded-full bg-brand-blue/10 px-2.5 py-1 text-xs font-medium text-brand-blue">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Compact action row — chips, not full-width slabs. */}
      <div className="mx-5 mt-3.5 flex flex-wrap justify-center gap-2">
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={tapSpring}
          onClick={() => follow.mutate(!isFollowing)}
          className={`btn-pill flex min-h-[34px] items-center justify-center gap-1.5 px-4 text-[13px] ${isFollowing ? 'btn-ghost text-gray-600' : 'btn-primary'}`}
        >
          {isFollowing ? <Check size={14} className="text-brand-green" /> : <UserPlus size={14} />}
          {isFollowing ? t('social2.following') : t('social2.follow')}
        </motion.button>
        {user.connectionStatus === 'connected' ? (
          <motion.button whileTap={{ scale: 0.92 }} transition={tapSpring} onClick={() => message.mutate()} className="btn-pill btn-ghost flex min-h-[34px] items-center justify-center gap-1.5 px-4 text-[13px]">
            <MessageSquare size={14} /> {t('buddies.message')}
          </motion.button>
        ) : (
          <>
            {user.connectionStatus === 'pending_out' ? (
              // Tappable: a sent request can now be withdrawn (same DELETE as unfriend).
              <button
                onClick={() => window.confirm(t('buddies.cancelRequest')) && cancelConn.mutate()}
                className="btn-pill btn-ghost flex min-h-[34px] items-center justify-center gap-1.5 px-4 text-[13px] text-gray-400"
              >
                <Clock size={14} /> {t('buddies.requested')} ✕
              </button>
            ) : user.connectionStatus === 'pending_in' ? (
              <motion.button whileTap={{ scale: 0.92 }} transition={tapSpring} onClick={() => accept.mutate()} className="btn-pill btn-primary flex min-h-[34px] items-center justify-center gap-1.5 px-4 text-[13px]">
                <Zap size={14} /> {t('buddies.accept')}
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.92 }} transition={tapSpring} onClick={() => connect.mutate()} className="btn-pill btn-primary flex min-h-[34px] items-center justify-center gap-1.5 px-4 text-[13px]">
                <HeartHandshake size={14} /> {t('buddies.connect')}
              </motion.button>
            )}
            {/* Message is always visible; before you're buddies it explains the gate. */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              transition={tapSpring}
              onClick={() => setGate(true)}
              aria-label={t('buddies.message')}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm"
            >
              <MessageSquare size={15} />
            </motion.button>
          </>
        )}
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={tapSpring}
          onClick={() => {
            if (user.blocked) { unblock.mutate(); return; }
            if (window.confirm(t('social2.blockConfirm', { name: user.firstName }))) block.mutate();
          }}
          aria-label={user.blocked ? t('social2.unblock') : t('social2.block')}
          className={`flex h-[34px] items-center justify-center gap-1 rounded-full px-3 text-[12px] font-bold shadow-sm ${
            user.blocked ? 'bg-red-500 text-white' : 'bg-white text-gray-400'
          }`}
        >
          <Ban size={13} /> {user.blocked ? t('social2.unblock') : ''}
        </motion.button>
      </div>

      <Sheet open={gate} onClose={() => setGate(false)} label={t('buddies.chatGateTitle', { name: user.firstName })}>
        <div className="px-5 pb-8 pt-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-pink/10 text-brand-pink">
            <MessageSquare size={24} />
          </div>
          <h3 className="mt-3 text-lg font-bold">{t('buddies.chatGateTitle', { name: user.firstName })}</h3>
          <p className="mt-2 text-sm text-gray-500">
            {t(
              user.connectionStatus === 'pending_out'
                ? 'buddies.chatGateOut'
                : user.connectionStatus === 'pending_in'
                  ? 'buddies.chatGateIn'
                  : 'buddies.chatGateNone',
              { name: user.firstName },
            )}
          </p>
          <div className="mt-5">
            {user.connectionStatus === 'pending_out' ? (
              <button disabled className="btn-pill btn-ghost flex min-h-[44px] w-full items-center justify-center gap-2 text-gray-400">
                <Clock size={16} /> {t('buddies.requested')}
              </button>
            ) : user.connectionStatus === 'pending_in' ? (
              <button onClick={() => { accept.mutate(); setGate(false); }} className="btn-pill btn-primary flex min-h-[44px] w-full items-center justify-center gap-2">
                <Zap size={16} /> {t('buddies.accept')}
              </button>
            ) : (
              <button onClick={() => { connect.mutate(); setGate(false); }} className="btn-pill btn-primary flex min-h-[44px] w-full items-center justify-center gap-2">
                <HeartHandshake size={16} /> {t('buddies.connect')}
              </button>
            )}
          </div>
        </div>
      </Sheet>

      {user.isCoach && <CoachSection userId={user.id} />}

      <PublicRoutines userId={user.id} firstName={user.firstName} />

      <div className="mt-6 px-4">
        <h3 className="mb-2.5 flex items-center gap-1.5 px-1 text-base font-extrabold">
          <Activity size={16} className="text-brand-pink" /> {t('social2.activity', { defaultValue: 'Activity' })}
        </h3>
        <div className="space-y-3">
          {posts.map((p: any) => <PostCard key={p.id} post={p} queryKey={key} />)}
          {!posts.length && <p className="py-10 text-center text-sm text-gray-400">{t('community.noActivity')}</p>}
        </div>
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
  const rate = useMutation({
    mutationFn: ({ stars, comment }: { stars: number; comment?: string }) =>
      api.post(`/api/coach/${userId}/rate`, { stars, ...(comment?.trim() ? { comment: comment.trim() } : {}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coach-rating', userId] }); toast(t('coach.thanksRating'), 'success'); },
  });

  const status = statusData?.status;
  const avg = rating?.avg ? Math.round(rating.avg * 10) / 10 : null;
  const openChat = useMutation({
    mutationFn: () => api.post('/api/chat/threads', { userId }),
    onSuccess: (thread: any) => navigate(`/chat/${thread.id}`),
    onError: (e: any) => toast(e?.message || 'Could not open chat', 'error'),
  });

  return (
    <div className="mx-5 mt-4 space-y-3">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        {/* WHAT this section is, before any buttons — "Connect" told users
            nothing about coaching (user feedback). */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate font-bold">🏋️ {t('coach.sectionTitle')}</h3>
          <div className="flex shrink-0 items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} className={avg && s <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />)}
            <span className="ms-1 text-xs text-gray-500" dir="ltr">{avg ?? '—'} ({rating?.count ?? 0})</span>
          </div>
        </div>

        {status === 'accepted' ? (
          <div className="mt-3 rounded-xl bg-emerald-50 p-3">
            <p className="text-sm font-bold text-emerald-700">✅ {t('coach.yourCoach')}</p>
            <p className="mt-0.5 text-xs text-emerald-600">{t('coach.acceptedHint')}</p>
            <button
              onClick={() => openChat.mutate()}
              disabled={openChat.isPending}
              className="mt-2 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full bg-emerald-500 text-sm font-extrabold text-white disabled:opacity-60"
            >
              💬 {t('coach.chatWith')}
            </button>
          </div>
        ) : status === 'pending' ? (
          <div className="mt-3 rounded-xl bg-amber-50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-amber-700"><Clock size={14} /> {t('coach.pendingTitle')}</p>
            <p className="mt-0.5 text-xs text-amber-600">{t('coach.pendingHint')}</p>
          </div>
        ) : (
          <>
            {/* How coaching works — 3 steps, so the button below needs no guessing. */}
            <div className="mt-3 space-y-1.5 text-xs leading-relaxed text-gray-500">
              <p>1️⃣ {t('coach.how1')}</p>
              <p>2️⃣ {t('coach.how2')}</p>
              <p>3️⃣ {t('coach.how3')}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={tapSpring}
              onClick={() => request.mutate()}
              disabled={request.isPending}
              className="btn-pill btn-primary mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 text-sm disabled:opacity-70"
            >
              <Zap size={15} /> {t('coach.requestBtn')}
            </motion.button>
          </>
        )}
        {/* Only accepted clients may rate (the server 403s everyone else) — a
            tappable star row for the general public was a guaranteed-fail button. */}
        {status === 'accepted' && (
          <div className="mt-3 flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <motion.button
                key={s}
                whileTap={{ scale: 0.8 }}
                transition={tapSpring}
                onClick={() => rate.mutate({ stars: s, comment: window.prompt(t('coach.reviewPrompt')) ?? undefined })}
                className="flex h-10 w-8 items-center justify-center"
              >
                <Star size={18} className={rating?.mine && s <= rating.mine ? 'fill-brand-pink text-brand-pink' : 'text-gray-300'} />
              </motion.button>
            ))}
          </div>
        )}
        {/* Written reviews were stored and never shown anywhere. */}
        {!!rating?.reviews?.length && (
          <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
            {rating.reviews.map((r: any, i: number) => (
              <p key={i} className="text-xs text-gray-500">
                <span className="font-bold text-ink">{r.by}</span> {'★'.repeat(r.stars)} — {r.comment}
              </p>
            ))}
          </div>
        )}
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
                {w.coverImage && <MediaImage path={w.coverImage} label={w.title} className="h-12 w-12 shrink-0 rounded-xl" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{w.title}{w.videoId ? ' 🎥' : ''}</p>
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

/** This user's public routines — one tap clones them into my list. */
function PublicRoutines({ userId, firstName }: { userId: string; firstName: string }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const [copiedIds, setCopiedIds] = useState<string[]>([]);
  const { data } = useQuery({
    queryKey: ['user-routines', userId],
    queryFn: () => api.get(`/api/routines/user/${userId}`),
  });
  const copy = useMutation({
    mutationFn: (id: string) => api.post(`/api/routines/${id}/copy`),
    onSuccess: (_res: any, id: string) => {
      setCopiedIds((ids) => [...ids, id]);
      toast(L('Copied to your routines 💪', 'اتنسخ في روتيناتك 💪'), 'success');
    },
    onError: (e: any) => toast(e?.message || L('Could not copy', 'معرفناش ننسخه'), 'error'),
  });

  const routines: any[] = Array.isArray(data) ? data : [];
  if (!routines.length) return null;

  return (
    <div className="mt-6 px-4">
      <h3 className="mb-2.5 flex items-center gap-1.5 px-1 text-base font-extrabold">
        <ListChecks size={16} className="text-brand-green" /> {L(`${firstName}'s routines`, `روتينات ${firstName}`)}
      </h3>
      <div className="space-y-2">
        {routines.map((r: any) => (
          <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{r.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
                {r.muscleFocus && <span className="font-semibold text-brand-pink">{r.muscleFocus}</span>}
                <span>{(r.exercises ?? []).length} {L('exercises', 'تمرين')}</span>
                {r.copies > 0 && (
                  <span className="flex items-center gap-0.5"><Copy size={11} /> {r.copies}</span>
                )}
              </p>
            </div>
            {copiedIds.includes(r.id) ? (
              <button
                onClick={() => navigate('/routines')}
                className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 text-xs font-bold text-emerald-600 transition active:scale-95"
              >
                <Check size={13} /> {L('In my routines →', 'في روتيناتك ←')}
              </button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={tapSpring}
                onClick={() => copy.mutate(r.id)}
                disabled={copy.isPending}
                className="btn-pill btn-primary flex min-h-[36px] shrink-0 items-center gap-1.5 px-4 text-xs disabled:opacity-60"
              >
                <Copy size={13} /> {L('Copy it', 'انسخه')}
              </motion.button>
            )}
          </div>
        ))}
      </div>
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

function Stat({ icon, n, label }: { icon: ReactNode; n: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className="font-display flex items-center gap-1 text-lg font-extrabold">{icon} {n}</p>
      <p className="text-[11px] text-gray-400">{label}</p>
    </div>
  );
}
