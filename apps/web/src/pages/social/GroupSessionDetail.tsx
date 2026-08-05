import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, Play, Trash2, Dumbbell, Timer, Square } from 'lucide-react';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../store/auth';
import { tapFeedback, successFeedback } from '../../lib/haptics';
import { Loader, MediaImage } from '../../components/ui';
import TopBar from '../../components/TopBar';
import CoachBadge from '../../components/CoachBadge';

const REACTIONS = ['💪', '🔥', '👏', '⚡', '❤️'];
const PRESETS = [60, 120, 300];
const RING_CIRC = 2 * Math.PI * 54;

function fmt(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function GroupSessionDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = ['group-session', id];
  const { user } = useAuth();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api.get(`/api/group/${id}`) });

  const join = useMutation({
    mutationFn: (on: boolean) => (on ? api.post(`/api/group/${id}/join`) : api.post(`/api/group/${id}/leave`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const del = useMutation({
    mutationFn: () => api.del(`/api/group/${id}`),
    onSuccess: () => navigate('/group'),
  });

  // ── Live room state ──────────────────────────────────────────────
  const [liveMembers, setLiveMembers] = useState<string[]>([]);
  const [timer, setTimer] = useState<{ durationSec: number; startedAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [timeUp, setTimeUp] = useState(false);
  const [preset, setPreset] = useState(60);
  const [bursts, setBursts] = useState<{ key: number; emoji: string; x: number }[]>([]);
  const burstKey = useRef(0);
  const timeUpFired = useRef(false);

  const loaded = !!data;

  useEffect(() => {
    if (!loaded || !id) return;
    const socket = getSocket();
    socket.emit('group:open', id);

    const onMembers = (p: any) => {
      if (p?.id === id) setLiveMembers(Array.isArray(p.members) ? p.members : []);
    };
    const onTimer = (p: any) => {
      if (p?.id !== id) return;
      if (p.action === 'start') {
        timeUpFired.current = false;
        setTimeUp(false);
        setTimer({ durationSec: p.durationSec, startedAt: p.startedAt });
        setNow(Date.now());
      } else {
        setTimer(null);
        setTimeUp(false);
      }
    };
    const onReact = (p: any) => {
      if (p?.id !== id) return;
      const k = ++burstKey.current;
      setBursts((prev) => [...prev.slice(-19), { key: k, emoji: p.emoji, x: 8 + Math.random() * 84 }]);
      setTimeout(() => setBursts((prev) => prev.filter((b) => b.key !== k)), 1500);
    };

    socket.on('group:members', onMembers);
    socket.on('group:timer', onTimer);
    socket.on('group:react', onReact);
    return () => {
      socket.emit('group:close', id);
      socket.off('group:members', onMembers);
      socket.off('group:timer', onTimer);
      socket.off('group:react', onReact);
    };
  }, [loaded, id]);

  // Tick while a timer is running
  useEffect(() => {
    if (!timer) return;
    const iv = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(iv);
  }, [timer]);

  const remaining = timer ? Math.max(0, timer.durationSec - (now - timer.startedAt) / 1000) : 0;

  // "Time!" flash when the countdown hits zero
  useEffect(() => {
    if (!timer || remaining > 0 || timeUpFired.current) return;
    timeUpFired.current = true;
    setTimeUp(true);
    successFeedback();
    const t = setTimeout(() => {
      setTimer(null);
      setTimeUp(false);
    }, 2200);
    return () => clearTimeout(t);
  }, [timer, remaining]);

  if (isLoading) return <Loader />;
  if (!data) return null;

  const isOwner = me?.id && me.id === data.coachUserId;
  const isHost = !!user?.id && user.id === data.coachUserId;

  const liveHere = liveMembers
    .map((uid) => data.participants?.find((p: any) => p.id === uid))
    .filter(Boolean) as any[];
  const unknownCount = liveMembers.length - liveHere.length;

  const startTimer = (durationSec: number) => {
    tapFeedback();
    getSocket().emit('group:timer', { id, action: 'start', durationSec });
  };
  const stopTimer = () => {
    tapFeedback();
    getSocket().emit('group:timer', { id, action: 'stop' });
  };
  const sendReaction = (emoji: string) => {
    tapFeedback();
    getSocket().emit('group:react', { id, emoji });
  };

  const progress = timer && timer.durationSec > 0 ? remaining / timer.durationSec : 0;

  return (
    <div className="min-h-screen pb-10">
      <TopBar title="Group Training" color="fitness-hero" textColor="text-white" />

      <div className="px-4 pt-4">
        <h1 className="text-2xl font-extrabold">{data.title}</h1>

        <Link to={`/u/${data.coachUserId}`} className="mt-2 flex items-center gap-2">
          <MediaImage path={data.coach?.avatarUrl} label={data.coach?.firstName} className="h-9 w-9 rounded-full" seed={2} />
          <span className="text-sm font-semibold">{data.coach?.firstName} {data.coach?.lastName}</span>
          {data.coach?.isCoach && <CoachBadge verified={data.coach?.coachVerified} />}
        </Link>

        <div className="mt-3 flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Calendar size={15} /> {new Date(data.scheduledAt).toLocaleString()}</span>
          <span className="flex items-center gap-1"><Users size={15} /> {data.participantCount}</span>
        </div>

        {data.muscleFocus && <p className="mt-2 text-sm font-semibold text-brand-blue">{data.muscleFocus}</p>}
        {data.description && <p className="mt-3 text-sm text-gray-600">{data.description}</p>}
      </div>

      {data.isJoined && (
        <section className="mt-5 px-4">
          <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
            {/* Header: live dot + count + avatars */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              <span className="font-bold">Live room</span>
              <span className="ml-auto text-xs font-semibold text-gray-500">
                {liveMembers.length} here now
              </span>
            </div>

            {liveMembers.length > 0 && (
              <div className="mt-3 flex items-center">
                <div className="flex -space-x-2">
                  {liveHere.slice(0, 8).map((p) => (
                    <MediaImage
                      key={p.id}
                      path={p.avatarUrl}
                      label={p.firstName}
                      className="h-8 w-8 rounded-full ring-2 ring-white"
                      seed={p.id.length}
                    />
                  ))}
                </div>
                {unknownCount > 0 && (
                  <span className="ml-2 text-xs font-semibold text-gray-400">+{unknownCount} more</span>
                )}
              </div>
            )}

            {/* Shared timer */}
            <div className="mt-4 flex flex-col items-center">
              {timer ? (
                <div className="relative h-36 w-36">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="54" fill="none" strokeWidth="8" strokeLinecap="round"
                      className="stroke-brand-blue transition-[stroke-dashoffset] duration-200 ease-linear"
                      strokeDasharray={RING_CIRC}
                      strokeDashoffset={RING_CIRC * (1 - progress)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-extrabold tabular-nums">{fmt(remaining)}</span>
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 py-2 text-sm text-gray-400">
                  <Timer size={15} /> {isHost ? 'Start a shared timer for everyone' : 'Waiting for the coach to start a timer'}
                </p>
              )}

              {isHost && (
                <div className="mt-3 flex items-center gap-2">
                  {timer ? (
                    <button onClick={stopTimer} className="btn-pill btn-ghost px-5 text-red-500">
                      <Square size={14} /> Stop
                    </button>
                  ) : (
                    <>
                      {PRESETS.map((sec) => (
                        <button
                          key={sec}
                          onClick={() => setPreset(sec)}
                          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold tabular-nums ${preset === sec ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {fmt(sec)}
                        </button>
                      ))}
                      <button onClick={() => startTimer(preset)} className="btn-pill btn-primary px-5">
                        <Play size={14} /> Start
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Reaction bar */}
            <div className="mt-4 flex justify-center gap-2">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-xl transition-transform active:scale-90"
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Floating reaction bursts */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <AnimatePresence>
                {bursts.map((b) => (
                  <motion.span
                    key={b.key}
                    initial={{ y: 0, opacity: 1, scale: 0.7 }}
                    animate={{ y: -170, opacity: 0, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                    className="absolute bottom-1 text-2xl"
                    style={{ left: `${b.x}%` }}
                  >
                    {b.emoji}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>

            {/* Time-up flash */}
            <AnimatePresence>
              {timeUp && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/90"
                >
                  <motion.span
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                    className="text-3xl font-extrabold"
                  >
                    Time! 💪
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      )}

      <section className="mt-5 px-4">
        <h2 className="mb-2 flex items-center gap-1 font-bold"><Users size={16} /> Participants</h2>
        {data.participants?.length ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {data.participants.map((p: any) => (
              <Link key={p.id} to={`/u/${p.id}`} className="w-16 shrink-0 text-center">
                <MediaImage path={p.avatarUrl} label={p.firstName} className="mx-auto h-12 w-12 rounded-full" seed={p.id.length} />
                <p className="mt-1 truncate text-xs font-medium">{p.firstName}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-4 text-sm text-gray-400">{t('leaderboard.beFirst')}</p>
        )}
      </section>

      <div className="mt-6 space-y-3 px-4">
        {data.coachWorkoutId && (
          <button
            onClick={() => navigate(`/session/w/${data.coachWorkoutId}`)}
            className="btn-pill btn-primary w-full"
          >
            <Play size={18} /> Start workout together
          </button>
        )}
        {data.coachWorkout && (
          <p className="flex items-center justify-center gap-1 text-xs text-gray-400">
            <Dumbbell size={13} /> {data.coachWorkout.title} · {data.coachWorkout.exercises?.length ?? 0} exercises
          </p>
        )}

        <button
          onClick={() => join.mutate(!data.isJoined)}
          disabled={join.isPending}
          className={`btn-pill w-full ${data.isJoined ? 'btn-ghost text-gray-600' : 'btn-primary'}`}
        >
          {data.isJoined ? 'Leave session' : 'Join session'}
        </button>

        {isOwner && (
          <button onClick={() => del.mutate()} disabled={del.isPending} className="btn-pill btn-ghost w-full text-red-500">
            <Trash2 size={16} /> Delete session
          </button>
        )}
      </div>
    </div>
  );
}
