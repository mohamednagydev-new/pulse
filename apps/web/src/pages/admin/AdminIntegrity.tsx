import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Zap, ExternalLink, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

type UserInfo = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  currentStreak?: number;
  xp?: number;
  bannedAt?: string | null;
} | null;

type Offender = { userId: string; total: number; kinds: Record<string, number>; user: UserInfo };
type Spike = { userId: string; xp24h: number; user: UserInfo };
type Event = { id: string; userId: string; kind: string; detail?: string | null; createdAt: string; user: UserInfo };
type Data = { offenders: Offender[]; recent: Event[]; xpSpikes: Spike[] };

const KIND_STYLES: Record<string, string> = {
  'lesson-pace': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'lesson-cap': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'program-day': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'workout-throttle': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

const name = (u: UserInfo) => (u ? `${u.firstName} ${u.lastName}` : 'Deleted user');

function UserCell({ user }: { user: UserInfo }) {
  return (
    <div>
      <p className="font-semibold">
        {name(user)}
        {user?.bannedAt && (
          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:bg-red-900/40 dark:text-red-300">
            Banned
          </span>
        )}
      </p>
      {user && <p className="text-xs text-gray-400">{user.email}</p>}
    </div>
  );
}

function UsersLink({ user }: { user: UserInfo }) {
  if (!user) return null;
  return (
    <Link
      to={`/admin/users?q=${encodeURIComponent(user.email)}`}
      className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-brand-blue"
    >
      Open in Users <ExternalLink size={12} />
    </Link>
  );
}

/**
 * Anti-cheat integrity queue. The guards in the API already reject fake
 * progress; every event here is one of those rejections. This page exists to
 * spot the users who keep trying — and the XP anomalies the guards can't see.
 */
export default function AdminIntegrity() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Data>({
    queryKey: ['admin', 'integrity'],
    queryFn: () => api.get('/api/admin-integrity'),
  });

  const clear = useMutation({
    mutationFn: (userId: string) => api.post(`/api/admin-integrity/clear/${userId}`, {}),
    onSuccess: () => {
      toast('Integrity events cleared', 'success');
      qc.invalidateQueries({ queryKey: ['admin', 'integrity'] });
    },
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldAlert size={20} /> Integrity</h1>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'integrity'] })}
          className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold dark:border-gray-700"
        >
          Refresh
        </button>
      </div>
      <p className="mb-4 text-sm text-gray-400">
        Every row is a rejected fake-progress attempt — the action was blocked; this queue only shows
        who keeps trying.
      </p>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-8">
          {/* ---- Repeat offenders ---- */}
          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">Repeat offenders (30d)</h2>
            {!data?.offenders.length ? (
              <p className="rounded-2xl border border-gray-200 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
                No guard trips in the last 30 days. Clean.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">Events</th>
                      <th className="px-3 py-2">Kinds</th>
                      <th className="px-3 py-2">Streak</th>
                      <th className="px-3 py-2">XP</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.offenders.map((o) => (
                      <tr key={o.userId}>
                        <td className="px-3 py-2"><UserCell user={o.user} /></td>
                        <td className="px-3 py-2 font-bold">{o.total}</td>
                        <td className="px-3 py-2">
                          <span className="flex flex-wrap gap-1">
                            {Object.entries(o.kinds).map(([kind, count]) => (
                              <span
                                key={kind}
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KIND_STYLES[kind] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}
                              >
                                {kind} × {count}
                              </span>
                            ))}
                          </span>
                        </td>
                        <td className="px-3 py-2">{o.user?.currentStreak ?? '—'}</td>
                        <td className="px-3 py-2">{o.user?.xp?.toLocaleString() ?? '—'}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-3">
                            <UsersLink user={o.user} />
                            <button
                              onClick={() => {
                                if (window.confirm(`Clear all integrity events for ${name(o.user)}? This marks them as reviewed and fine.`)) {
                                  clear.mutate(o.userId);
                                }
                              }}
                              disabled={clear.isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-300"
                            >
                              <Trash2 size={12} /> Clear
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ---- XP spikes ---- */}
          <section>
            <h2 className="mb-2 flex items-center gap-1 text-sm font-bold uppercase tracking-wide text-gray-400">
              <Zap size={14} /> XP spikes (24h)
            </h2>
            {!data?.xpSpikes.length ? (
              <p className="rounded-2xl border border-gray-200 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
                Nobody gained over 600 XP in the last 24 hours.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">XP gained (24h)</th>
                      <th className="px-3 py-2">Total XP</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.xpSpikes.map((s) => (
                      <tr key={s.userId}>
                        <td className="px-3 py-2"><UserCell user={s.user} /></td>
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            +{s.xp24h.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 py-2">{s.user?.xp?.toLocaleString() ?? '—'}</td>
                        <td className="px-3 py-2"><UsersLink user={s.user} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ---- Recent events ---- */}
          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">Recent events</h2>
            {!data?.recent.length ? (
              <p className="rounded-2xl border border-gray-200 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
                No integrity events yet.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
                {data.recent.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                    <span className="whitespace-nowrap text-xs text-gray-400">{fmt(e.createdAt)}</span>
                    <span className="font-semibold">{name(e.user)}</span>
                    {e.user && <span className="text-xs text-gray-400">{e.user.email}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KIND_STYLES[e.kind] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                      {e.kind}
                    </span>
                    {e.detail && <span className="text-xs text-gray-400">{e.detail}</span>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
