import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, CheckCircle2, HelpCircle, Lightbulb, Send } from 'lucide-react';
import { api } from '../lib/api';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';
import { toast } from '../lib/toast';
import { successFeedback, tapFeedback } from '../lib/haptics';

type Kind = 'suggestion' | 'issue' | 'question';

interface Ticket {
  id: string;
  kind: Kind;
  subject: string;
  body: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  reply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
}

const KINDS: { key: Kind; icon: typeof Bug; tone: string }[] = [
  { key: 'suggestion', icon: Lightbulb, tone: 'bg-amber-100 text-amber-600' },
  { key: 'issue', icon: Bug, tone: 'bg-red-100 text-red-500' },
  { key: 'question', icon: HelpCircle, tone: 'bg-sky-100 text-sky-600' },
];

const STATUS_TONE: Record<Ticket['status'], string> = {
  open: 'bg-orange-100 text-orange-600',
  in_progress: 'bg-violet-100 text-violet-600',
  resolved: 'bg-emerald-100 text-emerald-600',
  closed: 'bg-gray-100 text-gray-400',
};

/** Tell us something: an idea, a problem, or a question. */
export default function Support() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { pathname } = useLocation();
  const [kind, setKind] = useState<Kind>('suggestion');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');

  const { data: mine } = useQuery<Ticket[]>({
    queryKey: ['support-mine'],
    queryFn: () => api.get('/api/support/mine'),
  });

  const send = useMutation({
    mutationFn: () => api.post('/api/support', { kind, subject, body, contact, screen: pathname }),
    onSuccess: () => {
      successFeedback();
      toast(t('support.sent'), 'success');
      setSubject('');
      setBody('');
      qc.invalidateQueries({ queryKey: ['support-mine'] });
    },
    onError: (e: any) => toast(e?.message ?? t('support.failed'), 'error'),
  });

  const valid = subject.trim().length >= 3 && body.trim().length >= 10;

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-24">
      <AmbientBg tone="cool" />
      <TopBar title={t('support.title')} color="fitness-hero" textColor="text-white" />

      <p className="px-4 text-sm text-gray-500">{t('support.sub')}</p>

      <section className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map(({ key, icon: Icon, tone }) => (
            <button
              key={key}
              onClick={() => { tapFeedback(); setKind(key); }}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition active:scale-95 ${
                kind === key ? tone : 'bg-gray-50 text-gray-400'
              }`}
            >
              <Icon size={18} /> {t(`support.kind.${key}`)}
            </button>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-gray-500">{t('support.subject')}</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            placeholder={t('support.subjectPh')}
            className="min-h-[44px] w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-gray-500">{t('support.details')}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder={t('support.detailsPh')}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-gray-500">{t('support.contact')}</span>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={120}
            dir="ltr"
            placeholder={t('support.contactPh')}
            className="min-h-[44px] w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
          />
        </label>

        <button
          onClick={() => send.mutate()}
          disabled={!valid || send.isPending}
          className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
        >
          <Send size={16} /> {send.isPending ? t('support.sending') : t('support.send')}
        </button>
      </section>

      {!!mine?.length && (
        <section className="mt-5 px-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{t('support.yours')}</h2>
          <ul className="mt-2 space-y-2.5">
            <AnimatePresence initial={false}>
              {mine.map((tk) => (
                <motion.li
                  key={tk.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-sm font-bold">{tk.subject}</p>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${STATUS_TONE[tk.status]}`}>
                      {t(`support.status.${tk.status}`)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-gray-500">{tk.body}</p>

                  {tk.reply && (
                    <div className="mt-3 rounded-xl bg-emerald-50 p-3">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                        <CheckCircle2 size={12} /> {t('support.reply')}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-emerald-900">{tk.reply}</p>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}
    </div>
  );
}
