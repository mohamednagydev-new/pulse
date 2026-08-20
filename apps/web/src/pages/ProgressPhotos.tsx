import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Camera, Trash2, X, ArrowLeftRight } from 'lucide-react';
import { api, uploadWithAuth } from '../lib/api';
import { toast } from '../lib/toast';
import { Loader, MediaImage } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';

type Photo = { id: string; imagePath: string; url: string; weightKg: number | null; note: string | null; takenOn: string };

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

/** Private before/after vault: photos live behind /api/photos (owner-only) and
 *  never touch the social feed. Upload rides the existing /api/social/upload
 *  pipeline; only the returned images/ path is stored. */
export default function ProgressPhotos() {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({ queryKey: ['progress-photos'], queryFn: () => api.get('/api/photos') });
  const photos: Photo[] = data ?? [];

  // Add flow: pick → upload → tiny inline form (weight/note) → save row.
  const [uploading, setUploading] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');

  // Compare flow: pick exactly two → side-by-side slider.
  const [compareMode, setCompareMode] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const pair = sel
    .map((id) => photos.find((p) => p.id === id))
    .filter((p): p is Photo => Boolean(p))
    .sort((a, b) => new Date(a.takenOn).getTime() - new Date(b.takenOn).getTime());

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadWithAuth('/api/daily/body-photo', fd);
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Upload failed');
      const j = await res.json();
      if (!j.photo) throw new Error(L('Images only', 'صور بس'));
      setPendingPath(j.photo);
      setPendingUrl(j.url ?? null);
      // Prefill from the latest photo's weight — one less thing to type.
      setWeight(photos[0]?.weightKg != null ? String(photos[0].weightKg) : '');
      setNote('');
    } catch (e: any) {
      toast(e?.message ?? 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: () => {
      const n = Number(weight);
      return api.post('/api/photos', {
        imagePath: pendingPath,
        ...(Number.isFinite(n) && n >= 20 && n <= 400 ? { weightKg: n } : {}),
        ...(note.trim() ? { note: note.trim().slice(0, 200) } : {}),
      });
    },
    onSuccess: () => {
      setPendingPath(null);
      setPendingUrl(null);
      qc.invalidateQueries({ queryKey: ['progress-photos'] });
      toast(L('Photo saved', 'الصورة اتحفظت'), 'success');
    },
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.del(`/api/photos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['progress-photos'] }),
    onError: (e: any) => toast(e?.message ?? 'Failed', 'error'),
  });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' });

  const tapTile = (p: Photo) => {
    if (!compareMode) return;
    setSel((s) => (s.includes(p.id) ? s.filter((i) => i !== p.id) : s.length >= 2 ? [s[1], p.id] : [...s, p.id]));
  };

  if (isLoading) return <Loader />;

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <AmbientBg tone="warm" />
      <TopBar title={L('Progress photos', 'صور التقدم')} color="bg-gradient-to-b from-brand-teal to-cyan-500" textColor="text-white" />

      {/* Privacy first — the whole point of a vault. */}
      <p className="mx-4 rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
        🔒 {L('Only you can see these photos.', 'الصور دي محدش يشوفها غيرك.')}
      </p>

      <div className="mx-4 mt-3 flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => fileRef.current?.click()}
          disabled={uploading || Boolean(pendingPath)}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl btn-primary px-4 font-bold disabled:opacity-60"
        >
          <Camera size={18} /> {uploading ? L('Uploading…', 'بيرفع…') : L('Add photo', 'ضيف صورة')}
        </motion.button>
        {photos.length >= 2 && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { setCompareMode((v) => !v); setSel([]); }}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-2xl px-4 text-sm font-bold ${
              compareMode ? 'bg-brand-teal text-white' : 'bg-white text-brand-teal shadow-sm'
            }`}
          >
            <ArrowLeftRight size={16} /> {L('Compare', 'قارن')}
          </motion.button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(ev) => {
          const f = ev.target.files?.[0];
          ev.target.value = ''; // re-picking the same file must fire again
          if (f) void onFile(f);
        }}
      />

      {compareMode && (
        <p className="mx-4 mt-2 text-center text-xs font-semibold text-gray-400">
          {L('Tap two photos to compare', 'دوس على صورتين عشان تقارن')} ({sel.length}/2)
        </p>
      )}

      {/* Inline save form right after the pick — weight + note, then the row. */}
      {pendingPath && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="mx-4 mt-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <MediaImage path={pendingUrl ?? pendingPath} label="" className="h-20 w-16 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  dir="ltr"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder={L('Weight (kg)', 'الوزن (كجم)')}
                  className="w-28 rounded-lg bg-gray-50 px-2.5 py-2 text-sm font-bold outline-none ring-1 ring-gray-200 focus:ring-brand-teal"
                />
                <span className="text-xs text-gray-400">{L('optional', 'اختياري')}</span>
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder={L('Note (optional)', 'ملاحظة (اختياري)')}
                className="w-full rounded-lg bg-gray-50 px-2.5 py-2 text-sm outline-none ring-1 ring-gray-200 focus:ring-brand-teal"
              />
            </div>
            <button onClick={() => { setPendingPath(null); setPendingUrl(null); }} aria-label={L('Cancel', 'إلغاء')} className="-me-1 shrink-0 p-1.5 text-gray-400">
              <X size={18} />
            </button>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="mt-3 w-full rounded-xl btn-primary py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {L('Save', 'حفظ')}
          </motion.button>
        </motion.div>
      )}

      {photos.length === 0 && !pendingPath ? (
        <div className="mx-4 mt-6 rounded-2xl bg-white p-8 text-center shadow-sm">
          <span className="text-4xl">📸</span>
          <p className="mt-3 text-sm font-semibold text-gray-500">
            {L(
              'The scale lies week to week — photos are the proof. Take the first one today.',
              'الميزان بيكدب أسبوع عن أسبوع — الصور هي الدليل. صوّر أول صورة النهارده.',
            )}
          </p>
        </div>
      ) : (
        <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
          {photos.map((p, i) => {
            const picked = sel.includes(p.id);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...spring, delay: Math.min(i, 8) * 0.03 }}
                role={compareMode ? 'button' : undefined}
                tabIndex={compareMode ? 0 : undefined}
                onClick={() => tapTile(p)}
                onKeyDown={(e) => compareMode && (e.key === 'Enter' || e.key === ' ') && tapTile(p)}
                className={`relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100 ${
                  compareMode ? 'cursor-pointer' : ''
                } ${picked ? 'ring-4 ring-brand-teal' : ''}`}
              >
                <MediaImage path={p.url} label="" className="h-full w-full" />
                {/* Date + weight chip — the story each thumbnail tells. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4">
                  <p className="truncate text-[10px] font-bold text-white">
                    {new Date(p.takenOn).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                    {p.weightKg != null && <span className="ms-1 text-white/85">· {p.weightKg}kg</span>}
                  </p>
                </div>
                {!compareMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(L('Delete this photo?', 'تمسح الصورة دي؟'))) del.mutate(p.id);
                    }}
                    aria-label={L('Delete photo', 'مسح الصورة')}
                    className="absolute end-1 top-1 rounded-full bg-black/50 p-1.5 text-white/90"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                {picked && (
                  <span className="absolute start-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal text-[11px] font-extrabold text-white">
                    {sel.indexOf(p.id) + 1}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {pair.length === 2 && (
        <Comparer
          before={pair[0]}
          after={pair[1]}
          fmtDate={fmtDate}
          L={L}
          onClose={() => setSel([])}
        />
      )}
    </div>
  );
}

/* ------------------------------- Comparer ------------------------------- */

/** Before/after with a draggable vertical divider: both images fill the same
 *  box, the older one is clipped to `pos`% via clip-path, and an invisible
 *  full-size range input drives the split — touch-friendly with zero JS
 *  gesture code. The box is forced LTR so the slider math never flips in RTL. */
function Comparer({
  before,
  after,
  fmtDate,
  L,
  onClose,
}: {
  before: Photo;
  after: Photo;
  fmtDate: (iso: string) => string;
  L: (en: string, ar: string) => string;
  onClose: () => void;
}) {
  const [pos, setPos] = useState(50);

  const Side = ({ p, tag }: { p: Photo; tag: string }) => (
    <div className="min-w-0 flex-1 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">{tag}</p>
      <p className="truncate text-xs font-bold text-white">{fmtDate(p.takenOn)}</p>
      <p className="text-[11px] text-white/70">{p.weightKg != null ? `${p.weightKg} kg` : '—'}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-white">{L('Compare', 'قارن')}</h2>
        <button onClick={onClose} aria-label={L('Close', 'إغلاق')} className="rounded-full bg-white/10 p-2 text-white">
          <X size={20} />
        </button>
      </div>

      {/* Dates + weights above each side (order matches the LTR image box). */}
      <div className="mx-auto mb-2 flex w-full max-w-md items-center gap-2" dir="ltr">
        <Side p={before} tag={L('Before', 'قبل')} />
        <ArrowLeftRight size={14} className="shrink-0 text-white/40" />
        <Side p={after} tag={L('After', 'بعد')} />
      </div>

      <div dir="ltr" className="relative mx-auto w-full max-w-md flex-1 select-none overflow-hidden rounded-2xl" style={{ maxHeight: '70vh' }}>
        {/* After fills the box; Before sits on top clipped to the left pos%. */}
        <div className="absolute inset-0">
          <MediaImage path={after.url} label="" className="h-full w-full" />
        </div>
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <MediaImage path={before.url} label="" className="h-full w-full" />
        </div>
        {/* Divider + handle */}
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}>
          <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg">
            <ArrowLeftRight size={16} />
          </span>
        </div>
        {/* The whole box is the slider. */}
        <input
          type="range"
          min={2}
          max={98}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={L('Drag to compare', 'اسحب للمقارنة')}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
          style={{ touchAction: 'none' }}
        />
      </div>
    </div>
  );
}
