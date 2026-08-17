import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Mail, Sparkles, Send, FlaskConical } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

/**
 * Email blast: pick a segment, draft (or AI-draft) a bilingual-ish message,
 * test it on your own inbox, then send. The server owns the audience queries,
 * the per-run cap, opt-out exclusion and the unsubscribe footer — this screen
 * can't override any of that.
 */

const SEGMENTS = [
  { key: 'inactive3', label: 'Inactive 3+ days', hint: 'Registered but drifting' },
  { key: 'inactive7', label: 'Inactive 7+ days', hint: 'Same audience as the Friday digest' },
  { key: 'nopush', label: 'No push enabled', hint: 'Email is the only channel that reaches them' },
  { key: 'all', label: 'Everyone', hint: 'Use sparingly' },
] as const;

export default function AdminEmail() {
  const [seg, setSeg] = useState<(typeof SEGMENTS)[number]['key']>('inactive3');
  const [goal, setGoal] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [testTo, setTestTo] = useState('');

  const { data: audience } = useQuery({
    queryKey: ['admin-email-audience', seg],
    queryFn: () => api.get(`/api/admin/email/audience?seg=${seg}`),
  });

  // Live SMTP health — sends looked "successful" for months while SMTP was
  // never configured, so the truth gets a banner before any button.
  const { data: smtp } = useQuery({
    queryKey: ['admin-smtp-status'],
    queryFn: () => api.get('/api/admin/email/smtp-status'),
    staleTime: 60_000,
  });

  const draft = useMutation({
    mutationFn: () => api.post('/api/admin/email/draft', { goal }),
    onSuccess: (d: any) => {
      setSubject(d.subject);
      setBody(d.body);
      toast('Draft ready — edit freely before sending', 'success');
    },
    onError: (e: any) => toast(e?.message ?? 'Draft failed', 'error'),
  });

  const send = useMutation({
    mutationFn: (opts: { testTo?: string }) => api.post('/api/admin/email/send', { seg, subject, body, ...opts }),
    onSuccess: (r: any) => toast(r.test ? 'Test sent — check that inbox' : `Sent to ${r.sent} user(s)${r.capped ? ' (run cap hit — send again tomorrow for the rest)' : ''}`, 'success'),
    onError: (e: any) => toast(e?.message ?? 'Send failed', 'error'),
  });

  const ready = subject.trim().length >= 3 && body.trim().length >= 10;

  return (
    <div className="min-h-screen pb-10">
      <header className="safe-header flex items-center gap-2 bg-ink px-4 pb-4 text-white">
        <Link to="/admin"><ChevronLeft /></Link>
        <h1 className="flex items-center gap-2 text-lg font-bold"><Mail size={18} /> Email blast</h1>
      </header>

      <div className="space-y-4 p-4">
        {smtp && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              smtp.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {smtp.ok
              ? '✅ SMTP connected — emails will actually deliver'
              : `⚠️ Emails CANNOT be sent: ${smtp.reason}. Set SMTP_HOST / SMTP_USER / SMTP_PASS in the server .env and restart the API.`}
          </div>
        )}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold text-gray-700">1 · Who gets it</h2>
          <div className="space-y-2">
            {SEGMENTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSeg(s.key)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-start text-sm ${
                  seg === s.key ? 'border-brand-blue bg-blue-50 font-bold text-brand-blue' : 'border-gray-200 text-gray-600'
                }`}
              >
                <span className="min-w-0">
                  <span className="block">{s.label}</span>
                  <span className="block text-[11px] font-normal text-gray-400">{s.hint}</span>
                </span>
                {seg === s.key && audience && (
                  <span className="shrink-0 rounded-full bg-brand-blue px-2.5 py-0.5 text-[11px] font-bold text-white">
                    {audience.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {audience && audience.count > audience.cap && (
            <p className="mt-2 text-[11px] text-amber-600">
              {audience.count} match — each send goes to the {audience.cap} most recently active; repeat tomorrow for the rest.
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold text-gray-700">2 · Write it (or let AI draft)</h2>
          <div className="flex items-center gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-blue"
              placeholder="Goal, e.g: get lapsed users to try the diet journey"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            <button
              onClick={() => goal.trim().length >= 3 && draft.mutate()}
              disabled={draft.isPending || goal.trim().length < 3}
              className="flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              <Sparkles size={15} /> {draft.isPending ? '…' : 'AI draft'}
            </button>
          </div>
          <input
            className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-blue"
            placeholder="Subject"
            value={subject}
            maxLength={150}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            className="mt-2 min-h-[180px] w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-brand-blue"
            placeholder={'Body — use {name} for the first name.\nThe unsubscribe link is added automatically.'}
            value={body}
            maxLength={2000}
            dir="auto"
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-gray-400">{'{name}'} → first name · unsubscribe footer added automatically · opted-out users always excluded</p>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold text-gray-700">3 · Test, then send</h2>
          <div className="flex items-center gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-blue"
              placeholder="your@email.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
            <button
              onClick={() => send.mutate({ testTo })}
              disabled={send.isPending || !ready || !/^\S+@\S+\.\S+$/.test(testTo)}
              className="flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-xl bg-gray-800 px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              <FlaskConical size={15} /> Test
            </button>
          </div>
          <button
            onClick={() => {
              if (window.confirm(`Send to ${audience?.count ?? '?'} user(s) in "${SEGMENTS.find((s) => s.key === seg)?.label}"?`)) send.mutate({});
            }}
            disabled={send.isPending || !ready}
            className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-brand-blue text-sm font-bold text-white disabled:opacity-50"
          >
            <Send size={16} /> {send.isPending ? 'Sending…' : 'Send to audience'}
          </button>
        </section>
      </div>
    </div>
  );
}
