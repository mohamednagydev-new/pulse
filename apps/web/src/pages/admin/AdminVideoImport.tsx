import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Check, Film, ListPlus, Upload } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

type Target = 'lesson' | 'exercise' | 'article' | 'recipe';

interface Row {
  line: string;
  status: 'matched' | 'no_match' | 'ambiguous' | 'bad_format';
  id?: string;
  title?: string;
  key?: string;
  url?: string;
  reason?: string;
}

const TARGETS: { key: Target; label: string }[] = [
  { key: 'lesson', label: 'Lessons' },
  { key: 'exercise', label: 'Exercises' },
  { key: 'article', label: 'Articles' },
  { key: 'recipe', label: 'Recipes' },
];

const STATUS_STYLE: Record<Row['status'], string> = {
  matched: 'bg-emerald-100 text-emerald-600',
  no_match: 'bg-red-100 text-red-500',
  ambiguous: 'bg-amber-100 text-amber-600',
  bad_format: 'bg-gray-100 text-gray-400',
};

/** Paste "title or id, url" lines, check what matched, then apply in one go.
 *  Beats opening 99 edit forms — which is why they were all still empty. */
export default function AdminVideoImport() {
  const qc = useQueryClient();
  const [target, setTarget] = useState<Target>('lesson');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);

  const { data: status } = useQuery<Record<string, { total: number; withVideo: number }>>({
    queryKey: ['video-import-status'],
    queryFn: () => api.get('/api/admin/video-import/status'),
  });

  // Pulls every still-empty row into the box as "Title, " lines, so filling them in
  // is one column of pasting instead of one admin form per item.
  const worklist = useMutation({
    mutationFn: () => api.get(`/api/admin/video-import/worklist?target=${target}`),
    onSuccess: (res: any) => {
      if (!res.count) return toast('Everything here already has a video', 'success');
      setText(res.text);
      setRows(null);
      toast(`${res.count} rows loaded — paste a link after each comma`, 'success');
    },
    onError: (e: any) => toast(e?.message ?? 'Could not load the worklist', 'error'),
  });

  const preview = useMutation({
    mutationFn: () => api.post('/api/admin/video-import/preview', { target, text }),
    onSuccess: (res: any) => setRows(res.results),
    onError: (e: any) => toast(e?.message ?? 'Preview failed', 'error'),
  });

  const apply = useMutation({
    // Send the previewed matches themselves — applying from the raw text again
    // could write a different set than the one just reviewed.
    mutationFn: () =>
      api.post('/api/admin/video-import/apply', {
        target,
        rows: (rows ?? []).filter((r) => r.status === 'matched').map((r) => ({ id: r.id, url: r.url })),
      }),
    onSuccess: (res: any) => {
      toast(`${res.applied} updated, ${res.skipped} skipped`, 'success');
      setRows(null);
      setText('');
      qc.invalidateQueries({ queryKey: ['video-import-status'] });
    },
    onError: (e: any) => toast(e?.message ?? 'Import failed', 'error'),
  });

  const matched = rows?.filter((r) => r.status === 'matched').length ?? 0;
  const skipped = (rows?.length ?? 0) - matched;
  const s = status?.[target];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="safe-header-tall bg-ink px-5 pb-5 text-white">
        <div className="flex items-center gap-3">
          <Link to="/admin" aria-label="Back"><ArrowLeft /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold">Video Import</h1>
            <p className="text-xs text-white/60">Paste YouTube or MP4 links in bulk</p>
          </div>
          <Film className="shrink-0 opacity-60" />
        </div>
      </header>

      <div className="space-y-4 p-4">
        {/* Coverage — the worklist that tells you when you're done */}
        <div className="grid grid-cols-2 gap-2">
          {TARGETS.map((t) => {
            const st = status?.[t.key];
            const pct = st && st.total ? Math.round((st.withVideo / st.total) * 100) : 0;
            return (
              <button
                key={t.key}
                onClick={() => { setTarget(t.key); setRows(null); }}
                className={`rounded-2xl p-3 text-start shadow-sm transition ${
                  target === t.key ? 'bg-ink text-white' : 'bg-white'
                }`}
              >
                <p className="text-xs font-bold">{t.label}</p>
                <p className={`text-lg font-extrabold tabular-nums ${target === t.key ? '' : 'text-gray-700'}`}>
                  {st ? `${st.withVideo}/${st.total}` : '—'}
                </p>
                <div className={`mt-1 h-1.5 overflow-hidden rounded-full ${target === t.key ? 'bg-white/20' : 'bg-gray-100'}`}>
                  <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="block text-sm font-bold">
            One per line: <span className="font-mono text-xs text-gray-500">title or id, url</span>
          </label>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">
            The title is matched loosely, so punctuation and capitals don't matter. Only the last comma
            splits the line, so titles may contain commas. If two rows share a title, paste the id instead.
          </p>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setRows(null); }}
            rows={10}
            spellCheck={false}
            dir="ltr"
            placeholder={'Day 1: Grounding Flow, https://youtu.be/abc123\nDay 2: Gentle Spine Mobility, https://www.youtube.com/watch?v=def456'}
            className="mt-3 w-full resize-y rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs outline-none transition focus:border-orange-400 focus:bg-white"
          />

          <button
            onClick={() => worklist.mutate()}
            disabled={worklist.isPending}
            className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-500 transition active:scale-95 disabled:opacity-50"
          >
            <ListPlus size={14} /> {worklist.isPending ? 'Loading...' : `Load every ${target} that still has no video`}
          </button>

          <div className="mt-2 flex gap-2">
            <button
              onClick={() => preview.mutate()}
              disabled={!text.trim() || preview.isPending}
              className="min-h-[44px] flex-1 rounded-xl bg-gray-100 text-sm font-bold text-gray-600 transition active:scale-95 disabled:opacity-50"
            >
              {preview.isPending ? 'Checking...' : 'Preview matches'}
            </button>
            <button
              onClick={() => apply.mutate()}
              disabled={matched === 0 || apply.isPending}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-500 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
            >
              <Upload size={15} /> {apply.isPending ? 'Applying...' : `Apply to ${matched}`}
            </button>
          </div>

          {s && s.withVideo < s.total && (
            <p className="mt-2 text-center text-[11px] text-gray-400">
              {s.total - s.withVideo} {target}s still have no video.
            </p>
          )}
        </div>

        {rows && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                <Check size={15} /> {matched} matched
              </span>
              {skipped > 0 && (
                <span className="flex items-center gap-1 text-sm font-bold text-amber-600">
                  <AlertTriangle size={15} /> {skipped} skipped
                </span>
              )}
            </div>

            <ul className="mt-3 space-y-1.5">
              {rows.map((r, i) => (
                <li key={i} className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2">
                  <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${STATUS_STYLE[r.status]}`}>
                    {r.status === 'matched' ? 'ok' : r.status.replace('_', ' ')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold" dir="ltr">
                      {r.title ?? r.key ?? r.line}
                    </span>
                    {r.url && <span className="block truncate text-[10px] text-gray-400" dir="ltr">{r.url}</span>}
                    {r.reason && <span className="block text-[10px] text-red-400">{r.reason}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-2xl bg-white/70 p-3 text-[11px] leading-relaxed text-gray-500">
          Accepts YouTube watch links, youtu.be short links, Shorts and direct MP4 URLs. An uploaded
          video always wins over a link, so you can replace these with your own files later without
          clearing anything.
        </div>

        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-bold">Link, don't copy.</span> Embedding plays the video from
            YouTube, so the creator keeps the view and can pull it any time — that is the permitted
            way to use someone else's video. Downloading a video and re-uploading it as your own file
            is not, whoever made it. If you didn't film it, paste a link here rather than an upload.
          </span>
        </div>
      </div>
    </div>
  );
}
