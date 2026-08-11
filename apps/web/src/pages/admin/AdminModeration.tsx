import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, MessageCircle, Trophy, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import TopBar from '../../components/TopBar';
import { timeAgo } from '../../components/PostCard';

/** Everything the community can see, in one list, with a delete on every row.
 *  DMs are deliberately absent — private messages aren't moderation surface. */
export default function AdminModeration() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'feed' | 'rooms'>('feed');

  const feed = useQuery({ queryKey: ['mod-feed'], queryFn: () => api.get('/api/admin/moderation/feed'), enabled: tab === 'feed' });
  const rooms = useQuery({ queryKey: ['mod-rooms'], queryFn: () => api.get('/api/admin/moderation/challenge-messages'), enabled: tab === 'rooms' });

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
          { key: 'feed' as const, icon: MessageCircle, label: 'Feed posts' },
          { key: 'rooms' as const, icon: Trophy, label: 'Challenge rooms' },
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
