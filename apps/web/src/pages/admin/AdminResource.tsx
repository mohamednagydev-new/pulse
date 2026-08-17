import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronLeft, X, Upload, Sparkles } from 'lucide-react';
import { api, getAccessToken } from '../../lib/api';
import { toast } from '../../lib/toast';
import { Loader, MediaImage } from '../../components/ui';
import { RESOURCES, NUMBER_FIELDS, BOOLEAN_FIELDS, type Field } from './adminConfig';

const IMG_FIELDS = ['coverImage', 'image', 'avatarUrl', 'thumbnail', 'icon', 'svgAsset'];

export default function AdminResource() {
  const { resource } = useParams();
  const conf = RESOURCES.find((r) => r.key === resource);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['admin', conf?.api],
    queryFn: () => api.get(`/api/admin/${conf!.api}`),
    enabled: !!conf,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del(`/api/admin/${conf!.api}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', conf?.api] }),
  });

  if (!conf) return <div className="p-6">Unknown resource.</div>;

  return (
    <div className="min-h-screen pb-10">
      <header className="safe-header flex items-center gap-2 bg-ink px-4 pb-4 text-white">
        <Link to="/admin"><ChevronLeft /></Link>
        <h1 className="text-lg font-bold">{conf.label}</h1>
        <button onClick={() => setEditing({})} className="ms-auto flex items-center gap-1 rounded-full bg-brand-pink px-4 py-2 text-sm">
          <Plus size={16} /> New
        </button>
      </header>

      {isLoading ? (
        <Loader />
      ) : (
        <div className="divide-y">
          {(items ?? []).map((it: any) => (
            <div key={it.id} className="flex items-center gap-3 bg-white px-4 py-3">
              <button onClick={() => setEditing(it)} className="flex-1 text-left">
                <p className="font-medium">{it[conf.listLabel] || it.id}</p>
                <p className="text-xs text-gray-400">{it.id}</p>
              </button>
              <button onClick={() => confirm('Delete?') && del.mutate(it.id)} className="text-gray-300 hover:text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {!items?.length && <p className="p-6 text-center text-gray-400">No items yet.</p>}
        </div>
      )}

      {editing && <EditDrawer conf={conf} item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditDrawer({ conf, item, onClose }: { conf: any; item: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({ ...item });
  const [error, setError] = useState('');
  const isNew = !item.id;

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, any> = {};
      for (const f of conf.fields as Field[]) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="admin-sheet max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{isNew ? 'Create' : 'Edit'} {conf.label}</h2>
          <button onClick={onClose}><X /></button>
        </div>
        {conf.key === 'recipes' && <MacroEstimator form={form} setForm={setForm} />}
        <div className="space-y-3">
          {(conf.fields as Field[]).map((f) => (
            <FieldInput key={f.name} field={f} value={form[f.name] ?? ''} onChange={(v) => setForm({ ...form, [f.name]: v })} />
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-pill mt-5 w-full bg-brand-pink text-white disabled:opacity-60">
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
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
      const res = await fetch(isVideo ? '/api/admin/upload/video' : '/api/admin/upload/image', {
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
