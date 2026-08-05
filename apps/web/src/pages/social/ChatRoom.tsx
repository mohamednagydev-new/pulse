import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { Loader } from '../../components/ui';
import TopBar from '../../components/TopBar';

interface Message { id: string; senderId: string; text: string; createdAt: string }

export default function ChatRoom() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<any>(null);
  const [text, setText] = useState('');
  const [meId, setMeId] = useState<string>('');
  const [gated, setGated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { isLoading } = useQuery({
    queryKey: ['chat-room', id],
    queryFn: async () => {
      const [data, me] = await Promise.all([api.get(`/api/chat/threads/${id}/messages`), api.get('/api/me')]);
      setMessages(data.messages);
      setOther(data.other);
      setMeId(me.id);
      return data;
    },
  });

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

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    try {
      const msg = await api.post(`/api/chat/threads/${id}/messages`, { text: trimmed });
      setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
    } catch (e: any) {
      if (/connect/i.test(e?.message ?? '')) setGated(true);
      setText(trimmed);
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title={other ? `${other.firstName} ${other.lastName}` : t('chat.roomTitle')} color="fitness-hero" textColor="text-white" />
      <div className="flex-1 space-y-2 overflow-y-auto p-4 pb-24">
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-brand-pink text-white' : 'bg-white text-ink shadow-sm'}`}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 border-t glass-nav p-3">
        {gated ? (
          <p className="py-2 text-center text-sm text-gray-500">{t('chat.connectFirst')}</p>
        ) : (
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-full bg-gray-100 px-4 py-3 outline-none"
              placeholder={t('chat.messagePh')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button onClick={send} className="flex h-11 w-11 items-center justify-center rounded-full btn-primary">
              <Send size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
