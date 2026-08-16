import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, MessageCircle, Phone, Trash2 } from 'lucide-react';
import { api, getAccessToken } from '../../lib/api';
import { toast } from '../../lib/toast';

interface Lead {
  id: string;
  name: string;
  phone: string;
  city?: string | null;
  note?: string | null;
  status: string;
  createdAt: string;
  form: { id: string; title: string; partner: { id: string; name: string } };
}

const STATUSES = ['new', 'sent', 'contacted', 'won', 'lost'] as const;

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-orange-100 text-orange-600',
  sent: 'bg-sky-100 text-sky-600',
  contacted: 'bg-violet-100 text-violet-600',
  won: 'bg-emerald-100 text-emerald-600',
  lost: 'bg-gray-100 text-gray-400',
};

/** The leads inbox. Each row is a person who asked a partner to call them —
 *  which is what the partner is billed for. */
export default function AdminLeads() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery<{ leads: Lead[]; byStatus: { status: string; count: number }[] }>({
    queryKey: ['admin-leads', status],
    queryFn: () => api.get(`/api/admin/leads${status ? `?status=${status}` : ''}`),
  });

  const setStatusM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/api/admin/leads/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-leads'] }),
    onError: (e: any) => toast(e?.message ?? 'Update failed', 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/admin/leads/${id}`),
    onSuccess: () => {
      toast('Lead deleted', 'success');
      qc.invalidateQueries({ queryKey: ['admin-leads'] });
    },
    onError: (e: any) => toast(e?.message ?? 'Delete failed', 'error'),
  });

  // Fetch with the auth header, then hand the browser a blob — a plain <a href>
  // would hit the endpoint unauthenticated.
  const exportCsv = async () => {
    try {
      const res = await fetch('/api/admin/leads.csv', { headers: { Authorization: `Bearer ${getAccessToken()}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pulse-leads.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast(e?.message ?? 'Export failed', 'error');
    }
  };

  const counts = new Map((data?.byStatus ?? []).map((s) => [s.status, s.count]));
  const total = (data?.byStatus ?? []).reduce((n, s) => n + s.count, 0);
  const leads = data?.leads ?? [];

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="safe-header-tall bg-ink px-5 pb-5 text-white">
        <div className="flex items-center gap-3">
          <Link to="/admin" aria-label="Back"><ArrowLeft /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold">Leads</h1>
            <p className="text-xs text-white/60">{total} total · billable to partners</p>
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-xs font-bold active:scale-95"
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {[{ key: '', label: 'All', n: total }, ...STATUSES.map((s) => ({ key: s, label: s, n: counts.get(s) ?? 0 }))].map((f) => (
          <button
            key={f.key || 'all'}
            onClick={() => setStatus(f.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${
              status === f.key ? 'bg-ink text-white' : 'bg-white text-gray-500 shadow-sm'
            }`}
          >
            {f.label} {f.n > 0 && <span className="opacity-60">({f.n})</span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="px-4 py-10 text-center text-sm text-gray-400">Loading...</p>
      ) : leads.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-gray-400">No leads here yet.</p>
      ) : (
        <ul className="space-y-3 px-4">
          {leads.map((l) => (
            <li key={l.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{l.name}</p>
                  <p className="truncate text-xs text-gray-400">
                    {l.form.partner.name} · {l.form.title}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${STATUS_STYLE[l.status] ?? ''}`}>
                  {l.status}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <a href={`tel:${l.phone}`} className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-600">
                  <Phone size={12} /> <span dir="ltr">{l.phone}</span>
                </a>
                <a
                  href={`https://wa.me/${l.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-600"
                >
                  <MessageCircle size={12} /> WhatsApp
                </a>
                {l.city && <span className="text-gray-400">{l.city}</span>}
                <span className="text-gray-300">{new Date(l.createdAt).toLocaleDateString()}</span>
              </div>

              {l.note && <p className="mt-2 rounded-xl bg-gray-50 p-2.5 text-xs leading-relaxed text-gray-600">{l.note}</p>}

              <div className="mt-3 flex items-center gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusM.mutate({ id: l.id, status: s })}
                    disabled={l.status === s}
                    className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase transition ${
                      l.status === s ? STATUS_STYLE[s] : 'bg-gray-50 text-gray-400 active:scale-95'
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <button
                  onClick={() => remove.mutate(l.id)}
                  aria-label="Delete lead"
                  className="rounded-lg bg-red-50 p-1.5 text-red-500 active:scale-95"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
