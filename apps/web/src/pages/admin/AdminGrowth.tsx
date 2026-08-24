import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Rocket, X, Plus, FileUp, Copy, Trash2, Upload, Video, Image as ImageIcon, File as FileIcon,
  Megaphone, KanbanSquare, FolderOpen, Download, Loader2,
} from 'lucide-react';
import { api, uploadWithAuth, API_BASE } from '../../lib/api';
import { toast } from '../../lib/toast';

// ---------------------------------------------------------------------------
// Types — local mirror of the /api/admin-growth contract.
// ---------------------------------------------------------------------------

type Stage = 'new' | 'contacted' | 'replied' | 'qualified' | 'meeting' | 'won' | 'lost' | 'human';

type Lead = {
  id: string;
  name: string;
  org?: string | null;
  type: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  stage: Stage;
  aiBrief?: string | null;
  notes?: string | null;
  needsAction: boolean;
  autoSend?: boolean;
  nextTouchAt?: string | null;
  createdAt: string;
  touchCount: number;
  lastTouchAt?: string | null;
};

type BoardResponse = {
  board: Record<Stage, Lead[]>;
  counts: { needsAction: number; dueToday: number };
};

type Touch = {
  id: string;
  direction: 'out' | 'in';
  channel?: string | null;
  subject?: string | null;
  body: string;
  aiDrafted: boolean;
  status: string; // 'draft' | 'sent' | ...
  createdAt: string;
};

type LeadDetail = { lead: Lead; touches: Touch[] };

type Asset = {
  id: string;
  kind: string;
  filePath: string;
  fileUrl: string;
  caption?: string | null;
  active: boolean;
  usedCount: number;
  lastUsedAt?: string | null;
};

type PostingPlan = {
  items: { platform: string; text: string }[];
  asset: { id: string; caption?: string | null; fileUrl: string } | null;
};

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const STAGES: { key: Stage; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'replied', label: 'Replied' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'human', label: 'Needs human' },
];

const TYPE_OPTIONS = ['gym', 'coach', 'influencer', 'brand', 'community', 'other'];

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-blue dark:border-gray-700';
const cardCls = 'rounded-2xl border border-gray-200 p-4 dark:border-gray-700';
const btnPrimary =
  'inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50';
const btnGhost =
  'inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 dark:border-gray-700';

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function fileUrlAbs(u: string): string {
  return u.startsWith('http') ? u : `${API_BASE}${u}`;
}

function copyText(text: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast('Copied to clipboard', 'success'),
    () => toast('Copy failed', 'error'),
  );
}

function typeBadgeCls(type: string): string {
  switch (type) {
    case 'gym': return 'bg-blue-50 text-brand-blue dark:bg-blue-900/30 dark:text-blue-300';
    case 'coach': return 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300';
    case 'influencer': return 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300';
    case 'brand': return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Tab = 'pipeline' | 'plan' | 'assets';

/**
 * Growth team dashboard: an outreach pipeline (kanban of leads with AI-drafted
 * touches), a one-click daily posting plan, and the media asset pool the plan
 * generator draws from.
 */
export default function AdminGrowth() {
  const [tab, setTab] = useState<Tab>('pipeline');

  const tabs: { key: Tab; label: string; icon: JSX.Element }[] = [
    { key: 'pipeline', label: 'Pipeline', icon: <KanbanSquare size={14} /> },
    { key: 'plan', label: 'Posting plan', icon: <Megaphone size={14} /> },
    { key: 'assets', label: 'Assets', icon: <FolderOpen size={14} /> },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Rocket size={20} /> Growth</h1>
        <div className="flex rounded-xl border border-gray-200 p-0.5 dark:border-gray-700">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-bold transition-colors ${
                tab === t.key ? 'bg-brand-blue text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'plan' && <PostingPlanTab />}
      {tab === 'assets' && <AssetsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 1 — Pipeline
// ---------------------------------------------------------------------------

function PipelineTab() {
  const qc = useQueryClient();
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

  const { data, isLoading } = useQuery<BoardResponse>({
    queryKey: ['admin-growth', 'board'],
    queryFn: () => api.get('/api/admin-growth/'),
    refetchInterval: 60_000,
  });

  const columnTone = (s: Stage) =>
    s === 'human'
      ? 'border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-900/15'
      : s === 'won'
        ? 'border-green-300 bg-green-50/60 dark:border-green-800 dark:bg-green-900/15'
        : 'border-gray-200 bg-gray-50/60 dark:border-gray-700 dark:bg-gray-800/40';

  const headerTone = (s: Stage) =>
    s === 'human' ? 'text-red-600 dark:text-red-400' : s === 'won' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400';

  return (
    <div>
      {/* Top bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setAdding(true)} className={btnPrimary}><Plus size={13} /> Add lead</button>
        <button onClick={() => setImporting(true)} className={btnGhost}><FileUp size={13} /> Import CSV</button>
        <div className="ms-auto flex items-center gap-2">
          <button
            onClick={() => setFlaggedOnly((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              flaggedOnly
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            }`}
            title="Show only leads flagged as needing action"
          >
            Needs action {data?.counts.needsAction ?? 0}
          </button>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-brand-blue dark:bg-blue-900/30 dark:text-blue-300">
            Due today {data?.counts.dueToday ?? 0}
          </span>
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading pipeline…</p>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {STAGES.map((s) => {
              const all = data?.board?.[s.key] ?? [];
              const leads = flaggedOnly ? all.filter((l) => l.needsAction) : all;
              return (
                <div key={s.key} className={`w-64 shrink-0 rounded-2xl border p-2 ${columnTone(s.key)}`}>
                  <p className={`mb-2 flex items-center justify-between px-1 text-xs font-extrabold uppercase tracking-wide ${headerTone(s.key)}`}>
                    {s.label}
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] dark:bg-gray-900">{leads.length}</span>
                  </p>
                  <div className="space-y-2">
                    {leads.length === 0 && <p className="px-1 py-3 text-center text-[11px] text-gray-300 dark:text-gray-600">Empty</p>}
                    {leads.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setOpenLeadId(l.id)}
                        className="block w-full rounded-xl border border-gray-200 bg-white p-2.5 text-left shadow-sm transition-shadow hover:shadow dark:border-gray-700 dark:bg-gray-900"
                      >
                        <p className="flex items-center gap-1.5 text-sm font-bold">
                          {l.needsAction && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" title="Needs action" />}
                          <span className="truncate">{l.name}</span>
                        </p>
                        {l.org && <p className="truncate text-xs text-gray-400">{l.org}</p>}
                        <p className="mt-1.5 flex items-center justify-between gap-1">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeBadgeCls(l.type)}`}>{l.type}</span>
                          <span className="text-[10px] text-gray-400">
                            {l.lastTouchAt ? timeAgo(l.lastTouchAt) : 'no touches'}
                          </span>
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openLeadId && <LeadDrawer leadId={openLeadId} onClose={() => setOpenLeadId(null)} />}
      {adding && (
        <AddLeadModal
          onClose={() => setAdding(false)}
          onCreated={() => { setAdding(false); qc.invalidateQueries({ queryKey: ['admin-growth', 'board'] }); }}
        />
      )}
      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onImported={() => { setImporting(false); qc.invalidateQueries({ queryKey: ['admin-growth', 'board'] }); }}
        />
      )}
    </div>
  );
}

// --- Add lead modal ---------------------------------------------------------

function AddLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', org: '', type: 'gym', email: '', phone: '', source: '', notes: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = useMutation({
    mutationFn: () =>
      api.post('/api/admin-growth/leads', {
        name: form.name.trim(),
        org: form.org.trim() || undefined,
        type: form.type,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        source: form.source.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: () => { toast('Lead added', 'success'); onCreated(); },
    onError: (e: any) => toast(e?.message ?? 'Failed to add lead', 'error'),
  });

  return (
    <Modal title="Add lead" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name *"><input value={form.name} onChange={set('name')} className={inputCls} placeholder="Ahmed Samir" /></Field>
          <Field label="Organization"><input value={form.org} onChange={set('org')} className={inputCls} placeholder="Iron Gym Nasr City" /></Field>
          <Field label="Type">
            <select value={form.type} onChange={set('type')} className={inputCls}>
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Source"><input value={form.source} onChange={set('source')} className={inputCls} placeholder="facebook group / referral…" /></Field>
          <Field label="Email"><input value={form.email} onChange={set('email')} className={inputCls} placeholder="name@gym.com" dir="ltr" /></Field>
          <Field label="Phone"><input value={form.phone} onChange={set('phone')} className={inputCls} placeholder="+20 10 1234 5678" dir="ltr" /></Field>
        </div>
        <Field label="Notes"><textarea value={form.notes} onChange={set('notes')} rows={2} className={inputCls} /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button
            onClick={() => (form.name.trim() ? create.mutate() : toast('Name is required', 'error'))}
            disabled={create.isPending}
            className={btnPrimary}
          >
            {create.isPending ? 'Adding…' : 'Add lead'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// --- Import CSV modal -------------------------------------------------------

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [text, setText] = useState('');

  const rows = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, org, type, email, phone] = line.split(',').map((c) => c.trim());
      return {
        name: name || '',
        org: org || undefined,
        type: type || undefined,
        email: email || undefined,
        phone: phone || undefined,
      };
    })
    .filter((r) => r.name);

  const doImport = useMutation({
    mutationFn: () => api.post('/api/admin-growth/leads/import', { rows }),
    onSuccess: (d: any) => { toast(`Imported ${d.created} lead(s), skipped ${d.skipped}`, 'success'); onImported(); },
    onError: (e: any) => toast(e?.message ?? 'Import failed', 'error'),
  });

  return (
    <Modal title="Import leads (CSV)" onClose={onClose}>
      <p className="mb-2 text-xs text-gray-400">
        One lead per line: <code dir="ltr" className="rounded bg-gray-100 px-1 dark:bg-gray-800">name, org, type, email, phone</code> — only name is required.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        dir="ltr"
        placeholder={'Ahmed Samir, Iron Gym, gym, ahmed@irongym.com, +201012345678\nSara Adel, , influencer, , +201098765432'}
        className={`${inputCls} font-mono text-xs`}
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">{rows.length} row(s) parsed</span>
        <div className="flex gap-2">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button
            onClick={() => (rows.length ? doImport.mutate() : toast('Nothing to import', 'error'))}
            disabled={doImport.isPending}
            className={btnPrimary}
          >
            {doImport.isPending ? 'Importing…' : `Import ${rows.length || ''}`.trim()}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// --- Lead drawer ------------------------------------------------------------

function LeadDrawer({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<string | null>(null); // null = not yet edited
  const [replyOpen, setReplyOpen] = useState(false);

  const { data, isLoading } = useQuery<LeadDetail>({
    queryKey: ['admin-growth', 'lead', leadId],
    queryFn: () => api.get(`/api/admin-growth/leads/${leadId}`),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-growth', 'lead', leadId] });
    qc.invalidateQueries({ queryKey: ['admin-growth', 'board'] });
  };

  const patch = useMutation({
    mutationFn: (body: Partial<Pick<Lead, 'stage' | 'notes' | 'needsAction' | 'nextTouchAt' | 'autoSend'>>) =>
      api.patch(`/api/admin-growth/leads/${leadId}`, body),
    onSuccess: () => { toast('Saved', 'success'); invalidate(); },
    onError: (e: any) => toast(e?.message ?? 'Save failed', 'error'),
  });

  const draft = useMutation({
    mutationFn: (kind: 'first' | 'followup') => api.post(`/api/admin-growth/leads/${leadId}/draft`, { kind }),
    onSuccess: () => { toast('Draft ready — review it in the timeline below', 'success'); invalidate(); },
    onError: (e: any) => toast(e?.message ?? 'Drafting failed', 'error'),
  });

  const handoff = useMutation({
    mutationFn: () => api.post(`/api/admin-growth/leads/${leadId}/handoff`),
    onSuccess: () => { toast('Handed to a human — moved to the red column', 'success'); invalidate(); },
    onError: (e: any) => toast(e?.message ?? 'Handoff failed', 'error'),
  });

  const lead = data?.lead;
  const touches = data?.touches ?? [];
  const waPhone = lead?.phone ? lead.phone.replace(/[^\d]/g, '') : null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute inset-y-0 end-0 flex w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl dark:bg-gray-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-400">Lead details</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        {isLoading || !lead ? (
          <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="space-y-4 p-5">
            {/* Identity */}
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-lg font-extrabold">
                    {lead.needsAction && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" title="Needs action" />}
                    <span className="truncate">{lead.name}</span>
                  </p>
                  {lead.org && <p className="truncate text-sm text-gray-400">{lead.org}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${typeBadgeCls(lead.type)}`}>{lead.type}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <InfoCell label="Email" value={lead.email || '—'} ltr />
                <InfoCell label="Phone" value={lead.phone || '—'} ltr />
                <InfoCell label="Source" value={lead.source || '—'} />
                <InfoCell label="Touches" value={`${lead.touchCount} · added ${timeAgo(lead.createdAt)}`} />
              </div>
            </div>

            {/* AI brief */}
            {lead.aiBrief && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-brand-blue">AI brief</p>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">{lead.aiBrief}</p>
              </div>
            )}

            {/* Stage + flags */}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Stage">
                <select
                  value={lead.stage}
                  onChange={(e) => patch.mutate({ stage: e.target.value as Stage })}
                  className={inputCls}
                >
                  {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Next touch">
                <input
                  type="datetime-local"
                  value={lead.nextTouchAt ? lead.nextTouchAt.slice(0, 16) : ''}
                  onChange={(e) => patch.mutate({ nextTouchAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className={inputCls}
                />
              </Field>
            </div>
            <button
              onClick={() => patch.mutate({ needsAction: !lead.needsAction })}
              className={`${btnGhost} ${lead.needsAction ? 'border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400' : ''}`}
            >
              {lead.needsAction ? 'Clear "needs action" flag' : 'Flag as needs action'}
            </button>
            <button
              onClick={() => patch.mutate({ autoSend: !lead.autoSend })}
              className={`${btnGhost} ${lead.autoSend ? 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400' : ''}`}
              title="When ON, the agent sends its own follow-up drafts on this lead (threads that have replied). Cold first touches always wait for you."
            >
              {lead.autoSend ? '🤖 Autopilot ON — agent replies alone' : '🤖 Autopilot OFF — drafts wait for you'}
            </button>

            {/* Notes */}
            <Field label="Notes">
              <textarea
                value={notes ?? lead.notes ?? ''}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder="Context, objections, next steps…"
              />
              {notes !== null && notes !== (lead.notes ?? '') && (
                <button
                  onClick={() => patch.mutate({ notes }, { onSuccess: () => setNotes(null) })}
                  disabled={patch.isPending}
                  className={`${btnPrimary} mt-2`}
                >
                  Save notes
                </button>
              )}
            </Field>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button onClick={() => draft.mutate('first')} disabled={draft.isPending} className={btnPrimary}>
                {draft.isPending ? <Loader2 size={13} className="animate-spin" /> : '✨'} Draft first email
              </button>
              <button onClick={() => draft.mutate('followup')} disabled={draft.isPending} className={btnGhost}>
                ✨ Draft follow-up
              </button>
              <button onClick={() => setReplyOpen(true)} className={btnGhost}>📥 Log reply</button>
              <button onClick={() => handoff.mutate()} disabled={handoff.isPending} className={`${btnGhost} border-red-200 text-red-600 dark:border-red-800 dark:text-red-400`}>
                📞 Hand to human
              </button>
              {waPhone && (
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`${btnGhost} border-green-200 text-green-600 dark:border-green-800 dark:text-green-400`}
                >
                  WhatsApp
                </a>
              )}
            </div>

            {/* Timeline */}
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Touch timeline</p>
              {touches.length === 0 ? (
                <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-400 dark:bg-gray-800">
                  No touches yet — draft the first email above.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {touches.map((t) =>
                    t.status === 'draft' ? (
                      <DraftTouchCard key={t.id} touch={t} onChanged={invalidate} />
                    ) : (
                      <TouchBubble key={t.id} touch={t} />
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {replyOpen && lead && (
        <LogReplyModal
          leadId={lead.id}
          onClose={() => setReplyOpen(false)}
          onLogged={() => { setReplyOpen(false); invalidate(); }}
        />
      )}
    </div>
  );
}

function TouchBubble({ touch }: { touch: Touch }) {
  const out = touch.direction === 'out';
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          out
            ? 'rounded-br-md bg-brand-blue text-white'
            : 'rounded-bl-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
        }`}
      >
        {touch.subject && <p className="mb-0.5 text-xs font-bold opacity-90">{touch.subject}</p>}
        <p className="whitespace-pre-wrap">{touch.body}</p>
        <p className={`mt-1 text-[10px] ${out ? 'text-white/70' : 'text-gray-400'}`}>
          {[touch.channel, touch.aiDrafted ? 'AI' : null, touch.status !== 'sent' ? touch.status : null, timeAgo(touch.createdAt)]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </div>
  );
}

function DraftTouchCard({ touch, onChanged }: { touch: Touch; onChanged: () => void }) {
  const [subject, setSubject] = useState(touch.subject ?? '');
  const [body, setBody] = useState(touch.body);

  const send = useMutation({
    mutationFn: async () => {
      await api.patch(`/api/admin-growth/touches/${touch.id}`, { subject, body });
      await api.post(`/api/admin-growth/touches/${touch.id}/send`);
    },
    onSuccess: () => { toast('Sent', 'success'); onChanged(); },
    onError: (e: any) => toast(e?.message ?? 'Send failed', 'error'),
  });

  const save = useMutation({
    mutationFn: () => api.patch(`/api/admin-growth/touches/${touch.id}`, { subject, body }),
    onSuccess: () => { toast('Draft saved', 'success'); onChanged(); },
    onError: (e: any) => toast(e?.message ?? 'Save failed', 'error'),
  });

  return (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-3 dark:border-amber-700 dark:bg-amber-900/10">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
        Draft {touch.aiDrafted ? '· AI written' : ''} — review, then send
      </p>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className={`${inputCls} mb-2 bg-white dark:bg-gray-900`}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        className={`${inputCls} bg-white dark:bg-gray-900`}
      />
      <div className="mt-2 flex gap-2">
        <button onClick={() => send.mutate()} disabled={send.isPending || save.isPending} className={btnPrimary}>
          {send.isPending ? 'Sending…' : 'Send'}
        </button>
        <button onClick={() => save.mutate()} disabled={send.isPending || save.isPending} className={btnGhost}>
          Save draft
        </button>
      </div>
    </div>
  );
}

function LogReplyModal({ leadId, onClose, onLogged }: { leadId: string; onClose: () => void; onLogged: () => void }) {
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState('email');

  const log = useMutation({
    mutationFn: () => api.post(`/api/admin-growth/leads/${leadId}/log-reply`, { body: body.trim(), channel }),
    onSuccess: (d: any) => { toast(`Intent: ${d.intent} — ${d.summary}`, 'success'); onLogged(); },
    onError: (e: any) => toast(e?.message ?? 'Failed to log reply', 'error'),
  });

  return (
    <Modal title="Log their reply" onClose={onClose}>
      <p className="mb-2 text-xs text-gray-400">
        Paste what the lead replied — the AI classifies the intent and updates the pipeline.
      </p>
      <Field label="Channel">
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputCls}>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="facebook">Facebook</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <div className="mt-3">
        <Field label="Their message">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className={inputCls} placeholder="Paste the reply text…" />
        </Field>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button
          onClick={() => (body.trim() ? log.mutate() : toast('Paste the reply first', 'error'))}
          disabled={log.isPending}
          className={btnPrimary}
        >
          {log.isPending ? 'Analyzing…' : 'Log reply'}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// TAB 2 — Posting plan
// ---------------------------------------------------------------------------

function PostingPlanTab() {
  const [plan, setPlan] = useState<PostingPlan | null>(null);

  const generate = useMutation({
    mutationFn: () => api.post('/api/admin-growth/posting-plan', {}) as Promise<PostingPlan>,
    onSuccess: (d) => { setPlan(d); toast('Plan ready', 'success'); },
    onError: (e: any) => toast(e?.message ?? 'Failed to generate the plan', 'error'),
  });


  const { data: social } = useQuery<{ facebook: boolean; telegram: boolean; inbox: boolean; autoPostDaily: boolean }>({
    queryKey: ['growth-social-status'],
    queryFn: () => api.get('/api/admin-growth/social-status'),
  });
  const publish = useMutation({
    mutationFn: () => api.post('/api/admin-growth/posting-plan/publish', { items: plan!.items, assetId: plan?.asset?.id }),
    onSuccess: (r: any) => toast(`Published: ${r.summary}`, 'success'),
    onError: (e: any) => toast(e?.message ?? 'Publish failed', 'error'),
  });
  const assetSrc = plan?.asset ? fileUrlAbs(plan.asset.fileUrl) : null;
  const assetIsVideo = assetSrc ? /\.(mp4|mov|webm|m4v)(\?|$)/i.test(assetSrc) : false;

  return (
    <div className="space-y-4">
      <section className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Today's posting plan</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              One AI-written post per platform, plus the reel to attach.
            </p>
          </div>
          <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            <span className={`rounded-full px-2 py-0.5 ${social?.facebook ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>FB {social?.facebook ? '✓' : '—'}</span>
            <span className={`rounded-full px-2 py-0.5 ${social?.telegram ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>TG {social?.telegram ? '✓' : '—'}</span>
            <span className={`rounded-full px-2 py-0.5 ${social?.inbox ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>Inbox {social?.inbox ? '✓' : '—'}</span>
            <span className={`rounded-full px-2 py-0.5 ${social?.autoPostDaily ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>Daily 17:00 {social?.autoPostDaily ? 'ON' : 'OFF'}</span>
          </span>
          <button onClick={() => generate.mutate()} disabled={generate.isPending} className={btnPrimary}>
            {generate.isPending ? <Loader2 size={13} className="animate-spin" /> : '🎯'}{' '}
            {generate.isPending ? 'Generating…' : "Generate today's plan"}
          </button>
          {plan && (social?.facebook || social?.telegram) && (
            <button onClick={() => publish.mutate()} disabled={publish.isPending} className={btnPrimary}>
              {publish.isPending ? 'Publishing…' : '🚀 Publish to platforms now'}
            </button>
          )}
        </div>
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          Posting to groups/pages stays manual — paste, attach the reel, post. ~15 minutes.
        </p>
      </section>

      {plan && (
        <>
          {plan.asset && (
            <section className={cardCls}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold"><Video size={15} /> Attached asset</h2>
              {plan.asset.caption && <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">{plan.asset.caption}</p>}
              {assetIsVideo ? (
                <video controls src={assetSrc!} className="max-h-72 w-full rounded-xl bg-black" />
              ) : (
                <img src={assetSrc!} alt={plan.asset.caption ?? 'asset'} className="max-h-72 rounded-xl object-contain" />
              )}
              <a href={assetSrc!} download className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-blue">
                <Download size={12} /> Download file
              </a>
            </section>
          )}
          {plan.asset === null && (
            <p className="text-xs text-gray-400">No active asset available — upload one in the Assets tab.</p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {plan.items.map((item, i) => (
              <section key={`${item.platform}-${i}`} className={cardCls}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold capitalize">{item.platform}</h3>
                  <button onClick={() => copyText(item.text)} className={btnGhost}>
                    <Copy size={12} /> Copy
                  </button>
                </div>
                <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {item.text}
                </p>
              </section>
            ))}
          </div>
        </>
      )}

      {!plan && !generate.isPending && (
        <p className="py-8 text-center text-sm text-gray-400">No plan yet today — hit the button above.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 3 — Assets
// ---------------------------------------------------------------------------

function AssetsTab() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [fileKey, setFileKey] = useState(0); // resets the <input type=file> after upload

  const { data, isLoading } = useQuery<Asset[]>({
    queryKey: ['admin-growth', 'assets'],
    queryFn: () => api.get('/api/admin-growth/assets'),
  });

  const upload = async () => {
    if (!file) return toast('Pick a file first', 'error');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('caption', caption.trim());
      const res = await uploadWithAuth('/api/admin-growth/assets', form);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? 'Upload failed');
      }
      toast('Asset uploaded', 'success');
      setFile(null);
      setCaption('');
      setFileKey((k) => k + 1);
      qc.invalidateQueries({ queryKey: ['admin-growth', 'assets'] });
    } catch (e: any) {
      toast(e?.message ?? 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const del = useMutation({
    mutationFn: (id: string) => api.del(`/api/admin-growth/assets/${id}`),
    onSuccess: () => { toast('Asset deleted', 'success'); qc.invalidateQueries({ queryKey: ['admin-growth', 'assets'] }); },
    onError: (e: any) => toast(e?.message ?? 'Delete failed', 'error'),
  });

  const kindIcon = (kind: string) =>
    /video/i.test(kind) ? <Video size={16} /> : /image|photo/i.test(kind) ? <ImageIcon size={16} /> : <FileIcon size={16} />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">The plan generator picks the least-used active asset automatically.</p>

      {/* Upload zone */}
      <section className={cardCls}>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Upload size={15} /> Upload asset</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="File (reel / image)">
            <input
              key={fileKey}
              type="file"
              accept="video/*,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs file:me-3 file:rounded-xl file:border-0 file:bg-brand-blue file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
            />
          </Field>
          <Field label="Caption">
            <input value={caption} onChange={(e) => setCaption(e.target.value)} className={inputCls} placeholder="30s form-check reel, squat" />
          </Field>
          <div className="flex items-end">
            <button onClick={upload} disabled={uploading} className={btnPrimary}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>
      </section>

      {/* Grid */}
      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-400">Loading assets…</p>
      ) : !data?.length ? (
        <p className="py-8 text-center text-sm text-gray-400">No assets yet — upload your first reel above.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((a) => (
            <div key={a.id} className={`${cardCls} flex flex-col gap-2 ${a.active ? '' : 'opacity-50'}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-bold">
                  {kindIcon(a.kind)}
                  <span className="capitalize">{a.kind}</span>
                  {!a.active && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400 dark:bg-gray-800">inactive</span>}
                </span>
                <button
                  onClick={() => del.mutate(a.id)}
                  disabled={del.isPending}
                  aria-label="Delete asset"
                  className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="min-h-[2rem] text-sm text-gray-600 dark:text-gray-300">{a.caption || <span className="text-gray-300 dark:text-gray-600">No caption</span>}</p>
              <p className="text-[11px] text-gray-400">
                Used {a.usedCount}× {a.lastUsedAt ? `· last ${timeAgo(a.lastUsedAt)}` : '· never used'}
              </p>
              <a
                href={fileUrlAbs(a.fileUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue"
              >
                <Download size={12} /> Open file
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny shared UI atoms
// ---------------------------------------------------------------------------

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-400">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function InfoCell({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 truncate font-semibold" dir={ltr ? 'ltr' : undefined} title={value}>{value}</p>
    </div>
  );
}
