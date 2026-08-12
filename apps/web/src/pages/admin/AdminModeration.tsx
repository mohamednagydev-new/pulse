import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, MessageCircle, Trophy, RefreshCw, Wifi, Lock, Flag } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import TopBar from '../../components/TopBar';
import { MediaImage } from '../../components/ui';
import { timeAgo } from '../../components/PostCard';

/** Everything the community can see, in one list, with a delete on every row.
 *  DMs are deliberately absent — private messages aren't moderation surface. */
/** Inline DM transcript for the moderation panels. Voice notes show as markers. */
function ThreadView({ data, loading }: { data: any; loading: boolean }) {
  if (loading || !data) return <p className="py-4 text-center text-xs text-gray-400">…</p>;
  return (
    <div className="mt-2.5 max-h-72 space-y-1 overflow-y-auto rounded-lg bg-gray-50 p-2.5">
      {data.messages.map((m: any) => (
        <p key={m.id} className="text-xs leading-relaxed">
          <span className="font-bold">{m.from}:</span>{' '}
          {m.voice ? <span className="text-gray-400">🎤 voice note</span> : m.text}
          <span className="ms-1.5 text-[9px] text-gray-300">{timeAgo(m.createdAt)}</span>
        </p>
      ))}
      {data.messages.length === 0 && <p className="text-center text-xs text-gray-400">Empty conversation.</p>}
    </div>
  );
}

export default function AdminModeration() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'online' | 'feed' | 'rooms' | 'dms' | 'reports'>('online');
  const [openThread, setOpenThread] = useState<string | null>(null);

  const feed = useQuery({ queryKey: ['mod-feed'], queryFn: () => api.get('/api/admin/moderation/feed'), enabled: tab === 'feed' });
  const rooms = useQuery({ queryKey: ['mod-rooms'], queryFn: () => api.get('/api/admin/moderation/challenge-messages'), enabled: tab === 'rooms' });
  const online = useQuery({
    queryKey: ['mod-online'],
    queryFn: () => api.get('/api/admin/moderation/online'),
    enabled: tab === 'online',
    refetchInterval: 20000, // live-ish without sockets in the admin page
  });
  const dms = useQuery({ queryKey: ['mod-dms'], queryFn: () => api.get('/api/admin/moderation/dm-threads'), enabled: tab === 'dms' });
  const reports = useQuery({ queryKey: ['mod-reports'], queryFn: () => api.get('/api/admin/moderation/reports'), enabled: tab === 'reports' });
  const thread = useQuery({
    queryKey: ['mod-thread', openThread],
    queryFn: () => api.get(`/api/admin/moderation/dm-threads/${openThread}/messages`),
    enabled: Boolean(openThread),
  });
  const pin = useMutation({
    mutationFn: (postId: string) => api.post('/api/admin/pinned', { postId, days: 7 }),
    onSuccess: () => toast('Pinned for 7 days 📌', 'success'),
    onError: (e: any) => toast(e?.message ?? 'Pin failed', 'error'),
  });
  const resolve = useMutation({
    mutationFn: (rid: string) => api.post(`/api/admin/moderation/reports/${rid}/resolve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mod-reports'] }); toast('Resolved', 'success'); },
  });

  const del = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => api.del(`/api/admin/moderation/${type}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mod-feed'] });
      qc.invalidateQueries({ queryKey: ['mod-rooms'] });
      toast('Deleted', 'success');
    },
    onError: () => toast('Delete failed', 'error'),
  });

  const confirmDel = (type: string, id: string, what: string) => {
    if (window.confirm(`Delete this ${what}? This cannot be undone.`)) del.mutate({ type, id });
  };

  return (
    <div className="mx-auto min-h-screen max-w-3xl pb-12">
      <TopBar title="Moderation" color="bg-ink" textColor="text-white" />

      <div className="flex gap-1 p-4 pb-2">
        {([
          { key: 'online' as const, icon: Wifi, label: `Online${online.data ? ` (${online.data.count})` : ''}` },
          { key: 'feed' as const, icon: MessageCircle, label: 'Feed' },
          { key: 'rooms' as const, icon: Trophy, label: 'Rooms' },
          { key: 'dms' as const, icon: Lock, label: 'DMs' },
          { key: 'reports' as const, icon: Flag, label: `Reports${reports.data?.filter((r: any) => r.status === 'open').length ? ` (${reports.data.filter((r: any) => r.status === 'open').length})` : ''}` },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${
              tab === key ? 'bg-ink text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
        <button
          onClick={() => qc.invalidateQueries({ queryKey: tab === 'feed' ? ['mod-feed'] : ['mod-rooms'] })}
          aria-label="Refresh"
          className="ms-auto rounded-full bg-gray-100 p-2 text-gray-500"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {tab === 'online' && (
        <div className="px-4">
          <p className="mb-3 rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-600">
            🟢 {online.data?.count ?? 0} online right now
            <span className="ms-2 font-normal text-gray-400">(auto-refreshes every 20s)</span>
          </p>
          <div className="space-y-1.5">
            {(online.data?.users ?? []).map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
                <span className="relative shrink-0">
                  <MediaImage path={u.avatarUrl} label={u.firstName} className="h-9 w-9 rounded-full" seed={1} />
                  <span className="absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{u.firstName} {u.lastName}</p>
                  <p className="truncate text-[11px] text-gray-400">{u.email} · Lv {u.level ?? 1}</p>
                </div>
              </div>
            ))}
            {online.data?.count === 0 && <p className="py-10 text-center text-sm text-gray-400">Nobody connected at this moment.</p>}
          </div>
        </div>
      )}

      {tab === 'dms' && (
        <div className="px-4">
          <p className="mb-3 rounded-xl bg-blue-500/10 p-3 text-xs leading-relaxed text-gray-500">
            <Lock size={12} className="mb-0.5 me-1 inline text-blue-500" />
            Content access exists but <b>every read is logged</b>. Prefer the Reports tab — a report is the
            user's consent to review. Casual reading erodes the trust that keeps chat alive.
          </p>
          <div className="space-y-1.5">
            {(dms.data ?? []).map((th: any) => (
              <div key={th.id} className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {th.a.firstName} {th.a.lastName} <span className="text-gray-400">↔</span> {th.b.firstName} {th.b.lastName}
                    </p>
                    <p className="truncate text-[11px] text-gray-400">{th.a.email} · {th.b.email}</p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-sm font-bold">{th.messages}</p>
                    <p className="text-[10px] text-gray-400">{timeAgo(th.lastMessageAt)}</p>
                  </div>
                  <button
                    onClick={() => setOpenThread(openThread === th.id ? null : th.id)}
                    className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-600"
                  >
                    {openThread === th.id ? 'Hide' : 'View'}
                  </button>
                </div>
                {openThread === th.id && <ThreadView data={thread.data} loading={thread.isLoading} />}
              </div>
            ))}
            {dms.data?.length === 0 && <p className="py-10 text-center text-sm text-gray-400">No conversations yet.</p>}
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-1.5 px-4">
          {(reports.data ?? []).map((r: any) => (
            <div key={r.id} className={`rounded-xl bg-white p-3 shadow-sm ${r.status === 'resolved' ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    🚩 {r.reporter?.firstName} reported: {r.a?.firstName} ↔ {r.b?.firstName}
                    {r.status === 'resolved' && <span className="ms-2 rounded bg-emerald-100 px-1.5 text-[10px] text-emerald-600">RESOLVED</span>}
                  </p>
                  {r.reason && <p className="mt-0.5 text-xs text-gray-500">"{r.reason}"</p>}
                  <p className="mt-0.5 text-[10px] text-gray-400">{timeAgo(r.createdAt)}</p>
                </div>
                <button
                  onClick={() => setOpenThread(openThread === r.threadId ? null : r.threadId)}
                  className="shrink-0 rounded-full bg-gray-900 px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  {openThread === r.threadId ? 'Hide' : 'Review'}
                </button>
                {r.status === 'open' && (
                  <button onClick={() => resolve.mutate(r.id)} className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white">
                    Resolve
                  </button>
                )}
              </div>
              {openThread === r.threadId && <ThreadView data={thread.data} loading={thread.isLoading} />}
            </div>
          ))}
          {reports.data?.length === 0 && <p className="py-10 text-center text-sm text-gray-400">No reports — a quiet community is a good community.</p>}
        </div>
      )}

      {tab === 'feed' && (
        <div className="space-y-2 px-4">
          {(feed.data ?? []).map((p: any) => (
            <div key={p.id} className="rounded-xl bg-white p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">
                    {p.user.firstName} {p.user.lastName}
                    <span className="ms-2 font-normal text-gray-400">{p.user.email} · {p.kind} · {timeAgo(p.createdAt)} · {p.reactionCount} ❤</span>
                  </p>
                  {(p.text || p.textAr) && <p className="mt-1 break-words text-sm">{p.textAr ?? p.text}</p>}
                  {p.mediaType && <p className="mt-0.5 text-[11px] text-gray-400">[{p.mediaType} attached]</p>}
                </div>
                <button
                  onClick={() => pin.mutate(p.id)}
                  aria-label="Pin post"
                  className="shrink-0 rounded-lg p-1.5 text-amber-500 hover:bg-amber-50"
                  title="Pin to the top of everyone's feed for 7 days"
                >
                  📌
                </button>
                <button onClick={() => confirmDel('posts', p.id, 'post')} aria-label="Delete post" className="shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                  <Trash2 size={15} />
                </button>
              </div>
              {p.comments.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                  {p.comments.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="font-semibold">{c.by}</span>
                      <span className="min-w-0 flex-1 truncate text-gray-500">{c.text}</span>
                      <button onClick={() => confirmDel('comments', c.id, 'comment')} aria-label="Delete comment" className="shrink-0 text-red-400">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {feed.data?.length === 0 && <p className="py-10 text-center text-sm text-gray-400">No posts yet.</p>}
        </div>
      )}

      {tab === 'rooms' && (
        <div className="space-y-1.5 px-4">
          {(rooms.data ?? []).map((m: any) => (
            <div key={m.id} className="flex items-start gap-2 rounded-xl bg-white p-3 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">
                  {m.by}
                  {m.isCoach && <span className="ms-1 rounded bg-brand-pink/10 px-1 text-[9px] text-brand-pink">COACH</span>}
                  <span className="ms-2 font-normal text-gray-400">{m.room} · {timeAgo(m.createdAt)}</span>
                </p>
                <p className="mt-0.5 break-words text-sm">{m.text}</p>
              </div>
              <button onClick={() => confirmDel('challenge-messages', m.id, 'message')} aria-label="Delete message" className="shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {rooms.data?.length === 0 && <p className="py-10 text-center text-sm text-gray-400">No messages yet.</p>}
        </div>
      )}
    </div>
  );
}
