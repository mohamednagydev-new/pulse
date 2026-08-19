import { useQuery, useMutation } from '@tanstack/react-query';
import { BadgeCheck, Building2, Copy, Dumbbell, Flame, KeyRound, Star, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import Avatar from '../../components/Avatar';
import { Loader } from '../../components/ui';
import { timeAgo } from '../../components/PostCard';

/** Right-side detail drawer for a user row: profile, activity counts, gym,
 *  coach connections — data from GET /api/admin-ops/users/:id/detail. */
export default function UserDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-ops', 'user-detail', userId],
    queryFn: () => api.get(`/api/admin-ops/users/${userId}/detail`),
  });
  const [newPw, setNewPw] = useState<string | null>(null);
  const resetPw = useMutation({
    mutationFn: () => api.post(`/api/admin/users/${userId}/reset-password`),
    onSuccess: (r: any) => setNewPw(r.password),
    onError: (e: any) => toast(e?.message ?? 'Reset failed', 'error'),
  });

  const u = data?.user;
  const c = data?.counts;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute inset-y-0 end-0 w-full max-w-md overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-400">User details</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        {isLoading || !u ? (
          <Loader />
        ) : (
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Avatar path={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} className="h-14 w-14" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-extrabold">
                  {u.firstName} {u.lastName}
                  {u.coachVerified && <BadgeCheck size={15} className="mb-0.5 ms-1 inline text-brand-blue" />}
                  {u.coachFeatured && <Star size={13} className="mb-0.5 ms-0.5 inline fill-amber-400 text-amber-400" />}
                </p>
                <p className="truncate text-xs text-gray-400" dir="ltr">{u.email}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${u.role === 'ADMIN' ? 'bg-brand-pink/10 text-brand-pink' : u.isCoach ? 'bg-blue-50 text-brand-blue' : 'bg-gray-100 text-gray-500'}`}>
                {u.role === 'ADMIN' ? 'ADMIN' : u.isCoach ? 'COACH' : 'USER'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <InfoCell label="Joined" value={new Date(u.createdAt).toLocaleDateString()} />
              <InfoCell label="Last active" value={u.lastSeenAt ? timeAgo(u.lastSeenAt) : (u.lastActiveOn ?? 'never')} />
              <InfoCell label="Level / XP" value={`Lv ${u.level} · ${u.xp} XP`} />
              <InfoCell label="Streak" value={`🔥 ${u.currentStreak} (best ${u.longestStreak}) · ${u.streakFreezes} ❄`} />
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">Activity</p>
              <div className="grid grid-cols-3 gap-2">
                <StatCell n={c.workouts} label="Workouts" />
                <StatCell n={c.liftLogs} label="Lift sets" />
                <StatCell n={c.posts} label="Posts" />
                <StatCell n={c.comments} label="Comments" />
                <StatCell n={c.foodLogs} label="Food logs" />
                <StatCell n={c.weighIns} label="Weigh-ins" />
              </div>
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                <Building2 size={12} /> Gym
              </p>
              {data.gym ? (
                <p className="rounded-xl bg-gray-50 p-3 text-sm font-semibold">
                  {data.gym.name}
                  {data.gym.city && <span className="ms-1.5 font-normal text-gray-400">· {data.gym.city}</span>}
                  {u.gymJoinedAt && <span className="ms-1.5 text-[11px] font-normal text-gray-400">joined {timeAgo(u.gymJoinedAt)}</span>}
                </p>
              ) : (
                <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-400">No gym linked.</p>
              )}
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                <Dumbbell size={12} /> Coach connections
              </p>
              {data.coaches.length === 0 && data.clients.length === 0 ? (
                <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-400">No accepted coach connections.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.coaches.map((p: any) => <PersonRow key={`c-${p.id}`} p={p} tag="their coach" />)}
                  {data.clients.map((p: any) => <PersonRow key={`t-${p.id}`} p={p} tag="client" />)}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              {newPw ? (
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">New password — shown once</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code dir="ltr" className="flex-1 rounded-lg bg-white px-3 py-2 font-mono text-sm">{newPw}</code>
                    <button
                      onClick={() => { navigator.clipboard?.writeText(newPw).then(() => toast('Copied', 'success')); }}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-700"
                      aria-label="Copy"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => resetPw.mutate()}
                  disabled={resetPw.isPending}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-gray-200 text-sm font-bold text-gray-600 disabled:opacity-50"
                >
                  <KeyRound size={15} /> Reset password
                </button>
              )}
            </div>

            <p className="flex items-center gap-1 text-[10px] text-gray-300">
              <Flame size={10} /> id: <span dir="ltr">{u.id}</span>
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}

function StatCell({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-2.5 text-center">
      <p className="text-base font-extrabold">{n}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}

function PersonRow({ p, tag }: { p: any; tag: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 p-2.5">
      <Avatar path={p.avatarUrl} name={`${p.firstName} ${p.lastName}`} className="h-8 w-8" textClass="text-[10px]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{p.firstName} {p.lastName}</p>
        <p className="truncate text-[11px] text-gray-400" dir="ltr">{p.email}</p>
      </div>
      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500">{tag}</span>
    </div>
  );
}
