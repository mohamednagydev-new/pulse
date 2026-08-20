import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Send, FlaskConical, History, Users, Mail, Bell, X } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

type Preview = { count: number; emailableCount: number };
type HistoryRow = { id: string; ok: boolean; note?: string | null; ranAt: string };

const ROLE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'admin', label: 'Admins' },
  { value: 'user', label: 'Users' },
  { value: 'coach', label: 'Coaches' },
  { value: 'coach-pending', label: 'Coach requests' },
];

const INACTIVE_OPTIONS = [
  { value: '', label: 'Any' },
  ...[3, 7, 14, 30, 60, 90].map((d) => ({ value: String(d), label: `Inactive ${d}+ days` })),
];

const SEGMENT_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active1', label: 'Active today' },
  { value: 'active7', label: 'Active last 7d' },
  { value: 'active30', label: 'Active last 30d' },
  { value: 'daily', label: 'Daily streak 3+' },
  { value: 'retained7', label: 'Retained 7d+' },
  { value: 'retained30', label: 'Retained 30d+' },
  { value: 'churned', label: 'Churned' },
];

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-blue dark:border-gray-700';
const cardCls = 'rounded-2xl border border-gray-200 p-4 dark:border-gray-700';

/**
 * Segment broadcast composer: pick an audience (same filters as the Users
 * page), write one message, preview the reach, test on yourself, then send
 * over push and/or email. Banned users are always excluded server-side.
 */
export default function AdminBroadcast() {
  const qc = useQueryClient();

  // Audience
  const [role, setRole] = useState('');
  const [inactive, setInactive] = useState('');
  const [segment, setSegment] = useState('');

  // Message
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [chPush, setChPush] = useState(true);
  const [chEmail, setChEmail] = useState(false);

  const [confirming, setConfirming] = useState(false);

  const audience = {
    role: role || undefined,
    inactive: inactive ? Number(inactive) : undefined,
    segment: segment || undefined,
  };

  // Debounced audience for the live count — selects change discretely, but a
  // quick flurry of clicks shouldn't fire a preview request per click.
  const [debounced, setDebounced] = useState(audience);
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ role: role || undefined, inactive: inactive ? Number(inactive) : undefined, segment: segment || undefined }), 350);
    return () => clearTimeout(t);
  }, [role, inactive, segment]);

  const preview = useQuery<Preview>({
    queryKey: ['admin', 'broadcast', 'preview', debounced],
    queryFn: () => api.post('/api/admin-broadcast/preview', debounced),
  });

  const history = useQuery<HistoryRow[]>({
    queryKey: ['admin', 'broadcast', 'history'],
    queryFn: () => api.get('/api/admin-broadcast/history'),
  });

  const validate = (): string | null => {
    if (!title.trim()) return 'Title is required';
    if (title.trim().length > 120) return 'Title must be 120 characters or less';
    if (!body.trim()) return 'Message body is required';
    if (body.trim().length > 1000) return 'Message body must be 1000 characters or less';
    if (!chPush && !chEmail) return 'Pick at least one channel';
    return null;
  };

  const payload = (test: boolean) => ({
    ...audience,
    channels: { push: chPush, email: chEmail },
    title: title.trim(),
    body: body.trim(),
    url: url.trim() || undefined,
    test,
  });

  const sendTest = useMutation({
    mutationFn: () => api.post('/api/admin-broadcast/send', payload(true)),
    onSuccess: () => toast('Test sent to you — check your notifications/inbox', 'success'),
    onError: (e: any) => toast(e?.message ?? 'Test send failed', 'error'),
  });

  const send = useMutation({
    mutationFn: () => api.post('/api/admin-broadcast/send', payload(false)),
    onSuccess: (d: any) => {
      toast(`Broadcast sent — push: ${d.push}, email: ${d.email}, failed: ${d.failed}`, 'success');
      setConfirming(false);
      qc.invalidateQueries({ queryKey: ['admin', 'broadcast', 'history'] });
    },
    onError: (e: any) => {
      toast(e?.message ?? 'Broadcast failed', 'error');
      setConfirming(false);
    },
  });

  const onTest = () => {
    const err = validate();
    if (err) return toast(err, 'error');
    sendTest.mutate();
  };

  const onOpenConfirm = () => {
    const err = validate();
    if (err) return toast(err, 'error');
    if (preview.data && preview.data.count === 0) return toast('No users match this audience', 'error');
    setConfirming(true);
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const audienceSummary = [
    ROLE_OPTIONS.find((o) => o.value === role)?.label !== 'All' ? ROLE_OPTIONS.find((o) => o.value === role)?.label : null,
    inactive ? `Inactive ${inactive}+ days` : null,
    segment ? SEGMENT_OPTIONS.find((o) => o.value === segment)?.label : null,
  ].filter(Boolean).join(' · ') || 'All users';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Megaphone size={20} /> Broadcast</h1>
      </div>
      <p className="mb-4 text-sm text-gray-400">
        Send one message to a whole segment over push and/or email. Banned users are always excluded;
        email skips anyone who opted out. Capped at 5000 recipients per send.
      </p>

      <div className="space-y-4">
        {/* 1 — Audience */}
        <section className={cardCls}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Users size={15} /> Audience</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-400">Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-400">Activity</span>
              <select value={inactive} onChange={(e) => setInactive(e.target.value)} className={inputCls}>
                {INACTIVE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-400">Segment</span>
              <select value={segment} onChange={(e) => setSegment(e.target.value)} className={inputCls}>
                {SEGMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-3 text-sm font-semibold text-brand-blue">
            {preview.isLoading || preview.isFetching
              ? 'Counting…'
              : preview.data
                ? `≈ ${preview.data.count.toLocaleString()} users will receive this`
                : 'Count unavailable'}
          </p>
        </section>

        {/* 2 — Message */}
        <section className={cardCls}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Megaphone size={15} /> Message</h2>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-400">Title ({title.length}/120)</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. New challenge starts Monday" className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-400">Body ({body.length}/1000)</span>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={4} placeholder="What do you want to tell them?" className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-400">Link URL (optional)</span>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/challenges or https://…" className={inputCls} />
            </label>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={chPush} onChange={(e) => setChPush(e.target.checked)} className="h-4 w-4 accent-brand-blue" />
                <Bell size={14} /> Push
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={chEmail} onChange={(e) => setChEmail(e.target.checked)} className="h-4 w-4 accent-brand-blue" />
                <Mail size={14} /> Email
                {chEmail && preview.data && (
                  <span className="text-xs font-normal text-gray-400">({preview.data.emailableCount.toLocaleString()} emailable)</span>
                )}
              </label>
            </div>
          </div>
        </section>

        {/* 3 — Actions */}
        <section className={cardCls}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onTest}
              disabled={sendTest.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-gray-700"
            >
              <FlaskConical size={14} /> {sendTest.isPending ? 'Sending…' : 'Send test to me'}
            </button>
            <button
              onClick={onOpenConfirm}
              disabled={send.isPending || confirming}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <Send size={14} /> Send broadcast
            </button>
          </div>

          {confirming && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-sm font-bold">Confirm broadcast</p>
                <button onClick={() => setConfirming(false)} className="text-gray-400 hover:text-gray-600" aria-label="Cancel">
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm">
                Audience: <b>{audienceSummary}</b> — <b>≈ {preview.data?.count.toLocaleString() ?? '?'}</b> users
                {chEmail && preview.data && <> ({preview.data.emailableCount.toLocaleString()} emailable)</>}.
                Channels: <b>{[chPush && 'Push', chEmail && 'Email'].filter(Boolean).join(' + ')}</b>.
              </p>
              <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
                <p className="font-bold">{title.trim()}</p>
                <p className="mt-1 whitespace-pre-wrap text-gray-500 dark:text-gray-400">{body.trim()}</p>
                {url.trim() && <p className="mt-1 text-xs text-brand-blue">{url.trim()}</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => send.mutate()}
                  disabled={send.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Send size={14} /> {send.isPending ? 'Sending…' : 'Yes, send it'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={send.isPending}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold dark:border-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 4 — History */}
        <section className={cardCls}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><History size={15} /> Recent broadcasts</h2>
          {history.isLoading ? (
            <p className="py-4 text-center text-sm text-gray-400">Loading…</p>
          ) : !history.data?.length ? (
            <p className="py-4 text-center text-sm text-gray-400">No broadcasts sent yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
              {history.data.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3 py-2">
                  <span className="min-w-0 break-words text-gray-600 dark:text-gray-300">{row.note ?? '—'}</span>
                  <span className="shrink-0 whitespace-nowrap text-xs text-gray-400">{fmt(row.ranAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
