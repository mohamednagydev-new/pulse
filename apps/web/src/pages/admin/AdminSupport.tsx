import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bug, HelpCircle, Inbox, Lightbulb, Pin, PinOff, Send, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import { MediaImage } from '../../components/ui';

type Kind = 'suggestion' | 'issue' | 'question';
type Status = 'open' | 'in_progress' | 'resolved' | 'closed';

interface Ticket {
  id: string; kind: Kind; subject: string; body: string; contact?: string | null;
  screen?: string | null; status: Status; reply?: string | null; adminNote?: string | null;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string; avatarUrl?: string | null } | null;
}

const STATUSES: Status[] = ['open', 'in_progress', 'resolved', 'closed'];
const KIND_ICON = { suggestion: Lightbulb, issue: Bug, question: HelpCircle };
const STATUS_TONE: Record<Status, string> = {
  open: 'bg-orange-100 text-orange-600',
  in_progress: 'bg-violet-100 text-violet-600',
  resolved: 'bg-emerald-100 text-emerald-600',
  closed: 'bg-gray-100 text-gray-400',
};

export default function AdminSupport() {
  const [tab, setTab] = useState<'tickets' | 'pinned'>('tickets');
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="safe-header-tall bg-ink px-5 pb-4 text-white">
        <div className="flex items-center gap-3">
          <Link to="/admin" aria-label="Back"><ArrowLeft /></Link>
          <h1 className="flex-1 text-xl font-extrabold">Support &amp; Community</h1>
          <Inbox className="opacity-60" />
        </div>
        <div className="mt-3 flex gap-1.5 rounded-full bg-white/10 p-1">
          {(['tickets', 'pinned'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-full py-1.5 text-xs font-bold capitalize transition ${
                tab === k ? 'bg-white text-ink' : 'text-white/70'
              }`}
            >
              {k === 'tickets' ? 'Tickets' : 'Pinned post'}
            </button>
          ))}
        </div>
      </header>
      {tab === 'tickets' ? <Tickets /> : <Pinned />}
    </div>
  );
}

function Tickets() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data } = useQuery<{ tickets: Ticket[]; byStatus: { status: string; count: number }[] }>({
    queryKey: ['admin-tickets', status],
    queryFn: () => api.get(`/api/admin/tickets${status ? `?status=${status}` : ''}`),
  });

  const patch = useMutation({
    mutationFn: (v: { id: string; body: Record<string, unknown> }) => api.patch(`/api/admin/tickets/${v.id}`, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tickets'] }),
    onError: (e: any) => toast(e?.message ?? 'Update failed', 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/admin/tickets/${id}`),
    onSuccess: () => { toast('Deleted', 'success'); qc.invalidateQueries({ queryKey: ['admin-tickets'] }); },
  });

  const counts = new Map((data?.byStatus ?? []).map((s) => [s.status, s.count]));
  const total = (data?.byStatus ?? []).reduce((n, s) => n + s.count, 0);
  const tickets = data?.tickets ?? [];

  return (
    <div className="p-4">
      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
        {[{ k: '', l: 'All', n: total }, ...STATUSES.map((s) => ({ k: s, l: s.replace('_', ' '), n: counts.get(s) ?? 0 }))].map((f) => (
          <button
            key={f.k || 'all'}
            onClick={() => setStatus(f.k)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${
              status === f.k ? 'bg-ink text-white' : 'bg-white text-gray-500 shadow-sm'
            }`}
          >
            {f.l} {f.n > 0 && <span className="opacity-60">({f.n})</span>}
          </button>
        ))}
      </div>

      {tickets.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-400">Nothing here yet.</p>
      ) : (
        <ul className="space-y-3">
          {tickets.map((tk) => {
            const Icon = KIND_ICON[tk.kind] ?? HelpCircle;
            return (
              <li key={tk.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Icon size={17} className="mt-0.5 shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{tk.subject}</p>
                    <p className="truncate text-[11px] text-gray-400">
                      {tk.user
                        ? `${tk.user.firstName} ${tk.user.lastName} · ${tk.user.email}`
                        : tk.contact
                          ? `Guest · ${tk.contact}`
                          : 'Deleted user'}
                      {tk.screen ? ` · ${tk.screen}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${STATUS_TONE[tk.status]}`}>
                    {tk.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-700">{tk.body}</p>
                {tk.contact && <p className="mt-1.5 text-[11px] text-gray-400" dir="ltr">Contact: {tk.contact}</p>}

                <textarea
                  value={drafts[tk.id] ?? tk.reply ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [tk.id]: e.target.value }))}
                  rows={2}
                  placeholder="Reply to the user — they get a notification"
                  className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs outline-none focus:border-orange-400 focus:bg-white"
                />

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => patch.mutate({ id: tk.id, body: { reply: drafts[tk.id] ?? tk.reply ?? '', status: 'resolved' } })}
                    disabled={!(drafts[tk.id] ?? tk.reply ?? '').trim()}
                    className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-[11px] font-bold text-white active:scale-95 disabled:opacity-40"
                  >
                    <Send size={12} /> Reply &amp; resolve
                  </button>
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => patch.mutate({ id: tk.id, body: { status: s } })}
                      disabled={tk.status === s}
                      className={`rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase transition ${
                        tk.status === s ? STATUS_TONE[s] : 'bg-gray-50 text-gray-400 active:scale-95'
                      }`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                  <button onClick={() => remove.mutate(tk.id)} aria-label="Delete" className="ms-auto rounded-lg bg-red-50 p-1.5 text-red-500 active:scale-95">
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Pinned() {
  const qc = useQueryClient();
  const [postId, setPostId] = useState('');
  const [days, setDays] = useState(7);

  const { data } = useQuery<any>({ queryKey: ['admin-pinned'], queryFn: () => api.get('/api/admin/pinned') });
  const { data: posts } = useQuery<any[]>({ queryKey: ['admin-posts'], queryFn: () => api.get('/api/admin/reels/posts') });

  const pin = useMutation({
    mutationFn: () => api.post('/api/admin/pinned', { postId, days }),
    onSuccess: () => { toast('Pinned', 'success'); setPostId(''); qc.invalidateQueries({ queryKey: ['admin-pinned'] }); },
    onError: (e: any) => toast(e?.message ?? 'Could not pin', 'error'),
  });
  const unpin = useMutation({
    mutationFn: () => api.del('/api/admin/pinned'),
    onSuccess: () => { toast('Unpinned', 'success'); qc.invalidateQueries({ queryKey: ['admin-pinned'] }); },
  });

  const current = data?.pinned;

  return (
    <div className="space-y-4 p-4">
      {current ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Pin size={15} className="text-orange-500" />
            <p className="text-sm font-bold">Currently pinned</p>
            {data.expired && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-500">EXPIRED</span>}
          </div>
          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-xs leading-relaxed">{current.text}</p>
          <p className="mt-2 text-[11px] text-gray-400">
            {current._count?.comments ?? 0} comments · {current._count?.reactions ?? 0} reactions
            {current.pinnedUntil && ` · closes ${new Date(current.pinnedUntil).toLocaleDateString()}`}
          </p>
          <button onClick={() => unpin.mutate()} className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-gray-100 text-xs font-bold text-gray-600 active:scale-95">
            <PinOff size={14} /> Unpin now
          </button>

          {!!current.comments?.length && (
            <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3">
              {current.comments.map((c: any) => (
                <li key={c.id} className="flex items-start gap-2">
                  <MediaImage path={c.user?.avatarUrl} label={c.user?.firstName} className="h-7 w-7 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold">{c.user?.firstName} {c.user?.lastName}</p>
                    <p className="text-xs text-gray-600">{c.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-4 text-center text-sm text-gray-400 shadow-sm">Nothing pinned right now.</p>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm font-bold">Pin a post</p>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
          The pinned post sits at the top of everyone&apos;s feed — not just followers — and collects replies until it closes.
          Pinning one retires the previous one.
        </p>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-gray-500">Open for (days)</span>
          <input
            type="number" min={1} max={90} value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="min-h-[40px] w-24 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-orange-400"
          />
        </label>

        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {(posts ?? []).slice(0, 30).map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setPostId(p.id)}
                className={`w-full rounded-xl p-2.5 text-start text-xs transition ${
                  postId === p.id ? 'bg-orange-50 ring-1 ring-orange-400' : 'bg-gray-50'
                }`}
              >
                <span className="block font-semibold">{p.user?.firstName} {p.user?.lastName}</span>
                <span className="line-clamp-2 text-gray-500">{p.text || `(${p.mediaType ?? p.kind})`}</span>
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={() => pin.mutate()}
          disabled={!postId || pin.isPending}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-orange-500 text-sm font-bold text-white active:scale-95 disabled:opacity-40"
        >
          <Pin size={15} /> {pin.isPending ? 'Pinning...' : `Pin for ${days} day${days === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}
