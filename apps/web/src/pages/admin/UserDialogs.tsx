import { useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

/** Shared minimal centered modal for the admin desktop screens. */
export function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-extrabold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export type UserLite = { id: string; firstName: string; lastName: string; email: string };

/** Small title+body composer → POST /api/admin-ops/users/:id/push. */
export function PushDialog({ user, onClose }: { user: UserLite; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const send = useMutation({
    mutationFn: () => api.post(`/api/admin-ops/users/${user.id}/push`, { title: title.trim(), body: body.trim() }),
    onSuccess: () => { toast('Push sent', 'success'); onClose(); },
    onError: (e: any) => toast(e?.message ?? 'Push failed', 'error'),
  });
  return (
    <ModalShell title={`Send push to ${user.firstName} ${user.lastName}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400">Title</label>
          <input className="input-field w-full" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Quick heads-up" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400">Body</label>
          <textarea className="input-field w-full resize-none" rows={3} value={body} maxLength={300} onChange={(e) => setBody(e.target.value)} placeholder="The message they'll see…" />
        </div>
        <p className="text-[11px] text-gray-400">Delivered as a web push and saved to their in-app notifications.</p>
        <button
          onClick={() => send.mutate()}
          disabled={send.isPending || !title.trim() || !body.trim()}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-bold text-white disabled:opacity-50"
        >
          <Send size={15} /> {send.isPending ? 'Sending…' : 'Send push'}
        </button>
      </div>
    </ModalShell>
  );
}

/** Typed-confirmation hard delete → DELETE /api/admin-ops/users/:id. */
export function DeleteUserDialog({ user, onClose, onDeleted }: { user: UserLite; onClose: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState('');
  const match = confirm.trim().toLowerCase() === user.email.toLowerCase();
  const del = useMutation({
    mutationFn: () => api.del(`/api/admin-ops/users/${user.id}`, { confirmEmail: confirm.trim() }),
    onSuccess: () => { toast('User deleted', 'info'); onDeleted(); onClose(); },
    onError: (e: any) => toast(e?.message ?? 'Delete failed', 'error'),
  });
  return (
    <ModalShell title="Delete user permanently" onClose={onClose}>
      <div className="space-y-3">
        <p className="rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-red-600">
          This permanently deletes <b>{user.firstName} {user.lastName}</b> and all their data — workouts, logs,
          posts, chats, connections. There is no undo.
        </p>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400">
            Type the user's email to confirm
          </label>
          <input
            className="input-field w-full"
            dir="ltr"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={user.email}
            autoFocus
          />
        </div>
        <button
          onClick={() => del.mutate()}
          disabled={!match || del.isPending}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-red-500 text-sm font-bold text-white disabled:opacity-40"
        >
          <Trash2 size={15} /> {del.isPending ? 'Deleting…' : 'Delete permanently'}
        </button>
      </div>
    </ModalShell>
  );
}
