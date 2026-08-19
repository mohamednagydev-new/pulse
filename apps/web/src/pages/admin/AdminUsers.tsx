import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown, ArrowUp, BadgeCheck, Bell, ChevronLeft, ChevronRight, Download,
  Search, Shield, Snowflake, Star, Trash2,
} from 'lucide-react';
import { api, API_BASE, getAccessToken } from '../../lib/api';
import { Loader } from '../../components/ui';
import { timeAgo } from '../../components/PostCard';
import Avatar from '../../components/Avatar';
import { toast } from '../../lib/toast';
import { PushDialog, DeleteUserDialog, type UserLite } from './UserDialogs';
import UserDrawer from './UserDrawer';

/** Desktop user management: server-side search/filter/sort/pagination over
 *  GET /api/admin-ops/users, row actions (admin toggle, coach badge, push,
 *  streak freeze, typed-confirmation delete), detail drawer, CSV export. */

const KEY = ['admin-ops', 'users'];
type Sort = 'joined' | 'lastActive' | 'level' | 'streak';

export default function AdminUsers() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? ''); // live input
  const [q, setQ] = useState(search); // debounced, what the server sees
  const [role, setRole] = useState('');
  const [coach, setCoach] = useState(false);
  const [inactive, setInactive] = useState('');
  const [joinedWeek, setJoinedWeek] = useState(false);
  const [sort, setSort] = useState<Sort>('joined');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [pushUser, setPushUser] = useState<UserLite | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserLite | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (role) p.set('role', role);
    if (coach) p.set('coach', '1');
    if (inactive) p.set('inactive', inactive);
    if (joinedWeek) p.set('joined', 'week');
    p.set('sort', sort);
    p.set('dir', dir);
    return p;
  }, [q, role, coach, inactive, joinedWeek, sort, dir]);

  const { data, isLoading } = useQuery({
    queryKey: [...KEY, qs.toString(), page],
    queryFn: () => api.get(`/api/admin-ops/users?${qs.toString()}&page=${page}`),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ['admin-ops', 'user-detail'] });
  };

  const toggleAdmin = useMutation({
    mutationFn: (u: any) => api.post(`/api/admin-ops/users/${u.id}/role`, { role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' }),
    onSuccess: () => { toast('Role updated', 'success'); invalidate(); },
    onError: (e: any) => toast(e?.message ?? 'Update failed', 'error'),
  });
  const toggleVerified = useMutation({
    mutationFn: (u: any) => api.post(`/api/admin-ops/users/${u.id}/coach-verified`, { verified: !u.coachVerified }),
    onSuccess: () => { toast('Coach badge updated', 'success'); invalidate(); },
    onError: (e: any) => toast(e?.message ?? 'Update failed', 'error'),
  });
  const freeze = useMutation({
    mutationFn: (u: any) => api.post(`/api/admin-ops/users/${u.id}/freeze`),
    onSuccess: (r: any) => { toast(`Freeze granted (now ${r.streakFreezes}/3) ❄`, 'success'); invalidate(); },
    onError: (e: any) => toast(e?.message ?? 'Freeze failed', 'error'),
  });

  // Fetch with the auth header, then hand the browser a blob — a plain <a href>
  // would hit the endpoint unauthenticated.
  const exportCsv = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin-ops/users.csv?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast(e?.message ?? 'Export failed', 'error');
    }
  };

  const sortBtn = (key: Sort, label: string) => (
    <button
      onClick={() => {
        if (sort === key) setDir(dir === 'desc' ? 'asc' : 'desc');
        else { setSort(key); setDir('desc'); }
        setPage(1);
      }}
      className={`inline-flex items-center gap-1 ${sort === key ? 'text-ink' : 'text-gray-400 hover:text-gray-600'}`}
    >
      {label}
      {sort === key && (dir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
    </button>
  );

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / (data?.pageSize ?? 50)));
  const from = total === 0 ? 0 : (page - 1) * (data?.pageSize ?? 50) + 1;
  const to = Math.min(total, page * (data?.pageSize ?? 50));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Users</h1>
          <p className="text-xs text-gray-400">{total} matching · page {page} of {pages}</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
        <div className="relative min-w-56 flex-1">
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field w-full ps-9"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field w-auto" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          <option value="admin">Admins</option>
          <option value="user">Users</option>
        </select>
        <select className="input-field w-auto" value={inactive} onChange={(e) => { setInactive(e.target.value); setPage(1); }}>
          <option value="">Any activity</option>
          <option value="7">Inactive 7+ days</option>
          <option value="30">Inactive 30+ days</option>
        </select>
        <label className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ${coach ? 'bg-ink text-white' : 'bg-gray-100 text-gray-500'}`}>
          <input type="checkbox" className="hidden" checked={coach} onChange={(e) => { setCoach(e.target.checked); setPage(1); }} />
          Coaches only
        </label>
        <label className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ${joinedWeek ? 'bg-ink text-white' : 'bg-gray-100 text-gray-500'}`}>
          <input type="checkbox" className="hidden" checked={joinedWeek} onChange={(e) => { setJoinedWeek(e.target.checked); setPage(1); }} />
          Joined this week
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {isLoading ? (
          <Loader />
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-start text-[11px] font-bold uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 text-start font-bold">User</th>
                <th className="px-3 py-3 text-start font-bold">Role</th>
                <th className="px-3 py-3 text-start font-bold">{sortBtn('joined', 'Joined')}</th>
                <th className="px-3 py-3 text-start font-bold">{sortBtn('lastActive', 'Last active')}</th>
                <th className="px-3 py-3 text-start font-bold">{sortBtn('level', 'Level')}</th>
                <th className="px-3 py-3 text-start font-bold">{sortBtn('streak', 'Streak')}</th>
                <th className="px-3 py-3 text-end font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((u: any) => (
                <tr key={u.id} onClick={() => setDrawerId(u.id)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar path={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} className="h-9 w-9" textClass="text-xs" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {u.firstName} {u.lastName}
                          {u.coachVerified && <BadgeCheck size={13} className="mb-0.5 ms-1 inline text-brand-blue" />}
                          {u.coachFeatured && <Star size={12} className="mb-0.5 ms-0.5 inline fill-amber-400 text-amber-400" />}
                          {u._count?.pushSubs > 0 && <Bell size={11} className="mb-0.5 ms-1 inline text-gray-300" />}
                        </p>
                        <p className="max-w-56 truncate text-xs text-gray-400" dir="ltr">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${u.role === 'ADMIN' ? 'bg-brand-pink/10 text-brand-pink' : u.isCoach ? 'bg-blue-50 text-brand-blue' : 'bg-gray-100 text-gray-500'}`}>
                      {u.role === 'ADMIN' ? 'ADMIN' : u.isCoach ? 'COACH' : 'USER'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500">{u.lastSeenAt ? timeAgo(u.lastSeenAt) : (u.lastActiveOn ?? '—')}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500">Lv {u.level} · {u.xp} XP</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500">🔥 {u.currentStreak} · ❄ {u.streakFreezes}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <RowBtn
                        title={u.role === 'ADMIN' ? 'Demote to user' : 'Promote to admin'}
                        tone={u.role === 'ADMIN' ? 'text-brand-pink' : 'text-gray-400'}
                        onClick={() => toggleAdmin.mutate(u)}
                      >
                        <Shield size={15} />
                      </RowBtn>
                      {u.isCoach && (
                        <RowBtn
                          title={u.coachVerified ? 'Remove verified badge' : 'Verify coach'}
                          tone={u.coachVerified ? 'text-brand-blue' : 'text-gray-400'}
                          onClick={() => toggleVerified.mutate(u)}
                        >
                          <BadgeCheck size={15} />
                        </RowBtn>
                      )}
                      <RowBtn title="Send push" tone="text-gray-400" onClick={() => setPushUser(u)}>
                        <Bell size={15} />
                      </RowBtn>
                      <RowBtn
                        title={u.streakFreezes >= 3 ? 'Already at max freezes' : `Grant streak freeze (${u.streakFreezes}/3)`}
                        tone={u.streakFreezes >= 3 ? 'text-gray-200' : 'text-sky-500'}
                        disabled={u.streakFreezes >= 3}
                        onClick={() => freeze.mutate(u)}
                      >
                        <Snowflake size={15} />
                      </RowBtn>
                      <RowBtn title="Delete user" tone="text-red-400" onClick={() => setDeleteUser(u)}>
                        <Trash2 size={15} />
                      </RowBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-sm text-gray-400">No users match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{from}–{to} of {total}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-bold disabled:opacity-40"
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-bold disabled:opacity-40"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {drawerId && <UserDrawer userId={drawerId} onClose={() => setDrawerId(null)} />}
      {pushUser && <PushDialog user={pushUser} onClose={() => setPushUser(null)} />}
      {deleteUser && (
        <DeleteUserDialog
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onDeleted={() => { setDrawerId(null); invalidate(); }}
        />
      )}
    </div>
  );
}

function RowBtn({ title, tone, disabled, onClick, children }: {
  title: string; tone: string; disabled?: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition hover:bg-gray-100 disabled:cursor-not-allowed ${tone}`}
    >
      {children}
    </button>
  );
}
