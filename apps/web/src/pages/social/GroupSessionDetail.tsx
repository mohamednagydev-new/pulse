import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, Play, Pause, Trash2, Dumbbell, Timer, Square, Mic, Send, RotateCcw, RotateCw } from 'lucide-react';
import { api, uploadWithAuth } from '../../lib/api';
import { useSignedMedia } from '../../lib/media';
import { toast } from '../../lib/toast';
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

  // ── Synced class video: the host's transport drives everyone's player ──
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [vState, setVState] = useState<{ action: 'play' | 'pause'; positionSec: number; at: number } | null>(null);
  const [vBlocked, setVBlocked] = useState(false); // autoplay refused until the user taps once
  const [vPlaying, setVPlaying] = useState(false);
  const syncSrc = useSignedMedia('video', data?.coachWorkout?.videoId);

  // ── Room chat: live text + voice notes, one feed, nothing persisted ──
  const [feed, setFeed] = useState<{ key: number; by: string; at: number; text?: string; audio?: string }[]>([]);
  const [chatText, setChatText] = useState('');
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const feedKey = useRef(0);

  const loaded = !!data;

  const applyVideo = (p: { action: 'play' | 'pause'; positionSec: number; at: number }) => {
    const v = videoRef.current;
    if (!v) return;
    if (p.action === 'play') {
      v.currentTime = p.positionSec + (Date.now() - p.at) / 1000;
      v.play().then(() => { setVPlaying(true); setVBlocked(false); }).catch(() => setVBlocked(true));
    } else {
      v.pause();
      v.currentTime = p.positionSec;
      setVPlaying(false);
    }
  };

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

    const onVideo = (p: any) => {
      if (p?.id !== id) return;
      const next = { action: p.action, positionSec: p.positionSec, at: p.at };
      setVState(next);
      applyVideo(next);
    };
    const onNote = (p: any) => {
      if (p?.id !== id) return;
      setFeed((prev) => [...prev.slice(-29), { key: ++feedKey.current, audio: p.audio, by: p.by, at: p.at }]);
    };
    const onChat = (p: any) => {
      if (p?.id !== id) return;
      setFeed((prev) => [...prev.slice(-29), { key: ++feedKey.current, text: p.text, by: p.by, at: p.at }]);
    };

    socket.on('group:members', onMembers);
    socket.on('group:timer', onTimer);
    socket.on('group:react', onReact);
    socket.on('group:video', onVideo);
    socket.on('group:note', onNote);
    socket.on('group:chat', onChat);
    return () => {
      socket.emit('group:close', id);
      socket.off('group:members', onMembers);
      socket.off('group:timer', onTimer);
      socket.off('group:react', onReact);
      socket.off('group:video', onVideo);
      socket.off('group:note', onNote);
      socket.off('group:chat', onChat);
    };
  }, [loaded, id]);

  // Leaving mid-recording must release the microphone.
  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* already stopped */ } }, []);

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

  // The signed src arrives async — re-apply the room's transport state once the
  // player can actually honor it (covers late joiners landing mid-video).
  // MUST live above the early returns: a hook after a conditional return crashed
  // the whole page the moment `data` loaded ("rendered fewer hooks" — user report).
  useEffect(() => {
    if (syncSrc && vState) applyVideo(vState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncSrc]);

  if (isLoading) return <Loader />;
  if (!data) return null;

  const isOwner = me?.id && me.id === data.coachUserId;
  const isHost = !!user?.id && user.id === data.coachUserId;

  const liveHere = liveMembers
    .map((uid) => data.participants?.find((p: any) => p.id === uid))
    .filter(Boolean) as any[];
  const unknownCount = liveMembers.length - liveHere.length;

  const emitVideo = (action: 'play' | 'pause') => {
    tapFeedback();
    getSocket().emit('group:video', { id, action, positionSec: videoRef.current?.currentTime ?? 0 });
  };
  const hostSkip = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    tapFeedback();
    v.currentTime = Math.max(0, v.currentTime + delta);
    getSocket().emit('group:video', { id, action: vPlaying ? 'play' : 'pause', positionSec: v.currentTime });
  };

  const sendChat = () => {
    const text = chatText.trim();
    if (!text) return;
    tapFeedback();
    getSocket().emit('group:chat', { id, text });
    setChatText('');
  };

  const startNote = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setRecording(false);
        void (async () => {
          try {
            const blob = new Blob(chunks, { type: mime });
            if (blob.size < 1000) return; // a tap, not a note
            const fd = new FormData();
            fd.append('file', new File([blob], mime === 'audio/webm' ? 'note.webm' : 'note.m4a', { type: mime }));
            const res = await uploadWithAuth('/api/chat/voice', fd);
            const { audio } = await res.json();
            getSocket().emit('group:note', { id, audio });
          } catch (e: any) {
            toast(e?.message || t('chat.voiceFailed'), 'error');
          }
        })();
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      tapFeedback();
    } catch {
      toast(t('chat.micDenied'), 'error');
    }
  };
  const stopNote = () => { try { recRef.current?.stop(); } catch { /* not recording */ } };

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
      <TopBar title={t('group.trainingTitle')} color="fitness-hero" textColor="text-white" />

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
              <span className="font-bold">{t('group.liveRoom')}</span>
              <span className="ms-auto text-xs font-semibold text-gray-500">
                {t('group.hereNow', { n: liveMembers.length })}
              </span>
            </div>

            {liveMembers.length > 0 && (
              <div className="mt-3 flex items-center">
                <div className="flex -space-x-2 rtl:space-x-reverse">
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
                  <span className="ms-2 text-xs font-semibold text-gray-400">{t('group.moreCount', { n: unknownCount })}</span>
                )}
              </div>
            )}

            {/* Synced class video: everyone sees the same frame; host drives. */}
            {data.coachWorkout?.videoId && (
              <div className="relative mt-4 overflow-hidden rounded-xl bg-black">
                <video ref={videoRef} src={syncSrc} playsInline preload="metadata" className="aspect-video w-full" />
                {vBlocked && (
                  <button
                    onClick={() => vState && applyVideo(vState)}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white"
                  >
                    <Play size={34} />
                    <span className="text-sm font-bold">{t('group.tapToSync')}</span>
                  </button>
                )}
                {isHost ? (
                  <div className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-2">
                    <button onClick={() => hostSkip(-15)} aria-label="-15s" className="rounded-full bg-white/25 p-2.5 text-white backdrop-blur"><RotateCcw size={16} /></button>
                    <button onClick={() => emitVideo(vPlaying ? 'pause' : 'play')} className="rounded-full bg-white p-3.5 text-gray-900 shadow">
                      {vPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button onClick={() => hostSkip(15)} aria-label="+15s" className="rounded-full bg-white/25 p-2.5 text-white backdrop-blur"><RotateCw size={16} /></button>
                  </div>
                ) : (
                  !vPlaying && !vBlocked && (
                    <p className="absolute inset-x-0 bottom-2 text-center text-[11px] font-semibold text-white/80">{t('group.videoWait')}</p>
                  )
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
                  <Timer size={15} /> {isHost ? t('group.timerHostHint') : t('group.timerWaitHint')}
                </p>
              )}

              {isHost && (
                <div className="mt-3 flex items-center gap-2">
                  {timer ? (
                    <button onClick={stopTimer} className="btn-pill btn-ghost px-5 text-red-500">
                      <Square size={14} /> {t('group.stop')}
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
                        <Play size={14} /> {t('today.start')}
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
                  aria-label={`${t('group.react')} ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Room chat: live text + voice notes; the coach cues, anyone answers. */}
            <div className="mt-4 border-t border-gray-100 pt-3">
              <span className="text-xs font-bold text-gray-500">💬 {t('group.roomChat')}</span>
              {feed.length > 0 && (
                <div className="mt-2 max-h-44 space-y-2 overflow-y-auto">
                  {feed.map((n) => {
                    const sender =
                      n.by === data.coachUserId
                        ? data.coach
                        : data.participants?.find((p: any) => p.id === n.by);
                    const isCoach = n.by === data.coachUserId;
                    return (
                      <div key={n.key} className="flex items-center gap-2">
                        <MediaImage path={sender?.avatarUrl} label={sender?.firstName} className="h-7 w-7 shrink-0 rounded-full" seed={3} />
                        {n.audio ? (
                          <audio controls preload="metadata" src={n.audio} className="h-9 min-w-0 flex-1" />
                        ) : (
                          <p className={`min-w-0 flex-1 rounded-2xl px-3 py-1.5 text-sm ${isCoach ? 'bg-orange-50 font-semibold text-orange-700' : 'bg-gray-50 text-gray-700'}`}>
                            <span className="me-1.5 text-[10px] font-bold text-gray-400">{sender?.firstName}</span>
                            {n.text}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <input
                  className="min-w-0 flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm outline-none"
                  placeholder={t('group.chatPh')}
                  value={chatText}
                  maxLength={300}
                  onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                />
                <button
                  onClick={sendChat}
                  disabled={!chatText.trim()}
                  aria-label={t('group.send')}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white disabled:opacity-40"
                >
                  <Send size={15} />
                </button>
                <button
                  onClick={recording ? stopNote : startNote}
                  aria-label={recording ? t('group.stopNote') : t('group.recordNote')}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${recording ? 'animate-pulse bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  <Mic size={15} />
                </button>
              </div>
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
                    {t('group.timeUp')}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      )}

      <section className="mt-5 px-4">
        <h2 className="mb-2 flex items-center gap-1 font-bold"><Users size={16} /> {t('group.participants')}</h2>
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
            <Play size={18} /> {t('group.startTogether')}
          </button>
        )}
        {data.coachWorkout && (
          <p className="flex items-center justify-center gap-1 text-xs text-gray-400">
            <Dumbbell size={13} /> {data.coachWorkout.title} · {t('group.exercisesCount', { n: data.coachWorkout.exercises?.length ?? 0 })}
          </p>
        )}

        <button
          onClick={() => join.mutate(!data.isJoined)}
          disabled={join.isPending}
          className={`btn-pill w-full ${data.isJoined ? 'btn-ghost text-gray-600' : 'btn-primary'}`}
        >
          {data.isJoined ? t('group.leave') : t('group.join')}
        </button>

        {isOwner && (
          <button onClick={() => del.mutate()} disabled={del.isPending} className="btn-pill btn-ghost w-full text-red-500">
            <Trash2 size={16} /> {t('group.delete')}
          </button>
        )}
      </div>
    </div>
  );
}
