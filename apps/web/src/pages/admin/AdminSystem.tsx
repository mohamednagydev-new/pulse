import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Database, HardDrive, Play, Cpu, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

type JobLogRow = {
  id: string;
  name: string;
  ok: boolean;
  note?: string | null;
  manual: boolean;
  ranAt: string;
};

type SystemData = {
  jobs: Record<string, JobLogRow | null>;
  recent: JobLogRow[];
  db: { path: string; sizeBytes: number } | null;
  backup: { file: string; mtime: string; sizeBytes: number } | null;
  process: { uptimeSec: number; rssMb: number; nodeVersion: string };
};

/** Every job the scheduler knows about; `runnable` = has a Run-now endpoint. */
const JOBS: { name: string; label: string; schedule: string; runnable: boolean }[] = [
  { name: 'weekly-challenge', label: 'Weekly challenge', schedule: 'Hourly self-heal · failures logged', runnable: true },
  { name: 'season', label: 'Season rotation', schedule: 'Hourly self-heal · failures logged', runnable: true },
  { name: 'group-sessions', label: 'Group sessions top-up', schedule: 'Daily 09:00', runnable: true },
  { name: 'daily-prompts', label: 'Challenge room prompts', schedule: 'Daily 10:00', runnable: false },
  { name: 'reels-pull', label: 'Reels pull', schedule: 'Daily 06:00', runnable: true },
  { name: 'backup', label: 'Database backup', schedule: 'Nightly 04:00', runnable: true },
  { name: 'digest', label: 'Win-back email digest', schedule: 'Friday 17:00', runnable: false },
  { name: 'video-sweep', label: 'Video health sweep', schedule: 'Monday 05:00', runnable: true },
  { name: 'broadcast', label: 'Broadcast', schedule: 'Manual only', runnable: false },
];

function ago(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtBytes(n: number): string {
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function OkBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
      <CheckCircle2 size={12} /> ok
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
      <XCircle size={12} /> failed
    </span>
  );
}

/**
 * Jobs & system health: is the invisible machinery (backups, pulls, digests,
 * rotations) actually running? Every job's last outcome at a glance, plus a
 * Run-now button so nobody has to wait until 04:00 to test the backup.
 */
export default function AdminSystem() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  const { data, isLoading } = useQuery<SystemData>({
    queryKey: ['admin', 'system'],
    queryFn: () => api.get('/api/admin-system'),
    refetchInterval: 30_000,
  });

  const runNow = async (name: string) => {
    setPending(name);
    try {
      const r: { ok: boolean; note: string } = await api.post(`/api/admin-system/run/${name}`);
      toast(r.note || (r.ok ? 'Done' : 'Failed'), r.ok ? 'success' : 'error');
      qc.invalidateQueries({ queryKey: ['admin', 'system'] });
    } catch (e: any) {
      toast(e?.message ?? 'Run failed', 'error');
    } finally {
      setPending(null);
    }
  };

  const backupAgeH = data?.backup ? (Date.now() - new Date(data.backup.mtime).getTime()) / 3_600_000 : Infinity;
  const backupStale = backupAgeH > 48;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Activity size={20} /> System health</h1>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'system'] })}
          className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold dark:border-gray-700"
        >
          Refresh
        </button>
      </div>
      <p className="mb-4 text-sm text-gray-400">
        Scheduled jobs, database and backup vitals. Auto-refreshes every 30s. <b>Run now</b> triggers a job
        immediately and logs it as a manual run.
      </p>

      {isLoading || !data ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          {/* ---- Vitals ---- */}
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-400"><Database size={14} /> Database</p>
              <p className="mt-1 text-2xl font-bold">{data.db ? fmtBytes(data.db.sizeBytes) : '—'}</p>
              <p className="mt-1 break-all text-xs text-gray-400">{data.db?.path ?? 'Database file not found'}</p>
            </div>
            <div className={`rounded-2xl border p-4 ${backupStale ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-400"><HardDrive size={14} /> Last backup</p>
              {data.backup ? (
                <>
                  <p className="mt-1 text-2xl font-bold">{ago(data.backup.mtime)}</p>
                  <p className="mt-1 break-all text-xs text-gray-400">{data.backup.file} · {fmtBytes(data.backup.sizeBytes)}</p>
                </>
              ) : (
                <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">None</p>
              )}
              {backupStale && (
                <p className="mt-2 flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400">
                  <AlertTriangle size={13} /> {data.backup ? 'Backup older than 48h — check the nightly job.' : 'No backup file found — run one now.'}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-400"><Cpu size={14} /> Process</p>
              <p className="mt-1 text-2xl font-bold">{fmtUptime(data.process.uptimeSec)}</p>
              <p className="mt-1 text-xs text-gray-400">uptime · {data.process.rssMb} MB RSS · node {data.process.nodeVersion}</p>
            </div>
          </div>

          {/* ---- Scheduled jobs ---- */}
          <h2 className="mb-2 text-sm font-bold uppercase text-gray-400">Scheduled jobs</h2>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {JOBS.map((j) => {
              const last = data.jobs[j.name] ?? null;
              return (
                <div key={j.name} className="flex flex-col rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{j.label}</p>
                      <p className="text-xs text-gray-400">{j.schedule}</p>
                    </div>
                    {last && <OkBadge ok={last.ok} />}
                  </div>
                  <div className="mt-2 flex-1 text-xs text-gray-500 dark:text-gray-400">
                    {last ? (
                      <>
                        <p className="font-medium">
                          {ago(last.ranAt)}
                          {last.manual && <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-500 dark:bg-gray-800">manual</span>}
                        </p>
                        {last.note && <p className="mt-0.5 break-words">{last.note}</p>}
                      </>
                    ) : (
                      <p className="italic text-gray-300 dark:text-gray-600">Never logged</p>
                    )}
                  </div>
                  {j.runnable && (
                    <button
                      onClick={() => runNow(j.name)}
                      disabled={pending !== null}
                      className="mt-3 inline-flex w-fit items-center gap-1 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      <Play size={12} /> {pending === j.name ? 'Running…' : 'Run now'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* ---- Recent runs ---- */}
          <h2 className="mb-2 text-sm font-bold uppercase text-gray-400">Recent runs</h2>
          {!data.recent.length ? (
            <p className="py-6 text-center text-sm text-gray-400">No job runs logged yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Job</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Trigger</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.recent.map((r) => (
                    <tr key={r.id} className={r.ok ? '' : 'bg-red-50/50 dark:bg-red-900/10'}>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-500" title={new Date(r.ranAt).toLocaleString()}>{ago(r.ranAt)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-semibold">{r.name}</td>
                      <td className="px-3 py-2"><OkBadge ok={r.ok} /></td>
                      <td className="px-3 py-2 text-xs text-gray-400">{r.manual ? 'manual' : 'scheduled'}</td>
                      <td className="max-w-[360px] break-words px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{r.note ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
