import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, BadgeCheck, Star, Search, KeyRound, Trash2, Copy, Shield } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader } from '../../components/ui';
import { timeAgo } from '../../components/PostCard';
import Avatar from '../../components/Avatar';
import Sheet from '../../components/Sheet';
import { toast } from '../../lib/toast';

/** Full user control: edit identity/role/coach flags, reset password, delete. */

const KEY = ['admin', 'users'];
const FIELD = 'w-full rounded-xl bg-gray-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-pink/40';
const LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400';

export default function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const { data: users, isLoading } = useQuery({
    queryKey: [...KEY, q],
    queryFn: () => api.get(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  });

  return (
    <div className="min-h-screen pb-10">
      <header className="safe-header flex items-center gap-2 bg-ink px-4 pb-4 text-white">
        <Link to="/admin"><ChevronLeft /></Link>
        <h1 className="text-lg font-bold">Users</h1>
        <span className="ms-auto text-xs text-white/60">{(users ?? []).length} shown</span>
      </header>

      <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-3">
        <Search size={16} className="shrink-0 text-gray-400" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder="Search name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="divide-y">
          {(users ?? []).map((u: any) => (
            <button key={u.id} onClick={() => setSelected(u)} className="flex w-full items-center gap-3 bg-white px-4 py-3 text-start">
              <Avatar path={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {u.firstName} {u.lastName}
                  {u.coachVerified && <BadgeCheck size={13} className="mb-0.5 ms-1 inline text-brand-blue" />}
                  {u.coachFeatured && <Star size={12} className="mb-0.5 ms-0.5 inline fill-amber-400 text-amber-400" />}
                </p>
                <p className="truncate text-xs text-gray-400">{u.email} · Lv {u.level ?? 1} · {u.xp ?? 0} XP · 🔥{u.currentStreak ?? 0}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${u.role === 'ADMIN' ? 'bg-brand-pink/10 text-brand-pink' : u.isCoach ? 'bg-blue-50 text-brand-blue' : 'bg-gray-100 text-gray-500'}`}>
                {u.role === 'ADMIN' ? 'ADMIN' : u.isCoach ? 'COACH' : 'USER'}
              </span>
            </button>
          ))}
        </div>
      )}

      <UserSheet user={selected} onClose={() => setSelected(null)} onChanged={() => qc.invalidateQueries({ queryKey: KEY })} />
    </div>
  );
}

function UserSheet({ user, onClose, onChanged }: { user: any | null; onClose: () => void; onChanged: () => void }) {
  const [form, setForm] = useState<any>({});
  const [newPw, setNewPw] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const u = user ?? {};
  const v = (k: string) => (form[k] !== undefined ? form[k] : u[k]);

  const close = () => { setForm({}); setNewPw(null); setConfirmDelete(false); onClose(); };

  const save = useMutation({
    mutationFn: () => api.patch(`/api/admin/users/${u.id}`, form),
    onSuccess: () => { toast('User updated', 'success'); onChanged(); close(); },
    onError: (e: any) => toast(e?.message ?? 'Update failed', 'error'),
  });

  const resetPw = useMutation({
    mutationFn: () => api.post(`/api/admin/users/${u.id}/reset-password`),
    onSuccess: (r: any) => setNewPw(r.password),
    onError: (e: any) => toast(e?.message ?? 'Reset failed', 'error'),
  });

  const del = useMutation({
    mutationFn: () => api.del(`/api/admin/users/${u.id}`),
    onSuccess: () => { toast('User deleted', 'info'); onChanged(); close(); },
    onError: (e: any) => toast(e?.message ?? 'Delete failed', 'error'),
  });

  const Toggle = ({ k, label }: { k: string; label: string }) => (
    <button
      onClick={() => setForm({ ...form, [k]: !v(k) })}
      className={`min-h-10 flex-1 rounded-full text-xs font-bold transition ${v(k) ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500'}`}
    >
      {label}
    </button>
  );

  return (
    <Sheet open={!!user} onClose={close} label="Edit user">
      {user && (
        <div className="space-y-4 px-5 pb-8 pt-2">
          <div className="flex items-center gap-3">
            <Avatar path={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} className="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold">{u.firstName} {u.lastName}</p>
              <p className="truncate text-xs text-gray-400">{u._count?.pushSubs ? '🔔 ' : ''}Lv {u.level ?? 1} · {u.xp ?? 0} XP · 🔥{u.currentStreak ?? 0} · seen {u.lastSeenAt ? timeAgo(u.lastSeenAt) : (u.lastActiveOn ?? '—')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>First name</label>
              <input className={FIELD} value={v('firstName') ?? ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>Last name</label>
              <input className={FIELD} value={v('lastName') ?? ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input className={FIELD} dir="ltr" value={v('email') ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          <div>
            <label className={LABEL}>Role & coach flags</label>
            <div className="flex gap-2">
              <button
                onClick={() => setForm({ ...form, role: v('role') === 'ADMIN' ? 'USER' : 'ADMIN' })}
                className={`flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full text-xs font-bold transition ${v('role') === 'ADMIN' ? 'bg-brand-pink text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                <Shield size={13} /> Admin
              </button>
              <Toggle k="isCoach" label="Coach" />
              <Toggle k="coachVerified" label="Verified ✓" />
              <Toggle k="coachFeatured" label="Featured ⭐" />
            </div>
          </div>

          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || Object.keys(form).length === 0}
            className="btn-pill btn-primary w-full disabled:opacity-50"
          >
            Save changes
          </button>

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

            {u.role !== 'ADMIN' && (
              <button
                onClick={() => (confirmDelete ? del.mutate() : setConfirmDelete(true))}
                disabled={del.isPending}
                className={`mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition disabled:opacity-50 ${confirmDelete ? 'bg-red-500 text-white' : 'border border-red-200 text-red-500'}`}
              >
                <Trash2 size={15} /> {confirmDelete ? 'Tap again to permanently delete' : 'Delete user'}
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
