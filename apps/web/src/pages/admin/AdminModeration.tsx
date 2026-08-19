import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Flag, MessageCircle, Pin, RefreshCw, Trash2, Trophy, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import { timeAgo } from '../../components/PostCard';

/** Unified moderation queue — one screen, three tabs:
 *  · Reported chats — user-filed DM reports (the only PERSISTED report type;
 *    post reports only ping admins by push, nothing is stored).
 *  · Recent posts — the community feed, newest first, with delete / delete+warn.
 *  · Rooms — challenge-room messages, same actions.
 *  List/GET + plain delete/resolve endpoints are the existing /api/admin ones;
 *  the delete-and-warn variants live in /api/admin-ops. */

/** Inline DM transcript for reviewing a reported chat. Voice notes show as markers. */
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

/** Name that links to the pre-filtered Users screen. */
function AuthorLink({ name, email }: { name: string; email?: string | null }) {
  if (!email) return <span className="font-bold">{name}</span>;
  return (
    <Link to={`/admin/users?q=${encodeURIComponent(email)}`} className="font-bold underline decoration-gray-300 underline-offset-2 hover:text-brand-blue">
      {name}
    </Link>
  );
}

export default function AdminModeration() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'reported' | 'chats' | 'posts' | 'rooms'>('reported');
  const [openThread, setOpenThread] = useState<string | null>(null);

  const reports = useQuery({ queryKey: ['mod-reports'], queryFn: () => api.get('/api/admin/moderation/reports') });
  const reported = useQuery({ queryKey: ['mod-post-reports'], queryFn: () => api.get('/api/admin-ops/moderation/post-reports'), enabled: tab === 'reported' });
  const feed = useQuery({ queryKey: ['mod-feed'], queryFn: () => api.get('/api/admin/moderation/feed'), enabled: tab === 'posts' });
  const rooms = useQuery({ queryKey: ['mod-rooms'], queryFn: () => api.get('/api/admin/moderation/challenge-messages'), enabled: tab === 'rooms' });
  const thread = useQuery({
    queryKey: ['mod-thread', openThread],
    queryFn: () => api.get(`/api/admin/moderation/dm-threads/${openThread}/messages`),
    enabled: Boolean(openThread),
  });

  const dismissReport = useMutation({
    mutationFn: (postId: string) => api.post(`/api/admin-ops/moderation/post-reports/${postId}/dismiss`, {}),
    onSuccess: () => { toast('Reports dismissed', 'success'); qc.invalidateQueries({ queryKey: ['mod-post-reports'] }); },
  });
  const deleteReported = useMutation({
    mutationFn: ({ postId, warn }: { postId: string; warn: boolean }) =>
      api.post(`/api/admin-ops/moderation/post-reports/${postId}/delete`, { warn }),
    onSuccess: () => {
      toast('Post removed', 'success');
      qc.invalidateQueries({ queryKey: ['mod-post-reports'] });
      qc.invalidateQueries({ queryKey: ['mod-feed'] });
    },
  });

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ['mod-reports'] });
    qc.invalidateQueries({ queryKey: ['mod-feed'] });
    qc.invalidateQueries({ queryKey: ['mod-post-reports'] });
  };

  // ---- actions (dismiss / delete / delete+warn) ----
  const dismiss = useMutation({
    mutationFn: (rid: string) => api.post(`/api/admin/moderation/reports/${rid}/resolve`, {}),
    onSuccess: () => { toast('Report dismissed', 'success'); qc.invalidateQueries({ queryKey: ['mod-reports'] }); },
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });
  const deleteThread = useMutation({
    mutationFn: (v: { rid: string; warn: boolean }) => api.post(`/api/admin-ops/moderation/chat-reports/${v.rid}/delete-thread`, { warn: v.warn }),
    onSuccess: (_r, v) => { toast(v.warn ? 'Chat deleted, author warned' : 'Chat deleted', 'success'); setOpenThread(null); qc.invalidateQueries({ queryKey: ['mod-reports'] }); },
    onError: (e: any) => toast(e?.message ?? 'Delete failed', 'error'),
  });
  const del = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => api.del(`/api/admin/moderation/${type}/${id}`),
    onSuccess: () => { toast('Deleted', 'success'); refetchAll(); },
    onError: () => toast('Delete failed', 'error'),
  });
  const delWarn = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) => api.post(`/api/admin-ops/moderation/${type}/${id}/delete-warn`, {}),
    onSuccess: () => { toast('Deleted, author warned ⚠️', 'success'); refetchAll(); },
    onError: (e: any) => toast(e?.message ?? 'Delete failed', 'error'),
  });
  const pin = useMutation({
    mutationFn: (postId: string) => api.post('/api/admin/pinned', { postId, days: 7 }),
    onSuccess: () => toast('Pinned for 7 days 📌', 'success'),
    onError: (e: any) => toast(e?.message ?? 'Pin failed', 'error'),
  });

  const confirmDel = (type: string, id: string, what: string, warn: boolean) => {
    const msg = warn
      ? `Delete this ${what} AND send its author a guideline warning?`
      : `Delete this ${what}? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    if (warn) delWarn.mutate({ type, id });
    else del.mutate({ type, id });
  };

  const reportRows = reports.data ?? [];
  const openReports = reportRows.filter((r: any) => r.status === 'open');
  // Reporter count per thread (several users can flag the same conversation).
  const reportsPerThread = new Map<string, number>();
  for (const r of openReports) reportsPerThread.set(r.threadId, (reportsPerThread.get(r.threadId) ?? 0) + 1);

  const TabBtn = ({ k, icon: Icon, label }: { k: typeof tab; icon: any; label: string }) => (
    <button
      onClick={() => setTab(k)}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${tab === k ? 'bg-ink text-white' : 'bg-white text-gray-500 shadow-sm'}`}
    >
      <Icon size={13} /> {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Moderation</h1>
          <p className="text-xs text-gray-400">
            {(reported.data?.length ?? 0)} reported post{(reported.data?.length ?? 0) === 1 ? '' : 's'} · {openReports.length} open chat report{openReports.length === 1 ? '' : 's'}
          </p>
        </div>
        <button onClick={refetchAll} aria-label="Refresh" className="rounded-full bg-white p-2.5 text-gray-500 shadow-sm">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <TabBtn k="reported" icon={Flag} label={`Reported posts${reported.data?.length ? ` (${reported.data.length})` : ''}`} />
        <TabBtn k="chats" icon={Flag} label={`Reported chats${openReports.length ? ` (${openReports.length})` : ''}`} />
        <TabBtn k="posts" icon={MessageCircle} label="Recent posts" />
        <TabBtn k="rooms" icon={Trophy} label="Rooms" />
      </div>

      {/* ---- Reported posts (persisted queue) ---- */}
      {tab === 'reported' && (
        <div className="space-y-2">
          {(reported.data ?? []).length === 0 && !reported.isLoading && (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">No reported posts — all clear ✅</p>
          )}
          {(reported.data ?? []).map((r: any) => (
            <div key={r.post.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <AuthorLink name={`${r.post.user.firstName} ${r.post.user.lastName}`} email={r.post.user.email} />
                    <span className="ms-2 text-gray-400">{timeAgo(r.post.createdAt)} · 🚩 {r.count} report{r.count === 1 ? '' : 's'}</span>
                  </p>
                  {(r.post.text || r.post.textAr) && <p className="mt-1 break-words text-sm">{r.post.textAr ?? r.post.text}</p>}
                  {r.post.mediaType && <p className="mt-0.5 text-[11px] text-gray-400">[{r.post.mediaType} attached]</p>}
                  {r.reasons.length > 0 && <p className="mt-1 text-[11px] font-semibold text-amber-600">{r.reasons.join(' · ')}</p>}
                  <p className="mt-0.5 text-[11px] text-gray-400">Reported by: {r.reporters.join(', ')}</p>
                </div>
                <button
                  onClick={() => dismissReport.mutate(r.post.id)}
                  aria-label="Dismiss reports"
                  title="Dismiss — the post stays up"
                  className="shrink-0 rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={() => deleteReported.mutate({ postId: r.post.id, warn: false })}
                  aria-label="Delete post"
                  title="Delete post"
                  className="shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => deleteReported.mutate({ postId: r.post.id, warn: true })}
                  aria-label="Delete post and warn author"
                  title="Delete + warn author"
                  className="shrink-0 rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                >
                  <AlertTriangle size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Reported chats ---- */}
      {tab === 'chats' && (
        <div className="space-y-2">
          {reportRows.map((r: any) => {
            const reported = r.a && r.reporter && r.a.id === r.reporter.id ? r.b : r.a; // the party who did NOT file it
            const count = reportsPerThread.get(r.threadId) ?? 0;
            return (
              <div key={r.id} className={`rounded-2xl bg-white p-4 shadow-sm ${r.status === 'resolved' ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      🚩 <span className="font-bold">{r.reporter?.firstName ?? '?'}</span> reported their chat with{' '}
                      <AuthorLink name={`${reported?.firstName ?? '?'} ${reported?.lastName ?? ''}`.trim()} email={reported?.email} />
                      {count > 1 && <span className="ms-2 rounded bg-red-100 px-1.5 text-[10px] font-bold text-red-500">{count} REPORTS</span>}
                      {r.status === 'resolved' && <span className="ms-2 rounded bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-600">RESOLVED</span>}
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
                    <>
                      <button onClick={() => dismiss.mutate(r.id)} className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white">
                        Dismiss
                      </button>
                      <button
                        onClick={() => window.confirm('Delete this whole conversation? This cannot be undone.') && deleteThread.mutate({ rid: r.id, warn: false })}
                        className="shrink-0 rounded-full bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white"
                      >
                        Delete chat
                      </button>
                      <button
                        onClick={() => window.confirm('Delete the conversation AND warn the reported user?') && deleteThread.mutate({ rid: r.id, warn: true })}
                        className="flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white"
                      >
                        <AlertTriangle size={11} /> Delete + warn
                      </button>
                    </>
                  )}
                </div>
                {openThread === r.threadId && <ThreadView data={thread.data} loading={thread.isLoading} />}
              </div>
            );
          })}
          {reportRows.length === 0 && <p className="rounded-2xl bg-white py-12 text-center text-sm text-gray-400 shadow-sm">No reports — a quiet community is a good community.</p>}
        </div>
      )}

      {/* ---- Recent posts ---- */}
      {tab === 'posts' && (
        <div className="space-y-2">
          {(feed.data ?? []).map((p: any) => (
            <div key={p.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <AuthorLink name={`${p.user.firstName} ${p.user.lastName}`} email={p.user.email} />
                    <span className="ms-2 text-gray-400">{p.user.email} · {p.kind} · {timeAgo(p.createdAt)} · {p.reactionCount} ❤</span>
                  </p>
                  {(p.text || p.textAr) && <p className="mt-1 break-words text-sm">{p.textAr ?? p.text}</p>}
                  {p.mediaType && <p className="mt-0.5 text-[11px] text-gray-400">[{p.mediaType} attached]</p>}
                </div>
                <button
                  onClick={() => pin.mutate(p.id)}
                  aria-label="Pin post"
                  title="Pin to the top of everyone's feed for 7 days"
                  className="shrink-0 rounded-lg p-1.5 text-amber-500 hover:bg-amber-50"
                >
                  <Pin size={15} />
                </button>
                <button
                  onClick={() => confirmDel('posts', p.id, 'post', false)}
                  aria-label="Delete post"
                  title="Delete post"
                  className="shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => confirmDel('posts', p.id, 'post', true)}
                  aria-label="Delete post and warn author"
                  title="Delete + warn author"
                  className="shrink-0 rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                >
                  <AlertTriangle size={15} />
                </button>
              </div>
              {p.comments.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                  {p.comments.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="font-semibold">{c.by}</span>
                      <span className="min-w-0 flex-1 truncate text-gray-500">{c.text}</span>
                      <button onClick={() => confirmDel('comments', c.id, 'comment', false)} aria-label="Delete comment" className="shrink-0 text-red-400">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {feed.data?.length === 0 && <p className="rounded-2xl bg-white py-12 text-center text-sm text-gray-400 shadow-sm">No posts yet.</p>}
        </div>
      )}

      {/* ---- Challenge rooms ---- */}
      {tab === 'rooms' && (
        <div className="space-y-2">
          {(rooms.data ?? []).map((m: any) => (
            <div key={m.id} className="flex items-start gap-2 rounded-2xl bg-white p-4 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">
                  {m.by}
                  {m.isCoach && <span className="ms-1 rounded bg-brand-pink/10 px-1 text-[9px] text-brand-pink">COACH</span>}
                  <span className="ms-2 font-normal text-gray-400">{m.room} · {timeAgo(m.createdAt)}</span>
                </p>
                <p className="mt-0.5 break-words text-sm">{m.text}</p>
              </div>
              <button
                onClick={() => confirmDel('challenge-messages', m.id, 'message', false)}
                aria-label="Delete message"
                title="Delete message"
                className="shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50"
              >
                <Trash2 size={15} />
              </button>
              {!m.isCoach && (
                <button
                  onClick={() => confirmDel('challenge-messages', m.id, 'message', true)}
                  aria-label="Delete message and warn author"
                  title="Delete + warn author"
                  className="shrink-0 rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                >
                  <AlertTriangle size={15} />
                </button>
              )}
            </div>
          ))}
          {rooms.data?.length === 0 && <p className="rounded-2xl bg-white py-12 text-center text-sm text-gray-400 shadow-sm">No messages yet.</p>}
        </div>
      )}
    </div>
  );
}
