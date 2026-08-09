import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, RefreshCw, Send, CalendarClock, ImagePlus, Sparkles } from 'lucide-react';
import { api, getAccessToken } from '../../lib/api';
import { Loader, MediaImage } from '../../components/ui';
import { toast } from '../../lib/toast';

/** Daily posting loop without leaving the app: 3 suggested captions (AI when
 *  configured, else content-aware rotation) → edit → attach image → post or
 *  schedule straight to the Facebook Page. */

interface Suggestion { label: string; caption: string }

export default function AdminPosts() {
  const { data: status } = useQuery({ queryKey: ['fb-status'], queryFn: () => api.get('/api/admin/fb/status') });
  const {
    data: sugg,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<{ source: string; posts: Suggestion[] }>({
    queryKey: ['fb-suggestions'],
    queryFn: () => api.get('/api/admin/fb/suggestions'),
    staleTime: 10 * 60_000,
  });

  return (
    <div className="min-h-screen pb-10">
      <header className="flex items-center gap-2 bg-ink px-4 py-4 text-white">
        <Link to="/admin"><ChevronLeft /></Link>
        <h1 className="text-lg font-bold">Posts</h1>
        <span className="ms-auto text-xs text-white/60">
          {status?.configured ? `→ ${status.pageName ?? 'Facebook Page'}` : 'FB not configured'}
        </span>
      </header>

      {!status?.configured && (
        <p className="m-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
          Set FB_PAGE_ID and FB_PAGE_TOKEN in the server .env to enable posting. Suggestions still work.
        </p>
      )}

      <div className="flex items-center justify-between px-4 pt-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
          <Sparkles size={15} className="text-brand-pink" />
          Today's suggestions {sugg ? `· ${sugg.source === 'ai' ? 'AI' : 'rotation'}` : ''}
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-gray-600 shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="space-y-4 p-4">
          {(sugg?.posts ?? []).map((p, i) => (
            <PostCardEditor key={`${sugg?.source}-${i}-${p.label}`} suggestion={p} canPost={!!status?.configured} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCardEditor({ suggestion, canPost }: { suggestion: Suggestion; canPost: boolean }) {
  const [caption, setCaption] = useState(suggestion.caption);
  const [imagePath, setImagePath] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [posted, setPosted] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setCaption(suggestion.caption), [suggestion.caption]);

  const uploadImage = async (f: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/admin/upload/image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        credentials: 'include',
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.path) throw new Error(json.error || 'Upload failed');
      setImagePath(json.path);
      toast('Image attached', 'success');
    } catch (e: any) {
      toast(e?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const post = useMutation({
    mutationFn: () =>
      api.post('/api/admin/fb/post', {
        message: caption.trim(),
        ...(imagePath.trim() ? { imagePath: imagePath.trim() } : {}),
        ...(scheduleAt ? { scheduleAt: new Date(scheduleAt).toISOString() } : {}),
      }),
    onSuccess: (r: any) => {
      setPosted(r.scheduled ? 'Scheduled ✓ — see Page → Publishing tools' : 'Posted ✓');
      toast(r.scheduled ? 'Scheduled on the Page' : 'Posted to the Page', 'success');
    },
    onError: (e: any) => toast(e?.message ?? 'Post failed', 'error'),
  });

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand-pink">{suggestion.label}</p>
      <textarea
        dir="auto"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="min-h-32 w-full resize-y rounded-xl bg-gray-50 p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-brand-pink/40"
      />

      <div className="mt-2 flex items-center gap-2">
        <input
          dir="ltr"
          value={imagePath}
          onChange={(e) => setImagePath(e.target.value)}
          placeholder="Attach an image (optional) — pick or paste a path"
          className="min-w-0 flex-1 rounded-xl bg-gray-50 px-3 py-2 font-mono text-xs outline-none"
        />
        {/* Inline upload — no round-trip through the Upload screen. */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-3.5 py-2 text-xs font-bold text-gray-600 disabled:opacity-50"
        >
          <ImagePlus size={14} /> {uploading ? 'Uploading…' : 'Pick image'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
        />
      </div>
      {imagePath.trim() && <MediaImage path={imagePath.trim()} className="mt-2 h-32 w-full rounded-xl" />}

      <div className="mt-3 flex items-center gap-2">
        <CalendarClock size={15} className="shrink-0 text-gray-400" />
        <input
          type="datetime-local"
          value={scheduleAt}
          onChange={(e) => setScheduleAt(e.target.value)}
          className="min-w-0 flex-1 rounded-xl bg-gray-50 px-3 py-2 text-xs outline-none"
        />
        <button
          onClick={() => post.mutate()}
          disabled={!canPost || post.isPending || !caption.trim() || !!posted}
          className="btn-pill btn-primary flex min-h-[40px] shrink-0 items-center gap-1.5 px-4 text-sm disabled:opacity-50"
        >
          <Send size={14} /> {posted ? 'Done' : post.isPending ? 'Posting…' : scheduleAt ? 'Schedule' : 'Post now'}
        </button>
      </div>
      {posted && <p className="mt-2 text-xs font-semibold text-emerald-600">{posted}</p>}
    </div>
  );
}
