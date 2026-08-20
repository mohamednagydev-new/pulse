import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { api } from '../../lib/api';

type Row = {
  id: string;
  adminId: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: string | null;
  createdAt: string;
  admin: { firstName: string; lastName: string; email: string } | null;
};

type Page = { rows: Row[]; total: number; page: number };

const PAGE_SIZE = 50;

/** "3m ago" style relative time; the exact timestamp lives in the tooltip. */
function relTime(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Append-only trail of every admin mutation (bans, role changes, moderation
 * deletes, remote timers…) — who did what, to whom, and when.
 */
export default function AdminAudit() {
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState(''); // debounced copy of `search` used in the query
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: actions } = useQuery<string[]>({
    queryKey: ['admin', 'audit-actions'],
    queryFn: () => api.get('/api/admin-audit/actions'),
  });

  const params = new URLSearchParams({ page: String(page) });
  if (action) params.set('action', action);
  if (q) params.set('q', q);
  const { data, isLoading } = useQuery<Page>({
    queryKey: ['admin', 'audit', page, action, q],
    queryFn: () => api.get(`/api/admin-audit?${params.toString()}`),
  });

  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold"><ScrollText size={20} /> Audit log</h1>
      </div>
      <p className="mb-4 text-sm text-gray-400">
        Every admin action — bans, role changes, moderation deletes, remote timers — newest first.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 bg-transparent px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="">All actions</option>
          {(actions ?? []).map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search target id or detail…"
            className="w-64 rounded-xl border border-gray-200 bg-transparent py-1.5 pl-8 pr-3 text-sm dark:border-gray-700"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : !data?.rows.length ? (
        <p className="py-10 text-center text-sm text-gray-400">
          {action || q ? 'Nothing matches these filters.' : 'No admin actions recorded yet.'}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Admin</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-500" title={new Date(r.createdAt).toLocaleString()}>
                      {relTime(r.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {r.admin ? (
                        <>
                          <p className="font-semibold">{r.admin.firstName} {r.admin.lastName}</p>
                          <p className="text-xs text-gray-400">{r.admin.email}</p>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">deleted admin</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="rounded-lg bg-gray-100 px-2 py-0.5 font-mono text-xs font-semibold dark:bg-gray-800">
                        {r.action}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500" title={r.targetId ?? undefined}>
                      {r.targetType ? (
                        <>
                          {r.targetType}/<span className="font-mono">{(r.targetId ?? '').slice(0, 10)}{(r.targetId ?? '').length > 10 ? '…' : ''}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="max-w-[360px] truncate px-3 py-2 text-gray-500" title={r.detail ?? undefined}>
                      {r.detail || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <p className="text-xs text-gray-400">
              {total} entr{total === 1 ? 'y' : 'ies'} · page {page} of {lastPage}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 dark:border-gray-700"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page >= lastPage}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 dark:border-gray-700"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
