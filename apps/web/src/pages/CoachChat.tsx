import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bot, Salad, Send, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import TopBar from '../components/TopBar';

/**
 * The AI coach, finally with a face. The backend (/api/ai/chat) has existed
 * for months: grounded in PULSE's own content library with citations, hard
 * medical guardrails, per-user daily budget. This screen is just the phone
 * for it — bubbles, suggested first questions, and the conversation resumes
 * across visits via the stored conversationId.
 */

type Msg = { role: 'user' | 'assistant'; text: string };

export default function CoachChat() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  // Same phone, two professionals: /coach-chat = the coach, /nutritionist =
  // the nutritionist (own persona server-side, own conversation thread here).
  const nutrition = useLocation().pathname === '/nutritionist';
  const CONVO_KEY = nutrition ? 'pulse_nutri_convo' : 'pulse_coach_convo';
  const grad = nutrition ? 'from-emerald-500 to-teal-600' : 'from-orange-500 to-pink-600';
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: status } = useQuery({ queryKey: ['ai-status'], queryFn: () => api.get('/api/ai/status') });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setBusy(true);
    try {
      const r = await api.post('/api/ai/chat', {
        message: msg,
        ...(nutrition ? { mode: 'nutrition' } : {}),
        ...(localStorage.getItem(CONVO_KEY) ? { conversationId: localStorage.getItem(CONVO_KEY) } : {}),
      });
      localStorage.setItem(CONVO_KEY, r.conversationId);
      setMessages((m) => [...m, { role: 'assistant', text: r.answer }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', text: e?.message || t('coachChat.failed') }]);
    } finally {
      setBusy(false);
    }
  };

  const SUGGESTIONS = nutrition
    ? ar
      ? ['فاضلّي كام سعرة النهارده؟', 'إزاي أكمّل بروتيني بأكل رخيص؟', 'وزني واقف — أعمل إيه في أكلي؟', 'فطار صحي وسريع أعمله إيه؟']
      : ['How many calories do I have left today?', 'Cheap ways to hit my protein?', 'My weight is stuck — what should change in my food?', 'A quick healthy breakfast idea?']
    : ar
      ? ['إزاي أبدأ وأنا مبتدئ خالص؟', 'أكل إيه قبل وبعد التمرين؟', 'إزاي أخس من غير ما أحرم نفسي؟', 'عضلاتي بتوجعني بعد التمرين — طبيعي؟']
      : ['How do I start as a total beginner?', 'What should I eat before and after workouts?', 'How do I lose fat without starving?', 'My muscles hurt after training — normal?'];

  return (
    <div className="flex min-h-screen flex-col pb-0">
      <TopBar title={nutrition ? t('nutri.title') : t('coachChat.title')} color={nutrition ? 'bg-gradient-to-b from-emerald-600 to-teal-700' : 'fitness-hero'} textColor="text-white" />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" style={{ paddingBottom: 90 }}>
        {/* Intro card + suggested questions until the chat has life */}
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className={`grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br ${grad} text-white`}>
                {nutrition ? <Salad size={20} /> : <Bot size={20} />}
              </span>
              <div>
                <p className="font-bold">{nutrition ? t('nutri.hello') : t('coachChat.hello')}</p>
                <p className="text-xs text-gray-500">{nutrition ? t('nutri.sub') : t('coachChat.sub')}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600">
                  {s}
                </button>
              ))}
            </div>
            {status && !status.enabled && <p className="mt-3 text-xs text-red-500">{t('coachChat.disabled')}</p>}
          </motion.div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === 'user' ? `rounded-br-md bg-gradient-to-r ${grad} text-white` : 'rounded-bl-md bg-white shadow-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
              <Sparkles size={14} className="animate-pulse text-orange-500" />
              <span className="text-xs text-gray-400">{t('coachChat.thinking')}</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] border-t border-white/10 bg-ink/90 p-3 backdrop-blur" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <div className="flex items-center gap-2">
          <input
            className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
            placeholder={t('coachChat.ph')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            aria-label={t('coachChat.send')}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-r ${grad} text-white disabled:opacity-50`}
          >
            <Send size={16} className="rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}
