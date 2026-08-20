import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Swords, Users, Trophy, KeyRound } from 'lucide-react';
import { api } from '../lib/api';
import { Loader } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';
import { toast } from '../lib/toast';
import { tapFeedback } from '../lib/haptics';

const tapSpring = { type: 'spring', stiffness: 500, damping: 30 } as const;
const EMOJIS = ['⚔️', '🔥', '💪', '🦁', '🐺', '🚀', '🏆', '😤'];

type GymRow = { gymId: string; name: string; nameAr?: string | null; members: number; workouts: number };

export default function Squads() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);

  const { data: mine, isLoading } = useQuery({
    queryKey: ['squad-mine'],
    queryFn: () => api.get('/api/squads/mine'),
  });
  const { data: gymLeague } = useQuery({
    queryKey: ['gym-league'],
    queryFn: () => api.get('/api/squads/gym-league/table'),
  });

  // Already in a squad → this page's job is done; the squad page takes over.
  useEffect(() => {
    if (mine?.id) navigate(`/squads/${mine.id}`, { replace: true });
  }, [mine?.id, navigate]);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [code, setCode] = useState('');

  const create = useMutation({
    mutationFn: () => api.post('/api/squads', { name: name.trim(), emoji }),
    onSuccess: (r: any) => {
      tapFeedback();
      qc.invalidateQueries({ queryKey: ['squad-mine'] });
      toast(L('Squad created! Invite your friends ⚔️', 'السكواد اتعمل! اعزم صحابك ⚔️'), 'success');
      navigate(`/squads/${r.id}`, { replace: true });
    },
    onError: (e: any) => toast(e?.message || L('Could not create squad', 'السكواد ما اتعملش'), 'error'),
  });

  const join = useMutation({
    mutationFn: () => api.post('/api/squads/join', { code: code.trim() }),
    onSuccess: (r: any) => {
      tapFeedback();
      qc.invalidateQueries({ queryKey: ['squad-mine'] });
      toast(L('Welcome to the squad! 🎉', 'أهلا بيك في السكواد! 🎉'), 'success');
      navigate(`/squads/${r.id}`, { replace: true });
    },
    onError: (e: any) => toast(e?.message || L('Could not join', 'ما قدرناش نضمك'), 'error'),
  });

  const table: GymRow[] = gymLeague?.table ?? [];

  return (
    <div className="relative min-h-screen pb-8">
      <AmbientBg tone="warm" />
      <TopBar title={L('Squads', 'السكواد')} color="fitness-hero" textColor="text-white" fallback="/buddies" />

      {isLoading || mine?.id ? (
        <Loader />
      ) : (
        <div className="space-y-3 px-4 pt-2">
          {/* ── Hero — what a squad IS, in one breath. ── */}
          <div className="scene-tex rounded-2xl bg-gradient-to-br from-indigo-600/90 to-violet-800/85 p-4 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl" aria-hidden>
                ⚔️
              </span>
              <div className="min-w-0">
                <p className="text-lg font-extrabold leading-tight">{L('Squads', 'السكواد')}</p>
                <p className="text-[12px] text-white/85">
                  {L('2-8 friends. One team. Weekly battles against other squads.', 'من ٢ لـ٨ صحاب. فريق واحد. معارك أسبوعية ضد سكوادات تانية.')}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-white/70">
              {L('Every workout any member logs counts for the squad. Most workouts by Friday wins — winners take +100 XP each.', 'كل تمرينة من أي عضو بتتحسب للسكواد. اللي يعمل تمارين أكتر لحد الجمعة يكسب — وكل واحد في الفريق الكسبان ياخد +100 XP.')}
            </p>
          </div>

          {/* ── Create ── */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
              <Users size={12} /> {L('Create a squad', 'اعمل سكواد')}
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder={L('Squad name', 'اسم السكواد')}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-pink"
            />
            <div className="mt-2 flex gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  aria-label={e}
                  className={`flex h-9 flex-1 items-center justify-center rounded-xl text-lg transition ${
                    emoji === e ? 'bg-brand-pink/15 ring-2 ring-brand-pink' : 'bg-gray-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              transition={tapSpring}
              onClick={() => { tapFeedback(); create.mutate(); }}
              disabled={create.isPending || name.trim().length < 2}
              className="btn-pill btn-primary mt-3 flex w-full items-center justify-center gap-2 py-2.5 font-bold disabled:opacity-50"
            >
              <Swords size={16} /> {L('Create squad', 'اعمل السكواد')}
            </motion.button>
          </div>

          {/* ── Join by code ── */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
              <KeyRound size={12} /> {L('Got an invite code?', 'معاك كود دعوة؟')}
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="AB12CD"
                className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-center text-sm font-extrabold uppercase tracking-[0.3em] outline-none focus:border-brand-pink"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={tapSpring}
                onClick={() => { tapFeedback(); join.mutate(); }}
                disabled={join.isPending || code.trim().length < 4}
                className="btn-pill btn-primary shrink-0 px-5 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {L('Join', 'انضم')}
              </motion.button>
            </div>
          </div>

          {/* ── 🏆 Gym league — this month's gyms table ── */}
          <div className="pt-2">
            <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{L('This month', 'الشهر ده')}</p>
            <h2 className="flex items-center gap-1.5 px-1 pb-2 font-bold">
              <Trophy size={16} className="text-amber-500" /> {L('Gym league', 'دوري الجيمات')} 🏆
            </h2>
            <div className="space-y-2">
              {table.length === 0 && (
                <p className="rounded-2xl bg-white/60 p-3 text-sm text-gray-400">
                  {L('No gym workouts yet this month — the table fills as members train.', 'لسه مفيش تمارين جيمات الشهر ده — الجدول بيتملي أول ما الأعضاء يتمرنوا.')}
                </p>
              )}
              {table.map((g, idx) => (
                <motion.div
                  key={g.gymId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 28, delay: Math.min(idx, 6) * 0.05 }}
                  className={`flex items-center gap-3 rounded-2xl p-3 shadow-sm ${
                    idx === 0 ? 'bg-gradient-to-r from-amber-100/80 via-amber-50 to-white' : 'bg-white'
                  }`}
                >
                  <span className="w-6 shrink-0 text-center text-sm font-extrabold text-gray-400">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{(isAr && g.nameAr) || g.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {g.members} {L('members', 'عضو')}
                    </p>
                  </div>
                  <span className="shrink-0 text-end">
                    <span className="block font-extrabold text-brand-pink">{g.workouts}</span>
                    <span className="block text-[10px] text-gray-400">{L('workouts', 'تمرينة')}</span>
                  </span>
                </motion.div>
              ))}
            </div>
            <p className="px-1 pt-2 text-center text-[11px] text-gray-400">
              💪 {L('Your workouts count for your gym', 'تمريناتك بتتحسب لجيمك')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
