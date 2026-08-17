import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageSquare, Swords, Plus, Trash2, Share2, KeyRound, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { WaIcon, waOpen } from '../components/WaShare';
import { Loader, MediaImage } from '../components/ui';
import Sheet from '../components/Sheet';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';
import ShareCardButton from '../components/ShareCardButton';
import { shareMilestone } from '../lib/shareCard';
import CountUp from '../components/CountUp';
import { toast } from '../lib/toast';
import { tapFeedback } from '../lib/haptics';
import { CurlAnim } from '../components/TrainingAnim';
import { CarryAnim } from '../components/MoveAnims';
import { WaterAnim, FlameAnim, TrophyAnim } from '../components/MicroAnims';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;
const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;

/** goalType → animated icon for cover-less challenge cards. Keyed loosely on
 *  purpose: the server may grow goal types beyond the current union. */
const GOAL_ANIM: Record<string, (p: { className?: string }) => JSX.Element> = {
  lessons: CurlAnim,
  workout: CurlAnim,
  water: WaterAnim,
  streak: FlameAnim,
  xp: TrophyAnim,
  calories: FlameAnim,
  lifts: CarryAnim,
  walk: CarryAnim,
};

type ChallengeKind = 'global' | 'personal' | 'group';
type GoalType = 'lessons' | 'streak' | 'calories' | 'water' | 'lifts' | 'xp' | 'walk';

type Challenge = {
  id: string;
  kind: ChallengeKind;
  title: string;
  description?: string | null;
  goalType: GoalType;
  goalValue: number;
  myProgress: number;
  participantCount: number;
  joined: boolean;
  isMine: boolean;
  ownerId?: string | null;
  inviteCode?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  sponsorName?: string | null;
  sponsorUrl?: string | null;
  coverImage?: string | null;
};

const GOAL_OPTIONS: { value: GoalType; emoji: string; labelKey: string; def: number }[] = [
  { value: 'lessons', emoji: '💪', labelKey: 'challenges.workouts', def: 12 },
  { value: 'streak', emoji: '🔥', labelKey: 'challenges.streakDays', def: 7 },
  { value: 'calories', emoji: '⚡', labelKey: 'challenges.calories', def: 5000 },
  // The three goal types the server always supported and users could never create:
  { value: 'water', emoji: '💧', labelKey: 'challenges.waterGlasses', def: 40 },
  { value: 'lifts', emoji: '🏋️', labelKey: 'challenges.liftSets', def: 15 },
  { value: 'xp', emoji: '🎯', labelKey: 'challenges.xpPoints', def: 300 },
  // labelKey '' → bilingual inline label (locale JSON is frozen; see goalLabel).
  { value: 'walk', emoji: '🚶', labelKey: '', def: 10 },
];

const DURATIONS = [7, 14, 30, 60, 90];

function daysLeftOf(endsOn?: string | null): number | null {
  if (!endsOn) return null;
  const ms = new Date(endsOn).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

export default function Achievements() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: badges, isLoading } = useQuery({ queryKey: ['badges'], queryFn: () => api.get('/api/gamification/badges') });
  const { data: challenges } = useQuery<Challenge[]>({ queryKey: ['challenges'], queryFn: () => api.get('/api/gamification/challenges') });
  const { data: weekly } = useQuery({ queryKey: ['weekly-lb'], queryFn: () => api.get('/api/social/leaderboard/weekly') });

  const [tab, setTab] = useState<'mine' | 'global'>('mine');
  const [sheet, setSheet] = useState<null | 'create'>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');

  // create form
  const [kind, setKind] = useState<'personal' | 'group'>('personal');
  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('lessons');
  const [goalValue, setGoalValue] = useState(12);
  const [durationDays, setDurationDays] = useState(30);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['challenges'] });

  const goalLabel = (g: GoalType) => {
    if (g === 'walk') return L('walks', 'مشاوير مشي');
    return t(GOAL_OPTIONS.find((o) => o.value === g)?.labelKey || 'challenges.workouts');
  };

  const openCreate = () => {
    setKind('personal');
    setTitle('');
    setGoalType('lessons');
    setGoalValue(12);
    setDurationDays(30);
    setCreatedCode(null);
    setSheet('create');
  };

  const join = useMutation({
    mutationFn: (id: string) => api.post(`/api/gamification/challenges/${id}/join`),
    onSuccess: () => {
      tapFeedback();
      invalidate();
      toast(t('challenges.joined'), 'success');
    },
    onError: (e: any) => toast(e?.message || 'Could not join', 'error'),
  });

  const create = useMutation({
    mutationFn: () => api.post('/api/gamification/challenges', { kind, title: title.trim(), goalType, goalValue, durationDays }),
    onSuccess: (res: any) => {
      tapFeedback();
      invalidate();
      toast(t('challenges.created'), 'success');
      setTab('mine');
      const inviteCode = res?.inviteCode ?? res?.challenge?.inviteCode ?? null;
      if (inviteCode) setCreatedCode(inviteCode);
      else setSheet(null);
    },
    onError: (e: any) => toast(e?.message || 'Could not create challenge', 'error'),
  });

  const joinByCode = useMutation({
    mutationFn: (c: string) => api.post('/api/gamification/challenges/join-code', { code: c.trim().toUpperCase() }),
    onSuccess: () => {
      tapFeedback();
      invalidate();
      toast(t('challenges.joined'), 'success');
      setCode('');
      setShowCodeInput(false);
      setTab('mine');
    },
    onError: (e: any) => toast(e?.message || 'Could not join', 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/gamification/challenges/${id}`),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast(e?.message || 'Could not delete', 'error'),
  });

  /** Prefilled Arabic invite for WhatsApp — the channel Egyptian invites
   *  actually travel on. */
  const waInviteText = (inviteCode: string) =>
    `تعالى اتحدى معايا على PULSE 💪\nادخل بكود: ${inviteCode}\n${window.location.origin} — مجاني ١٠٠٪`;

  const shareInvite = async (inviteCode: string) => {
    const text = `Join my challenge on PULSE — code: ${inviteCode}`;
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'PULSE', text, url });
      } catch {
        /* user cancelled the share sheet */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast(t('deals.copied'), 'success');
    } catch {
      toast(t('common.copyFailed'), 'error');
    }
  };

  const list = useMemo(() => {
    const all = challenges ?? [];
    if (tab === 'global') return all.filter((c) => c.kind === 'global');
    return all.filter((c) => c.kind !== 'global' && (c.joined || c.isMine));
  }, [challenges, tab]);

  if (isLoading) return <Loader />;

  const kindChip = (c: Challenge) =>
    c.kind === 'personal'
      ? { emoji: '🎯', label: t('challenges.personal'), cls: 'bg-brand-pink/10 text-brand-pink' }
      : c.kind === 'group'
        ? { emoji: '👥', label: t('challenges.group'), cls: 'bg-brand-blue/10 text-brand-blue' }
        : { emoji: '🌍', label: t('challenges.global'), cls: 'bg-gray-100 text-gray-500' };

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <AmbientBg tone="cool" />
      <TopBar title={t('achievements.title')} color="fitness-hero" textColor="text-white" />

      {!!weekly?.length && (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mx-4 mb-5 rounded-2xl bg-white p-4 shadow-sm"
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('home2.thisWeek')}</p>
          <h2 className="mb-3 font-bold">XP leaderboard</h2>
          <div className="space-y-2">
            {weekly.slice(0, 5).map((r: any, i: number) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring, delay: 0.1 + i * 0.05 }}
                className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${r.isMe ? 'bg-brand-pink/5' : ''}`}
              >
                <span className="w-6 shrink-0 text-center text-sm font-bold">{r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank - 1] : r.rank}</span>
                <MediaImage path={r.avatarUrl} label={r.firstName} className="h-8 w-8 shrink-0 rounded-full" seed={r.rank} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.firstName} {r.lastName}{r.isMe ? ` (${t('battle.you')})` : ''}</span>
                <span className="shrink-0 text-sm font-bold text-brand-pink">{r.xp} XP</span>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Challenges hub — ABOVE the badge wall. Challenges (and the marketing
          join-code, e.g. PULSE14) are actionable; badges are a trophy case that
          was burying them below the fold. ── */}
      <section className="px-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('battle.compete')}</p>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate font-bold">{t('challenges.title')}</h2>
          <motion.button
            whileTap={{ scale: 0.94 }}
            transition={tapSpring}
            onClick={openCreate}
            className="btn-pill btn-primary flex min-h-[36px] shrink-0 items-center gap-1 px-3.5 py-1.5 text-sm"
          >
            <Plus size={15} /> {t('challenges.create')}
          </motion.button>
        </div>

        {/* segmented control */}
        <div className="flex gap-1 rounded-full bg-gray-100 p-1">
          {(['mine', 'global'] as const).map((seg) => (
            <button
              key={seg}
              onClick={() => setTab(seg)}
              className="relative min-h-[36px] flex-1 rounded-full px-2 text-sm font-semibold"
            >
              {tab === seg && (
                <motion.span layoutId="chal-tab" transition={spring} className="absolute inset-0 rounded-full bg-white shadow-sm" />
              )}
              <span className={`relative z-10 block truncate ${tab === seg ? 'text-ink' : 'text-gray-500'}`}>
                {t(`challenges.${seg}`)}
              </span>
            </button>
          ))}
          <button
            onClick={() => navigate('/buddies')}
            className="relative flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-full px-2 text-sm font-semibold text-gray-500"
          >
            <Swords size={15} className="shrink-0" />
            <span className="truncate">{t('challenges.oneVsOne')}</span>
          </button>
        </div>

        {/* join with a code */}
        <div className="mt-2 flex justify-center">
          <button
            onClick={() => setShowCodeInput((v) => !v)}
            className="flex items-center gap-1 py-1.5 text-xs font-semibold text-brand-blue"
          >
            <KeyRound size={13} /> {t('challenges.joinCode')}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {showCodeInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mb-1 flex gap-2 pt-1">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={t('challenges.enterCode')}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  className="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold tracking-widest outline-none focus:border-brand-pink"
                />
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  transition={tapSpring}
                  disabled={!code.trim() || joinByCode.isPending}
                  onClick={() => joinByCode.mutate(code)}
                  className="btn-pill btn-primary shrink-0 px-4 py-2 text-sm disabled:opacity-50"
                >
                  {joinByCode.isPending ? t('common.loading') : t('challenges.start')}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* cards */}
        <div className="mt-3 space-y-3">
          {list.length === 0 && (
            <p className="rounded-2xl bg-white/60 p-5 text-center text-sm text-gray-400">{t('challenges.empty')}</p>
          )}
          {list.map((c, i) => {
            const chip = kindChip(c);
            const left = daysLeftOf(c.endsOn);
            const pct = c.goalValue > 0 ? Math.min(100, Math.max(0, (c.myProgress / c.goalValue) * 100)) : 0;
            const showProgress = c.joined || c.isMine;
            const GoalAnim = c.coverImage ? undefined : GOAL_ANIM[c.goalType];
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                transition={{ ...spring, delay: Math.min(i, 3) * 0.05 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate(`/challenge/${c.id}`)}
                className="card-hover cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                {c.coverImage && <MediaImage path={c.coverImage} label={c.title} className="h-28 w-full" seed={c.title.length} />}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {GoalAnim && (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink" aria-hidden>
                        <GoalAnim className="h-8 w-8" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${chip.cls}`}>
                          {chip.emoji} {chip.label}
                        </span>
                        {left === 0 ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">{t('challenges.ended')}</span>
                        ) : left !== null ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                            {t('challenges.daysLeft', { n: left })}
                          </span>
                        ) : null}
                        {c.sponsorName && (
                          <span className="max-w-full truncate rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-blue">
                            {c.sponsorName}
                          </span>
                        )}
                      </div>
                      <p className="break-words font-bold">{c.title}</p>
                      {c.description && <p className="line-clamp-2 text-sm text-gray-500">{c.description}</p>}
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                        <span className="font-semibold text-gray-500">
                          {t('challenges.goal')}: {c.goalValue} {goalLabel(c.goalType)}
                        </span>
                        {c.kind !== 'personal' && (
                          <span className="flex items-center gap-1"><Users size={12} /> {c.participantCount}</span>
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {c.isMine && (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          transition={tapSpring}
                          aria-label={t('challenges.deleteConfirm')}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(t('challenges.deleteConfirm'))) remove.mutate(c.id);
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400"
                        >
                          <Trash2 size={15} />
                        </motion.button>
                      )}
                      {showProgress ? (
                        <Link
                          to={`/challenge/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex min-h-[40px] items-center gap-1 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
                        >
                          <MessageSquare size={15} /> Open
                        </Link>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          transition={tapSpring}
                          onClick={(e) => { e.stopPropagation(); join.mutate(c.id); }}
                          className="btn-pill btn-primary px-4 py-2 text-sm"
                        >
                          Join
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {showProgress && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-gray-400">
                        <span>{t('challenges.progress')}</span>
                        <span className="text-brand-pink">{c.myProgress}/{c.goalValue}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pct}%` }}
                          viewport={{ once: true }}
                          transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.15 }}
                          className="h-full rounded-full bg-gradient-to-r from-brand-pink to-pink-400"
                        />
                      </div>
                    </div>
                  )}

                  {c.isMine && c.inviteCode && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); void shareInvite(c.inviteCode as string); }}
                        className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-brand-blue"
                      >
                        <Share2 size={13} /> {t('challenges.invite')}: <span className="tracking-widest">{c.inviteCode}</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); waOpen(waInviteText(c.inviteCode as string)); }}
                        aria-label="WhatsApp"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white transition active:scale-90"
                      >
                        <WaIcon size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="mt-7 px-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate font-bold">Badges · <CountUp value={badges?.earnedCount ?? 0} /> earned</h2>
          {(badges?.earnedCount ?? 0) > 0 && (
            <ShareCardButton emoji="🏆" title={`${badges.earnedCount} badges earned`} subtitle="on my fitness journey" />
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(badges?.badges ?? []).map((b: any, i: number) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '0px 0px -40px 0px' }}
              transition={{ ...spring, delay: (i % 3) * 0.06 }}
              whileTap={b.earned ? { scale: 0.94 } : undefined}
              onClick={b.earned ? () => void shareMilestone({ kind: 'badge', title: t('share.badge'), value: b.title, subtitle: b.description, emoji: b.icon ?? '🏅', savedMsg: t('share.saved') }) : undefined}
              className={`flex flex-col items-center gap-1 rounded-2xl bg-white p-4 text-center shadow-sm ${b.earned ? 'cursor-pointer' : 'opacity-45 grayscale'}`}
            >
              <span className="text-3xl">{b.icon ?? '🏅'}</span>
              <span className="text-xs font-semibold leading-tight">{b.title}</span>
              {b.description && <span className="text-[10px] text-gray-400">{b.description}</span>}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Create challenge sheet ─────────────────────────────────── */}
      <Sheet open={sheet === 'create'} onClose={() => setSheet(null)} label={t('challenges.create')}>
        <div className="p-5 pb-8 text-ink">
              {createdCode ? (
                <div className="text-center">
                  <motion.p initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={spring} className="text-5xl">🎯</motion.p>
                  <h2 className="mt-2 text-lg font-bold">{t('challenges.created')}</h2>
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('challenges.invite')}</p>
                  <p className="mt-1 text-3xl font-extrabold tracking-[0.3em] text-brand-pink">{createdCode}</p>
                  <button
                    onClick={() => waOpen(waInviteText(createdCode))}
                    className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#25D366] font-bold text-white transition active:scale-[0.97]"
                  >
                    <WaIcon size={18} /> WhatsApp
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    transition={tapSpring}
                    onClick={() => void shareInvite(createdCode)}
                    className="btn-pill btn-primary mt-2 flex w-full items-center justify-center gap-2 py-3 font-bold"
                  >
                    <Share2 size={17} /> {t('challenges.shareInvite')}
                  </motion.button>
                  <button onClick={() => setSheet(null)} className="mt-3 w-full py-2 text-sm font-semibold text-gray-400">
                    {t('common.close', { defaultValue: 'Close' })}
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold">{t('challenges.create')}</h2>

                  <div className="mt-4 flex gap-2">
                    {([
                      { value: 'personal' as const, label: `🎯 ${t('challenges.personal')}` },
                      { value: 'group' as const, label: `👥 ${t('challenges.group')}` },
                    ]).map((k) => (
                      <button
                        key={k.value}
                        onClick={() => setKind(k.value)}
                        className={`min-h-[40px] flex-1 truncate rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                          kind === k.value ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>

                  <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('challenges.title')}</p>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={60}
                    placeholder={t('challenges.create')}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-pink"
                  />

                  <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('challenges.goal')}</p>
                  {/* Wrap: 7 goal types no longer fit one flex row. */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {GOAL_OPTIONS.map((g) => (
                      <button
                        key={g.value}
                        onClick={() => { setGoalType(g.value); setGoalValue(g.def); }}
                        className={`min-h-[40px] flex-1 basis-[30%] truncate rounded-full px-2 py-2 text-xs font-semibold transition-colors ${
                          goalType === g.value ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {g.emoji} {g.value === 'walk' ? L('Walk', 'مشي') : t(g.labelKey)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={goalValue}
                      onChange={(e) => setGoalValue(Math.max(1, Number(e.target.value) || 0))}
                      className="w-28 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-pink"
                    />
                    <span className="min-w-0 truncate text-sm text-gray-400">{goalLabel(goalType)}</span>
                  </div>

                  <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('challenges.duration')}</p>
                  <div className="mt-2 flex gap-1.5">
                    {DURATIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() => setDurationDays(d)}
                        className={`min-h-[40px] flex-1 truncate rounded-full px-1 py-2 text-xs font-semibold transition-colors ${
                          durationDays === d ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {d} {t('challenges.days')}
                      </button>
                    ))}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    transition={tapSpring}
                    disabled={!title.trim() || goalValue < 1 || create.isPending}
                    onClick={() => { tapFeedback(); create.mutate(); }}
                    className="btn-pill btn-primary mt-6 flex w-full items-center justify-center gap-2 py-3 font-bold disabled:opacity-60"
                  >
                    {create.isPending ? t('common.loading') : t('challenges.start')}
                  </motion.button>
                </>
              )}
        </div>
      </Sheet>
    </div>
  );
}
