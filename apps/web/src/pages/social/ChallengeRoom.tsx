import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Send, Trophy, MessageSquare, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { MediaImage, Loader } from '../../components/ui';
import TopBar from '../../components/TopBar';

export default function ChallengeRoom() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [tab, setTab] = useState<'chat' | 'board'>('chat');
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [meId, setMeId] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const { data: challenge } = useQuery({ queryKey: ['challenge', id], queryFn: () => api.get(`/api/gamification/challenges/${id}/detail`) });
  const { data: board } = useQuery({ queryKey: ['challenge-board', id], queryFn: () => api.get(`/api/gamification/challenges/${id}/leaderboard`), enabled: tab === 'board' });
  const { isLoading } = useQuery({
    queryKey: ['challenge-msgs', id],
    queryFn: async () => {
      const [msgs, me] = await Promise.all([api.get(`/api/gamification/challenges/${id}/messages`), api.get('/api/me')]);
      setMessages(msgs);
      setMeId(me.id);
      return msgs;
    },
  });

  useEffect(() => {
    const socket = getSocket();
    socket.emit('challenge:open', id);
    const onMsg = (m: any) => setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    socket.on('challenge:msg', onMsg);
    return () => { socket.emit('challenge:close', id); socket.off('challenge:msg', onMsg); };
  }, [id]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, tab]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    const m = await api.post(`/api/gamification/challenges/${id}/messages`, { text: t });
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  };

  if (isLoading) return <Loader />;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title={challenge?.title ?? 'Challenge'} color="bg-gradient-to-b from-brand-blue to-blue-500" textColor="text-white" />
      {challenge?.coverImage && <MediaImage path={challenge.coverImage} label={challenge.title} className="h-32 w-full" seed={2} />}
      <div className="flex gap-2 px-4 py-2">
        <Tab active={tab === 'chat'} onClick={() => setTab('chat')} icon={<MessageSquare size={15} />} label="Chat" />
        <Tab active={tab === 'board'} onClick={() => setTab('board')} icon={<Trophy size={15} />} label="Leaderboard" />
      </div>

      {tab === 'chat' ? (
        <>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-24">
            <p className="py-2 text-center text-[11px] text-gray-400">Tip: type <b>@coach</b> to ask the AI coach</p>
            {messages.map((m) => {
              const mine = m.userId === meId;
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                  {!mine && <MediaImage path={m.user?.avatarUrl} label={m.isCoach ? '🤖' : m.user?.firstName} className="h-7 w-7 rounded-full" seed={(m.id || '').length} />}
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.isCoach ? 'bg-brand-pink/10 text-ink ring-1 ring-brand-pink/30' : mine ? 'bg-brand-blue text-white' : 'bg-white shadow-sm'}`}>
                    {!mine && <p className="text-[11px] font-semibold opacity-70">{m.isCoach ? '🤖 PULSE Coach' : m.user?.firstName}</p>}
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <div className="sticky bottom-0 border-t glass-nav p-3">
            <div className="flex items-center gap-2">
              <input className="flex-1 rounded-full bg-gray-100 px-4 py-3 outline-none" placeholder={t('challenge.messagePh')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
              <button onClick={send} className="flex h-11 w-11 items-center justify-center rounded-full btn-blue"><Send size={18} /></button>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-2 px-4 pb-10">
          {(board ?? []).map((r: any) => (
            <div key={r.rank} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
              <span className="w-7 text-center text-lg font-bold">{r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank - 1] : r.rank}</span>
              <MediaImage path={r.avatarUrl} label={r.name} className="h-9 w-9 rounded-full" seed={r.rank} />
              <span className="flex-1 font-medium">{r.name}</span>
              <span className="font-bold text-brand-blue">{r.progress}</span>
            </div>
          ))}
          {!board?.length && <p className="py-10 text-center text-gray-400">{t('challenge.noParticipants')}</p>}
        </div>
      )}
    </div>
  );
}

function Tab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold ${active ? 'bg-brand-blue text-white' : 'bg-white text-gray-500 shadow-sm'}`}>
      {icon} {label}
    </button>
  );
}
