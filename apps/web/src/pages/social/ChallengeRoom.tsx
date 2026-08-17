import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Trophy, MessageSquare, Users, Zap, CalendarDays, Info, Camera, Loader2 } from 'lucide-react';
import { api, uploadWithAuth } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { MediaImage, Loader } from '../../components/ui';
import TopBar from '../../components/TopBar';
import { toast } from '../../lib/toast';

/**
 * Challenge room. Opens on OVERVIEW — what the challenge is, the goal, your
 * progress, who's in — with chat and leaderboard one tap away. It used to open
 * straight into a bare group chat, which read as "why am I in a chat screen?".
 */
export default function ChallengeRoom() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'about' | 'chat' | 'board'>('about');
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [meId, setMeId] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [shareToFeed, setShareToFeed] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);

  const { data: challenge, isLoading } = useQuery({
    queryKey: ['challenge', id],
    queryFn: () => api.get(`/api/gamification/challenges/${id}/detail`),
  });
  const { data: board } = useQuery({
    queryKey: ['challenge-board', id],
    queryFn: () => api.get(`/api/gamification/challenges/${id}/leaderboard`),
  });
  const { data: msgData } = useQuery({
    queryKey: ['challenge-msgs', id],
    queryFn: async () => {
      const [msgs, me] = await Promise.all([api.get(`/api/gamification/challenges/${id}/messages`), api.get('/api/me')]);
      return { msgs: Array.isArray(msgs) ? msgs : [], meId: me.id };
    },
  });
  // Sync from query DATA, not inside queryFn — cached-fresh remounts skipped the
  // fetch and left the room blank (same bug as the DM chat).
  useEffect(() => {
    if (!msgData) return;
    setMessages((prev) => {
      const known = new Set(msgData.msgs.map((m: any) => m.id));
      return [...msgData.msgs, ...prev.filter((m) => !known.has(m.id))];
    });
    setMeId(msgData.meId);
  }, [msgData]);

  const leave = useMutation({
    mutationFn: () => api.post(`/api/gamification/challenges/${id}/leave`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenge', id] });
      qc.invalidateQueries({ queryKey: ['challenges'] });
    },
  });
  const join = useMutation({
    mutationFn: () => api.post(`/api/gamification/challenges/${id}/join`),
    onSuccess: () => {
      toast(t('challenges.joined'), 'success');
      qc.invalidateQueries({ queryKey: ['challenge', id] });
      qc.invalidateQueries({ queryKey: ['challenge-board', id] });
    },
    onError: (e: any) => toast(e?.message || t('common.somethingWrong'), 'error'),
  });

  useEffect(() => {
    const socket = getSocket();
    socket.emit('challenge:open', id);
    const onMsg = (m: any) => setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    socket.on('challenge:msg', onMsg);
    return () => {
      socket.emit('challenge:close', id);
      socket.off('challenge:msg', onMsg);
    };
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tab]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    try {
      const m = await api.post(`/api/gamification/challenges/${id}/messages`, { text: body });
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    } catch (e: any) {
      toast(e?.message || t('common.somethingWrong'), 'error');
      setText(body);
    }
  };

  // Proof check-in: photo/video evidence of the workout — counted in the
  // winner audit. Picking a file opens a preview with the community-share
  // consent checkbox; nothing uploads until the user confirms.
  const pickProof = (file: File) => {
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    setShareToFeed(true);
  };
  const cancelProof = () => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofFile(null);
    setProofPreview(null);
    if (proofRef.current) proofRef.current.value = '';
  };
  const sendProof = async () => {
    if (!proofFile) return;
    setUploadingProof(true);
    try {
      const fd = new FormData();
      fd.append('file', proofFile);
      const res = await uploadWithAuth('/api/social/upload', fd);
      if (!res.ok) throw new Error('upload failed');
      const { mediaType, mediaUrl } = await res.json();
      const m = await api.post(`/api/gamification/challenges/${id}/messages`, {
        text: text.trim(), mediaType, mediaUrl, isProof: true, shareToFeed,
      });
      setText('');
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      toast(shareToFeed ? t('challenge.proofSent') : t('challenge.proofSentPrivate'), 'success');
      cancelProof();
    } catch (e: any) {
      toast(e?.message || t('common.somethingWrong'), 'error');
    } finally {
      setUploadingProof(false);
    }
  };

  if (isLoading) return <Loader />;

  const rows: any[] = Array.isArray(board) ? board : [];
  const isAr = i18n.language.startsWith('ar');
  const title = (isAr && challenge?.titleAr) || challenge?.title || 'Challenge';
  const description = (isAr && challenge?.descriptionAr) || challenge?.description;
  const goalPct = challenge?.goalValue > 0 ? Math.min(100, Math.round(((challenge?.myProgress ?? 0) / challenge.goalValue) * 100)) : 0;
  const daysLeft = challenge?.endsOn
    ? Math.ceil((new Date(`${challenge.endsOn}T23:59:59`).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title={title} color="bg-gradient-to-b from-brand-blue to-blue-500" textColor="text-white" />

      <div className="flex gap-2 px-4 py-2">
        <Tab active={tab === 'about'} onClick={() => setTab('about')} icon={<Info size={15} />} label={t('challenge.overview')} />
        <Tab active={tab === 'chat'} onClick={() => setTab('chat')} icon={<MessageSquare size={15} />} label={t('challenge.chat')} />
        <Tab active={tab === 'board'} onClick={() => setTab('board')} icon={<Trophy size={15} />} label={t('challenge.board')} />
      </div>

      {tab === 'about' && (
        <div className="space-y-3 px-4 pb-10">
          {challenge?.coverImage && <MediaImage path={challenge.coverImage} label={title} className="h-36 w-full rounded-2xl" />}

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            {description && <p className="text-sm leading-relaxed text-gray-600">{description}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1 rounded-full bg-brand-blue/10 px-3 py-1.5 text-brand-blue">
                <Trophy size={13} /> {t('challenge.goal')}: {challenge?.goalValue}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-gray-600">
                <Users size={13} /> {t('challenge.participants', { n: challenge?.participantCount ?? rows.length })}
              </span>
              {daysLeft !== null && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-amber-700">
                  <CalendarDays size={13} />
                  {daysLeft > 0 ? t('challenge.daysLeft', { n: daysLeft }) : daysLeft === 0 ? t('challenge.endsToday') : t('challenge.ended')}
                </span>
              )}
              {challenge?.rewardXp > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-700">
                  <Zap size={13} /> {t('challenge.reward', { n: challenge.rewardXp })}
                </span>
              )}
            </div>

            {/* Real prizes for the top 3 — the rules and the reason to fight for the podium. */}
            {challenge?.prizeText && (
              <div className="mt-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-3 ring-1 ring-amber-200">
                <p className="text-xs font-extrabold text-amber-700">🏆 {t('challenge.prizes')}</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-amber-900">
                  {(isAr && challenge.prizeTextAr) || challenge.prizeText}
                </p>
                <p className="mt-1 text-[11px] text-amber-600">{t('challenge.prizesNote')}</p>
                {challenge?.prizeMode && challenge.prizeMode !== 'top3' && (
                  <p className="mt-1 text-[11px] font-bold text-amber-700">🎟 {t('challenge.raffleNote')}</p>
                )}
                <p className="mt-1 text-[11px] text-amber-600">📸 {t('challenge.proofHint')}</p>
              </div>
            )}
          </div>

          {challenge?.joined ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-1 flex items-center justify-between text-sm font-semibold">
                <span>{t('challenge.yourProgress')}</span>
                <span className="font-display font-extrabold text-brand-blue">
                  {challenge.myProgress}/{challenge.goalValue}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-blue to-blue-400" style={{ width: `${goalPct}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-emerald-600">
                  {challenge.completedAt ? t('challenge.completed') : t('challenge.joined')}
                </p>
                {!challenge.completedAt && (
                  <button
                    onClick={() => window.confirm(t('challenge.leaveConfirm')) && leave.mutate()}
                    className="text-[11px] font-bold text-gray-400"
                  >
                    {t('challenge.leave')}
                  </button>
                )}
              </div>
            </div>
          ) : (daysLeft ?? 1) > 0 ? (
            <button
              onClick={() => join.mutate()}
              disabled={join.isPending}
              className="btn-pill btn-primary flex min-h-[48px] w-full items-center justify-center gap-2 disabled:opacity-60"
            >
              <Zap size={16} /> {t('challenge.join')}
            </button>
          ) : (
            // Ended → the server would 410 the join anyway; don't offer it.
            <p className="rounded-xl bg-gray-100 py-3 text-center text-xs font-bold text-gray-400">{t('challenge.ended')}</p>
          )}

          {/* Top 3 teaser under the overview — the full list is one tap away */}
          {rows.length > 0 && (
            <button onClick={() => setTab('board')} className="w-full rounded-2xl bg-white p-4 text-start shadow-sm">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('challenge.board')}</p>
              <div className="space-y-2">
                {rows.slice(0, 3).map((r: any) => (
                  <BoardRow key={r.rank} r={r} me={r.userId === meId} />
                ))}
              </div>
            </button>
          )}
        </div>
      )}

      {tab === 'chat' && (
        <>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-24">
            <p className="py-2 text-center text-[11px] text-gray-400">
              Tip: type <b>@coach</b> to ask the AI coach
            </p>
            {messages.map((m) => {
              const mine = m.userId === meId;
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                  {!mine && <MediaImage path={m.user?.avatarUrl} label={m.isCoach ? '🤖' : m.user?.firstName} className="h-7 w-7 rounded-full" seed={(m.id || '').length} />}
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.isCoach ? 'bg-brand-pink/10 text-ink ring-1 ring-brand-pink/30' : mine ? 'bg-brand-blue text-white' : 'bg-white shadow-sm'}`}>
                    {!mine && <p className="text-[11px] font-semibold opacity-70">{m.isCoach ? '🤖 PULSE Coach' : m.user?.firstName}</p>}
                    {m.isProof && (
                      <p className={`mb-1 text-[10px] font-extrabold ${mine ? 'text-white/80' : 'text-emerald-600'}`}>📸 {t('challenge.proofBadge')}</p>
                    )}
                    {m.mediaUrl && (
                      m.mediaType === 'video'
                        ? <video src={m.mediaUrl} controls playsInline className="mb-1 max-h-64 w-full rounded-xl" />
                        : <MediaImage path={m.mediaUrl} label="proof" className="mb-1 max-h-64 w-full rounded-xl" />
                    )}
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <div className="sticky bottom-0 border-t glass-nav p-3">
            {/* Proof preview + consent: nothing uploads until the user confirms. */}
            {proofFile && proofPreview && (
              <div className="mb-2 rounded-2xl bg-white p-3 shadow-md">
                <div className="flex items-start gap-3">
                  {proofFile.type.startsWith('video')
                    ? <video src={proofPreview} muted playsInline className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                    : <img src={proofPreview} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">📸 {t('challenge.proofBadge')}</p>
                    <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <input
                        type="checkbox"
                        checked={shareToFeed}
                        onChange={(e) => setShareToFeed(e.target.checked)}
                        className="h-4 w-4 accent-emerald-500"
                      />
                      {t('challenge.shareToFeed')}
                    </label>
                    <p className="mt-1 text-[11px] text-gray-400">{shareToFeed ? t('challenge.shareOnHint') : t('challenge.shareOffHint')}</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={cancelProof} className="min-h-[40px] rounded-full bg-gray-100 px-4 text-xs font-bold text-gray-500">
                    {t('common.close')}
                  </button>
                  <button
                    onClick={sendProof}
                    disabled={uploadingProof}
                    className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-500 text-sm font-extrabold text-white disabled:opacity-60"
                  >
                    {uploadingProof ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />} {t('challenge.proofSendBtn')}
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                className="flex-1 rounded-full bg-gray-100 px-4 py-3 outline-none"
                placeholder={t('challenge.messagePh')}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <button
                onClick={() => proofRef.current?.click()}
                disabled={uploadingProof}
                aria-label={t('challenge.proofBtn')}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white active:scale-90 disabled:opacity-60"
              >
                {uploadingProof ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              </button>
              <input
                ref={proofRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && pickProof(e.target.files[0])}
              />
              <button onClick={send} className="flex h-11 w-11 items-center justify-center rounded-full btn-blue">
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {tab === 'board' && (
        <div className="space-y-2 px-4 pb-10">
          {rows.map((r: any) => (
            <BoardRow key={r.rank} r={r} me={r.userId === meId} card />
          ))}
          {rows.length === 0 && <p className="py-10 text-center text-gray-400">{t('challenge.noParticipants')}</p>}
        </div>
      )}
    </div>
  );
}

function BoardRow({ r, me, card = false }: { r: any; me: boolean; card?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${card ? `rounded-xl bg-white px-4 py-3 shadow-sm ${me ? 'ring-1 ring-brand-blue/40' : ''}` : ''}`}>
      <span className="w-7 shrink-0 text-center text-lg font-bold">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span>
      <MediaImage path={r.avatarUrl} label={r.name} className="h-9 w-9 shrink-0 rounded-full" seed={r.rank} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
      <span className="font-display shrink-0 font-bold text-brand-blue">{r.progress}</span>
    </div>
  );
}

function Tab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold ${active ? 'bg-brand-blue text-white' : 'bg-white text-gray-500 shadow-sm'}`}
    >
      {icon} {label}
    </button>
  );
}
