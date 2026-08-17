import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Mic, Send, Trash2, Flag, Ban } from 'lucide-react';
import { api, uploadWithAuth } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { Loader } from '../../components/ui';
import TopBar from '../../components/TopBar';
import { toast } from '../../lib/toast';

interface Message { id: string; senderId: string; text: string | null; audioUrl?: string | null; createdAt: string }

export default function ChatRoom() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<any>(null);
  const [text, setText] = useState('');
  const [meId, setMeId] = useState<string>('');
  const [gated, setGated] = useState(false);
  const [recSec, setRecSec] = useState(-1); // -1 = not recording
  const [sending, setSending] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const cancelRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const endRef = useRef<HTMLDivElement>(null);

  const { data: room, isLoading } = useQuery({
    queryKey: ['chat-room', id],
    queryFn: async () => {
      const [data, me] = await Promise.all([api.get(`/api/chat/threads/${id}/messages`), api.get('/api/me')]);
      return { ...data, meId: me.id };
    },
  });

  // Sync local state from the QUERY DATA, not inside queryFn: with the global
  // 60s staleTime, re-entering the room served cached data WITHOUT re-running
  // queryFn — local state remounted empty and the chat looked blank until the
  // cache went stale or a manual refresh (user report).
  useEffect(() => {
    if (!room) return;
    setMessages((prev) => {
      // Keep anything that arrived via socket after the cached snapshot.
      const known = new Set(room.messages.map((m: Message) => m.id));
      return [...room.messages, ...prev.filter((m) => !known.has(m.id))];
    });
    setOther(room.other);
    setMeId(room.meId);
  }, [room]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('dm:open', id);
    const onNew = (m: Message) => setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    socket.on('dm:new', onNew);
    return () => {
      socket.emit('dm:close', id);
      socket.off('dm:new', onNew);
    };
  }, [id]);

  // Block body on purpose: an implicit-return arrow hands whatever the call
  // returns to React as the effect "cleanup" — anything non-function crashes
  // the whole tree on unmount ("destroy is not a function", blank screen).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Stop the recorder if the user navigates away mid-recording.
  useEffect(() => () => {
    cancelRef.current = true;
    recRef.current?.stream.getTracks().forEach((tr) => tr.stop());
    if (recRef.current?.state === 'recording') recRef.current.stop();
    clearInterval(timerRef.current);
  }, []);

  // Re-pull the thread from the server. Used after a network hiccup on send:
  // the POST often succeeded server-side even though the response was cut
  // (Safari's "The network connection was lost"), so the truth is over there.
  const resync = async () => {
    try {
      const data = await api.get(`/api/chat/threads/${id}/messages`);
      setMessages(data.messages);
      return data.messages as Message[];
    } catch {
      return null;
    }
  };

  const appendMsg = (msg: Message) =>
    setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    try {
      appendMsg(await api.post(`/api/chat/threads/${id}/messages`, { text: trimmed }));
    } catch (e: any) {
      // Only a real server 403 means "not buddies" — never a dropped connection.
      if (e?.status === 403) return setGated(true);
      const synced = await resync();
      if (!synced || !synced.some((m) => m.senderId === meId && m.text === trimmed)) setText(trimmed);
    }
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Chrome/Android record webm-opus; iOS Safari records mp4/aac.
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      cancelRef.current = false;
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        clearInterval(timerRef.current);
        setRecSec(-1);
        if (cancelRef.current || chunks.length === 0) return;
        setSending(true);
        try {
          const blob = new Blob(chunks, { type: mime });
          const fd = new FormData();
          fd.append('file', new File([blob], mime === 'audio/webm' ? 'voice.webm' : 'voice.m4a', { type: mime }));
          const res = await uploadWithAuth('/api/chat/voice', fd);
          if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Upload failed');
          const { audio } = await res.json();
          appendMsg(await api.post(`/api/chat/threads/${id}/messages`, { audio }));
        } catch (e: any) {
          if (e?.status === 403) setGated(true);
          else toast(e?.message || t('chat.voiceFailed'), 'error');
        } finally {
          setSending(false);
        }
      };
      recRef.current = rec;
      rec.start();
      setRecSec(0);
      timerRef.current = setInterval(() => setRecSec((s) => s + 1), 1000);
    } catch {
      toast(t('chat.micDenied'), 'error');
    }
  };

  const stopRec = (cancel: boolean) => {
    cancelRef.current = cancel;
    recRef.current?.stop();
  };

  if (isLoading) return <Loader />;

  const recording = recSec >= 0;
  const mmss = `${Math.floor(recSec / 60)}:${String(recSec % 60).padStart(2, '0')}`;

  const reportChat = async () => {
    const reason = window.prompt(t('chat.reportWhy', { defaultValue: 'What happened? (optional)' })) ?? '';
    if (!window.confirm(t('chat.reportConfirm', { defaultValue: 'Report this conversation to the PULSE team? Its messages will be reviewed.' }))) return;
    try {
      await api.post(`/api/chat/threads/${id}/report`, { reason });
      toast(t('chat.reportDone', { defaultValue: 'Reported — our team will review it. Thank you.' }), 'success');
    } catch {
      toast(t('common.error', { defaultValue: 'Something went wrong' }), 'error');
    }
  };
  const blockUser = async () => {
    if (!other?.id) return;
    if (!window.confirm(t('chat.blockConfirm', { defaultValue: `Block ${other.firstName}? They won't be able to message or connect with you.`, name: other.firstName }))) return;
    try {
      await api.post(`/api/social/users/${other.id}/block`);
      toast(t('chat.blockDone', { defaultValue: 'Blocked.' }), 'success');
      navigate('/chat');
    } catch {
      toast(t('common.error', { defaultValue: 'Something went wrong' }), 'error');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative">
        <TopBar title={other ? `${other.firstName} ${other.lastName}` : t('chat.roomTitle')} color="fitness-hero" textColor="text-white" />
        {/* Safety actions live where the conversation lives. */}
        <div className="absolute end-2 top-1/2 flex -translate-y-1/2 gap-1" style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) / 2)' }}>
          <button onClick={reportChat} aria-label={t('chat.report', { defaultValue: 'Report' })} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
            <Flag size={15} />
          </button>
          <button onClick={blockUser} aria-label={t('chat.block', { defaultValue: 'Block' })} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
            <Ban size={15} />
          </button>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4 pb-24">
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-brand-pink text-white' : 'bg-white text-ink shadow-sm'}`}>
                {m.audioUrl ? (
                  <audio controls preload="metadata" src={m.audioUrl} className="h-10 w-52 max-w-full" />
                ) : (
                  m.text
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 border-t glass-nav p-3">
        {gated ? (
          <p className="py-2 text-center text-sm text-gray-500">{t('chat.connectFirst')}</p>
        ) : recording ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => stopRec(true)}
              aria-label={t('common.cancel')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500"
            >
              <Trash2 size={18} />
            </button>
            <div className="flex flex-1 items-center gap-2 rounded-full bg-gray-100 px-4 py-3">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm font-semibold tabular-nums">{mmss}</span>
              <span className="text-sm text-gray-400">{t('chat.recording')}</span>
            </div>
            <button onClick={() => stopRec(false)} aria-label={t('common.next')} className="flex h-11 w-11 items-center justify-center rounded-full btn-primary">
              <Send size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-full bg-gray-100 px-4 py-3 outline-none"
              placeholder={t('chat.messagePh')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            {text.trim() ? (
              <button onClick={send} className="flex h-11 w-11 items-center justify-center rounded-full btn-primary">
                <Send size={18} />
              </button>
            ) : (
              <button
                onClick={startRec}
                disabled={sending}
                aria-label={t('chat.voiceNote')}
                className="flex h-11 w-11 items-center justify-center rounded-full btn-primary disabled:opacity-60"
              >
                <Mic size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
