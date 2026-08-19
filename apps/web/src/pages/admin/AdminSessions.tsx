import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Timer, Square, ExternalLink, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

type Row = {
  id: string;
  title: string;
  muscleFocus?: string | null;
  scheduledAt: string;
  participantCount: number;
  liveCount: number;
  coach: { id: string; firstName: string; lastName: string; email: string } | null;
};

/**
 * Live group sessions: the schedule for the coming week plus who is actually in
 * each room right now — and a remote timer start/stop, for the day a coach
 * no-shows and the participants are sitting in a silent room.
 */
export default function AdminSessions() {
  const qc = useQueryClient();
  const [durations, setDurations] = useState<Record<string, number>>({});

  const { data, isLoading } = useQuery<Row[]>({
    queryKey: ['admin', 'group-sessions'],
    queryFn: () => api.get('/api/admin-ops/group-sessions'),
    refetchInterval: 15_000, // live counts go stale fast
  });

  const timer = useMutation({
    mutationFn: ({ id, action, durationSec }: { id: string; action: 'start' | 'stop'; durationSec?: number }) =>
      api.post(`/api/admin-ops/group-sessions/${id}/timer`, { action, durationSec }),
    onSuccess: (_d, v) => toast(v.action === 'start' ? 'Timer started in the room' : 'Timer stopped', 'success'),
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });

  const fmt = (iso: string) => {
    const d = new Date(iso);
    const today = new Date().toDateString() === d.toDateString();
    return `${today ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Radio size={20} /> Live sessions</h1>
        <button onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'group-sessions'] })} className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold dark:border-gray-700">
          Refresh
        </button>
      </div>
      <p className="mb-4 text-sm text-gray-400">
        Next 7 days. <b>Live</b> = people in the room right now. If a coach no-shows, start the shared
        timer from here — or open the room: as admin you have full host controls inside.
      </p>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : !data?.length ? (
        <p className="py-10 text-center text-sm text-gray-400">No sessions scheduled in the coming week.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Session</th>
                <th className="px-3 py-2">Coach</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2">Live</th>
                <th className="px-3 py-2">Timer</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.map((s) => {
                const started = new Date(s.scheduledAt).getTime() <= Date.now();
                return (
                  <tr key={s.id} className={started ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{fmt(s.scheduledAt)}</td>
                    <td className="px-3 py-2">
                      <p className="font-semibold">{s.title}</p>
                      {s.muscleFocus && <p className="text-xs text-gray-400">{s.muscleFocus}</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                      {s.coach ? `${s.coach.firstName} ${s.coach.lastName}` : '—'}
                    </td>
                    <td className="px-3 py-2"><span className="inline-flex items-center gap-1"><Users size={13} /> {s.participantCount}</span></td>
                    <td className="px-3 py-2">
                      {s.liveCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          ● {s.liveCount}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">0</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min={10}
                          max={3600}
                          value={durations[s.id] ?? 60}
                          onChange={(e) => setDurations((d) => ({ ...d, [s.id]: Number(e.target.value) }))}
                          className="w-16 rounded-lg border border-gray-200 bg-transparent px-2 py-1 text-xs dark:border-gray-700"
                          title="Seconds"
                        />
                        <button
                          onClick={() => timer.mutate({ id: s.id, action: 'start', durationSec: durations[s.id] ?? 60 })}
                          disabled={timer.isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-2 py-1 text-xs font-bold text-white"
                        >
                          <Timer size={12} /> Start
                        </button>
                        <button
                          onClick={() => timer.mutate({ id: s.id, action: 'stop' })}
                          disabled={timer.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold dark:border-gray-700"
                        >
                          <Square size={11} /> Stop
                        </button>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Link to={`/group/${s.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue">
                        Open <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
