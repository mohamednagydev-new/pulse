import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BadgeCheck, Dumbbell, MapPin, PartyPopper, Sparkles, UserCheck, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import { MediaImage, Loader, EmptyState } from '../components/ui';
import ScreenHeader from '../components/ScreenHeader';
import Confetti from '../components/Confetti';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

type Preview =
  | { type: 'coach'; name: string; avatarUrl: string | null; headline: string | null; verified: boolean; clients: number }
  | { type: 'gym'; name: string; nameAr: string | null; logo: string | null; city: string | null; members: number };

type RedeemResult =
  | { type: 'coach' | 'gym'; redeemed: true; target: { id: string; name: string } }
  | { alreadyInGym: true; current: { name: string; nameAr: string | null } };

const PENDING_KEY = 'pulse-pending-invite';

/** Invite landing — a coach's or gym's link/QR. Guest-browsable: a newcomer
 *  sees who invited them BEFORE being asked to sign up, and the code survives
 *  registration via localStorage so they land pre-connected. */
export default function InvitePage() {
  const { code = '' } = useParams();
  const isGymPath = useLocation().pathname.startsWith('/invite/g/');
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const { status } = useAuth();

  const [done, setDone] = useState<{ type: string; target: { id: string; name: string } } | null>(null);
  const [conflict, setConflict] = useState<{ name: string; nameAr: string | null } | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const { data: preview, isLoading, isError } = useQuery<Preview>({
    queryKey: ['org-invite', code],
    queryFn: () => api.get(`/api/org/invite/${encodeURIComponent(code)}`),
    enabled: !!code,
    retry: 1,
  });

  const redeem = useMutation<RedeemResult, Error, { code: string; force?: boolean }>({
    mutationFn: (vars) => api.post(`/api/org/invite/${encodeURIComponent(vars.code)}/redeem${vars.force ? '?force=1' : ''}`),
    onSuccess: (r) => {
      if ('alreadyInGym' in r && r.alreadyInGym) {
        setConflict(r.current);
        return;
      }
      if ('redeemed' in r) {
        setConflict(null);
        setDone({ type: r.type, target: r.target });
        setCelebrate(true);
      }
    },
  });

  // Deferred redeem: the code a guest saved before registering gets cashed in
  // the moment they come back here signed-in.
  useEffect(() => {
    if (status !== 'authed') return;
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return;
    localStorage.removeItem(PENDING_KEY);
    try {
      const p = JSON.parse(raw) as { code?: string };
      if (p?.code) redeem.mutate({ code: p.code });
    } catch {
      /* corrupt entry — already removed */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const savePendingAndGo = (to: '/register' | '/login') => {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ code, gym: isGymPath }));
    navigate(to);
  };

  const isGym = preview?.type === 'gym';
  const displayName = preview ? (isGym && isAr && (preview as any).nameAr ? (preview as any).nameAr : preview.name) : '';

  const benefits = isGym
    ? [
        { icon: <Users size={18} />, text: L('Compete on your gym’s own leaderboard', 'نافس صحابك على ليدربورد الجيم بتاعكم') },
        { icon: <Dumbbell size={18} />, text: L('Log workouts, lifts and streaks in one app', 'سجل تمرينك وأوزانك وستريكك في مكان واحد') },
        { icon: <Sparkles size={18} />, text: L('Gym challenges, deals and events', 'تحديات وعروض وفعاليات خاصة بالجيم') },
      ]
    : [
        { icon: <UserCheck size={18} />, text: L('Your coach follows your training day by day', 'مدربك بيتابع تمرينك يوم بيوم') },
        { icon: <Dumbbell size={18} />, text: L('Programs assigned just for you', 'برامج معمولة ليك مخصوص') },
        { icon: <Sparkles size={18} />, text: L('Motivation, streaks and XP to keep you going', 'تشجيع وستريك ونقط XP تخليك مستمر') },
      ];

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}

      <ScreenHeader tone={isGym ? 'teal' : 'violet'} padBottom="pb-8">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-2xl font-extrabold"
        >
          {L('You’re invited!', 'انت معزوم!')}
        </motion.h1>
        <p className="mt-1 text-sm text-white/80">
          {isGym ? L('Your gym is on PULSE', 'جيمك على بالس') : L('Your coach is on PULSE', 'مدربك على بالس')}
        </p>
      </ScreenHeader>

      {isLoading && <Loader />}

      {isError && (
        <EmptyState
          icon={<Sparkles size={40} />}
          title={L('This invite link is not valid', 'لينك الدعوة ده مش شغال')}
          hint={L('Ask for a fresh link and try again.', 'اطلب لينك جديد وجرب تاني.')}
          action={
            <button onClick={() => navigate('/')} className="min-h-11 rounded-full bg-gray-900 px-6 font-semibold text-white">
              {L('Go home', 'الرئيسية')}
            </button>
          }
        />
      )}

      {preview && !done && (
        <div className="px-4 pt-4">
          {/* Hero card — who invited you */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className={`scene-tex rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg ${
              isGym ? 'from-teal-500/90 to-cyan-700/80' : 'from-violet-500/90 to-purple-700/80'
            }`}
          >
            <div className="flex items-center gap-4">
              <MediaImage
                path={isGym ? (preview as any).logo : (preview as any).avatarUrl}
                label={displayName}
                className="h-16 w-16 shrink-0 rounded-full border-2 border-white/40 bg-white/20"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="truncate text-lg font-extrabold">{displayName}</h2>
                  {!isGym && (preview as any).verified && <BadgeCheck size={18} className="shrink-0 text-emerald-300" />}
                </div>
                {!isGym && (preview as any).headline && (
                  <p className="truncate text-sm text-white/85">{(preview as any).headline}</p>
                )}
                {isGym && (preview as any).city && (
                  <p className="flex items-center gap-1 text-sm text-white/85">
                    <MapPin size={14} /> {(preview as any).city}
                  </p>
                )}
                <p className="mt-1 text-xs text-white/75">
                  {isGym
                    ? L(`${(preview as any).members} members on PULSE`, `${(preview as any).members} عضو على بالس`)
                    : L(`${(preview as any).clients} clients training with them`, `${(preview as any).clients} متدرب بيتمرنوا معاه`)}
                </p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20">
                {isGym ? <Dumbbell size={20} /> : <UserCheck size={20} />}
              </span>
            </div>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.08 }}
            className="mt-4 space-y-2"
          >
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white ${isGym ? 'bg-teal-500' : 'bg-violet-500'}`}>
                  {b.icon}
                </span>
                <p className="text-sm font-medium text-gray-700">{b.text}</p>
              </div>
            ))}
          </motion.div>

          {/* Gym-switch confirm */}
          {conflict && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"
            >
              <p className="text-sm font-semibold text-amber-800">
                {L(
                  `You're already a member of ${conflict.name}. Switch to ${preview.name}?`,
                  `انت متسجل في ${isAr && conflict.nameAr ? conflict.nameAr : conflict.name}. تحب تتحول لـ${displayName}؟`,
                )}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => redeem.mutate({ code, force: true })}
                  disabled={redeem.isPending}
                  className="min-h-11 flex-1 rounded-full bg-amber-600 px-4 font-semibold text-white disabled:opacity-60"
                >
                  {L('Yes, switch me', 'اه، حولني')}
                </button>
                <button
                  onClick={() => setConflict(null)}
                  className="min-h-11 flex-1 rounded-full bg-white px-4 font-semibold text-gray-700 shadow-sm"
                >
                  {L('No, keep my gym', 'لا، خليني في جيمي')}
                </button>
              </div>
            </motion.div>
          )}

          {redeem.isError && !conflict && (
            <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-center text-sm text-red-600">
              {redeem.error?.message}
            </p>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.14 }}
            className="mt-5 space-y-2"
          >
            {status === 'authed' ? (
              !conflict && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => redeem.mutate({ code })}
                  disabled={redeem.isPending}
                  className={`min-h-12 w-full rounded-full font-bold text-white shadow-md disabled:opacity-60 ${
                    isGym ? 'bg-teal-600' : 'bg-violet-600'
                  }`}
                >
                  {redeem.isPending
                    ? L('Joining…', 'ثواني…')
                    : isGym
                      ? L('Join this gym', 'انضم للجيم ده')
                      : L('Join this coach', 'انضم للمدرب ده')}
                </motion.button>
              )
            ) : status === 'guest' ? (
              <>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => savePendingAndGo('/register')}
                  className={`min-h-12 w-full rounded-full font-bold text-white shadow-md ${isGym ? 'bg-teal-600' : 'bg-violet-600'}`}
                >
                  {L('Sign up & join', 'سجل وانضم')}
                </motion.button>
                <button
                  onClick={() => savePendingAndGo('/login')}
                  className="min-h-11 w-full rounded-full bg-white font-semibold text-gray-700 shadow-sm"
                >
                  {L('I already have an account', 'عندي حساب')}
                </button>
              </>
            ) : (
              /* auth still bootstrapping — keep the CTA area quiet */
              <div className="h-12" />
            )}
          </motion.div>
        </div>
      )}

      {/* Success */}
      {done && (
        <div className="px-4 pt-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
            className={`scene-tex rounded-2xl bg-gradient-to-br p-6 text-center text-white shadow-lg ${
              done.type === 'gym' ? 'from-teal-500/90 to-cyan-700/80' : 'from-violet-500/90 to-purple-700/80'
            }`}
          >
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/20">
              <PartyPopper size={28} />
            </span>
            <h2 className="mt-3 text-xl font-extrabold">{L('You’re in! 🎉', 'انضميت! 🎉')}</h2>
            <p className="mt-1 text-sm text-white/85">
              {done.type === 'gym'
                ? L(`You joined ${done.target.name}. Time to show up!`, `انضميت لـ${done.target.name}. يلا نبان في الجيم!`)
                : L(`${done.target.name} is now your coach. Let’s train!`, `${done.target.name} بقى مدربك. يلا نتمرن!`)}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(done.type === 'gym' ? `/partner/${done.target.id}` : `/u/${done.target.id}`)}
              className="mt-4 min-h-11 w-full rounded-full bg-white px-6 font-bold text-gray-900"
            >
              {done.type === 'gym' ? L('See the gym page', 'شوف صفحة الجيم') : L('See your coach', 'شوف مدربك')}
            </motion.button>
            <button onClick={() => navigate('/')} className="mt-2 min-h-11 w-full rounded-full font-semibold text-white/85">
              {L('Go to home', 'الرئيسية')}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
