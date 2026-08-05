import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Play, X } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

/**
 * Add reels. One link, a whole list, or a channel you trust.
 *
 * Keyword search depended on a scraper that broke, and every drop-in replacement
 * breaks the same way — they are all scraping the same moving target. Nothing here
 * searches. Links and titles come from YouTube's own oEmbed endpoint, and a channel's
 * recent videos from YouTube's public RSS feed. No API key, no third-party service.
 *
 * The channel mode is what makes stocking a launch realistic, and it matches how
 * vetting should work anyway: trust a creator once, then review their videos as a
 * batch instead of hunting links one at a time. Nothing is approved without a human
 * ticking it — the checkbox is the review.
 */

type Topic = 'workout' | 'yoga';
type Mode = 'one' | 'many' | 'channel';

type Video = {
  provider: 'youtube';
  externalId: string;
  sourceUrl: string;
  title: string;
  authorName: string | null;
  authorUrl: string | null;
  thumbnail: string | null;
  embedUrl: string;
  alreadyImported: boolean;
  blocked: boolean;
  blockedReason: string | null;
};

type Failed = { url: string; error: string };

const guessTopic = (title: string): Topic =>
  /yoga|pilates|stretch|meditat|mobility/i.test(title) ? 'yoga' : 'workout';

export default function AdminReelPaste() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('one');
  const [input, setInput] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [failed, setFailed] = useState<Failed[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [topics, setTopics] = useState<Record<string, Topic>>({});
  const [preview, setPreview] = useState<Video | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const reset = () => {
    setVideos([]);
    setFailed([]);
    setPicked({});
    setTopics({});
    setPreview(null);
  };

  const load = async () => {
    setErr('');
    reset();
    setBusy(true);
    try {
      const res =
        mode === 'channel'
          ? await api.post('/api/admin/reels/channel', { url: input.trim() })
          : await api.post('/api/admin/reels/bulk-resolve', {
              urls: input.split(/[\n,\s]+/).map((u) => u.trim()).filter(Boolean),
            });

      const list: Video[] = res.videos ?? [];
      setVideos(list);
      setFailed(res.failed ?? []);
      // Pre-tick only what can actually be added, so "select all" is never a trap.
      setPicked(Object.fromEntries(list.map((v) => [v.externalId, !v.alreadyImported && !v.blocked])));
      setTopics(Object.fromEntries(list.map((v) => [v.externalId, guessTopic(v.title)])));
      if (list.length === 0) setErr('Nothing to review.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not read that');
    } finally {
      setBusy(false);
    }
  };

  const selected = videos.filter((v) => picked[v.externalId] && !v.alreadyImported && !v.blocked);

  const add = useMutation({
    mutationFn: () =>
      api.post('/api/admin/reels/bulk-add', {
        items: selected.map((v) => ({
          externalId: v.externalId,
          title: v.title,
          topic: topics[v.externalId] ?? 'workout',
          sourceUrl: v.sourceUrl,
          authorName: v.authorName,
          authorUrl: v.authorUrl,
          thumbnail: v.thumbnail,
        })),
      }),
    onSuccess: (r: any) => {
      toast(`Added ${r.added}${r.skipped ? ` · skipped ${r.skipped}` : ''}`, 'success');
      setInput('');
      reset();
      qc.invalidateQueries({ queryKey: ['admin', 'reels', 'library'] });
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
  });

  const block = useMutation({
    mutationFn: (v: Video) =>
      api.post('/api/admin/reels/blocked', {
        provider: 'youtube',
        handle: v.authorUrl || v.authorName,
        purge: true,
      }),
    onSuccess: () => {
      toast('Creator blocked and their reels removed', 'success');
      setPreview(null);
      load();
      qc.invalidateQueries({ queryKey: ['admin', 'reels', 'library'] });
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
  });

  const PLACEHOLDER: Record<Mode, string> = {
    one: 'https://youtube.com/shorts/…',
    many: 'One link per line —\nhttps://youtube.com/shorts/…\nhttps://youtu.be/…',
    channel: 'https://youtube.com/@channelname',
  };

  return (
    <div className="space-y-3 p-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex gap-1.5">
          {(
            [
              ['one', 'One link'],
              ['many', 'Many links'],
              ['channel', 'From a channel'],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setInput('');
                reset();
                setErr('');
              }}
              className={`min-h-9 flex-1 rounded-full px-2 text-[12px] font-bold transition ${
                mode === m ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs leading-relaxed text-gray-500">
          {mode === 'channel'
            ? "YouTube's public feed gives that channel's 15 most recent videos. Vet the creator once, then tick the ones you want."
            : 'Age-restricted videos are refused automatically. Nothing else is filtered — ticking a reel is you vouching for it.'}
        </p>

        {mode === 'many' ? (
          <textarea
            className="input-field h-28 w-full rounded-2xl"
            placeholder={PLACEHOLDER.many}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        ) : (
          <input
            className="input-field w-full"
            placeholder={PLACEHOLDER[mode]}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        )}

        <button
          onClick={load}
          disabled={busy || input.trim().length < 8}
          className="btn-pill mt-2 w-full bg-gray-900 text-sm text-white disabled:opacity-50"
        >
          {busy ? 'Reading…' : mode === 'channel' ? 'Load channel' : 'Check links'}
        </button>
        {err && <p className="mt-2 text-xs leading-relaxed text-red-500">{err}</p>}
      </div>

      {failed.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-bold text-red-700">{failed.length} link(s) could not be read</p>
          <ul className="mt-1 space-y-0.5">
            {failed.map((f, i) => (
              <li key={i} className="truncate text-[11px] text-red-600">
                {f.url} — {f.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {videos.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold text-gray-500">
              {selected.length} of {videos.length} selected
            </p>
            <button
              onClick={() =>
                setPicked(
                  Object.fromEntries(
                    videos.map((v) => [v.externalId, selected.length === 0 && !v.alreadyImported && !v.blocked]),
                  ),
                )
              }
              className="text-xs font-bold text-brand-blue"
            >
              {selected.length ? 'Clear' : 'Select all'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {videos.map((v) => {
              const disabled = v.alreadyImported || v.blocked;
              const on = !!picked[v.externalId] && !disabled;
              return (
                <div
                  key={v.externalId}
                  className={`overflow-hidden rounded-2xl border bg-white transition ${
                    on ? 'border-brand-green ring-1 ring-brand-green' : 'border-gray-200'
                  } ${disabled ? 'opacity-50' : ''}`}
                >
                  <button
                    onClick={() => setPreview(v)}
                    className="relative block aspect-video w-full bg-black"
                    aria-label={`Preview ${v.title}`}
                  >
                    {v.thumbnail && <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />}
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white">
                        <Play size={16} fill="currentColor" />
                      </span>
                    </span>
                  </button>

                  <div className="space-y-1.5 p-2.5">
                    <p className="line-clamp-2 text-[12px] font-semibold leading-snug">{v.title}</p>
                    {v.authorName && <p className="truncate text-[10px] text-gray-400">{v.authorName}</p>}

                    {disabled ? (
                      <p className="text-[10px] font-bold text-amber-600">
                        {v.blocked ? 'creator blocked' : 'already added'}
                      </p>
                    ) : (
                      <>
                        <div className="flex gap-1">
                          {(['workout', 'yoga'] as Topic[]).map((tp) => (
                            <button
                              key={tp}
                              onClick={() => setTopics((p) => ({ ...p, [v.externalId]: tp }))}
                              className={`min-h-7 flex-1 rounded-full text-[10px] font-bold capitalize ${
                                topics[v.externalId] === tp
                                  ? 'bg-gray-900 text-white'
                                  : 'border border-gray-200 text-gray-400'
                              }`}
                            >
                              {tp}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setPicked((p) => ({ ...p, [v.externalId]: !on }))}
                          className={`flex min-h-8 w-full items-center justify-center gap-1 rounded-full text-[11px] font-bold ${
                            on ? 'bg-brand-green text-white' : 'border border-gray-200 text-gray-500'
                          }`}
                        >
                          {on ? <Check size={13} /> : null} {on ? 'Selected' : 'Select'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => add.mutate()}
            disabled={add.isPending || selected.length === 0}
            className="btn-pill btn-primary sticky bottom-4 w-full disabled:opacity-50"
          >
            {add.isPending ? 'Adding…' : `Approve & add ${selected.length}`}
          </button>
        </>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <div className="mx-auto w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                src={preview.embedUrl}
                title={preview.title}
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
            <div className="mt-2 rounded-2xl bg-white p-3">
              <p className="text-sm font-semibold">{preview.title}</p>
              {preview.authorName && <p className="mt-0.5 text-xs text-gray-400">{preview.authorName}</p>}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setPreview(null)}
                  className="btn-pill flex flex-1 items-center justify-center gap-1 border border-gray-200 py-2 text-xs font-semibold"
                >
                  <X size={13} /> Close
                </button>
                {preview.authorName && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Block ${preview.authorName} and remove all their reels?`)) {
                        block.mutate(preview);
                      }
                    }}
                    className="btn-pill flex-1 bg-red-500 py-2 text-xs font-semibold text-white"
                  >
                    Block creator
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
