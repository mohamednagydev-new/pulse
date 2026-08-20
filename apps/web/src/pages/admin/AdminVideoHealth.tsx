import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MonitorX, RefreshCw, ExternalLink, Link2, EyeOff, Power, Undo2 } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

type Issue = {
  id: string;
  kind: 'lesson-video' | 'reel-video';
  refId: string;
  title?: string | null;
  url?: string | null;
  status: 'open' | 'resolved' | 'ignored';
  note?: string | null;
  detectedAt: string;
};

/** "3d ago" — enough precision for a weekly sweep. */
function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

const KIND_LABEL: Record<Issue['kind'], string> = {
  'lesson-video': 'Lesson',
  'reel-video': 'Reel',
};

/**
 * Broken-video sweep results: every embedded YouTube video the weekly job could
 * not play, with the fixes inline — relink to a working URL, ignore a known
 * case, or deactivate a dead reel.
 */
export default function AdminVideoHealth() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ open: Issue[]; recent: Issue[] }>({
    queryKey: ['admin', 'video-health'],
    queryFn: () => api.get('/api/admin-content-health/issues'),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'video-health'] });

  const sweep = useMutation({
    mutationFn: () => api.post('/api/admin-content-health/sweep-now'),
    onSuccess: (d: { note: string }) => {
      toast(`Sweep done — ${d.note}`, 'success');
      refresh();
    },
    onError: (e: any) => toast(e?.message ?? 'Sweep failed', 'error'),
  });

  const act = useMutation({
    mutationFn: ({ id, action, url }: { id: string; action: 'ignore' | 'reopen' | 'relink' | 'deactivate'; url?: string }) =>
      api.post(`/api/admin-content-health/issues/${id}/${action}`, url ? { url } : undefined),
    onSuccess: (_d, v) => {
      const msg =
        v.action === 'relink' ? 'Relinked and resolved' :
        v.action === 'deactivate' ? 'Reel deactivated' :
        v.action === 'ignore' ? 'Issue ignored' : 'Issue reopened';
      toast(msg, 'success');
      refresh();
    },
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });

  const relink = (issue: Issue) => {
    const url = window.prompt('Paste the new YouTube URL for this video:', '');
    if (!url?.trim()) return;
    act.mutate({ id: issue.id, action: 'relink', url: url.trim() });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold"><MonitorX size={20} /> Video health</h1>
        <button
          onClick={() => sweep.mutate()}
          disabled={sweep.isPending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          <RefreshCw size={13} className={sweep.isPending ? 'animate-spin' : ''} />
          {sweep.isPending ? 'Sweeping…' : 'Sweep now'}
        </button>
      </div>
      <p className="mb-4 text-sm text-gray-400">
        A weekly job checks every embedded YouTube video (lesson links and curated reels) against
        YouTube's oEmbed. Anything private, removed, or age-restricted lands here.
      </p>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : !data?.open.length ? (
        <p className="py-10 text-center text-sm text-gray-400">All embedded videos are playing ✓</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Error</th>
                <th className="px-3 py-2">Detected</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.open.map((issue) => (
                <tr key={issue.id}>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${
                        issue.kind === 'lesson-video'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      }`}
                    >
                      {KIND_LABEL[issue.kind]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-semibold">{issue.title || '(untitled)'}</p>
                    {issue.url && (
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex max-w-[280px] items-center gap-1 truncate text-xs text-brand-blue"
                      >
                        <span className="truncate">{issue.url}</span> <ExternalLink size={11} className="shrink-0" />
                      </a>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-red-500">{issue.note ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-400">{relative(issue.detectedAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => relink(issue)}
                        disabled={act.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-2 py-1 text-xs font-bold text-white disabled:opacity-60"
                      >
                        <Link2 size={12} /> Relink
                      </button>
                      <button
                        onClick={() => act.mutate({ id: issue.id, action: 'ignore' })}
                        disabled={act.isPending}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold dark:border-gray-700"
                      >
                        <EyeOff size={12} /> Ignore
                      </button>
                      {issue.kind === 'reel-video' && (
                        <button
                          onClick={() => act.mutate({ id: issue.id, action: 'deactivate' })}
                          disabled={act.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 dark:border-red-900/50 dark:text-red-400"
                        >
                          <Power size={12} /> Deactivate
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!!data?.recent.length && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-bold text-gray-500 dark:text-gray-400">Recently resolved / ignored</h2>
          <ul className="space-y-1">
            {data.recent.map((issue) => (
              <li
                key={issue.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2 text-xs dark:border-gray-800"
              >
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{KIND_LABEL[issue.kind]}</span>
                  {' · '}
                  <span className="text-gray-500 dark:text-gray-400">{issue.title || '(untitled)'}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-bold ${
                      issue.status === 'resolved'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {issue.status}
                  </span>
                  {issue.status === 'ignored' && (
                    <button
                      onClick={() => act.mutate({ id: issue.id, action: 'reopen' })}
                      disabled={act.isPending}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-0.5 font-semibold dark:border-gray-700"
                    >
                      <Undo2 size={11} /> Reopen
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
