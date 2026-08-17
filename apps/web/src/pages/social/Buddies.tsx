import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Flame, Zap, Dumbbell, Crown, Swords, Megaphone, MessageSquare, X, Footprints, Target, Pencil, Check, CalendarClock } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../store/auth';
import { MediaImage, Loader } from '../../components/ui';
import Sheet from '../../components/Sheet';
import TopBar from '../../components/TopBar';
import AmbientBg from '../../components/AmbientBg';
import { toast } from '../../lib/toast';
import { tapFeedback } from '../../lib/haptics';

type DuelMetric = 'workouts' | 'xp';
type Duel = {
  id: string;
  metric: DuelMetric;
  durationDays: number;
  wagerXp: number;
  status: string;
  startsAt: string;
  endsAt: string;
  iChallenged: boolean;
  other: { id: string; firstName: string; lastName: string; avatarUrl: string | null; level: number };
  myScore: number;
  theirScore: number;
  iWon?: boolean | null;
};

const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;

type InviteKind = 'walk' | 'workout' | 'run' | 'other';
const INVITE_EMOJI: Record<InviteKind, string> = { walk: '🚶', workout: '🏋️', run: '🏃', other: '✨' };

type ActivityInvite = {
  id: string;
  kind: InviteKind;
  note: string | null;
  whenText: string | null;
  status: string;
  createdAt: string;
  fromMe: boolean;
  other: { id: string; firstName: string; lastName: string; avatarUrl: string | null; level: number };
};

export function Buddies() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const authUser = useAuth((s) => s.user);

  const inviteKindLabel = (k: InviteKind) =>
    k === 'walk' ? L('Walk', 'مشي') : k === 'workout' ? L('Workout', 'تمرين') : k === 'run' ? L('Run', 'جري') : L('Something else', 'حاجة تانية');

  const metricLabel = (m: DuelMetric) => (m === 'xp' ? t('duels.metricXp') : t('duels.metricWorkouts'));

  const duelTimeLeft = (endsAt: string) => {
    const ms = new Date(endsAt).getTime() - Date.now();
    if (ms <= 0) return '…';
    const days = Math.floor(ms / 86_400_000);
    if (days >= 1) return `${days}d ${t('duels.left')}`;
    return `${Math.max(1, Math.ceil(ms / 3_600_000))}h ${t('duels.left')}`;
  };

  const { data: conns, isLoading: loadingConns } = useQuery({
    queryKey: ['connections'],
    queryFn: () => api.get('/api/social/connections'),
  });
  const { data: buddies, isLoading: loadingBuddies } = useQuery({
    queryKey: ['buddies'],
    queryFn: () => api.get('/api/social/buddies'),
  });
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });
  const { data: duels } = useQuery({
    queryKey: ['duels'],
    queryFn: () => api.get('/api/duels'),
  });

  // Friends vs duels — the page's two jobs, one visible at a time.
  const [view, setView] = useState<'friends' | 'duels'>('friends');
  const [fullBoard, setFullBoard] = useState(false);
  // Challenge sheet state
  const [duelTarget, setDuelTarget] = useState<any>(null);
  const [duelMetric, setDuelMetric] = useState<DuelMetric>('workouts');
  const [duelDays, setDuelDays] = useState<number>(7);
  const [duelWager, setDuelWager] = useState<number>(0);
  // Keep the last target around so the sheet still has content while it slides out.
  const lastDuelTarget = useRef<any>(null);
  if (duelTarget) lastDuelTarget.current = duelTarget;
  const duelShown = duelTarget ?? lastDuelTarget.current;

  const openDuelSheet = (b: any) => {
    setDuelMetric('workouts');
    setDuelDays(7);
    setDuelWager(0);
    setDuelTarget(b);
  };

  // ---- Low-pressure invites («اعزمه») + shared goal + walk log ----
  const { data: invites } = useQuery({
    queryKey: ['activity-invites'],
    queryFn: () => api.get('/api/social/invites'),
  });
  const { data: myGoal } = useQuery({
    queryKey: ['my-goal'],
    queryFn: () => api.get('/api/social/goal'),
  });

  const [inviteTarget, setInviteTarget] = useState<any>(null);
  const [inviteKind, setInviteKind] = useState<InviteKind>('walk');
  const [inviteWhen, setInviteWhen] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const lastInviteTarget = useRef<any>(null);
  if (inviteTarget) lastInviteTarget.current = inviteTarget;
  const inviteShown = inviteTarget ?? lastInviteTarget.current;

  const openInviteSheet = (b: any) => {
    setInviteKind('walk');
    setInviteWhen('');
    setInviteNote('');
    setInviteTarget(b);
  };

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');

  const invalidateInvites = () => qc.invalidateQueries({ queryKey: ['activity-invites'] });

  const sendInvite = useMutation({
    mutationFn: () =>
      api.post('/api/social/invites', {
        toUserId: inviteTarget.id,
        kind: inviteKind,
        whenText: inviteWhen.trim() || undefined,
        note: inviteNote.trim() || undefined,
      }),
    onSuccess: () => {
      tapFeedback();
      invalidateInvites();
      setInviteTarget(null);
      toast(L('Invite sent 🎉', 'العزومة اتبعتت 🎉'), 'success');
    },
    onError: (e: any) => toast(e?.message || L('Could not send invite', 'العزومة موصلتش'), 'error'),
  });
  const acceptInvite = useMutation({
    mutationFn: (id: string) => api.post(`/api/social/invites/${id}/accept`),
    onSuccess: () => {
      tapFeedback();
      invalidateInvites();
      toast(L("It's a plan! 🤝", 'اتفقنا! 🤝'), 'success');
    },
    onError: (e: any) => toast(e?.message || 'Error', 'error'),
  });
  const declineInvite = useMutation({
    mutationFn: (id: string) => api.post(`/api/social/invites/${id}/decline`),
    onSuccess: () => invalidateInvites(),
    onError: (e: any) => toast(e?.message || 'Error', 'error'),
  });
  const cancelInvite = useMutation({
    mutationFn: (id: string) => api.post(`/api/social/invites/${id}/cancel`),
    onSuccess: () => invalidateInvites(),
    onError: (e: any) => toast(e?.message || 'Error', 'error'),
  });

  const saveGoal = useMutation({
    mutationFn: (text: string) => api.post('/api/social/goal', { goalText: text.trim() || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-goal'] });
      setEditingGoal(false);
      toast(L('Goal saved 🎯', 'هدفك اتسجل 🎯'), 'success');
    },
    onError: (e: any) => toast(e?.message || 'Error', 'error'),
  });

  const logWalk = useMutation({
    mutationFn: (minutes: number) => api.post('/api/social/walks', { minutes }),
    onSuccess: (r: any) => {
      tapFeedback();
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['challenges'] });
      if (r?.credited === false) toast(L('Walks logged for today — see you tomorrow 😄', 'سجلت مشي كفاية النهارده — نكمل بكرة 😄'), 'info');
      else toast(L(`Walk logged! +${r?.xp ?? 15} XP 🚶`, `تسجّل المشوار! +${r?.xp ?? 15} XP 🚶`), 'success');
    },
    onError: (e: any) => toast(e?.message || 'Error', 'error'),
  });

  const accept = useMutation({
    mutationFn: (id: string) => api.post(`/api/social/connections/${id}/accept`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] });
      qc.invalidateQueries({ queryKey: ['buddies'] });
      toast(`${t('buddies.connect')} ✓`, 'success');
    },
  });
  const cheer = useMutation({
    mutationFn: (id: string) => api.post(`/api/social/buddies/${id}/cheer`),
    onSuccess: (r: any) => {
      tapFeedback();
      // The 4h cooldown returns 200 {cooldown:true} — claiming success there
      // meant the buddy got nothing while the user believed they nudged them.
      if (r?.cooldown) toast(t('buddies.cheerCooldown'), 'info');
      else toast(t('buddies.cheered'), 'success');
    },
    onError: (e: any) => toast(e?.message || 'Could not cheer', 'error'),
  });
  const decline = useMutation({
    mutationFn: (userId: string) => api.del(`/api/social/connections/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] });
      qc.invalidateQueries({ queryKey: ['buddies'] });
    },
  });
  const message = useMutation({
    mutationFn: (id: string) => api.post('/api/chat/threads', { userId: id }),
    onSuccess: (thread: any) => navigate(`/chat/${thread.id}`),
    onError: (e: any) => toast(e?.message || 'Could not open chat', 'error'),
  });

  const cancelDuel = useMutation({
    mutationFn: (id: string) => api.del(`/api/duels/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['duels'] }),
  });
  const acceptDuel = useMutation({
    mutationFn: (id: string) => api.post(`/api/duels/${id}/accept`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duels'] });
      toast(`${t('duels.accept')} ⚔️`, 'success');
    },
    onError: (e: any) => toast(e?.message || 'Could not accept duel', 'error'),
  });
  const declineDuel = useMutation({
    mutationFn: (id: string) => api.post(`/api/duels/${id}/decline`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['duels'] }),
    onError: (e: any) => toast(e?.message || 'Could not decline duel', 'error'),
  });
  const rematch = useMutation({
    mutationFn: (id: string) => api.post(`/api/duels/${id}/rematch`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duels'] });
      toast(t('duels.sent'), 'success');
    },
    onError: (e: any) => toast(e?.message || 'Could not send rematch', 'error'),
  });
  const createDuel = useMutation({
    mutationFn: () =>
      api.post('/api/duels', {
        opponentId: duelTarget.id,
        metric: duelMetric,
        durationDays: duelDays,
        wagerXp: duelWager,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duels'] });
      setDuelTarget(null);
      toast(t('duels.sent'), 'success');
    },
    onError: (e: any) => toast(e?.message || 'Could not send challenge', 'error'),
  });

  const incoming = conns?.incoming ?? [];
  const isLoading = loadingConns || loadingBuddies;

  const duelIncoming: Duel[] = duels?.incoming ?? [];
  const duelOutgoing: Duel[] = duels?.outgoing ?? [];
  const duelActive: Duel[] = duels?.active ?? [];
  const duelFinished: Duel[] = duels?.finished ?? [];
  const hasDuels = duelIncoming.length + duelOutgoing.length + duelActive.length + duelFinished.length > 0;

  // Streak Battle — me + buddies, ranked by streak (weekly XP breaks ties).
  const meSrc = me ?? authUser;
  const leaderboard = meSrc
    ? [
        {
          id: meSrc.id,
          firstName: meSrc.firstName,
          lastName: meSrc.lastName,
          avatarUrl: meSrc.avatarUrl,
          currentStreak: (meSrc as any).currentStreak ?? 0,
          weeklyXp: (meSrc as any).weeklyXp ?? 0,
          isMe: true,
        },
        ...(buddies ?? []).map((b: any) => ({ ...b, isMe: false })),
      ].sort((a, b) => (b.currentStreak - a.currentStreak) || (b.weeklyXp - a.weeklyXp))
    : [];

  return (
    <div className="relative min-h-screen pb-8">
      <AmbientBg tone="warm" />
      <TopBar title={t('buddies.title')} color="fitness-hero" textColor="text-white" />

      {isLoading ? (
        <Loader />
      ) : (
        <div className="space-y-3 px-4 pt-2">
          {/* Two jobs, two tabs: your PEOPLE and your BATTLES. Stacked together
              this page read as a wall (user feedback: crowded, unorganized). */}
          {((buddies?.length ?? 0) > 0 || hasDuels || incoming.length > 0) && (
            <div className="flex rounded-full bg-white p-1 shadow-sm">
              {([
                { key: 'friends' as const, label: `👥 ${t('buddies.title')}`, badge: incoming.length },
                { key: 'duels' as const, label: `⚔️ ${t('duels.title')}`, badge: duelIncoming.length },
              ]).map((v) => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`relative flex-1 rounded-full py-2 text-sm font-bold transition ${
                    view === v.key ? 'bg-ink text-white' : 'text-gray-500'
                  }`}
                >
                  {v.label}
                  {v.badge > 0 && (
                    <span className="absolute -top-1 end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-pink px-1 text-[10px] font-bold text-white">
                      {v.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Incoming activity invites — someone wants YOU, answer first. ── */}
          {view === 'friends' && (invites?.incoming?.length ?? 0) > 0 && (
            <div className="space-y-2">
              {(invites.incoming as ActivityInvite[]).map((inv) => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                  className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-emerald-400/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl" aria-hidden>
                      {INVITE_EMOJI[inv.kind] ?? '✨'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold text-ink">{inv.other.firstName} {inv.other.lastName}</span>{' '}
                        {L('invites you:', 'عازمك:')}{' '}
                        <span className="font-semibold">{inviteKindLabel(inv.kind)}</span>
                        {inv.whenText ? ` · ${inv.whenText}` : ''}
                      </p>
                      {inv.note && <p className="truncate text-xs text-gray-400">{inv.note}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      transition={tapSpring}
                      onClick={() => { tapFeedback(); acceptInvite.mutate(inv.id); }}
                      disabled={acceptInvite.isPending}
                      className="flex min-h-[32px] flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-500 py-1 text-xs font-bold text-white disabled:opacity-60"
                    >
                      <Check size={15} /> {L('I\'m in', 'ماشي، جاي')}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      transition={tapSpring}
                      onClick={() => declineInvite.mutate(inv.id)}
                      disabled={declineInvite.isPending}
                      className="btn-pill btn-ghost flex min-h-[32px] flex-1 items-center justify-center py-1 text-xs disabled:opacity-60"
                    >
                      {L('Another time', 'مرة تانية')}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── My shared goal — one honest line my buddies can see. ── */}
          {view === 'friends' && (
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              {editingGoal ? (
                <div className="flex items-center gap-2">
                  <Target size={16} className="shrink-0 text-brand-pink" />
                  <input
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    maxLength={120}
                    autoFocus
                    placeholder={L('e.g. lose 5kg before summer', 'مثلا: أخس ٥ كيلو قبل الصيف')}
                    className="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-pink"
                  />
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    transition={tapSpring}
                    onClick={() => saveGoal.mutate(goalDraft)}
                    disabled={saveGoal.isPending}
                    aria-label={L('Save goal', 'احفظ هدفي')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-pink text-white disabled:opacity-60"
                  >
                    <Check size={15} />
                  </motion.button>
                  <button
                    onClick={() => setEditingGoal(false)}
                    aria-label={t('common.cancel')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setGoalDraft(myGoal?.goalText ?? ''); setEditingGoal(true); }}
                  className="flex w-full items-center gap-2 text-start"
                >
                  <span className="text-lg" aria-hidden>🎯</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-400">{L('My goal', 'هدفي')}</span>
                    <span className={`block truncate text-sm ${myGoal?.goalText ? 'font-semibold text-ink' : 'text-gray-400'}`}>
                      {myGoal?.goalText || L('Share a goal your buddies can push you on', 'اكتب هدفك وخلي صحابك يشدوا معاك')}
                    </span>
                  </span>
                  <Pencil size={14} className="shrink-0 text-gray-400" />
                </button>
              )}
            </div>
          )}

          {/* ── Accepted upcoming plans — a reminder strip, not a scoreboard. ── */}
          {view === 'friends' && ((invites?.accepted?.length ?? 0) + (invites?.outgoing?.length ?? 0)) > 0 && (
            <div>
              <p className="flex items-center gap-1 px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                <CalendarClock size={12} /> {L('Plans together', 'خطط مع صحابك')}
              </p>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {([...(invites?.accepted ?? []), ...(invites?.outgoing ?? [])] as ActivityInvite[]).map((inv) => (
                  <div
                    key={inv.id}
                    className={`flex shrink-0 items-center gap-2 rounded-full bg-white py-1.5 pe-2 ps-1.5 shadow-sm ${inv.status === 'pending' ? 'opacity-60' : ''}`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm" aria-hidden>
                      {INVITE_EMOJI[inv.kind] ?? '✨'}
                    </span>
                    <span className="max-w-[180px] truncate text-xs font-semibold">
                      {inviteKindLabel(inv.kind)} {L('with', 'مع')} {inv.other.firstName}
                      {inv.whenText ? ` · ${inv.whenText}` : ''}
                      {inv.status === 'pending' ? ` · ${L('waiting', 'مستني رد')}` : ''}
                    </span>
                    {inv.fromMe && (
                      <button
                        onClick={() => cancelInvite.mutate(inv.id)}
                        aria-label={t('common.cancel')}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Quick walk log — the lowest-pressure workout there is. ── */}
          {view === 'friends' && (
            <div className="scene-tex rounded-2xl bg-gradient-to-br from-emerald-500/90 to-teal-700/80 p-3.5 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20" aria-hidden>
                  <Footprints size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight">{L('Log a walk', 'سجل مشوار مشي')} 🚶</p>
                  <p className="text-[11px] text-white/80">{L('Counts for streaks and walk challenges', 'بيحسب في السلسلة وتحديات المشي')}</p>
                </div>
              </div>
              <div className="mt-2.5 flex gap-2">
                {[15, 30, 45, 60].map((m) => (
                  <motion.button
                    key={m}
                    whileTap={{ scale: 0.92 }}
                    transition={tapSpring}
                    onClick={() => logWalk.mutate(m)}
                    disabled={logWalk.isPending}
                    className="min-h-[36px] flex-1 rounded-full bg-white/20 text-sm font-bold text-white backdrop-blur transition active:bg-white/30 disabled:opacity-60"
                  >
                    {m} {L('min', 'دقيقة')}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {view === 'friends' && (buddies?.length ?? 0) > 0 && leaderboard.length > 0 && (
            <div>
              <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('battle.compete')}</p>
              <h2 className="px-1 pb-2 font-bold">{t('battle.title')}</h2>
              <div className="space-y-2">
                {(fullBoard ? leaderboard : leaderboard.slice(0, 5)).map((row: any, idx: number) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 28, delay: Math.min(idx, 5) * 0.06 }}
                    className={`flex items-center gap-3 rounded-2xl p-3 shadow-sm ${
                      idx === 0 ? 'bg-gradient-to-r from-amber-100/80 via-amber-50 to-white' : 'bg-white'
                    } ${row.isMe ? 'ring-2 ring-brand-pink' : ''}`}
                  >
                    <span className="w-6 shrink-0 text-center">
                      {idx === 0 ? (
                        <Crown size={18} className="mx-auto text-amber-500" />
                      ) : (
                        <span className="text-sm font-extrabold text-gray-400">{idx + 1}</span>
                      )}
                    </span>
                    <span className="relative shrink-0">
                      <MediaImage
                        path={row.avatarUrl}
                        label={row.firstName}
                        className="h-10 w-10 rounded-full"
                        seed={row.id?.length}
                      />
                      {/* Live presence dot — sockets, not polling. */}
                      {row.online && <span className="absolute -end-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />}
                    </span>
                    <p className="min-w-0 flex-1 truncate font-semibold">
                      {row.isMe ? t('battle.you') : `${row.firstName} ${row.lastName}`}
                      {idx === 0 ? ' 👑' : ''}
                    </p>
                    <span className="flex shrink-0 items-center gap-1 font-extrabold text-orange-500">
                      <Flame size={15} /> {row.currentStreak}
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5 text-xs text-gray-400">
                      <Zap size={11} className="text-amber-500" /> {row.weeklyXp}
                    </span>
                  </motion.div>
                ))}
                {leaderboard.length > 5 && (
                  <button onClick={() => setFullBoard((v) => !v)} className="w-full py-1.5 text-center text-xs font-bold text-gray-400">
                    {fullBoard ? t('common.less', { defaultValue: '− أقل' }) : `+${leaderboard.length - 5}`}
                  </button>
                )}
              </div>
            </div>
          )}

          {view === 'duels' && (hasDuels || (buddies?.length ?? 0) > 0) && (
            <div>
              <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('duels.duel')}</p>
              <h2 className="px-1 pb-2 font-bold">{t('duels.title')} ⚔️</h2>
              <div className="space-y-2">
                {duelIncoming.map((d) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                    className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-brand-pink/20"
                  >
                    <div className="flex items-center gap-3">
                      <MediaImage
                        path={d.other.avatarUrl}
                        label={d.other.firstName}
                        className="h-10 w-10 shrink-0 rounded-full"
                        seed={d.other.id.length}
                      />
                      <p className="min-w-0 flex-1 text-sm text-gray-600">
                        <span className="font-semibold text-ink">{d.other.firstName} {d.other.lastName}</span>{' '}
                        {t('duels.challengesYou')} — {metricLabel(d.metric).toLowerCase()} · {d.durationDays} {t('duels.days')}
                        {d.wagerXp > 0 ? ` · ⚡${d.wagerXp} XP` : ''}
                      </p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        transition={tapSpring}
                        onClick={() => { tapFeedback(); acceptDuel.mutate(d.id); }}
                        disabled={acceptDuel.isPending}
                        className="btn-pill btn-primary flex min-h-[32px] flex-1 items-center justify-center gap-1.5 py-1 text-xs disabled:opacity-60"
                      >
                        <Swords size={15} /> {t('duels.accept')}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        transition={tapSpring}
                        onClick={() => declineDuel.mutate(d.id)}
                        disabled={declineDuel.isPending}
                        className="btn-pill btn-ghost flex min-h-[32px] flex-1 items-center justify-center py-1 text-xs disabled:opacity-60"
                      >
                        {t('duels.decline')}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}

                {duelActive.map((d) => {
                  const total = d.myScore + d.theirScore;
                  const myPct = total === 0 ? 50 : (d.myScore / total) * 100;
                  const myLead = d.myScore >= d.theirScore;
                  const theirLead = d.theirScore >= d.myScore;
                  return (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                      className="rounded-2xl bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-gray-400">
                        <span>{metricLabel(d.metric)}</span>
                        <span className="flex items-center gap-2 normal-case tracking-normal">
                          {d.wagerXp > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-600">⚡{d.wagerXp} XP</span>
                          )}
                          <span className="font-semibold">{duelTimeLeft(d.endsAt)}</span>
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex shrink-0 flex-col items-center">
                          <MediaImage
                            path={meSrc?.avatarUrl}
                            label={meSrc?.firstName}
                            className="h-10 w-10 rounded-full"
                            seed={meSrc?.id?.length}
                          />
                          <span className="mt-0.5 text-[10px] font-semibold text-gray-400">{t('battle.you')}</span>
                        </div>
                        <span className={`shrink-0 text-lg font-extrabold ${myLead ? 'text-brand-pink' : 'text-gray-400'}`}>
                          {d.myScore}
                        </span>
                        <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-brand-pink to-pink-400"
                            initial={false}
                            animate={{ width: `${myPct}%` }}
                            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                          />
                        </div>
                        <span className={`shrink-0 text-lg font-extrabold ${theirLead ? 'text-brand-pink' : 'text-gray-400'}`}>
                          {d.theirScore}
                        </span>
                        <div className="flex shrink-0 flex-col items-center">
                          <MediaImage
                            path={d.other.avatarUrl}
                            label={d.other.firstName}
                            className="h-10 w-10 rounded-full"
                            seed={d.other.id.length}
                          />
                          <span className="mt-0.5 max-w-[52px] truncate text-[10px] font-semibold text-gray-400">
                            {d.other.firstName}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {duelOutgoing.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-3 text-sm text-gray-400 shadow-sm">
                    <button
                      onClick={() => cancelDuel.mutate(d.id)}
                      aria-label={t('common.cancel')}
                      className="order-last flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400"
                    >
                      <X size={14} />
                    </button>
                    <MediaImage
                      path={d.other.avatarUrl}
                      label={d.other.firstName}
                      className="h-8 w-8 shrink-0 rounded-full opacity-70"
                      seed={d.other.id.length}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {t('duels.waiting', { name: d.other.firstName })} · {metricLabel(d.metric).toLowerCase()}, {d.durationDays} {t('duels.days')}
                    </span>
                  </div>
                ))}

                {duelFinished.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm shadow-sm">
                    <span>{d.iWon === true ? '🏆' : d.iWon === false ? '😤' : '🤝'}</span>
                    <span className="min-w-0 flex-1 truncate text-gray-600">
                      {d.iWon === true ? t('duels.won') : d.iWon === false ? t('duels.lost') : t('duels.draw')} — {d.other.firstName} ·{' '}
                      {metricLabel(d.metric).toLowerCase()}
                    </span>
                    <span className={`shrink-0 font-extrabold ${d.iWon === true ? 'text-brand-pink' : 'text-gray-400'}`}>
                      {d.myScore}–{d.theirScore}
                    </span>
                    {/* Losers want revenge, winners want proof — one tap, same terms. */}
                    <button
                      onClick={() => rematch.mutate(d.id)}
                      disabled={rematch.isPending}
                      className="flex shrink-0 items-center gap-1 rounded-full bg-brand-pink/10 px-2.5 py-1 text-xs font-bold text-brand-pink transition active:scale-90 disabled:opacity-50"
                    >
                      <Swords size={12} /> {t('duels.rematch')}
                    </button>
                  </div>
                ))}

                {!hasDuels && (
                  <p className="flex items-center gap-1.5 rounded-2xl bg-white/60 p-3 text-sm text-gray-400">
                    <Swords size={14} className="shrink-0" /> {t('duels.challengeTitle', { name: t('buddies.title') })} ⚔️
                  </p>
                )}
              </div>
            </div>
          )}

          {view === 'friends' && incoming.length > 0 && (
            <div>
              <p className="px-1 pb-2 text-sm font-bold uppercase text-gray-400">{t('buddies.requests')}</p>
              <div className="space-y-2">
                {incoming.map((r: any) => (
                  <div key={r.connectionId} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                    <Link to={`/u/${r.user.id}`}>
                      <MediaImage path={r.user.avatarUrl} label={r.user.firstName} className="h-12 w-12 rounded-full" seed={r.user.id.length} />
                    </Link>
                    <Link to={`/u/${r.user.id}`} className="flex-1">
                      <p className="font-semibold">{r.user.firstName} {r.user.lastName}</p>
                      <p className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="rounded-full bg-brand-pink/10 px-2 font-bold text-brand-pink">{t('common.lv', { n: r.user.level })}</span>
                        <span className="flex items-center gap-0.5"><Flame size={11} /> {r.user.currentStreak}</span>
                      </p>
                    </Link>
                    {/* Decline existed server-side all along; only Accept was drawn. */}
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      transition={tapSpring}
                      onClick={() => decline.mutate(r.user.id)}
                      aria-label={t('buddies.decline')}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400"
                    >
                      <X size={14} />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      transition={tapSpring}
                      onClick={() => accept.mutate(r.user.id)}
                      className="btn-pill btn-primary flex min-h-[32px] items-center gap-1.5 px-3 py-1 text-xs"
                    >
                      <Zap size={14} /> {t('buddies.accept')}
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'friends' && incoming.length > 0 && (buddies?.length ?? 0) > 0 && (
            <p className="px-1 pt-2 text-sm font-bold uppercase text-gray-400">{t('buddies.title')}</p>
          )}

          <div className="space-y-2">
            {/* One compact row per friend — the 3-button second row doubled every
                card's height and made the page a scroll marathon (user report). */}
            {view === 'friends' && (buddies ?? []).map((b: any) => (
              <div key={b.id} className="flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-sm">
                <Link to={`/u/${b.id}`} className="shrink-0">
                  <MediaImage path={b.avatarUrl} label={b.firstName} className="h-11 w-11 rounded-full" seed={b.id.length} />
                </Link>
                <Link to={`/u/${b.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{b.firstName} {b.lastName}</p>
                  <p className="flex items-center gap-2 text-[11px] text-gray-400">
                    <span className="flex items-center gap-0.5"><Flame size={11} className="text-orange-500" /> {b.currentStreak}</span>
                    <span className="flex items-center gap-0.5"><Zap size={11} className="text-amber-500" /> {b.weeklyXp}</span>
                    <span className="flex items-center gap-0.5"><Dumbbell size={11} /> {b.completions}</span>
                  </p>
                  {/* The buddy's shared goal — knowing what a friend is chasing is
                      the whole point of sharing it. */}
                  {b.goalText && <p className="truncate text-[11px] text-gray-400">🎯 {b.goalText}</p>}
                </Link>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  transition={tapSpring}
                  onClick={() => openInviteSheet(b)}
                  aria-label={L(`Invite ${b.firstName}`, `اعزم ${b.firstName}`)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 active:scale-90"
                >
                  <Footprints size={15} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85, rotate: -6 }}
                  transition={tapSpring}
                  onClick={() => cheer.mutate(b.id)}
                  aria-label={t('buddies.cheer')}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 active:scale-90"
                >
                  <Megaphone size={15} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  transition={tapSpring}
                  onClick={() => message.mutate(b.id)}
                  aria-label={t('buddies.message')}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-brand-blue active:scale-90"
                >
                  <MessageSquare size={15} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  transition={tapSpring}
                  onClick={() => openDuelSheet(b)}
                  aria-label={t('duels.challengeTitle', { name: b.firstName })}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-pink/10 text-brand-pink active:scale-90"
                >
                  <Swords size={15} />
                </motion.button>
              </div>
            ))}
          </div>

          {!incoming.length && !(buddies?.length ?? 0) && (
            <div className="py-16 text-center text-gray-400">
              <p>{t('buddies.empty')}</p>
              <Link to="/people" className="mt-2 inline-block font-semibold text-brand-pink">{t('buddies.emptyHint')} →</Link>
            </div>
          )}
        </div>
      )}

      <Sheet
        open={!!duelTarget}
        onClose={() => setDuelTarget(null)}
        label={duelShown ? t('duels.challengeTitle', { name: duelShown.firstName }) : t('duels.duel')}
      >
        {duelShown && (
          <div className="p-5 pb-8 text-ink">
              <div className="flex items-center gap-3">
                <MediaImage
                  path={duelShown.avatarUrl}
                  label={duelShown.firstName}
                  className="h-12 w-12 shrink-0 rounded-full"
                  seed={duelShown.id?.length}
                />
                <div>
                  <h2 className="text-lg font-bold">{t('duels.challengeTitle', { name: duelShown.firstName })}</h2>
                  <p className="text-xs text-gray-400">{t('duels.title')} ⚔️</p>
                </div>
              </div>

              <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('duels.duel')}</p>
              <div className="mt-2 flex gap-2">
                {([
                  { value: 'workouts' as DuelMetric, label: `💪 ${t('duels.metricWorkouts')}` },
                  { value: 'xp' as DuelMetric, label: `⚡ ${t('duels.metricXp')}` },
                ]).map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setDuelMetric(m.value)}
                    className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                      duelMetric === m.value ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('duels.days')}</p>
              <div className="mt-2 flex gap-2">
                {[3, 7, 14].map((days) => (
                  <button
                    key={days}
                    onClick={() => setDuelDays(days)}
                    className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                      duelDays === days ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {days} {t('duels.days')}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('duels.stake')}</p>
              <div className="mt-2 flex gap-2">
                {([
                  { value: 0, label: t('duels.noStake') },
                  { value: 50, label: '⚡50 XP' },
                  { value: 100, label: '⚡100 XP' },
                ]).map((w) => (
                  <button
                    key={w.value}
                    onClick={() => setDuelWager(w.value)}
                    className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                      duelWager === w.value ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={tapSpring}
                onClick={() => { tapFeedback(); createDuel.mutate(); }}
                disabled={createDuel.isPending}
                className="btn-pill btn-primary mt-6 flex w-full items-center justify-center gap-2 py-3 font-bold disabled:opacity-60"
              >
                {createDuel.isPending ? t('common.loading') : t('duels.send')}
              </motion.button>
          </div>
        )}
      </Sheet>

      {/* ── «اعزمه» — low-pressure activity invite sheet ── */}
      <Sheet
        open={!!inviteTarget}
        onClose={() => setInviteTarget(null)}
        label={inviteShown ? L(`Invite ${inviteShown.firstName}`, `اعزم ${inviteShown.firstName}`) : L('Invite', 'اعزمه')}
      >
        {inviteShown && (
          <div className="p-5 pb-8 text-ink">
            <div className="flex items-center gap-3">
              <MediaImage
                path={inviteShown.avatarUrl}
                label={inviteShown.firstName}
                className="h-12 w-12 shrink-0 rounded-full"
                seed={inviteShown.id?.length}
              />
              <div>
                <h2 className="text-lg font-bold">{L(`Invite ${inviteShown.firstName}`, `اعزم ${inviteShown.firstName}`)} 🤝</h2>
                <p className="text-xs text-gray-400">{L('No scores, no pressure — just company', 'من غير نقط ولا منافسة — رفقة وبس')}</p>
              </div>
            </div>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-gray-400">{L('What are we doing?', 'نعمل إيه؟')}</p>
            <div className="mt-2 flex gap-2">
              {(['walk', 'workout', 'run', 'other'] as InviteKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setInviteKind(k)}
                  className={`min-h-[40px] flex-1 truncate rounded-full px-2 py-2 text-xs font-semibold transition-colors ${
                    inviteKind === k ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {INVITE_EMOJI[k]} {inviteKindLabel(k)}
                </button>
              ))}
            </div>

            <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{L('When?', 'إمتى؟')}</p>
            <input
              value={inviteWhen}
              onChange={(e) => setInviteWhen(e.target.value)}
              maxLength={60}
              placeholder={L('Today at 6, for example', 'النهارده ٦ مثلا')}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
            />

            <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{L('Note (optional)', 'ملاحظة (اختياري)')}</p>
            <input
              value={inviteNote}
              onChange={(e) => setInviteNote(e.target.value)}
              maxLength={200}
              placeholder={L('Meet at the club gate?', 'نتقابل عند باب النادي؟')}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
            />

            <motion.button
              whileTap={{ scale: 0.95 }}
              transition={tapSpring}
              onClick={() => { tapFeedback(); sendInvite.mutate(); }}
              disabled={sendInvite.isPending}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-3 font-bold text-white transition active:scale-[0.97] disabled:opacity-60"
            >
              {sendInvite.isPending ? t('common.loading') : `${L('Send the invite', 'ابعت العزومة')} 🚀`}
            </motion.button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

export default Buddies;
