import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Search, Clapperboard, Trash2, Film, Users, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, MediaImage, EmptyState, formatDuration } from '../../components/ui';
import { toast } from '../../lib/toast';
import AdminReelPaste from './AdminReelPaste';

type Topic = 'workout' | 'yoga';

interface CuratedReel {
  id: string;
  source: string;
  provider: string;
  externalId: string | null;
  sourceUrl: string | null;
  authorName: string | null;
  keyword: string | null;
  topic: Topic;
  title: string;
  titleAr: string | null;
  videoId: string | null;
  poster: string | null;
  active: boolean;
  order: number;
  createdAt: string;
  resolvable?: boolean;
}
interface CommunityPost {
  id: string;
  kind: string;
  text: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  refId: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
}

const QUICK_KEYWORDS = ['workout', 'yoga', 'hiit', 'pilates', 'stretching', 'home workout', 'meal prep'];

function defaultTopic(keyword: string): Topic {
  return /yoga|pilates|stretch|meditat/i.test(keyword) ? 'yoga' : 'workout';
}

function TopicChip({ topic }: { topic: Topic }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
        topic === 'yoga' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-brand-pink/10 text-brand-pink'
      }`}
    >
      {topic}
    </span>
  );
}

/* ------------------------------- Tab 2: Library ------------------------------- */

function LibraryTab({ reels, isLoading }: { reels: CuratedReel[] | undefined; isLoading: boolean }) {
  const qc = useQueryClient();

  const patchReel = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/api/admin/reels/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reels', 'library'] }),
    onError: (err) => toast(err instanceof Error ? err.message : 'Update failed', 'error'),
  });

  const deleteReel = useMutation({
    mutationFn: (id: string) => api.del(`/api/admin/reels/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reels', 'library'] });
      toast('Reel deleted', 'success');
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Delete failed', 'error'),
  });

  if (isLoading) return <Loader label="Loading library" />;
  if (!reels?.length) {
    return (
      <EmptyState
        icon={<Film size={40} />}
        title="No curated reels yet"
        hint="Approve videos in the Find & approve tab — they appear here and go live for users."
      />
    );
  }

  return (
    <div className="space-y-2 p-4">
      {reels.map((r) => (
        <div
          key={r.id}
          className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ${r.active ? '' : 'opacity-50'}`}
        >
          <MediaImage path={r.poster} label={r.title} className="h-20 w-14 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium leading-snug">{r.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <TopicChip topic={r.topic} />
              {r.videoId ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700" title="Saved on your server — never expires">saved</span>
              ) : r.resolvable === false ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600" title="No longer found on TikTok search — users may see it as expired. Re-find or remove it.">⚠ link lost</span>
              ) : (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-600" title="Link mode — refreshed automatically at serve time">link</span>
              )}
              {r.keyword && <span className="text-xs text-gray-400">“{r.keyword}”</span>}
              <span className="text-xs text-gray-300">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button
            onClick={() => patchReel.mutate({ id: r.id, active: !r.active })}
            title={r.active ? 'Visible to users — click to hide' : 'Hidden — click to show'}
            role="switch"
            aria-checked={r.active}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${r.active ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${r.active ? 'left-[22px]' : 'left-0.5'}`}
            />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete “${r.title}”? Users will no longer see it.`)) deleteReel.mutate(r.id);
            }}
            title="Delete reel"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Tab 3: Community ------------------------------- */

function CommunityTab() {
  const qc = useQueryClient();
  const [reelsOnly, setReelsOnly] = useState(true);

  const { data: posts, isLoading } = useQuery<CommunityPost[]>({
    queryKey: ['admin', 'reels', 'posts', reelsOnly],
    queryFn: () => api.get(`/api/admin/reels/posts${reelsOnly ? '?kind=reel' : ''}`),
  });

  const deletePost = useMutation({
    mutationFn: (id: string) => api.del(`/api/admin/reels/posts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reels', 'posts'] });
      toast('Removed', 'success');
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Delete failed', 'error'),
  });

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-end gap-1 rounded-full bg-gray-100 p-1 text-xs font-semibold" style={{ width: 'fit-content', marginLeft: 'auto' }}>
        <button
          onClick={() => setReelsOnly(true)}
          className={`rounded-full px-3 py-1.5 ${reelsOnly ? 'bg-white shadow-sm' : 'text-gray-400'}`}
        >
          Reels only
        </button>
        <button
          onClick={() => setReelsOnly(false)}
          className={`rounded-full px-3 py-1.5 ${!reelsOnly ? 'bg-white shadow-sm' : 'text-gray-400'}`}
        >
          All posts
        </button>
      </div>

      {isLoading ? (
        <Loader label="Loading posts" />
      ) : !posts?.length ? (
        <EmptyState
          icon={<Users size={40} />}
          title="No community posts"
          hint={reelsOnly ? 'No reel posts yet. Switch to “All posts” to see everything.' : 'Nothing posted yet.'}
        />
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {p.user.firstName} {p.user.lastName}{' '}
                  <span className="font-normal text-gray-400">· {p.user.email}</span>
                </p>
                {p.text && <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{p.text}</p>}
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-500">
                    {p.kind}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Delete this post? This cannot be undone.')) deletePost.mutate(p.id);
                }}
                className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Page ------------------------------- */

type TabKey = 'paste' | 'library' | 'community';

export default function AdminReels() {
  const [tab, setTab] = useState<TabKey>('paste');

  const qc = useQueryClient();
  const { data: library, isLoading: libraryLoading } = useQuery<CuratedReel[]>({
    queryKey: ['admin', 'reels', 'library'],
    queryFn: () => api.get('/api/admin/reels'),
  });

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'paste', label: 'Add reels' },
    { key: 'library', label: `Library${library ? ` (${library.length})` : ''}` },
    { key: 'community', label: 'Community' },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-3xl pb-10">
      <header className="safe-header flex items-center gap-2 bg-ink px-4 pb-4 text-white">
        <Link to="/admin"><ChevronLeft /></Link>
        <Clapperboard size={20} />
        <h1 className="text-lg font-bold">Reels Curation</h1>
        <button
          onClick={async () => {
            try {
              const r: { added: number; skipped: number } = await api.post('/api/admin/reels/pull-now');
              alert(`Pulled ${r.added} new reel(s) into the library (inactive, review below). Skipped ${r.skipped}.`);
              qc.invalidateQueries({ queryKey: ['admin', 'reels'] });
            } catch (e: any) {
              alert(e?.message ?? 'Pull failed');
            }
          }}
          className="ml-auto rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold"
          title="Pull the newest uploads from the channels configured in REELS_CHANNELS"
        >
          Pull channels
        </button>
      </header>

      <div className="px-4 pt-4">
        <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                tab === t.key ? 'bg-white shadow-sm' : 'text-gray-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'paste' && <AdminReelPaste />}
      {tab === 'library' && <LibraryTab reels={library} isLoading={libraryLoading} />}
      {tab === 'community' && <CommunityTab />}
    </div>
  );
}
