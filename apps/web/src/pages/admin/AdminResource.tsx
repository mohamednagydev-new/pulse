import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronLeft, X, Upload, Sparkles } from 'lucide-react';
import { api, getAccessToken, API_BASE } from '../../lib/api';
import { toast } from '../../lib/toast';
import { Loader, MediaImage } from '../../components/ui';
import { RESOURCES, NUMBER_FIELDS, BOOLEAN_FIELDS, IMG_FIELDS, type Field, type Resource } from './adminConfig';
import ResourceTable from './ResourceTable';
import ConfirmDialog from './ConfirmDialog';

/** Fields that must never travel with a duplicate: unique per record, or an
 *  identity in their own right. Copying a coupon code or an email creates a
 *  constraint error at best and a silent collision at worst. */
const UNIQUE_FIELDS = ['code', 'inviteCode', 'email'];

export default function AdminResource() {
  const { resource } = useParams();
  const conf = RESOURCES.find((r) => r.key === resource);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [confirmDel, setConfirmDel] = useState<any | null>(null); // phone list delete

  const listKey = ['admin', conf?.api];

  const { data: items, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => api.get(`/api/admin/${conf!.api}`),
    enabled: !!conf,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: listKey });

  /** Inline boolean toggle from the table — optimistic, rolled back on error. */
  const toggle = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: string; value: boolean }) =>
      api.patch(`/api/admin/${conf!.api}/${id}`, { [field]: value }),
    onMutate: async ({ id, field, value }) => {
      await qc.cancelQueries({ queryKey: listKey });
      const prev = qc.getQueryData(listKey);
      qc.setQueryData(listKey, (old: any) =>
        (old ?? []).map((it: any) => (it.id === id ? { ...it, [field]: value } : it)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(listKey, ctx?.prev);
      toast('Update failed — change rolled back', 'error');
    },
    onSettled: invalidate,
  });

  /** POST a copy of the record: config fields only, label suffixed " (copy)",
   *  unique-ish fields (code/inviteCode/email) stripped so constraints hold. */
  const duplicate = async (item: any) => {
    if (!conf) return;
    const copy: Record<string, any> = {};
    for (const f of conf.fields) {
      const v = item[f.name];
      if (v === undefined || v === null || UNIQUE_FIELDS.includes(f.name)) continue;
      copy[f.name] = v;
    }
    const labelField = ['title', 'name'].find((k) => typeof copy[k] === 'string') ?? conf.listLabel;
    if (typeof copy[labelField] === 'string') copy[labelField] = `${copy[labelField]} (copy)`;
    try {
      await api.post(`/api/admin/${conf.api}`, copy);
      invalidate();
      toast('Duplicated', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Duplicate failed', 'error');
    }
  };

  /** Sequential deletes (the API is per-id); one summary toast at the end. */
  const deleteMany = async (ids: string[]) => {
    if (!conf) return;
    let ok = 0;
    for (const id of ids) {
      try {
        await api.del(`/api/admin/${conf.api}/${id}`);
        ok++;
      } catch {
        /* keep going — the summary reports the misses */
      }
    }
    invalidate();
    if (ids.length === 1) toast(ok ? 'Deleted' : 'Delete failed', ok ? 'success' : 'error');
    else toast(`Deleted ${ok}/${ids.length}`, ok === ids.length ? 'success' : 'error');
  };

  /** Bulk flag set (active/featured) — sequential PATCH, summary toast. */
  const setMany = async (ids: string[], field: string, value: boolean) => {
    if (!conf) return;
    let ok = 0;
    for (const id of ids) {
      try {
        await api.patch(`/api/admin/${conf.api}/${id}`, { [field]: value });
        ok++;
      } catch {
        /* summary below */
      }
    }
    invalidate();
    toast(`Updated ${ok}/${ids.length}`, ok === ids.length ? 'success' : 'error');
  };

  if (!conf) return <div className="p-6">Unknown resource.</div>;

  return (
    <div className="pb-10">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin" className="text-gray-500 lg:hidden" aria-label="Back">
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-extrabold">{conf.label}</h1>
        <button
          onClick={() => setEditing({})}
          className="ms-auto flex items-center gap-1 rounded-full bg-brand-pink px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> New
        </button>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <>
          {/* Desktop: real data table */}
          <div className="hidden lg:block">
            <ResourceTable
              key={conf.key}
              conf={conf}
              items={items ?? []}
              onEdit={setEditing}
              onDuplicate={duplicate}
              onDeleteMany={deleteMany}
              onSetMany={setMany}
              onToggle={(item, field, value) => toggle.mutate({ id: item.id, field, value })}
            />
          </div>

          {/* Phone: the original card list */}
          <div className="divide-y overflow-hidden rounded-xl lg:hidden">
            {(items ?? []).map((it: any) => (
              <div key={it.id} className="flex items-center gap-3 bg-white px-4 py-3">
                <button onClick={() => setEditing(it)} className="flex-1 text-left">
                  <p className="font-medium">{it[conf.listLabel] || it.id}</p>
                  <p className="text-xs text-gray-400">{it.id}</p>
                </button>
                <button onClick={() => setConfirmDel(it)} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {!items?.length && <p className="p-6 text-center text-gray-400">No items yet.</p>}
          </div>
        </>
      )}

      {confirmDel && (
        <ConfirmDialog
          title={`Delete "${confirmDel[conf.listLabel] || confirmDel.id}"?`}
          message="This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            deleteMany([String(confirmDel.id)]);
            setConfirmDel(null);
          }}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {editing && <EditPanel conf={conf} item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/** The create/edit form. Phones keep the bottom sheet; on lg+ the same form
 *  docks as a right-side panel so the table stays visible behind it. Closing
 *  with unsaved edits asks first. */
function EditPanel({ conf, item, onClose }: { conf: Resource; item: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setFormRaw] = useState<Record<string, any>>({ ...item });
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState('');
  const isNew = !item.id;

  const setForm = (v: Record<string, any>) => {
    setFormRaw(v);
    setDirty(true);
  };
  const requestClose = () => (dirty ? setConfirmClose(true) : onClose());

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, any> = {};
      for (const f of conf.fields) {
        let v = form[f.name];
        if (v === undefined) continue;

        // An emptied field has to be sent as null, not skipped. Skipping meant a
        // value could be typed but never removed - clearing a Video ID, an image
        // path or a link was impossible through this form.
        if (v === '') {
          // Counters and flags are non-null with defaults, so leave those alone.
          if (isNew || NUMBER_FIELDS.has(f.name) || BOOLEAN_FIELDS.has(f.name)) continue;
          payload[f.name] = null;
          continue;
        }

        if (NUMBER_FIELDS.has(f.name)) v = Number(v);
        if (BOOLEAN_FIELDS.has(f.name)) v = v === true || v === 'true';
        payload[f.name] = v;
      }
      return isNew
        ? api.post(`/api/admin/${conf.api}`, payload)
        : api.patch(`/api/admin/${conf.api}/${item.id}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', conf.api] });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-stretch lg:justify-end"
        onClick={requestClose}
      >
        <div
          className="admin-sheet max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl p-5 lg:h-full lg:max-h-none lg:rounded-none lg:border-s lg:border-gray-200 lg:shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {isNew ? 'Create' : 'Edit'} {conf.label}
              {dirty && <span className="ms-2 align-middle text-xs font-semibold text-amber-600">unsaved</span>}
            </h2>
            <button onClick={requestClose} aria-label="Close">
              <X />
            </button>
          </div>
          {conf.key === 'recipes' && <MacroEstimator form={form} setForm={setForm} />}
          <div className="space-y-3">
            {conf.fields.map((f) => (
              <FieldInput key={f.name} field={f} value={form[f.name] ?? ''} onChange={(v) => setForm({ ...form, [f.name]: v })} />
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="btn-pill mt-5 w-full bg-brand-pink text-white disabled:opacity-60"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {confirmClose && (
        <ConfirmDialog
          title="Discard changes?"
          message="This form has unsaved edits. Close anyway?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          danger
          onConfirm={onClose}
          onCancel={() => setConfirmClose(false)}
        />
      )}
    </>
  );
}

/**
 * Fill a recipe's macros from its ingredient list.
 *
 * A recipe without protein/carbs/fat is invisible to the meal planner, so this is the
 * difference between the kitchen growing and it staying frozen at whatever was seeded.
 * It writes into the form, never straight to the database — the editor sees the
 * numbers, the confidence and what drove the estimate, and still has to press Save.
 */
function MacroEstimator({ form, setForm }: { form: Record<string, any>; setForm: (v: any) => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState('');
  const { data: ai } = useQuery({ queryKey: ['ai-status'], queryFn: () => api.get('/api/ai/status') });

  if (!ai?.enabled) return null;

  const run = async () => {
    setErr('');
    setResult(null);

    // Ingredients live as a JSON array string. If it will not parse there is nothing
    // to estimate from, and saying so beats sending the model an empty list.
    let ingredients: string[] = [];
    try {
      const raw = JSON.parse(form.ingredients || form.ingredientsAr || '[]');
      if (Array.isArray(raw)) ingredients = raw.map(String).filter(Boolean);
    } catch {
      /* fall through to the check below */
    }
    if (ingredients.length === 0) return setErr('Add the ingredients list first (JSON array).');
    if (!form.title) return setErr('Add the title first.');

    setBusy(true);
    try {
      const r = await api.post('/api/ai/recipe-macros', {
        title: form.title,
        ingredients,
        servings: Number(form.servings) || 4,
      });
      setResult(r);
      setForm({
        ...form,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        mealSlots: JSON.stringify(r.mealSlots),
        cuisine: r.cuisine,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Estimate failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <button
        onClick={run}
        disabled={busy}
        className="btn-pill flex min-h-[38px] w-full items-center justify-center gap-2 bg-gray-900 py-2 text-sm text-white disabled:opacity-60"
      >
        <Sparkles size={15} /> {busy ? 'Estimating…' : 'Estimate macros from ingredients'}
      </button>
      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
      {result && (
        <div className="mt-2 text-xs leading-relaxed text-gray-600">
          <p className="font-semibold">
            {result.calories} kcal · P{result.protein} C{result.carbs} F{result.fat} · per serving
            <span className={`ms-2 font-bold ${result.confidence === 'high' ? 'text-brand-green' : result.confidence === 'medium' ? 'text-amber-600' : 'text-red-500'}`}>
              {result.confidence}
            </span>
          </p>
          {result.note && <p className="mt-0.5 text-gray-500">{result.note}</p>}
          <p className="mt-1 text-gray-400">Fields below are filled in. Check them, then Save.</p>
        </div>
      )}
    </div>
  );
}

/** Searchable replacement for the remote <select> — with hundreds of users,
 *  scrolling a native dropdown to find one email was hopeless. Type to filter,
 *  tap to pick; the current selection stays visible with a clear (×) button. */
function RemotePicker({
  options, labelKey, value, onChange,
}: { options: any[]; labelKey: string; value: any; onChange: (v: any) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const label = (o: any) => String(o[labelKey] ?? o.title ?? o.name ?? o.email ?? o.id);
  const selected = options.find((o) => o.id === value);
  const needle = q.trim().toLowerCase();
  const matches = needle
    ? options.filter((o) => label(o).toLowerCase().includes(needle) || String(o.id) === q.trim())
    : options;

  return (
    <div className="mt-1">
      {selected ? (
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label(selected)}</span>
          <button type="button" onClick={() => { onChange(''); setQ(''); setOpen(true); }} aria-label="Clear" className="shrink-0 text-gray-400">
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <input
            className="input-field"
            placeholder={`Search… (${options.length})`}
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
          {open && (
            <div className="mt-1 max-h-48 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
              {matches.slice(0, 30).map((o: any) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => { onChange(o.id); setOpen(false); }}
                  className="block w-full truncate px-3 py-2 text-start text-sm hover:bg-gray-50"
                >
                  {label(o)}
                </button>
              ))}
              {matches.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">No match</p>}
              {matches.length > 30 && (
                <p className="px-3 py-2 text-[11px] text-gray-400">{matches.length - 30} more — keep typing to narrow</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const { data: options } = useQuery({
    queryKey: ['admin', field.remote],
    queryFn: () => api.get(`/api/admin/${field.remote}`),
    enabled: field.type === 'remote',
  });

  // Booleans need a real control. Typing "true" into a text box and hoping the API
  // coerces it is how a flag ends up as the string "false", which is truthy.
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2.5 py-1">
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 accent-brand-orange"
          checked={value === true || value === 'true'}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-xs text-gray-500">{field.label}</span>
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-xs text-gray-500">{field.label}</span>
      {field.type === 'textarea' ? (
        <textarea className="input-field mt-1 rounded-2xl" rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'select' ? (
        <select className="input-field mt-1 px-3" value={value} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o || '—'}</option>)}
        </select>
      ) : field.type === 'remote' ? (
        <RemotePicker options={options ?? []} labelKey={field.remoteLabel ?? 'title'} value={value} onChange={onChange} />
      ) : IMG_FIELDS.includes(field.name) || field.name === 'videoId' ? (
        <div className="mt-1 flex items-center gap-2">
          {IMG_FIELDS.includes(field.name) && value && <MediaImage path={value} className="h-10 w-10 rounded-lg" />}
          <input className="input-field flex-1" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.name === 'videoId' ? 'video id' : 'image path'} />
          <MediaUpload isVideo={field.name === 'videoId'} onChange={onChange} />
        </div>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          className="input-field mt-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function MediaUpload({ isVideo, onChange }: { isVideo: boolean; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}${isVideo ? '/api/admin/upload/video' : '/api/admin/upload/image'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      onChange(isVideo ? data.id : data.path);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="btn-pill btn-ghost whitespace-nowrap px-3 py-2 text-xs disabled:opacity-60">
        <Upload size={14} /> {busy ? 'uploading…' : 'Upload'}
      </button>
      <input ref={ref} type="file" accept={isVideo ? 'video/*' : 'image/*'} className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </>
  );
}
