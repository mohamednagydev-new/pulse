import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Crown, Flame, Copy, LogOut, Swords } from 'lucide-react';
import { api } from '../lib/api';
import { MediaImage, Loader } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';
import { toast } from '../lib/toast';
import { tapFeedback } from '../lib/haptics';

const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  currentStreak: number;
  weekWorkouts: number;
};

export default function SquadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);

  const { data: squad, isLoading } = useQuery({
    queryKey: ['squad', id],
    queryFn: () => api.get(`/api/squads/${id}`),
    refetchInterval: 60_000, // battle totals are live — keep them breathing
    enabled: !!id,
  });

  const [confirmLeave, setConfirmLeave] = useState(false);
  const leave = useMutation({
    mutationFn: () => api.post('/api/squads/leave'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['squad-mine'] });
      qc.removeQueries({ queryKey: ['squad', id] });
      toast(L('You left the squad', 'سبت السكواد'), 'info');
      navigate('/squads', { replace: true });
    },
    onError: (e: any) => toast(e?.message || 'Error', 'error'),
  });

  if (isLoading || !squad) {
    return (
      <div className="relative min-h-screen">
        <AmbientBg tone="warm" />
        <TopBar title={L('Squad', 'السكواد')} color="fitness-hero" textColor="text-white" fallback="/squads" />
        {isLoading ? <Loader /> : (
          <p className="px-4 py-16 text-center text-gray-400">{L('Squad not found', 'السكواد ده مش موجود')}</p>
        )}
      </div>
    );
  }

  const members: Member[] = squad.members ?? [];
  const topId = members[0]?.weekWorkouts > 0 ? members[0].id : null;
  const battle = squad.battle;
  const total = battle ? battle.us.total + battle.them.total : 0;
  const usPct = battle ? (total === 0 ? 50 : (battle.us.total / total) * 100) : 50;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(squad.inviteCode);
      toast(L('Code copied!', 'الكود اتنسخ!'), 'success');
    } catch {
      toast(squad.inviteCode, 'info');
    }
  };

  return (
    <div className="relative min-h-screen pb-8">
      <AmbientBg tone="warm" />
      <TopBar title={L('Squad', 'السكواد')} color="fitness-hero" textColor="text-white" fallback="/squads" />

      <div className="space-y-3 px-4 pt-2">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-1">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm" aria-hidden>
            {squad.emoji ?? '⚔️'}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold">{squad.name}</h1>
            <p className="text-xs text-gray-400">
              {squad.memberCount}/{squad.maxMembers} {L('members', 'عضو')}
            </p>
          </div>
        </div>

        {/* ── THIS WEEK'S BATTLE — front and center ── */}
        {battle ? (
          <div className="scene-tex rounded-2xl bg-gradient-to-br from-indigo-600/90 to-violet-800/85 p-4 text-white shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-white/70">
              <span className="flex items-center gap-1"><Swords size={12} /> {L("This week's battle", 'معركة الأسبوع')}</span>
              <span>
                {battle.daysLeft > 0
                  ? `${battle.daysLeft} ${L('days left', 'يوم فاضل')}`
                  : L('last day!', 'آخر يوم!')}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="min-w-0 flex-1 text-center">
                <p className="text-2xl" aria-hidden>{battle.us.emoji ?? '⚔️'}</p>
                <p className="truncate text-xs font-semibold text-white/85">{battle.us.name}</p>
                <p className={`text-3xl font-extrabold ${battle.us.total >= battle.them.total ? 'text-amber-300' : 'text-white/80'}`}>
                  {battle.us.total}
                </p>
              </div>
              <span className="shrink-0 text-sm font-extrabold text-white/60">VS</span>
              <div className="min-w-0 flex-1 text-center">
                <p className="text-2xl" aria-hidden>{battle.them.emoji ?? '🛡️'}</p>
                <p className="truncate text-xs font-semibold text-white/85">{battle.them.name}</p>
                <p className={`text-3xl font-extrabold ${battle.them.total >= battle.us.total ? 'text-amber-300' : 'text-white/80'}`}>
                  {battle.them.total}
                </p>
              </div>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/20">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
                initial={false}
                animate={{ width: `${usPct}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
            <p className="mt-2 text-center text-[11px] text-white/70">
              {L('Every workout by any member counts. Winners get +100 XP each.', 'كل تمرينة من أي عضو بتتحسب. الفريق الكسبان كل واحد فيه ياخد +100 XP.')}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/70 p-4 text-center text-sm text-gray-500 shadow-sm">
            ⚔️ {squad.memberCount >= 2
              ? L('No battle this week yet — pairing happens every Saturday.', 'لسه مفيش معركة الأسبوع ده — القرعة كل يوم سبت.')
              : L('You need at least 2 members to enter the weekly battles — invite a friend!', 'محتاجين عضوين على الأقل عشان تدخلوا المعارك الأسبوعية — اعزم صاحبك!')}
          </div>
        )}

        {/* ── Members — this week's workouts + streaks ── */}
        <div>
          <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            {L('Members — this week', 'الأعضاء — الأسبوع ده')}
          </p>
          <div className="space-y-2">
            {members.map((m, idx) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28, delay: Math.min(idx, 6) * 0.05 }}
                className={`flex items-center gap-3 rounded-2xl p-3 shadow-sm ${
                  m.id === topId ? 'bg-gradient-to-r from-amber-100/80 via-amber-50 to-white' : 'bg-white'
                }`}
              >
                <span className="relative shrink-0">
                  <MediaImage path={m.avatarUrl} label={m.firstName} className="h-10 w-10 rounded-full" seed={m.id.length} />
                  {m.id === topId && (
                    <Crown size={16} className="absolute -top-2 start-1/2 -translate-x-1/2 text-amber-500 rtl:translate-x-1/2" />
                  )}
                </span>
                <p className="min-w-0 flex-1 truncate font-semibold">
                  {m.firstName} {m.lastName}
                </p>
                <span className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                  <Flame size={13} className="text-orange-500" /> {m.currentStreak}
                </span>
                <span className="shrink-0 text-end">
                  <span className="block font-extrabold text-brand-pink">{m.weekWorkouts}</span>
                  <span className="block text-[10px] text-gray-400">{L('workouts', 'تمرينة')}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Invite (members only) ── */}
        {squad.isMember && squad.inviteCode && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              {L('Invite friends', 'اعزم صحابك')} · {squad.memberCount}/{squad.maxMembers}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={copyCode}
                className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-2.5"
              >
                <span className="text-lg font-extrabold tracking-[0.3em]">{squad.inviteCode}</span>
                <Copy size={14} className="shrink-0 text-gray-400" />
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(squad.shareText ?? squad.inviteCode)}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => tapFeedback()}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white active:scale-95"
              >
                WhatsApp 💬
              </a>
            </div>
          </div>
        )}

        {/* ── Leave (members only, confirmed) ── */}
        {squad.isMember && (
          confirmLeave ? (
            <div className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-red-200">
              <p className="min-w-0 flex-1 text-sm text-gray-600">
                {L('Leave the squad? Your workouts stop counting for it.', 'تسيب السكواد؟ تمريناتك هتبطل تتحسب ليه.')}
              </p>
              <motion.button
                whileTap={{ scale: 0.92 }}
                transition={tapSpring}
                onClick={() => leave.mutate()}
                disabled={leave.isPending}
                className="shrink-0 rounded-full bg-red-500 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {L('Leave', 'اسيبه')}
              </motion.button>
              <button
                onClick={() => setConfirmLeave(false)}
                className="btn-pill btn-ghost shrink-0 px-3 py-1.5 text-xs"
              >
                {L('Stay', 'أكمل')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-bold text-gray-400"
            >
              <LogOut size={13} /> {L('Leave squad', 'اسيب السكواد')}
            </button>
          )
        )}
      </div>
    </div>
  );
}
